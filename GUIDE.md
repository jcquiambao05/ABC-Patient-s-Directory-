# Agentic Workflow Guide

This folder is now structured to support a 3-layer architecture for your AI agent, integrated with your local Ollama instance.

## 1. Setup

### Prerequisites
- **Ollama**: Ensure Ollama is installed and running (`ollama serve`).
- **Python 3**: Ensure you have Python installed.

### Install Dependencies
Run the following command to install the required Pyton libraries (`ollama`, `pydantic`, `python-dotenv`):

```bash
pip install -r requirements.txt
```

### Configure Environment
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. (Optional) Edit `.env` if your Ollama host is different or you want to use a model other than `llama3` (e.g. `qwen2.5-coder`).

## 2. Running the Agent

To run the agent with the default example directive:

```bash
python main.py
```

This will:
1. Read `directives/example.md`.
2. Connect to your local Ollama.
3. Send the directive to the LLM.
4. Print the LLM's response.

To run with a custom directive:
1. Create a new markdown file in `directives/` (e.g., `directives/my_task.md`).
2. Run:
   ```bash
   python main.py directives/my_task.md
   ```

## 3. Architecture Overview

- **directives/**: Place your instructions/SOPs here.
- **execution/**: Python scripts that do the actual work. `llm_client.py` handles the connection to Ollama.
- **.tmp/**: For temporary files (ignored by git).
- **main.py**: The central brain that reads directives and orchestrates the execution.

## 4. Customizing

To add more capabilities:
1. Creates new tools in `execution/` (e.g., `scrape_web.py`).
2. Update `main.py` or create a new orchestrator to use those tools.
3. Update your directives to instruct the agent to use those tools.
