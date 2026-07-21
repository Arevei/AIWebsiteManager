"""AI engine — Claude Sonnet 4.6 via emergentintegrations, with structured tool calling
implemented as JSON-mode prompting (model never outputs raw HTML/CSS)."""
from __future__ import annotations

import json
import os
import re
from typing import Any

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError:
    LlmChat = None
    UserMessage = None

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

def _local_tool_fallback(user_message: str) -> dict[str, Any]:
    """Deterministic dev fallback when the private Emergent LLM package is absent."""
    msg = user_message.lower()
    tool_calls: list[dict[str, Any]] = []

    if any(word in msg for word in ("teal", "green", "brand color", "primary color", "hero color")):
        tool_calls.append({
            "name": "update_theme_color",
            "args": {"token": "primary", "value": "#009685"},
        })
        tool_calls.append({
            "name": "update_theme_color",
            "args": {"token": "accent", "value": "#061414"},
        })

    if "headline" in msg or "hero" in msg or "bold" in msg or "direct" in msg:
        tool_calls.append({
            "name": "update_content_block",
            "args": {
                "section_id": "hero",
                "field_path": "headline",
                "value": "Set it. Forget it. Watch it grow.",
            },
        })
        tool_calls.append({
            "name": "update_content_block",
            "args": {
                "section_id": "hero",
                "field_path": "subheadline",
                "value": "Turn your website into a money-making machine with AI-native website management under one retainer.",
            },
        })
    
    blog_title = _extract_quoted_title(user_message) or "Why founders ship faster with AREVEI"
    if "blog" in msg or "article" in msg or "post" in msg:
        slug = re.sub(r"[^a-z0-9]+", "-", blog_title.lower()).strip("-") or "arevei-growth"
        tool_calls.append({
            "name": "generate_blog_post",
            "args": {
                "title": blog_title,
                "slug": slug,
                "body": (
                    "Founders do not need another dashboard to babysit. They need a website system that keeps "
                    "moving: audit the gaps, plan the next growth step, ship safe improvements, and report what "
                    "changed. AREVEI combines AI-native workflows with senior website judgment so content, SEO, "
                    "design, and conversion work happen inside one operating system. The result is a calmer way to "
                    "grow: fewer handoffs, faster updates, better visibility, and a website that compounds instead "
                    "of sitting still."
                ),
            },
        })

    if "meta" in msg or "seo" in msg or "description" in msg or "keywords" in msg:
        tool_calls.append({
            "name": "generate_meta_tags",
            "args": {
                "meta_title": "AREVEI | AI Native Website Manager",
                "meta_description": "Turn your website into a money-making machine with AI-native website management under one retainer.",
                "keywords": ["AI website manager", "website growth", "founder website", "SEO automation"],
            },
        })

    if "seo" in msg or "aeo" in msg or "geo" in msg or "improve" in msg:
        tool_calls.append({
            "name": "suggest_seo_improvements",
            "args": {
                "suggestions": [
                    "Add founder-focused FAQ answers for AI search and conversion coverage.",
                    "Create a topic cluster around AI website management and managed growth retainers.",
                    "Strengthen hero proof with measurable growth outcomes and service clarity.",
                ],
            },
        })

    if "font" in msg or "typography" in msg:
        tool_calls.append({
            "name": "update_typography",
            "args": {"heading_font": "Poppins", "body_font": "Poppins", "scale": "lg"},
        })

    if "rounded" in msg or "pill" in msg or "layout" in msg:
        tool_calls.append({
            "name": "update_component_layout",
            "args": {"hero_variant": "split", "button_style": "pill"},
        })

    if not tool_calls:
        return {
            "assistant_message": "I can help with brand colors, hero copy, blog posts, SEO metadata, typography, and layout. Try asking for one of those changes.",
            "tool_calls": [],
        }

    return {
        "assistant_message": "I prepared a safe structured proposal you can review and publish.",
        "tool_calls": tool_calls,
    }


def _extract_quoted_title(text: str) -> str | None:
    quoted = re.search(r"['\"]([^'\"]{4,120})['\"]", text)
    if quoted:
        return quoted.group(1).strip()
    titled = re.search(r"titled?\s+(.+)$", text, re.IGNORECASE)
    if titled:
        return titled.group(1).strip(" .'\"")[:120]
    return None


async def run_ai(session_id: str, system_context: str, user_message: str) -> dict[str, Any]:
    """Send the user message and parse Claude's structured JSON response."""
    if not EMERGENT_LLM_KEY:
        return _local_tool_fallback(user_message)
    if LlmChat is None or UserMessage is None:
        return _local_tool_fallback(user_message)

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
