"""AREVEI model router — LiteLLM abstraction over OpenRouter / NVIDIA NIM.

Keeps provider credentials server-side, exposes a small allowlist of friendly
model names (free / cheap / coding / nim) mapped to provider slugs, and gives a
single async `acompletion` used by the workspace coding agent. This replaces the
expensive Codex SDK path with a cheap, provider-neutral routed agent loop.
"""
from __future__ import annotations

import logging
import os

log = logging.getLogger("arevei.router")

try:
    # pyrefly: ignore [missing-import]
    import litellm

    # Drop provider-unsupported params (e.g. temperature on some models) instead
    # of raising, and stay quiet about pricing lookups for free models.
    litellm.drop_params = True
    litellm.suppress_debug_info = True
except Exception:  # pragma: no cover - import guard
    litellm = None


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip().strip('"').strip("'")


def model_catalog() -> dict[str, dict]:
    """Friendly name -> {slug, tier, label}. Slugs are configurable via env so
    they can track the live OpenRouter/NVIDIA/OpenAI catalog without code changes."""
    return {
        "codex-mini": {
            "slug": _env("ROUTER_CODEX_MINI_MODEL", "openai/" + (_env("OPENAI_MODEL") or "gpt-5.4-mini")),
            "tier": "free",
            "label": "Codex Mini · GPT-5.4 Mini",
        },
        "codex": {
            "slug": _env("ROUTER_CODEX_MODEL", "openai/" + (_env("OPENAI_CODING_MODEL") or "gpt-5.5")),
            "tier": "paid",
            "label": "Codex · GPT-5.5 (OpenAI)",
        },
        "coding": {
            "slug": _env("ROUTER_CODING_MODEL", "openrouter/anthropic/claude-sonnet-4.5"),
            "tier": "paid",
            "label": "Pro Coder · Claude Sonnet 4.5",
        },
        "cheap": {
            "slug": _env("ROUTER_CHEAP_MODEL", "openrouter/google/gemini-2.5-flash-lite"),
            "tier": "free",
            "label": "Fast · Gemini 2.5 Flash Lite",
        },
        "free": {
            "slug": _env("ROUTER_FREE_MODEL", "openrouter/openai/gpt-oss-20b:free"),
            "tier": "free",
            "label": "Free · GPT-OSS 20B",
        },
        "nim": {
            "slug": _env("ROUTER_NIM_MODEL", "nvidia_nim/meta/llama-3.1-8b-instruct"),
            "tier": "free",
            "label": "NVIDIA NIM · Llama 3.1",
        },
    }


def default_model() -> str:
    catalog = model_catalog()
    preferred = _env("ROUTER_DEFAULT_MODEL", "codex-mini")
    return preferred if preferred in catalog else "codex-mini"


def router_ready() -> bool:
    return litellm is not None and bool(
        _env("OPENROUTER_API_KEY") or _env("NVIDIA_NIM_API_KEY") or _env("OPENAI_API_KEY")
    )


def _configure_env():
    """LiteLLM reads provider keys straight from the environment; ensure the
    common ones are present as bare values."""
    for key in ("OPENROUTER_API_KEY", "NVIDIA_NIM_API_KEY", "NVIDIA_NIM_API_BASE", "OPENAI_API_KEY"):
        value = _env(key)
        if value:
            os.environ[key] = value


def resolve_model(name: str | None, tier: str = "free") -> tuple[str, str, str]:
    """Return (friendly_name, provider_slug, resolved_tier_note).

    Paid models are allowed to fall back to a free coding model when the caller
    is not on a paid tier, so the agent never hard-fails on gating.
    """
    catalog = model_catalog()
    key = name if name in catalog else default_model()
    entry = catalog.get(key) or catalog["free"]
    if entry["tier"] == "paid" and tier != "paid":
        # Downgrade to the best available free option rather than error out.
        key = "cheap" if "cheap" in catalog else "free"
        entry = catalog[key]
        return key, entry["slug"], "downgraded_free"
    return key, entry["slug"], "ok"


def public_models() -> list[dict]:
    """Model list for the UI picker."""
    catalog = model_catalog()
    return [
        {"id": name, "slug": meta["slug"], "label": meta["label"], "tier": meta["tier"]}
        for name, meta in catalog.items()
    ]


async def acompletion(
    model_slug: str,
    messages: list[dict],
    tools: list[dict] | None = None,
    tool_choice: str | None = None,
    temperature: float = 0.2,
    max_tokens: int | None = None,
    stream: bool = False,
):
    if litellm is None:
        raise RuntimeError("litellm is not installed on the server")
    _configure_env()
    kwargs: dict = {
        "model": model_slug,
        "messages": messages,
        "temperature": temperature,
        # OpenRouter attribution headers (harmless for other providers).
        "extra_headers": {"HTTP-Referer": "https://arevei.com", "X-Title": "AREVEI"},
        "timeout": 120,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = tool_choice or "auto"
        kwargs["parallel_tool_calls"] = False
    if max_tokens:
        kwargs["max_tokens"] = max_tokens
    if stream:
        kwargs["stream"] = True
    return await litellm.acompletion(**kwargs)


def message_to_dict(message) -> dict:
    """Normalize a LiteLLM/OpenAI message object into a plain dict."""
    if isinstance(message, dict):
        data = dict(message)
    elif hasattr(message, "model_dump"):
        data = message.model_dump(exclude_none=True)
    else:
        data = {
            "role": getattr(message, "role", "assistant"),
            "content": getattr(message, "content", "") or "",
        }
        if getattr(message, "tool_calls", None):
            data["tool_calls"] = message.tool_calls
    # Assistant messages with tool_calls must keep content as a string ("" is ok).
    if data.get("content") is None:
        data["content"] = ""
    return data
