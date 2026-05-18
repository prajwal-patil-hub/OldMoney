from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any, AsyncIterator

import httpx
import structlog

from app.core.config import settings

log = structlog.get_logger(__name__)


class Message:
    def __init__(self, role: str, content: str, tool_calls: list | None = None) -> None:
        self.role = role
        self.content = content
        self.tool_calls = tool_calls or []

    def to_dict(self) -> dict:
        d: dict[str, Any] = {"role": self.role, "content": self.content}
        if self.tool_calls:
            d["tool_calls"] = self.tool_calls
        return d


class AIResponse:
    def __init__(
        self,
        content: str,
        tool_calls: list | None = None,
        token_count: int | None = None,
        latency_ms: int | None = None,
    ) -> None:
        self.content = content
        self.tool_calls = tool_calls or []
        self.token_count = token_count
        self.latency_ms = latency_ms


class AIProvider(ABC):
    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        stream: bool = False,
        tools: list | None = None,
    ) -> AIResponse:
        """Send a chat request. Returns a complete response (non-streaming)."""

    @abstractmethod
    async def chat_stream(
        self,
        messages: list[Message],
        tools: list | None = None,
    ) -> AsyncIterator[str]:
        """Stream a chat response, yielding text chunks."""

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed texts into vectors."""

    @abstractmethod
    async def health_check(self) -> tuple[bool, int | None]:
        """Returns (is_available, latency_ms)."""


class OllamaProvider(AIProvider):
    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.embed_model = settings.OLLAMA_EMBED_MODEL

    async def chat(
        self,
        messages: list[Message],
        stream: bool = False,
        tools: list | None = None,
    ) -> AIResponse:
        start = time.perf_counter()
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "stream": False,
            "options": {"temperature": 0.7},
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()

        latency_ms = round((time.perf_counter() - start) * 1000)
        msg = data.get("message", {})
        return AIResponse(
            content=msg.get("content", ""),
            tool_calls=msg.get("tool_calls", []),
            token_count=data.get("eval_count"),
            latency_ms=latency_ms,
        )

    async def chat_stream(
        self,
        messages: list[Message],
        tools: list | None = None,
    ) -> AsyncIterator[str]:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "stream": True,
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    import json
                    try:
                        data = json.loads(line)
                        chunk = data.get("message", {}).get("content", "")
                        if chunk:
                            yield chunk
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

    async def embed(self, texts: list[str]) -> list[list[float]]:
        results = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for text in texts:
                resp = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": self.embed_model, "prompt": text},
                )
                resp.raise_for_status()
                data = resp.json()
                results.append(data.get("embedding", []))
        return results

    async def health_check(self) -> tuple[bool, int | None]:
        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
            latency_ms = round((time.perf_counter() - start) * 1000)
            return True, latency_ms
        except Exception as e:
            log.warning("ollama_health_check_failed", error=str(e))
            return False, None


class OpenAICompatibleProvider(AIProvider):
    """Works with OpenAI, Groq, OpenRouter, LM Studio, etc."""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        embed_model: str = "text-embedding-3-small",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.embed_model = embed_model

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def chat(
        self,
        messages: list[Message],
        stream: bool = False,
        tools: list | None = None,
    ) -> AIResponse:
        start = time.perf_counter()
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "stream": False,
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        latency_ms = round((time.perf_counter() - start) * 1000)
        choice = data["choices"][0]
        msg = choice["message"]
        usage = data.get("usage", {})

        return AIResponse(
            content=msg.get("content", ""),
            tool_calls=msg.get("tool_calls", []),
            token_count=usage.get("total_tokens"),
            latency_ms=latency_ms,
        )

    async def chat_stream(
        self,
        messages: list[Message],
        tools: list | None = None,
    ) -> AsyncIterator[str]:
        import json

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "stream": True,
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=self._headers(),
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    raw = line[6:].strip()
                    if raw == "[DONE]":
                        break
                    try:
                        data = json.loads(raw)
                        delta = data["choices"][0].get("delta", {})
                        chunk = delta.get("content", "")
                        if chunk:
                            yield chunk
                    except json.JSONDecodeError:
                        continue

    async def embed(self, texts: list[str]) -> list[list[float]]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.base_url}/embeddings",
                json={"model": self.embed_model, "input": texts},
                headers=self._headers(),
            )
            resp.raise_for_status()
            data = resp.json()
        return [item["embedding"] for item in data["data"]]

    async def health_check(self) -> tuple[bool, int | None]:
        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                )
                resp.raise_for_status()
            latency_ms = round((time.perf_counter() - start) * 1000)
            return True, latency_ms
        except Exception as e:
            log.warning("openai_health_check_failed", error=str(e))
            return False, None


def get_provider() -> AIProvider:
    provider_name = settings.AI_PROVIDER.lower()
    if provider_name == "ollama":
        return OllamaProvider()
    elif provider_name in ("openai", "groq", "openrouter"):
        if not settings.OPENAI_API_KEY:
            raise ValueError(f"OPENAI_API_KEY required for provider '{provider_name}'")
        return OpenAICompatibleProvider(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            model=settings.OPENAI_MODEL,
            embed_model=settings.OPENAI_EMBED_MODEL,
        )
    else:
        raise ValueError(f"Unknown AI provider: {provider_name}")
