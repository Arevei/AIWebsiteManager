"""AREVEI Phase 1 specialist agents.

The Manager keeps product control in FastAPI routes. Specialist agents produce
structured deliverables that flow through the existing approval pipeline.
"""
from __future__ import annotations

import os
import json
import re
from typing import Any, Literal

from pydantic import BaseModel, Field

try:
    from agents import Agent, Runner
except ImportError:  # Local fallback when openai-agents is not installed.
    Agent = None
    Runner = None


OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_AGENT_MODEL = os.environ.get("OPENAI_AGENT_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"))

AgentType = Literal["manager", "content", "website", "analytics"]
WorkflowType = Literal["blog", "seo", "update", "publish", "report"]

TASK_OWNERSHIP: dict[str, dict[str, str]] = {
    "content.blog": {"agent_type": "content", "workflow_type": "blog"},
    "content.seo": {"agent_type": "content", "workflow_type": "seo"},
    "website.update": {"agent_type": "website", "workflow_type": "update"},
    "website.publish": {"agent_type": "website", "workflow_type": "publish"},
    "analytics.report": {"agent_type": "analytics", "workflow_type": "report"},
}

BLOG_WORKFLOW_STAGES = [
    "receive_task",
    "research",
    "keyword_analysis",
    "competitor_analysis",
    "outline",
    "draft",
    "seo_optimization",
    "internal_links",
    "image_suggestions",
    "metadata",
    "review",
]


class FAQItem(BaseModel):
    question: str
    answer: str


class BlogAgentStage(BaseModel):
    agent: str
    role: str
    status: str = "done"
    input_summary: str = ""
    decision: str = ""
    output: dict[str, Any] = Field(default_factory=dict)


class AgentTask(BaseModel):
    type: str = "website.update"
    description: str = ""
    agent_type: AgentType = "website"
    workflow_type: WorkflowType = "update"
    input_context: dict[str, Any] = Field(default_factory=dict)
    deliverable: dict[str, Any] | None = None
    quality_checks: list[str] | dict[str, Any] = Field(default_factory=list)
    approval_required: bool = True


class BlogDeliverable(BaseModel):
    type: str = "content.blog"
    agent_type: AgentType = "content"
    workflow_type: WorkflowType = "blog"
    workflow_stages: list[str] = Field(default_factory=lambda: BLOG_WORKFLOW_STAGES.copy())
    title: str
    slug: str
    audience: str
    word_count: int
    keywords: list[str]
    search_intent: str = "educational"
    outline: list[str]
    markdown: str
    body: str
    meta_title: str
    meta_description: str
    faqs: list[FAQItem] = Field(default_factory=list)
    internal_links: list[str] = Field(default_factory=list)
    external_references: list[str] = Field(default_factory=list)
    image_suggestions: list[str] = Field(default_factory=list)
    image_prompt: str = ""
    review_notes: list[str] = Field(default_factory=list)
    agent_mind: list[BlogAgentStage] = Field(default_factory=list)
    quality_checks: dict[str, Any] = Field(default_factory=dict)
    cta: str = "Book a Demo"
    brand_voice: str = "Professional, simple, educational"
    deadline: str = "Today"


class WebsiteProposal(BaseModel):
    agent_type: AgentType = "website"
    workflow_type: WorkflowType = "update"
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    summary: str = ""


class AgentActionEnvelope(BaseModel):
    agent_type: AgentType
    workflow_type: WorkflowType
    source_task_type: str
    structured_output: dict[str, Any]
    deliverable: dict[str, Any] | None = None
    quality_checks: list[str] | dict[str, Any] = Field(default_factory=list)
    approval_required: bool = True


class StageOutput(BaseModel):
    decision: str
    output: dict[str, Any] = Field(default_factory=dict)


def slugify(value: str, fallback: str = "blog-post") -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    return slug[:80].strip("-") or fallback


def as_list(value: Any, fallback: list | None = None, limit: int | None = None) -> list:
    if isinstance(value, list):
        items = [item for item in value if item not in (None, "")]
    elif isinstance(value, str) and value.strip():
        items = [value.strip()]
    else:
        items = list(fallback or [])
    return items[:limit] if limit is not None else items


