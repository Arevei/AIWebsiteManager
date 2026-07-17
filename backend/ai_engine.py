"""AI engine — Claude Sonnet 4.6 via emergentintegrations, with structured tool calling
implemented as JSON-mode prompting (model never outputs raw HTML/CSS)."""
from __future__ import annotations

import json
import os
import re
from typing import Any

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

TOOLS_SPEC = """Available tools (you MUST respond with a single JSON object — no markdown fences):

{
  "assistant_message": "<short natural language summary of what you're proposing>",
  "tool_calls": [
    {
      "name": "<tool_name>",
      "args": { ... }
    }
  ]
}

Tools:
- update_theme_color(token: "primary"|"accent"|"background"|"surface"|"text"|"muted", value: "#RRGGBB")
- update_typography(heading_font?: str, body_font?: str, scale?: "sm"|"md"|"lg")
- update_component_layout(hero_variant?: "split"|"centered"|"minimal", button_style?: "sharp"|"pill"|"rounded")
- update_content_block(section_id: str, field_path: str, value: str)   # e.g. field_path="headline" or "items.0.title"
- generate_blog_post(title: str, body: str, slug: str)
- generate_meta_tags(meta_title: str, meta_description: str, keywords: [str])
- suggest_seo_improvements(suggestions: [str])

Rules:
1. Use ONLY these tools. Never emit HTML or CSS.
2. Color values MUST be valid hex like "#0A0A0A".
3. If the user just wants a chat/answer, return tool_calls: [].
4. Keep assistant_message under 300 characters."""


def _strip_fences(text: str) -> str:
    text = text.strip()
    # remove ```json ... ``` style
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    return text.strip()


async def run_ai(session_id: str, system_context: str, user_message: str) -> dict[str, Any]:
    """Send the user message and parse Claude's structured JSON response."""
    if not EMERGENT_LLM_KEY:
        return {"assistant_message": "AI key not configured.", "tool_calls": []}

    system_message = (
        "You are AREVEI, an AI website manager helping a founder edit their site. "
        "You ONLY modify the site through structured tool calls — never raw code.\n\n"
        f"{TOOLS_SPEC}\n\nCurrent site state:\n{system_context}"
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-6")

    raw = await chat.send_message(UserMessage(text=user_message))
    cleaned = _strip_fences(raw if isinstance(raw, str) else str(raw))

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fall back: extract first {...} block
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except Exception:
                parsed = {"assistant_message": cleaned[:300], "tool_calls": []}
        else:
            parsed = {"assistant_message": cleaned[:300], "tool_calls": []}

    parsed.setdefault("assistant_message", "")
    parsed.setdefault("tool_calls", [])
    return parsed


# ---------- Tool execution against site state ----------
def apply_tool_calls(site: dict, tool_calls: list[dict]) -> tuple[dict, list[dict]]:
    """Apply tool calls to a deep-copied site object. Returns (new_site, diff_list)."""
    new_site = json.loads(json.dumps(site))
    diffs: list[dict] = []

    for call in tool_calls:
        name = call.get("name")
        args = call.get("args", {}) or {}

        if name == "update_theme_color":
            token = args.get("token")
            value = args.get("value")
            if token and value and re.match(r"^#[0-9A-Fa-f]{6}$", value):
                old = new_site["theme_config"]["colors"].get(token)
                new_site["theme_config"]["colors"][token] = value
                diffs.append({"path": f"theme.colors.{token}", "old": old, "new": value})

        elif name == "update_typography":
            for k in ("heading_font", "body_font", "scale"):
                if k in args and args[k]:
                    old = new_site["theme_config"]["typography"].get(k)
                    new_site["theme_config"]["typography"][k] = args[k]
                    diffs.append({"path": f"theme.typography.{k}", "old": old, "new": args[k]})

        elif name == "update_component_layout":
            for k in ("hero_variant", "button_style"):
                if k in args and args[k]:
                    old = new_site["theme_config"]["layout"].get(k)
                    new_site["theme_config"]["layout"][k] = args[k]
                    diffs.append({"path": f"theme.layout.{k}", "old": old, "new": args[k]})

        elif name == "update_content_block":
            section_id = args.get("section_id")
            field_path = args.get("field_path", "")
            value = args.get("value")
            if section_id and field_path:
                for page in new_site.get("pages", []):
                    for sec in page.get("sections", []):
                        if sec.get("id") == section_id:
                            _set_path(sec.get("content", {}), field_path, value)
                            diffs.append({
                                "path": f"content.{section_id}.{field_path}",
                                "old": None,
                                "new": value,
                            })

        elif name == "generate_blog_post":
            title = args.get("title", "Untitled")
            body = args.get("body", "")
            slug = args.get("slug", title.lower().replace(" ", "-"))
            new_site["pages"].append({
                "slug": slug,
                "title": title,
                "sections": [{"id": "article", "type": "article",
                              "content": {"title": title, "body": body}}],
            })
            diffs.append({"path": f"pages.{slug}", "old": None, "new": title})

        elif name == "generate_meta_tags":
            for k in ("meta_title", "meta_description", "keywords"):
                if k in args:
                    new_site["seo"][k] = args[k]
                    diffs.append({"path": f"seo.{k}", "old": None, "new": args[k]})

        elif name == "suggest_seo_improvements":
            suggestions = args.get("suggestions", [])
            new_site["seo"]["suggestions"] = suggestions
            diffs.append({"path": "seo.suggestions", "old": None, "new": suggestions})

    return new_site, diffs


def _set_path(obj: dict, path: str, value: Any):
    parts = path.split(".")
    cur = obj
    for i, p in enumerate(parts):
        last = i == len(parts) - 1
        if p.isdigit():
            idx = int(p)
            if isinstance(cur, list) and idx < len(cur):
                if last:
                    cur[idx] = value
                else:
                    cur = cur[idx]
            else:
                return
        else:
            if last:
                cur[p] = value
            else:
                if p not in cur or not isinstance(cur[p], (dict, list)):
                    cur[p] = {}
                cur = cur[p]
