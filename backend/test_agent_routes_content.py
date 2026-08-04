import asyncio

from fastapi import FastAPI
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import agent_routes
from agent_routes import build_agent_router
from site_defaults import default_pages, default_seo, default_theme


def run(coro):
    return asyncio.run(coro)


def make_client():
    db = AsyncMongoMockClient().arevei_agent_test
    app = FastAPI()
    app.include_router(build_agent_router(db))
    app.dependency_overrides[agent_routes.current_user] = lambda: {
        "user_id": "user-1",
        "role": "founder_admin",
        "tenant_id": "tenant-1",
    }
    run(db.sites.insert_one({
        "id": "site-1",
        "tenant_id": "tenant-1",
        "slug": "demo",
        "theme_config": default_theme(),
        "pages": default_pages("DemoCo"),
        "seo": default_seo("DemoCo"),
    }))
    return TestClient(app), db


def test_content_blog_proposal_creates_structured_action_without_publishing():
    client, db = make_client()

    res = client.post("/api/agent/content/blog/propose", json={
        "topic": "Benefits of AI Website Monitoring",
        "audience": "Small Business Owners",
        "keywords": ["AI Website", "Website Monitoring", "Website Growth"],
        "word_count": 2000,
        "cta": "Book a Demo",
    })

    assert res.status_code == 200
    action = res.json()
    assert action["status"] == "proposed"
    assert action["agent_type"] == "content"
    assert action["workflow_type"] == "blog"
    assert action["source_task_type"] == "content.blog"
    assert action["deliverable"]["title"] == "Benefits of AI Website Monitoring"
    assert action["deliverable"]["meta_description"]
    assert action["diff"]["changes"]

    site = run(db.sites.find_one({"id": "site-1"}, {"_id": 0}))
    assert all(page["slug"] != action["deliverable"]["slug"] for page in site["pages"])


def test_approving_content_blog_action_publishes_via_existing_pipeline():
    client, db = make_client()
    proposal = client.post("/api/agent/content/blog/propose", json={
        "topic": "Benefits of AI Website Monitoring",
    }).json()

    res = client.post(f"/api/agent/actions/{proposal['id']}/apply", json={"accept": True})

    assert res.status_code == 200
    assert res.json()["status"] == "published"
    site = run(db.sites.find_one({"id": "site-1"}, {"_id": 0}))
    assert any(page["slug"] == proposal["deliverable"]["slug"] for page in site["pages"])
    version_count = run(db.versions.count_documents({"site_id": "site-1"}))
    assert version_count == 1


def test_blog_workspace_generate_edit_preview_and_publish():
    client, db = make_client()

    generated = client.post("/api/agent/blogs/generate", json={
        "topic": "AI Website Monitoring",
        "keywords": ["AI Website", "Website Monitoring"],
    })
    assert generated.status_code == 200
    blog = generated.json()
    assert blog["status"] == "draft"
    assert blog["site_slug"] == "demo"

    edited = client.patch(f"/api/agent/blogs/{blog['id']}", json={
        "title": "AI Website Monitoring for Founders",
        "slug": "ai-website-monitoring-founders",
        "meta_title": "AI Website Monitoring for Founders",
        "meta_description": "A practical guide to using AI website monitoring for stronger content, SEO, and growth.",
        "keywords": ["AI Website", "Website Monitoring", "Website Growth"],
        "thumbnail_url": "https://example.com/thumb.jpg",
    })
    assert edited.status_code == 200
    assert edited.json()["slug"] == "ai-website-monitoring-founders"
    assert len(edited.json()["versions"]) == 2

    preview = client.get(f"/api/agent/blogs/{blog['id']}/preview")
    assert preview.status_code == 200
    assert preview.json()["preview_page"]["sections"][0]["content"]["image"] == "https://example.com/thumb.jpg"

    published = client.post(f"/api/agent/blogs/{blog['id']}/publish", json={})
    assert published.status_code == 200
    assert published.json()["status"] == "published"
    site = run(db.sites.find_one({"id": "site-1"}, {"_id": 0}))
    assert any(page["slug"] == "ai-website-monitoring-founders" for page in site["pages"])