def plain_body_from_markdown(markdown: str) -> str:
    return re.sub(r"^#{1,6}\s+", "", markdown or "", flags=re.MULTILINE).strip()


def _keyword_items(request: dict[str, Any]) -> list[str]:
    return [str(item) for item in as_list(
        request.get("keywords"),
        ["AI Website", "Website Monitoring", "Website Growth"],
        8,
    )]


def fallback_agent_mind(request: dict[str, Any], context: dict[str, Any] | None = None) -> list[BlogAgentStage]:
    context = context or {}
    topic = str(request.get("topic") or "AI Website Monitoring").strip()
    audience = str(request.get("audience") or "Small Business Owners").strip()
    keywords = _keyword_items(request)
    pages = [str(item) for item in context.get("pages", []) if item]
    primary = keywords[0] if keywords else topic
    return [
        BlogAgentStage(
            agent="Manager Agent",
            role="Task routing and constraints",
            input_summary=f"Topic: {topic}; audience: {audience}",
            decision="Route this to Content Agent with approval required before publish.",
            output={"workflow": "content.blog", "approval_required": True},
        ),
        BlogAgentStage(
            agent="Research Agent",
            role="Market and reader context",
            input_summary=f"Research {topic} for {audience}",
            decision=f"Focus on practical monitoring pain points that {audience} recognize quickly.",
            output={
                "reader_questions": [
                    f"How does {topic.lower()} improve growth?",
                    "What should be monitored every week?",
                    "How can a small team act on website issues faster?",
                ],
                "source_gaps": ["Live web research is unavailable in local fallback mode."],
                "competitor_angles": ["SEO dashboards", "website builders", "manual agency retainers"],
            },
        ),
        BlogAgentStage(
            agent="SEO Agent",
            role="Search intent and keyword plan",
            input_summary=", ".join(keywords),
            decision=f"Use {primary} as the primary keyword with educational search intent.",
            output={
                "primary_keyword": primary,
                "secondary_keywords": keywords[1:],
                "search_intent": "educational",
                "schema": "Article + FAQPage",
            },
        ),
        BlogAgentStage(
            agent="Outline Agent",
            role="Narrative structure",
            input_summary="Research and SEO outputs",
            decision="Use a problem-to-workflow structure with concrete founder actions.",
            output={
                "sections": [
                    "Why website monitoring became a growth function",
                    "What AI should watch",
                    "How a Manager + specialist agent workflow works",
                    "What to do before publishing changes",
                    "Next step",
                ]
            },
        ),
        BlogAgentStage(
            agent="Writer Agent",
            role="Draft generation",
            input_summary=f"{request.get('word_count', 2000)} words requested",
            decision="Write in a direct, educational voice with short sections and practical examples.",
            output={"format": "markdown", "cta": request.get("cta") or "Book a Demo"},
        ),
        BlogAgentStage(
            agent="Editor Agent",
            role="Quality, voice, and approval checks",
            input_summary="Draft, SEO fields, and brand voice",
            decision="Keep claims conservative, mark source gaps, and require manager approval.",
            output={"checks": ["readability", "brand voice", "SEO metadata", "approval gate"]},
        ),
        BlogAgentStage(
            agent="Image Agent",
            role="Featured image direction",
            input_summary=topic,
            decision="Generate a product-like editorial image, not generic stock art.",
            output={
                "prompt": f"Modern SaaS dashboard editorial image for {topic}, showing website health signals, content growth, SEO monitoring, clean premium interface, no text",
                "storage": "Cloudinary on publish when configured",
            },
        ),
    ]


