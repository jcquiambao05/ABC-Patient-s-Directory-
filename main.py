import os
import sys
from execution.llm_client import OllamaClient

def read_directive(directive_path):
    if not os.path.exists(directive_path):
        return None
    with open(directive_path, 'r') as f:
        return f.read()

def main():
    print("Agentic Workflow Orchestrator")
    print("-----------------------------")

    # default to example directive
    directive_file = "directives/example.md"
    if len(sys.argv) > 1:
        directive_file = sys.argv[1]

    print(f"Loading directive: {directive_file}")
    directive_content = read_directive(directive_file)
    
    if not directive_content:
        print(f"Error: Directive file '{directive_file}' not found.")
        return

    print("Initializing Ollama Client...")
    client = OllamaClient()
    
    # Simple orchestration: Ask the LLM to execute the directive
    # In a real scenario, you'd parse the directive and run specific tools.
    # Here we are simulating the "Agent" reading the directive and deciding what to do.
    
    prompt = f"""
    You are an intelligent agent. Your goal is to follow the directive below.
    
    DIRECTIVE:
    {directive_content}
    
    INSTRUCTIONS:
    Identify the next step based on the directive and execute it or describe it.
    If the directive asks you to summarize something, provide the summary.
    """
    
    print("Thinking...")
    response = client.generate(prompt)
    print("\n--- Agent Response ---\n")
    print(response)
    print("\n----------------------")

if __name__ == "__main__":
    main()
