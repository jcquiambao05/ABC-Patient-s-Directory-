import ollama
import os
from dotenv import load_dotenv

load_dotenv()

class OllamaClient:
    def __init__(self, host=None, model=None):
        self.host = host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.model = model or os.getenv("DEFAULT_MODEL", "llama3")
        # Initialize the client (though the ollama library is stateless/direct usually, 
        # we can set the host environment variable if needed by the lib)
        # The python-ollama library usually checks OLLAMA_HOST env var.

    def generate(self, prompt, model=None):
        """Generates a response from the Ollama model."""
        target_model = model or self.model
        try:
            response = ollama.chat(model=target_model, messages=[
                {
                    'role': 'user',
                    'content': prompt,
                },
            ])
            return response['message']['content']
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"

if __name__ == "__main__":
    # Test
    client = OllamaClient()
    print("Testing connection...")
    print(client.generate("Say hello!"))
