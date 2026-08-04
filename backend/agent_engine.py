"""AREVEI AI Website Manager Agent — stateful planning + execution."""
from __future__ import annotations

import json
import os
import re
import requests
from datetime import datetime, timezone
from typing import Any

from specialist_agents import normalize_agent_task

try:
    # pyrefly: ignore [missing-import]
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError:
    LlmChat = None
    UserMessage = None

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _response_output_text(data: dict[str, Any]) -> str:
    if data.get("output_text"):
        return data["output_text"]
    chunks: list[str] = []
    for item in data.get("output", []):
        for part in item.get("content", []):
            if part.get("type") in {"output_text", "text"} and part.get("text"):
                chunks.append(part["text"])
    return "\n".join(chunks)


def _extract_json_object(text: str) -> dict:
    cleaned = _strip_fences(text if isinstance(text, str) else str(text))
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            return {}
        try:
            return json.loads(match.group(0))
        except Exception:
            return {}


def _normalize_roadmap(data: Any, business_context: dict | None = None) -> dict:
    if isinstance(data, list):
        data = {"quarters": data}
    if not isinstance(data, dict):
        return {}

    quarters = (
        data.get("quarters")
        or data.get("roadmap")
        or data.get("year_roadmap")
        or data.get("growth_roadmap")
        or []
    )
    if isinstance(quarters, dict):
        quarters = quarters.get("quarters") or quarters.get("items") or list(quarters.values())
    if not isinstance(quarters, list):
        quarters = []

    normalized = []
    for index, item in enumerate(quarters[:4], start=1):
        if not isinstance(item, dict):
            continue
        milestones = item.get("milestones") or item.get("goals") or item.get("actions") or item.get("tasks") or []
        if isinstance(milestones, str):
            milestones = [milestones]
        milestones = [str(m).strip() for m in milestones if str(m).strip()][:5]
        if len(milestones) < 3:
            continue
        normalized.append({
            "quarter": str(item.get("quarter") or item.get("label") or f"Q{index}").strip(),
            "theme": str(item.get("theme") or item.get("focus") or item.get("title") or f"Growth phase {index}").strip(),
            "milestones": milestones,
        })

    if len(normalized) >= 4:
        return {"quarters": normalized[:4]}
    return _fallback_roadmap(business_context or {})


def _fallback_roadmap(business_context: dict) -> dict:
    goals = str(business_context.get("goals") or "increase qualified leads, improve SEO visibility, and publish useful content")
    audience = str(business_context.get("target_audience") or "target buyers")
    return {
        "quarters": [
            {
                "quarter": "Q1",
                "theme": "Foundation and conversion clarity",
                "milestones": [
                    "Audit current website structure, messaging, and conversion paths.",
                    f"Rewrite core pages for {audience} with clear calls to action.",
                    "Set baseline SEO metadata, schema, speed, and analytics tracking.",
                ],
            },
            {
                "quarter": "Q2",
                "theme": "Search visibility and content engine",
                "milestones": [
                    "Build a keyword-backed publishing plan around priority services.",
                    "Publish helpful articles and answer-style pages for AI search discovery.",
                    "Add internal links and FAQs that support the main conversion pages.",
                ],
            },
            {
                "quarter": "Q3",
                "theme": "Lead generation and trust expansion",
                "milestones": [
                    "Improve forms, CTAs, proof sections, and landing page flows.",
                    "Create case-study or portfolio content that supports buyer confidence.",
                    "Use performance data to refine high-intent pages and offers.",
                ],
            },
            {
                "quarter": "Q4",
                "theme": "Optimization and compounding growth",
                "milestones": [
                    f"Prioritize experiments aligned to: {goals}.",
                    "Refresh top pages using analytics, search data, and conversion signals.",
                    "Create the next annual roadmap from results, gaps, and new opportunities.",
                ],
            },
        ],
        "fallback": True,
    }


async def _ask_openai_json(session_id: str, system: str, user: str) -> dict:
    if not OPENAI_API_KEY:
        return {}
    try:
        res = requests.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "input": [
                    {"role": "developer", "content": system + "\n\nReturn only valid JSON. Do not use markdown fences."},
                    {"role": "user", "content": user},
                ],
            },
            timeout=60,
        )
        if res.status_code >= 400:
            return {}
        return _extract_json_object(_response_output_text(res.json()))
    except Exception:
        return {}


async def _ask_json(session_id: str, system: str, user: str) -> dict:
    openai_data = await _ask_openai_json(session_id, system, user)
    if openai_data:
        return openai_data
    if not EMERGENT_LLM_KEY:
        return {}
    if LlmChat is None or UserMessage is None:
        return {}
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY, session_id=session_id,
        system_message=system + "\n\nReturn ONLY a JSON object — no markdown fences.",
    ).with_model("anthropic", "claude-sonnet-4-6")
    raw = await chat.send_message(UserMessage(text=user))
    cleaned = _strip_fences(raw if isinstance(raw, str) else str(raw))
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return {}
        return {}


