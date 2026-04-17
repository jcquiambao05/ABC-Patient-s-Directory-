#!/usr/bin/env python3
"""
============================================================
TOOL 1: "Lazy Sysadmin" Log Explainer
============================================================
Reads a messy server log and explains it in plain English.

USAGE:
  python3 explain-error.py error.log
  cat error.log | python3 explain-error.py
  python3 explain-error.py < error.log

DEMO COMMAND (the dramatic one for presentations):
  cat sample-error.log | python3 explain-error.py

REQUIRES:
  - Ollama running: ollama serve
  - llama3.2 pulled: ollama pull llama3.2
============================================================
"""

import sys
import json
import urllib.request
import urllib.error

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL      = "llama3.2"

# ── System prompt — tells AI exactly what to do ──────────────
# This is the "guardrail" for this tool.
# The AI is constrained to ONLY explain log errors.
SYSTEM_PROMPT = """You are a senior Linux sysadmin and log analysis expert.
Your job is to read server log files and explain them clearly to a beginner.

When given a log file, you MUST:
1. Identify the ROOT CAUSE of the error in ONE sentence
2. Explain what happened in plain English (no jargon)
3. List the top 3 things to check or fix
4. Rate the severity: LOW / MEDIUM / HIGH / CRITICAL

Format your response exactly like this:
ROOT CAUSE: [one sentence]

WHAT HAPPENED: [2-3 sentences in plain English]

TOP 3 FIXES:
1. [fix one]
2. [fix two]
3. [fix three]

SEVERITY: [LOW/MEDIUM/HIGH/CRITICAL]"""

def call_ollama(log_content: str) -> str:
    """Send log content to Ollama and get explanation."""
    
    payload = {
        "model": MODEL,
        "stream": False,
        "messages": [
            {"role": "system",  "content": SYSTEM_PROMPT},
            {"role": "user",    "content": f"Analyze this log file:\n\n{log_content}"}
        ]
    }
    
    data = json.dumps(payload).encode('utf-8')
    req  = urllib.request.Request(
        OLLAMA_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read())
            return result["message"]["content"]
    except urllib.error.URLError:
        return "ERROR: Cannot connect to Ollama. Make sure it's running: ollama serve"
    except Exception as e:
        return f"ERROR: {e}"


def main():
    print("\n Log Explainer — Powered by Local AI (llama3.2)")
    print("=" * 52)
    
    # ── Read log from file argument or stdin ─────────────────
    if len(sys.argv) > 1:
        # Usage: python3 explain-error.py error.log
        filename = sys.argv[1]
        try:
            with open(filename, 'r') as f:
                log_content = f.read()
            print(f" Reading: {filename}")
        except FileNotFoundError:
            print(f"ERROR: File not found: {filename}")
            sys.exit(1)
    else:
        # Usage: cat error.log | python3 explain-error.py
        if sys.stdin.isatty():
            print("Usage: python3 explain-error.py <logfile>")
            print("   or: cat logfile | python3 explain-error.py")
            sys.exit(1)
        log_content = sys.stdin.read()
        print("Reading from stdin (pipe)")
    
    if not log_content.strip():
        print("ERROR: Log file is empty.")
        sys.exit(1)
    
    print(f"Log size: {len(log_content)} characters, {log_content.count(chr(10))} lines")
    print("\n⏳ Sending to AI for analysis...\n")
    
    # ── Call the AI ───────────────────────────────────────────
    explanation = call_ollama(log_content)
    
    print("=" * 52)
    print(" AI EXPLANATION:")
    print("=" * 52)
    print(explanation)
    print("=" * 52 + "\n")


if __name__ == "__main__":
    main()