def fallback_blog_markdown(request: dict[str, Any], mind: list[BlogAgentStage]) -> str:
    topic = str(request.get("topic") or "AI Website Monitoring").strip()
    audience = str(request.get("audience") or "Small Business Owners").strip()
    cta = str(request.get("cta") or "Book a Demo").strip()
    keywords = _keyword_items(request)
    primary = keywords[0] if keywords else topic
    return (
        f"# {topic}\n\n"
        f"For {audience}, a website is no longer a static brochure. It is a living growth system: pages change, search intent changes, competitors change, and small issues quietly become lost leads. {primary} helps teams see those changes early and act before momentum leaks away.\n\n"
        "## Why Website Monitoring Is Now Growth Work\n\n"
        "Traditional monitoring only asks whether a site is online. That is useful, but it is not enough. A growth-focused website needs to know whether its message is still clear, whether important pages are discoverable, whether metadata is complete, whether calls to action are working, and whether new content is supporting the business strategy.\n\n"
        "AI changes the workflow because it can inspect patterns continuously. Instead of waiting for a quarterly audit, a founder can receive prioritized recommendations: update this headline, add this FAQ, improve this article, refresh this keyword cluster, or publish a new page that answers a buyer question.\n\n"
        "## What An AI Website System Should Watch\n\n"
        "A useful system should monitor content quality, SEO basics, page structure, internal links, conversion paths, and publishing opportunities. It should also understand the business context: who the company sells to, what the offer is, what tone the brand uses, and which goals matter this month.\n\n"
        "That context is the difference between a chatbot and an operating system. A chatbot can answer a prompt. An operating system can plan work, assign specialist agents, return structured deliverables, and wait for approval before anything reaches production.\n\n"
        "## How AREVEI Handles The Workflow\n\n"
        "AREVEI uses a Manager Agent to plan and delegate. For a blog, the Manager sends a structured task to the Content Agent. The Content Agent then coordinates research, SEO, outlining, writing, editing, image direction, metadata, and review. The result is not just text. It is a complete blog package: title, slug, body, keywords, meta title, meta description, FAQs, image prompt, review notes, and publish-ready content.\n\n"
        "The Website Agent handles the site-side work. It converts approved content into safe site updates, previews the result, snapshots the current version, and only publishes when approval is explicit.\n\n"
        "## What This Means For Small Teams\n\n"
        "Small teams do not need another dashboard to babysit. They need a system that turns signals into finished work. The practical benefit is speed: ideas move from topic to draft to preview to approval without passing through five disconnected tools.\n\n"
        "The bigger benefit is consistency. Every blog follows the same quality loop. Every publishable change has a preview. Every generated asset has metadata. Every action can be reviewed before it touches the live website.\n\n"
        "## Before You Publish\n\n"
        "A strong workflow still needs human judgment. Review claims, confirm the offer, check the CTA, and make sure the article sounds like the brand. AI can accelerate the work, but approval protects the business.\n\n"
        f"## Next Step\n\n{cta}.\n"
    )


def classify_agent_task(task_type: str | None, tool: str | None = None) -> dict[str, str]:
    task_type = (task_type or "").strip().lower()
    tool = (tool or "").strip()
    if task_type in TASK_OWNERSHIP:
        return TASK_OWNERSHIP[task_type]
    if tool == "generate_blog_post" or task_type == "content":
        return TASK_OWNERSHIP["content.blog"]
    if tool in {"generate_meta_tags", "suggest_seo_improvements"} or task_type == "seo":
        return TASK_OWNERSHIP["content.seo"]
    if task_type == "analytics":
        return TASK_OWNERSHIP["analytics.report"]
    return TASK_OWNERSHIP["website.update"]


def normalize_agent_task(raw: dict[str, Any]) -> dict[str, Any]:
    ownership = classify_agent_task(raw.get("type") or raw.get("task_type"), raw.get("tool"))
    agent_type = raw.get("agent_type") or ownership["agent_type"]
    workflow_type = raw.get("workflow_type") or ownership["workflow_type"]
    task_type = raw.get("task_type") or raw.get("type") or f"{agent_type}.{workflow_type}"
    if task_type in {"content", "seo", "analytics", "design"}:
        task_type = f"{agent_type}.{workflow_type}"
    return AgentTask(
        type=task_type,
        description=raw.get("description", ""),
        agent_type=agent_type,
        workflow_type=workflow_type,
        input_context=raw.get("input_context") or {},
        deliverable=raw.get("deliverable"),
        quality_checks=raw.get("quality_checks") or [],
        approval_required=raw.get("approval_required", True),
    ).model_dump() | {
        "priority": raw.get("priority", "medium"),
        "effort": raw.get("effort", "1h"),
        "tool": raw.get("tool", "manual"),
    }