# ---------- Roadmap ----------
async def generate_growth_roadmap(tenant_id: str, business_context: dict) -> dict:
    sys_msg = (
        "You are AREVEI's AI Website Manager. Produce a 1-year growth roadmap for the tenant's website. "
        "Return JSON: {\"quarters\": [{\"quarter\": \"Q1\", \"theme\": str, \"milestones\": [str, ...]}, ...]} "
        "with exactly 4 quarters and 3-5 concrete milestones each."
    )
    return await _ask_json(f"roadmap-{tenant_id}", sys_msg,
                           f"Business context:\n{json.dumps(business_context, indent=2)}")


async def parse_founder_strategy(tenant_id: str, document_text: str) -> dict:
    sys_msg = (
        "Parse the founder's strategy doc into a roadmap. "
        "Return JSON: {\"quarters\": [{\"quarter\": str, \"theme\": str, \"milestones\": [str,...]}, ...]}"
    )
    return await _ask_json(f"parse-{tenant_id}", sys_msg, document_text[:6000])


# ---------- Monthly goals ----------
async def generate_monthly_goals(tenant_id: str, roadmap: dict, current_month: str,
                                  analytics_snapshot: dict) -> list[dict]:
    sys_msg = (
        "Break the active roadmap's current quarter into 3-5 monthly goals. "
        "Return JSON: {\"goals\": [{\"goal_text\": str, \"why\": str, \"category\": "
        "\"content|design|seo|analytics\"}, ...]}"
    )
    payload = {"roadmap": roadmap, "month": current_month, "analytics": analytics_snapshot}
    data = await _ask_json(f"goals-{tenant_id}", sys_msg, json.dumps(payload))
    return data.get("goals", [])


async def decompose_goal_into_tasks(tenant_id: str, goal: dict) -> list[dict]:
    sys_msg = (
        "Decompose this monthly goal into 3-6 concrete, schedulable tasks. "
        "Return JSON: {\"tasks\": [{\"description\": str, \"type\": "
        "\"content.blog|content.seo|website.update|website.publish|analytics.report\", "
        "\"priority\": \"low|medium|high\", "
        "\"effort\": \"15m|1h|half-day|day\", \"tool\": "
        "\"update_theme_color|update_content_block|generate_blog_post|generate_meta_tags|suggest_seo_improvements|manual\", "
        "\"agent_type\": \"content|website|analytics\", \"workflow_type\": str, "
        "\"input_context\": object, \"quality_checks\": [str], \"approval_required\": true}, ...]}"
    )
    data = await _ask_json(f"tasks-{tenant_id}", sys_msg, json.dumps(goal))
    return [normalize_agent_task(task) for task in data.get("tasks", []) if isinstance(task, dict)]


# ---------- Daily execution ----------
async def execute_task_to_prompt(task: dict) -> str:
    """Turn a task description into a chat prompt the existing AI engine can act on."""
    return (
        f"As AREVEI's {task.get('agent_type', 'website')} agent, execute this task: {task.get('description','')}. "
        f"Use the appropriate tool ({task.get('tool','manual')}) to propose changes."
    )


# ---------- Monthly report ----------
async def generate_monthly_report(tenant_id: str, goals: list[dict], tasks: list[dict],
                                   analytics: dict, integration_data: dict) -> dict:
    sys_msg = (
        "Write a clear, founder-friendly monthly report. "
        "Return JSON: {\"summary\": str (2-3 sentences), "
        "\"wins\": [str, ...], "
        "\"metrics\": {\"traffic_delta_pct\": number, \"seo_score\": number, "
        "\"goals_completed\": number, \"tasks_done\": number}, "
        "\"recommendations\": [str, ...]}"
    )
    payload = {
        "goals": goals, "tasks_count": len(tasks),
        "tasks_done": sum(1 for t in tasks if t.get("status") == "done"),
        "analytics": analytics, "integrations": integration_data,
    }
    return await _ask_json(f"report-{tenant_id}", sys_msg, json.dumps(payload))


# ---------- Mock analytics snapshot (when integrations are mocked) ----------
def mock_analytics_snapshot() -> dict:
    return {
        "sessions": 12_840, "users": 9_120, "bounce_rate": 0.41,
        "top_pages": [{"path": "/", "views": 5_300},
                       {"path": "/pricing", "views": 1_840},
                       {"path": "/blog", "views": 980}],
        "top_keywords": [{"q": "ai website manager", "rank": 12, "impressions": 4_200},
                          {"q": "founder cms", "rank": 8, "impressions": 2_100}],
        "ai_citations": {"chatgpt": 6, "perplexity": 11, "gemini": 3},
    }


def now_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")
