from specialist_agents import (
    blog_deliverable_tool_calls,
    classify_agent_task,
    normalize_agent_task,
    normalize_blog_deliverable,
)


def test_classify_agent_task_domains():
    assert classify_agent_task("content.blog") == {"agent_type": "content", "workflow_type": "blog"}
    assert classify_agent_task("content.seo") == {"agent_type": "content", "workflow_type": "seo"}
    assert classify_agent_task("website.update") == {"agent_type": "website", "workflow_type": "update"}
    assert classify_agent_task("website.publish") == {"agent_type": "website", "workflow_type": "publish"}
    assert classify_agent_task("analytics.report") == {"agent_type": "analytics", "workflow_type": "report"}
    assert classify_agent_task("content", "generate_blog_post") == {"agent_type": "content", "workflow_type": "blog"}


def test_normalize_agent_task_adds_phase_1_metadata():
    task = normalize_agent_task({
        "description": "Write a blog about website monitoring",
        "type": "content",
        "tool": "generate_blog_post",
        "priority": "high",
    })

    assert task["type"] == "content.blog"
    assert task["agent_type"] == "content"
    assert task["workflow_type"] == "blog"
    assert task["input_context"] == {}
    assert task["approval_required"] is True
    assert task["priority"] == "high"


def test_normalize_blog_deliverable_handles_partial_output():
    deliverable = normalize_blog_deliverable(
        {"title": "Benefits of AI Website Monitoring", "keywords": ["AI Website"]},
        {"audience": "Small Business Owners", "cta": "Book a Demo"},
    )

    assert deliverable.type == "content.blog"
    assert deliverable.agent_type == "content"
    assert deliverable.workflow_type == "blog"
    assert deliverable.slug == "benefits-of-ai-website-monitoring"
    assert deliverable.meta_description
    assert deliverable.body
    assert deliverable.quality_checks["approval_required"] is True


def test_normalize_blog_deliverable_handles_malformed_output():
    deliverable = normalize_blog_deliverable("not-json", {"topic": "AI Website Monitoring"})

    assert deliverable.title == "AI Website Monitoring"
    assert deliverable.keywords
    assert deliverable.outline
    assert deliverable.review_notes


def test_blog_deliverable_tool_calls_use_existing_site_pipeline():
    deliverable = normalize_blog_deliverable(
        {"title": "AI Website Monitoring", "markdown": "# AI Website Monitoring\n\nBody"},
        {"keywords": ["AI Website", "Website Monitoring"]},
    )

    calls = blog_deliverable_tool_calls(deliverable)

    assert [call["name"] for call in calls] == ["generate_blog_post", "generate_meta_tags"]
    assert calls[0]["args"]["slug"] == "ai-website-monitoring"
    assert calls[1]["args"]["keywords"] == ["AI Website", "Website Monitoring"]
