# Example Directive: Summarize Text

## Goal
Take a text file and produce a summary of it.

## Inputs
- `input_file`: Path to the text file to summarize.

## Tools
- `read_file`: Built-in function or script.
- `llm_summary`: Use the LLM to summarize the content.

## Steps
1. Read the content of `input_file`.
2. Send the content to the LLM with the prompt: "Summarize the following text: {text}".
3. Print the summary to the console.
