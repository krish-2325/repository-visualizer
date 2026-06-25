"""
AI integration with local disk cache.
Uses Groq API (free tier) with llama-3.3-70b-versatile model.
Get your free API key at: https://console.groq.com
"""
import os
import json
from pathlib import Path

import httpx

CACHE_FILE = Path(__file__).parent / ".ai_cache.json"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


class AIService:
    def __init__(self):
        self._cache: dict = self._load_cache()

    # ------------------------------------------------------------------ cache

    def _load_cache(self) -> dict:
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_cache(self):
        with open(CACHE_FILE, "w") as f:
            json.dump(self._cache, f, indent=2)

    def get_cached(self, file_hash: str) -> str | None:
        return self._cache.get(file_hash)

    def set_cache(self, file_hash: str, explanation: str):
        self._cache[file_hash] = explanation
        self._save_cache()

    # --------------------------------------------------------------- AI call

    async def explain_code(self, code: str, filename: str) -> str:
        """
        Calls the Groq API (free) to explain a code file in 3 sentences.
        Falls back to a helpful message if no API key is set.
        """
        api_key = os.getenv("GROQ_API_KEY", "")

        if not api_key:
            return (
                "No Groq API key configured. "
                "Get a free key at https://console.groq.com and set "
                "GROQ_API_KEY in your .env file."
            )

        # Truncate very large files to stay within token limits
        snippet = code[:12_000] + ("\n\n[... file truncated ...]" if len(code) > 12_000 else "")

        prompt = (
            f"You are a senior software engineer reviewing a file called `{filename}`.\n"
            f"Explain what this file does in exactly 3 clear, plain-English sentences "
            f"suitable for a developer who has never seen this codebase.\n\n"
            f"File contents:\n```\n{snippet}\n```"
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type":  "application/json",
        }

        payload = {
            "model":      GROQ_MODEL,
            "max_tokens": 300,
            "temperature": 0.3,
            "messages": [
                {
                    "role":    "system",
                    "content": "You are a concise code explainer. Always respond in exactly 3 sentences."
                },
                {
                    "role":    "user",
                    "content": prompt
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    GROQ_API_URL,
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as e:
            return f"Groq API error ({e.response.status_code}): {e.response.text}"
        except Exception as e:
            return f"Could not reach Groq API: {str(e)}"