def normalize_blog_deliverable(data: Any, request: dict[str, Any] | None = None) -> BlogDeliverable:
    request = request or {}
    data = data if isinstance(data, dict) else {}
    topic = str(request.get("topic") or data.get("title") or "Benefits of AI Website Monitoring").strip()
    title = str(data.get("title") or topic).strip()
    audience = str(request.get("audience") or request.get("target_audience") or data.get("audience") or "Small Business Owners").strip()
    cta = str(request.get("cta") or data.get("cta") or "Book a Demo").strip()
    keywords = as_list(
        data.get("keywords") or request.get("keywords"),
        ["AI Website", "Website Monitoring", "Website Growth"],
        8,
    )
    markdown = str(data.get("markdown") or data.get("body") or "").strip()
    if not markdown:
        fallback_mind = fallback_agent_mind(request)
        markdown = fallback_blog_markdown(request, fallback_mind)
    body = plain_body_from_markdown(markdown)
    slug = slugify(data.get("slug") or title)
    meta_title = str(data.get("meta_title") or title[:60]).strip()
    meta_description = str(
        data.get("meta_description")
        or f"Learn how {topic.lower()} helps {audience.lower()} improve visibility, monitoring, and website growth."
    ).strip()[:160]
    deliverable = BlogDeliverable(
        title=title,
        slug=slug,
        audience=audience,
        word_count=int(request.get("word_count") or data.get("word_count") or max(600, len(body.split()))),
        keywords=[str(item) for item in keywords],
        search_intent=str(data.get("search_intent") or "educational"),
        outline=[str(item) for item in as_list(data.get("outline"), ["Why website monitoring is growth work", "What AI should watch", "How AREVEI handles the workflow", "Before publishing", "Next step"], 12)],
        markdown=markdown,
        body=body,
        meta_title=meta_title,
        meta_description=meta_description,
        faqs=[FAQItem(**item) if isinstance(item, dict) else FAQItem(question=str(item), answer="") for item in as_list(data.get("faqs"), [], 6)],
        internal_links=[str(item) for item in as_list(data.get("internal_links"), ["/", "/admin/seo"], 8)],
        external_references=[str(item) for item in as_list(data.get("external_references") or data.get("sources"), [], 8)],
        image_suggestions=[str(item) for item in as_list(data.get("image_suggestions"), [f"Featured image showing {topic.lower()} dashboard insights"], 5)],
        image_prompt=str(data.get("image_prompt") or f"Modern SaaS dashboard editorial image for {topic}, website monitoring, SEO growth signals, clean premium interface, no text"),
        review_notes=[str(item) for item in as_list(data.get("review_notes"), ["Verify claims and sources before approval.", "Confirm brand voice and CTA fit the tenant offer."], 8)],
        agent_mind=[
            item if isinstance(item, BlogAgentStage) else BlogAgentStage(**item)
            for item in as_list(data.get("agent_mind"), [stage.model_dump() for stage in fallback_agent_mind(request)], 12)
            if isinstance(item, (dict, BlogAgentStage))
        ],
        quality_checks={
            "has_title": bool(title),
            "has_slug": bool(slug),
            "has_meta_description": bool(meta_description),
            "has_keywords": bool(keywords),
            "has_body": bool(body),
            "approval_required": True,
        },
        cta=cta,
        brand_voice=str(request.get("brand_voice") or data.get("brand_voice") or "Professional, simple, educational"),
        deadline=str(request.get("deadline") or data.get("deadline") or "Today"),
    )
    return deliverable


async def _run_stage_agent(name: str, role: str, instructions: str, payload: dict[str, Any]) -> BlogAgentStage:
    agent = Agent(
        name=name,
        instructions=instructions + "\nReturn a concise structured stage result. Do not expose hidden chain-of-thought.",
        model=OPENAI_AGENT_MODEL,
        output_type=StageOutput,
    )
    result = await Runner.run(agent, json.dumps(payload), max_turns=3)
    output = result.final_output
    if hasattr(output, "model_dump"):
        output = output.model_dump()
    output = output if isinstance(output, dict) else {}
    return BlogAgentStage(
        agent=name,
        role=role,
        input_summary=str(payload.get("summary") or payload.get("task", ""))[:240],
        decision=str(output.get("decision") or "Completed this workflow stage."),
        output=output.get("output") if isinstance(output.get("output"), dict) else {},
    )


async def _run_sdk_blog_workflow(request: dict[str, Any], context: dict[str, Any] | None = None) -> dict[str, Any]:
    context = context or {}
    topic = str(request.get("topic") or "AI Website Monitoring")
    stages: list[BlogAgentStage] = []
    base_payload = {"task": request, "context": context, "summary": f"Blog topic: {topic}"}
    stage_specs = [
        (
            "Manager Agent",
            "Task routing and constraints",
            "You are AREVEI's Manager Agent. Convert the blog request into a clear assignment for specialist agents. Identify constraints, approval requirements, and success criteria.",
        ),
        (
            "Research Agent",
            "Reader context and source gaps",
            "You are a blog research agent. Identify reader questions, relevant angles, competitor patterns, and any claims that require verification. Use only provided context; mark unknowns clearly.",
        ),
        (
            "SEO Agent",
            "Search intent and keyword plan",
            "You are an SEO agent. Select primary and secondary keywords, search intent, FAQ opportunities, internal links, schema, and metadata recommendations.",
        ),
        (
            "Outline Agent",
            "Blog structure",
            "You are an outline agent. Produce a strong blog structure with section headings, CTA placement, and FAQ direction.",
        ),
        (
            "Writer Agent",
            "Full draft",
            "You are a writer agent. Draft the complete blog in markdown using the prior stage outputs. Keep it practical, specific, and aligned with the brand voice.",
        ),
        (
            "Editor Agent",
            "Quality and approval review",
            "You are an editor agent. Review for clarity, repetition, brand voice, claim safety, SEO completeness, and approval readiness.",
        ),
        (
            "Image Agent",
            "Featured image direction",
            "You are an image direction agent. Produce a concrete image prompt for a premium website/blog thumbnail. Avoid text inside the image.",
        ),
    ]
    running_payload = base_payload
    for name, role, instructions in stage_specs:
        stage = await _run_stage_agent(name, role, instructions, running_payload)
        stages.append(stage)
        running_payload = {**base_payload, "previous_stages": [item.model_dump() for item in stages]}

    final_agent = Agent(
        name="AREVEI Blog Compiler",
        instructions=(
            "Compile the specialist outputs into one complete BlogDeliverable. "
            "The markdown must be a full article, not an outline. Include SEO fields, FAQs, "
            "internal links, image suggestions, image_prompt, review notes, and agent_mind."
        ),
        model=OPENAI_AGENT_MODEL,
        output_type=BlogDeliverable,
    )
    result = await Runner.run(
        final_agent,
        json.dumps({**base_payload, "agent_mind": [stage.model_dump() for stage in stages]}),
        max_turns=4,
    )
    output = result.final_output
    data = output.model_dump() if hasattr(output, "model_dump") else output
    data = data if isinstance(data, dict) else {}
    data["agent_mind"] = [stage.model_dump() for stage in stages]
    return data


async def run_content_blog_agent(request: dict[str, Any], context: dict[str, Any] | None = None) -> BlogDeliverable:
    """Run the SDK specialist workflow when configured, otherwise return a local agent-style deliverable."""
    if Agent is None or Runner is None or not OPENAI_API_KEY:
        mind = fallback_agent_mind(request, context)
        return normalize_blog_deliverable({
            "markdown": fallback_blog_markdown(request, mind),
            "agent_mind": [stage.model_dump() for stage in mind],
            "image_prompt": mind[-1].output.get("prompt", ""),
        }, request)

    data = await _run_sdk_blog_workflow(request, context)
    return normalize_blog_deliverable(data, request)


def blog_deliverable_tool_calls(deliverable: BlogDeliverable | dict[str, Any]) -> list[dict[str, Any]]:
    data = deliverable.model_dump() if isinstance(deliverable, BlogDeliverable) else deliverable
    return [
        {
            "name": "generate_blog_post",
            "args": {"title": data["title"], "slug": data["slug"], "body": data["body"]},
        },
        {
            "name": "generate_meta_tags",
            "args": {
                "meta_title": data["meta_title"],
                "meta_description": data["meta_description"],
                "keywords": data["keywords"],
            },
        },
    ]
