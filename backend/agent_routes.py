"""Agent routes — roadmap, goals, tasks, execution, integrations, reports, notifications."""
from __future__ import annotations

import base64
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
import time
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
import requests

from agent_engine import (
    decompose_goal_into_tasks, execute_task_to_prompt, generate_growth_roadmap,
    generate_monthly_goals, generate_monthly_report, mock_analytics_snapshot,
    now_month, parse_founder_strategy,
)
from ai_engine import apply_tool_calls, run_ai
from auth import current_user
from models import new_id, now_iso
from specialist_agents import blog_deliverable_tool_calls, run_content_blog_agent, slugify

logger = logging.getLogger("arevei.agent")


def build_agent_router(db: AsyncIOMotorDatabase) -> APIRouter:
    r = APIRouter(prefix="/api/agent")

    async def _site(user):
        if not user.get("tenant_id"):
            raise HTTPException(400, "No tenant")
        site = await db.sites.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
        if not site:
            raise HTTPException(404, "Site not found")
        return site

    async def _notify(tenant_id: str, msg: str, kind: str = "info"):
        await db.agent_notifications.insert_one({
            "id": new_id(), "tenant_id": tenant_id, "type": kind,
            "message": msg, "channel_sent": "dashboard",
            "sent_at": now_iso(), "read": False,
        })

    def _blog_doc_from_deliverable(tenant_id: str, deliverable: dict, status: str = "draft") -> dict:
        return {
            "id": new_id(),
            "tenant_id": tenant_id,
            "title": deliverable.get("title", "Untitled blog"),
            "slug": deliverable.get("slug", "blog-post"),
            "status": status,
            "audience": deliverable.get("audience", ""),
            "word_count": deliverable.get("word_count", 0),
            "keywords": deliverable.get("keywords", []),
            "search_intent": deliverable.get("search_intent", "educational"),
            "outline": deliverable.get("outline", []),
            "markdown": deliverable.get("markdown", ""),
            "body": deliverable.get("body", ""),
            "meta_title": deliverable.get("meta_title", ""),
            "meta_description": deliverable.get("meta_description", ""),
            "faqs": deliverable.get("faqs", []),
            "internal_links": deliverable.get("internal_links", []),
            "external_references": deliverable.get("external_references", []),
            "image_suggestions": deliverable.get("image_suggestions", []),
            "image_prompt": deliverable.get("image_prompt", ""),
            "thumbnail_url": deliverable.get("thumbnail_url", ""),
            "featured_image_url": deliverable.get("featured_image_url", ""),
            "cloudinary": deliverable.get("cloudinary", {}),
            "tags": deliverable.get("tags", []),
            "category": deliverable.get("category", "Blog"),
            "cta": deliverable.get("cta", "Book a Demo"),
            "brand_voice": deliverable.get("brand_voice", ""),
            "review_notes": deliverable.get("review_notes", []),
            "agent_mind": deliverable.get("agent_mind", []),
            "quality_checks": deliverable.get("quality_checks", {}),
            "agent_timeline": [
                {"agent": "Manager", "event": "Task created", "status": "done", "time": now_iso()},
                {"agent": "Research Agent", "event": "Reader and competitor context prepared", "status": "done", "time": now_iso()},
                {"agent": "SEO Agent", "event": "Keywords and metadata selected", "status": "done", "time": now_iso()},
                {"agent": "Writer Agent", "event": "Draft generated", "status": "done", "time": now_iso()},
                {"agent": "Editor Agent", "event": "Draft reviewed", "status": "done", "time": now_iso()},
                {"agent": "Image Agent", "event": "Image prompt prepared", "status": "done", "time": now_iso()},
                {"agent": "Manager", "event": "Waiting approval", "status": "waiting", "time": now_iso()},
            ],
            "versions": [{
                "id": new_id(),
                "label": "Version 1",
                "summary": "Initial agent draft",
                "snapshot": deliverable,
                "created_at": now_iso(),
            }],
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "published_at": None,
        }

    def _deliverable_from_blog(blog: dict) -> dict:
        keys = {
            "title", "slug", "audience", "word_count", "keywords", "search_intent",
            "outline", "markdown", "body", "meta_title", "meta_description", "faqs",
            "internal_links", "external_references", "image_suggestions", "thumbnail_url",
            "featured_image_url", "image_prompt", "tags", "category", "cta", "brand_voice",
            "review_notes", "agent_mind", "quality_checks",
        }
        data = {key: blog.get(key) for key in keys if key in blog}
        data.update({"type": "content.blog", "agent_type": "content", "workflow_type": "blog"})
        return data

    def _article_page_from_blog(blog: dict) -> dict:
        image = blog.get("featured_image_url") or blog.get("thumbnail_url")
        content = {"title": blog.get("title", "Untitled blog"), "body": blog.get("body") or blog.get("markdown", "")}
        if image:
            content["image"] = image
        return {
            "slug": blog.get("slug", "blog-post"),
            "title": blog.get("title", "Untitled blog"),
            "seo": {
                "meta_title": blog.get("meta_title", ""),
                "meta_description": blog.get("meta_description", ""),
                "keywords": blog.get("keywords", []),
            },
            "sections": [{"id": "article", "type": "article", "content": content}],
        }

    def _cloudinary_config() -> dict:
        url = os.environ.get("CLOUDINARY_URL", "")
        parsed = urlparse(url) if url else None
        return {
            "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME") or (parsed.hostname if parsed else ""),
            "api_key": os.environ.get("CLOUDINARY_API_KEY") or (parsed.username if parsed else ""),
            "api_secret": os.environ.get("CLOUDINARY_API_SECRET") or (parsed.password if parsed else ""),
            "folder": os.environ.get("CLOUDINARY_BLOG_FOLDER", "arevei/blogs"),
        }

    def _upload_image_to_cloudinary(image_ref: str, public_id: str) -> dict:
        cfg = _cloudinary_config()
        if not all((cfg["cloud_name"], cfg["api_key"], cfg["api_secret"])):
            return {"configured": False}
        if not (image_ref.startswith("data:image/") or image_ref.startswith("http://") or image_ref.startswith("https://")):
            return {"configured": False}
        timestamp = str(int(time.time()))
        params = {
            "folder": cfg["folder"],
            "overwrite": "true",
            "public_id": public_id,
            "timestamp": timestamp,
        }
        signing = "&".join(f"{k}={params[k]}" for k in sorted(params))
        signature = hashlib.sha1(f"{signing}{cfg['api_secret']}".encode("utf-8")).hexdigest()
        payload = {
            **params,
            "api_key": cfg["api_key"],
            "signature": signature,
            "file": image_ref,
        }
        res = requests.post(
            f"https://api.cloudinary.com/v1_1/{cfg['cloud_name']}/image/upload",
            data=payload,
            timeout=45,
        )
        if res.status_code >= 400:
            raise HTTPException(502, f"Cloudinary upload failed: {res.text[:200]}")
        data = res.json()
        return {
            "configured": True,
            "public_id": data.get("public_id"),
            "secure_url": data.get("secure_url"),
            "thumbnail_url": data.get("secure_url"),
            "width": data.get("width"),
            "height": data.get("height"),
        }

    def _is_inline_image(value: Any) -> bool:
        return isinstance(value, str) and value.startswith("data:image/")

    def _normalize_blog_image_ref(image_ref: str, blog: dict) -> tuple[str, dict]:
        if not image_ref:
            return "", blog.get("cloudinary", {})
        if _is_inline_image(image_ref):
            public_id = (blog.get("cloudinary") or {}).get("public_id") or blog.get("slug", blog.get("id", "blog-image"))
            cloudinary = _upload_image_to_cloudinary(image_ref, public_id)
            if not cloudinary.get("secure_url"):
                raise HTTPException(400, "Cloudinary is required before saving raw uploaded blog images")
            return cloudinary["secure_url"], cloudinary
        return image_ref, blog.get("cloudinary", {})

    def _fallback_blog_image_data_url(blog: dict) -> str:
        title = (blog.get("title") or "AREVEI Blog").replace("&", "&amp;").replace("<", "").replace(">", "")
        keyword = str((blog.get("keywords") or ["AI Website Growth"])[0])
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061414"/><stop offset=".54" stop-color="#0e3b34"/><stop offset="1" stop-color="#f4f4ef"/></linearGradient></defs>
<rect width="1200" height="675" fill="url(#bg)"/>
<rect x="74" y="70" width="1052" height="535" rx="36" fill="#fff" fill-opacity=".93"/>
<rect x="120" y="126" width="330" height="26" rx="13" fill="#49e8ca"/>
<text x="120" y="245" font-family="Arial, sans-serif" font-size="56" font-weight="800" fill="#07110f">{title[:56]}</text>
<text x="120" y="322" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="#2f5f58">{keyword}</text>
<rect x="120" y="402" width="360" height="24" rx="12" fill="#0b2f2a" fill-opacity=".18"/>
<rect x="120" y="450" width="560" height="24" rx="12" fill="#0b2f2a" fill-opacity=".12"/>
<rect x="760" y="170" width="260" height="260" rx="38" fill="#49e8ca" fill-opacity=".25"/>
<path d="M812 350 L884 260 L936 315 L980 246" fill="none" stroke="#007f70" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="812" cy="350" r="18" fill="#007f70"/><circle cx="884" cy="260" r="18" fill="#007f70"/><circle cx="936" cy="315" r="18" fill="#007f70"/><circle cx="980" cy="246" r="18" fill="#007f70"/>
</svg>"""
        return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")

    def _generate_openai_blog_image(blog: dict) -> dict:
        prompt = blog.get("image_prompt") or f"Premium editorial SaaS blog thumbnail for {blog.get('title', 'AI website growth')}, dashboard, no text"
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return {"source": "local_fallback", "data_url": _fallback_blog_image_data_url(blog), "prompt": prompt}
        res = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1"),
                "prompt": prompt,
                "size": os.environ.get("OPENAI_IMAGE_SIZE", "1536x1024"),
            },
            timeout=90,
        )
        if res.status_code >= 400:
            raise HTTPException(502, f"OpenAI image generation failed: {res.text[:240]}")
        image = res.json().get("data", [{}])[0]
        if image.get("url"):
            return {"source": "openai", "url": image["url"], "prompt": prompt}
        if image.get("b64_json"):
            return {"source": "openai", "data_url": f"data:image/png;base64,{image['b64_json']}", "prompt": prompt}
        raise HTTPException(502, "OpenAI image generation returned no image")

    async def _propose_content_blog(payload: dict, user: dict, task: dict | None = None):
        tenant_id = user["tenant_id"]
        site = await _site(user)
        roadmap = await db.roadmaps.find_one({"tenant_id": tenant_id, "status": "active"}, {"_id": 0})
        topic = payload.get("topic") or (task or {}).get("description") or "Benefits of AI Website Monitoring"
        candidate_slug = slugify(topic)
        if not payload.get("force_new"):
            existing = await db.blog_posts.find_one(
                {"tenant_id": tenant_id, "slug": candidate_slug, "status": {"$ne": "archived"}},
                {"_id": 0},
            )
            if existing:
                return {"existing": True, "blog": existing}
        request = {
            "topic": topic,
            "audience": payload.get("audience") or payload.get("target_audience") or "Small Business Owners",
            "keywords": payload.get("keywords") or ["AI Website", "Website Monitoring", "Website Growth"],
            "word_count": payload.get("word_count") or 2000,
            "cta": payload.get("cta") or "Book a Demo",
            "brand_voice": payload.get("brand_voice") or "Professional, simple, educational",
            "deadline": payload.get("deadline") or "Today",
            "source_context": payload.get("source_context") or payload.get("context") or {},
        }
        context = {
            "site_slug": site.get("slug"),
            "pages": [page.get("slug") for page in site.get("pages", [])],
            "roadmap": (roadmap or {}).get("content", {}),
            "task": task or {},
            "source_context": request["source_context"],
        }
        deliverable = await run_content_blog_agent(request, context)
        deliverable_data = deliverable.model_dump()
        blog = _blog_doc_from_deliverable(tenant_id, deliverable_data, "draft")
        blog["site_slug"] = site.get("slug", "")
        await db.blog_posts.insert_one(blog)
        if payload.get("auto_generate_image", True):
            try:
                generated = _generate_openai_blog_image(blog)
                image_url = generated.get("url") or generated.get("data_url") or ""
                cloudinary = {}
                source_image = generated.get("data_url") or generated.get("url")
                if source_image:
                    cloudinary = _upload_image_to_cloudinary(source_image, blog.get("slug", blog["id"]))
                    image_url = cloudinary.get("secure_url") or image_url
                image_updates = {
                    "thumbnail_url": image_url,
                    "featured_image_url": image_url,
                    "image_prompt": generated.get("prompt") or blog.get("image_prompt", ""),
                    "cloudinary": cloudinary or blog.get("cloudinary", {}),
                    "updated_at": now_iso(),
                }
                await db.blog_posts.update_one({"id": blog["id"]}, {"$set": image_updates, "$push": {"agent_timeline": {
                    "agent": "Image Agent", "event": f"Generated image via {generated.get('source', 'openai')}",
                    "status": "done", "time": now_iso(),
                }}})
                blog.update(image_updates)
            except Exception as exc:
                await db.blog_posts.update_one({"id": blog["id"]}, {"$push": {"agent_timeline": {
                    "agent": "Image Agent", "event": f"Image generation failed: {str(exc)[:120]}",
                    "status": "failed", "time": now_iso(),
                }}})
        tool_calls = blog_deliverable_tool_calls(deliverable)
        preview, diffs = apply_tool_calls(site, tool_calls)
        action = {
            "id": new_id(),
            "blog_id": blog["id"],
            "task_id": (task or {}).get("id"),
            "tenant_id": tenant_id,
            "agent_type": "content",
            "workflow_type": "blog",
            "source_task_type": "content.blog",
            "source": "daily_cycle" if task else "blog_workspace",
            "tool_used": ",".join(call["name"] for call in tool_calls),
            "input": json.dumps(request),
            "output": f"Content Agent drafted: {deliverable.title}",
            "structured_output": deliverable_data,
            "deliverable": deliverable_data,
            "quality_checks": deliverable_data.get("quality_checks", {}),
            "approval_required": True,
            "diff": {"changes": diffs, "preview": preview},
            "status": "proposed",
            "created_at": now_iso(),
        }
        await db.agent_actions.insert_one(action)
        if task:
            await db.tasks.update_one(
                {"id": task["id"], "tenant_id": tenant_id},
                {"$set": {
                    "status": "needs_approval",
                    "deliverable": deliverable_data,
                    "quality_checks": deliverable_data.get("quality_checks", {}),
                }},
            )
        action.pop("_id", None)
        await _notify(tenant_id, "Content Agent drafted a blog post for approval", "blog")
        return {**action, "blog": {k: v for k, v in blog.items() if k != "_id"}}

    # ---------- Settings ----------
    @r.get("/settings")
    async def get_settings(user=Depends(current_user)):
        t = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
        return {
            "auto_publish_low_risk": t.get("auto_publish_low_risk", False),
            "discovery_done": t.get("discovery_done", False),
        }

    @r.patch("/settings")
    async def patch_settings(payload: dict, user=Depends(current_user)):
        allowed = {k: v for k, v in payload.items() if k in {"auto_publish_low_risk", "discovery_done"}}
        await db.tenants.update_one({"id": user["tenant_id"]}, {"$set": allowed})
        return {"ok": True}

    # ---------- Discovery + Roadmap ----------
    @r.post("/discovery")
    async def discovery(payload: dict, user=Depends(current_user)):
        """payload: {business_description, target_audience, goals, competitors,
        brand_voice, strategy_doc?}"""
        tenant_id = user["tenant_id"]
        if payload.get("strategy_doc"):
            roadmap = await parse_founder_strategy(tenant_id, payload["strategy_doc"])
            source = "founder_provided"
        else:
            roadmap = await generate_growth_roadmap(tenant_id, payload)
            source = "ai_generated"
        if not roadmap or "quarters" not in roadmap:
            raise HTTPException(502, "AI did not return a valid roadmap")
        doc = {
            "id": new_id(), "tenant_id": tenant_id, "source": source,
            "content": roadmap, "status": "draft", "created_at": now_iso(),
            "business_context": payload,
        }
        await db.roadmaps.insert_one(doc)
        doc.pop("_id", None)
        await db.tenants.update_one({"id": tenant_id}, {"$set": {"discovery_done": True}})
        await _notify(tenant_id, "Roadmap draft is ready for review", "roadmap")
        return doc

    @r.get("/roadmap")
    async def get_roadmap(user=Depends(current_user)):
        active = await db.roadmaps.find_one(
            {"tenant_id": user["tenant_id"], "status": "active"}, {"_id": 0})
        draft = await db.roadmaps.find_one(
            {"tenant_id": user["tenant_id"], "status": "draft"}, {"_id": 0},
            sort=[("created_at", -1)])
        return {"active": active, "draft": draft}

    @r.post("/roadmap/{rid}/activate")
    async def activate(rid: str, user=Depends(current_user)):
        rm = await db.roadmaps.find_one({"id": rid, "tenant_id": user["tenant_id"]})
        if not rm:
            raise HTTPException(404, "Not found")
        await db.roadmaps.update_many({"tenant_id": user["tenant_id"]},
                                       {"$set": {"status": "archived"}})
        await db.roadmaps.update_one({"id": rid}, {"$set": {"status": "active"}})
        await _notify(user["tenant_id"], "Roadmap activated · monthly goals will be generated", "roadmap")
        return {"ok": True}

    # ---------- Goals + Tasks ----------
    @r.post("/goals/generate")
    async def gen_goals(user=Depends(current_user)):
        tenant_id = user["tenant_id"]
        rm = await db.roadmaps.find_one({"tenant_id": tenant_id, "status": "active"}, {"_id": 0})
        if not rm:
            raise HTTPException(400, "No active roadmap")
        month = now_month()
        existing = await db.monthly_goals.find_one({"tenant_id": tenant_id, "month": month})
        if existing:
            return await db.monthly_goals.find({"tenant_id": tenant_id, "month": month},
                                                {"_id": 0}).to_list(20)
        goals = await generate_monthly_goals(tenant_id, rm["content"], month, mock_analytics_snapshot())
        docs = []
        for g in goals:
            doc = {
                "id": new_id(), "tenant_id": tenant_id, "roadmap_id": rm["id"],
                "month": month, "goal_text": g.get("goal_text", ""),
                "category": g.get("category", "content"),
                "why": g.get("why", ""), "status": "active",
                "created_at": now_iso(),
            }
            await db.monthly_goals.insert_one(doc)
            doc.pop("_id", None)
            docs.append(doc)
        await _notify(tenant_id, f"Generated {len(docs)} goals for {month}", "goals")
        return docs

    @r.get("/goals")
    async def list_goals(user=Depends(current_user)):
        return await db.monthly_goals.find(
            {"tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

    @r.post("/goals/{gid}/tasks/generate")
    async def gen_tasks(gid: str, user=Depends(current_user)):
        goal = await db.monthly_goals.find_one({"id": gid, "tenant_id": user["tenant_id"]},
                                                 {"_id": 0})
        if not goal:
            raise HTTPException(404, "Goal not found")
        existing = await db.tasks.count_documents({"goal_id": gid})
        if existing:
            return await db.tasks.find({"goal_id": gid}, {"_id": 0}).to_list(50)
        tasks = await decompose_goal_into_tasks(user["tenant_id"], goal)
        docs = []
        for t in tasks:
            doc = {
                "id": new_id(), "goal_id": gid, "tenant_id": user["tenant_id"],
                "description": t.get("description", ""),
                "type": t.get("type", "website.update"),
                "agent_type": t.get("agent_type", "website"),
                "workflow_type": t.get("workflow_type", "update"),
                "input_context": t.get("input_context", {}),
                "deliverable": t.get("deliverable"),
                "quality_checks": t.get("quality_checks", []),
                "approval_required": t.get("approval_required", True),
                "priority": t.get("priority", "medium"),
                "effort": t.get("effort", "1h"),
                "tool": t.get("tool", "manual"),
                "status": "pending", "scheduled_date": now_iso()[:10],
                "created_at": now_iso(),
            }
            await db.tasks.insert_one(doc)
            doc.pop("_id", None)
            docs.append(doc)
        return docs

    @r.get("/tasks")
    async def list_tasks(user=Depends(current_user)):
        return await db.tasks.find(
            {"tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(200)

    @r.patch("/tasks/{tid}")
    async def patch_task(tid: str, payload: dict, user=Depends(current_user)):
        allowed = {k: v for k, v in payload.items()
                   if k in {
                       "status", "description", "priority", "scheduled_date",
                       "agent_type", "workflow_type", "input_context",
                       "deliverable", "quality_checks", "approval_required",
                   }}
        await db.tasks.update_one(
            {"id": tid, "tenant_id": user["tenant_id"]}, {"$set": allowed})
        return {"ok": True}

    # ---------- Daily cycle ----------
    @r.post("/cycle/run")
    async def run_cycle(user=Depends(current_user)):
        site = await _site(user)
        tenant_id = user["tenant_id"]
        pending = await db.tasks.find(
            {"tenant_id": tenant_id, "status": "pending"},
            {"_id": 0},
        ).limit(3).to_list(3)
        results = []
        for task in pending:
            if task.get("type") == "content.blog" or (
                task.get("agent_type") == "content" and task.get("workflow_type") == "blog"
            ):
                action = await _propose_content_blog(task.get("input_context") or {}, user, task)
                results.append({
                    "task_id": task["id"], "action_id": action["id"],
                    "changes": len(action.get("diff", {}).get("changes", [])),
                })
                continue
            prompt = await execute_task_to_prompt(task)
            session = f"agent-{tenant_id}-{task['id']}"
            context = json.dumps({"theme": site["theme_config"],
                                  "pages_count": len(site.get("pages", []))})[:2000]
            try:
                ai_res = await run_ai(session, context, prompt)
            except Exception as e:
                ai_res = {"assistant_message": f"AI failed: {e}", "tool_calls": []}
            preview, diffs = apply_tool_calls(site, ai_res.get("tool_calls", []))
            action = {
                "id": new_id(), "task_id": task["id"], "tenant_id": tenant_id,
                "agent_type": task.get("agent_type", "website"),
                "workflow_type": task.get("workflow_type", "update"),
                "source_task_type": task.get("type", "website.update"),
                "tool_used": ",".join(c.get("name", "?") for c in ai_res.get("tool_calls", [])),
                "input": prompt, "output": ai_res.get("assistant_message", ""),
                "structured_output": ai_res,
                "deliverable": task.get("deliverable"),
                "quality_checks": task.get("quality_checks", []),
                "approval_required": task.get("approval_required", True),
                "diff": {"changes": diffs, "preview": preview},
                "status": "proposed", "created_at": now_iso(),
            }
            await db.agent_actions.insert_one(action)
            await db.tasks.update_one({"id": task["id"]},
                                       {"$set": {"status": "needs_approval"}})
            results.append({"task_id": task["id"], "action_id": action["id"],
                           "changes": len(diffs)})
        await _notify(tenant_id, f"Daily cycle ran · {len(results)} task(s) need approval",
                       "cycle")
        return {"executed": len(results), "results": results}

    @r.get("/actions")
    async def list_actions(user=Depends(current_user)):
        actions = await db.agent_actions.find(
            {"tenant_id": user["tenant_id"], "source": {"$ne": "blog_workspace"}}, {"_id": 0}
        ).sort("created_at", -1).limit(50).to_list(50)
        # strip preview from list
        for a in actions:
            if "diff" in a and "preview" in a["diff"]:
                a["diff"] = {"changes": a["diff"].get("changes", [])}
        return actions

    @r.post("/actions/{aid}/apply")
    async def apply_action(aid: str, payload: dict, user=Depends(current_user)):
        action = await db.agent_actions.find_one(
            {"id": aid, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not action:
            raise HTTPException(404, "Not found")
        accept = bool(payload.get("accept", False))
        if not accept:
            await db.agent_actions.update_one({"id": aid}, {"$set": {"status": "rejected"}})
            if action.get("task_id"):
                await db.tasks.update_one({"id": action["task_id"]},
                                           {"$set": {"status": "pending"}})
            return {"ok": True, "status": "rejected"}
        preview = action.get("diff", {}).get("preview")
        if preview:
            site = await _site(user)
            # snapshot first
            await db.versions.insert_one({
                "id": new_id(), "site_id": site["id"], "tenant_id": user["tenant_id"],
                "snapshot": site, "summary": f"Agent: {action['input'][:80]}",
                "created_by": user["user_id"], "created_at": now_iso(),
            })
            await db.sites.update_one({"id": site["id"]}, {"$set": {
                "theme_config": preview.get("theme_config", site["theme_config"]),
                "pages": preview.get("pages", site["pages"]),
                "seo": preview.get("seo", site["seo"]),
                "updated_at": now_iso(),
            }})
        await db.agent_actions.update_one({"id": aid}, {"$set": {"status": "published"}})
        if action.get("task_id"):
            await db.tasks.update_one({"id": action["task_id"]}, {"$set": {"status": "done"}})
        return {"ok": True, "status": "published"}

    # ---------- Integrations (mocked) ----------
    INTEGRATION_TYPES = ["gsc", "ga4", "bing", "schema", "geo", "slack"]

    @r.get("/integrations")
    async def list_integrations(user=Depends(current_user)):
        existing = await db.integrations.find(
            {"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(50)
        by_type = {x["type"]: x for x in existing}
        return [
            by_type.get(t, {"type": t, "status": "disconnected", "tenant_id": user["tenant_id"]})
            for t in INTEGRATION_TYPES
        ]

    @r.post("/integrations/{itype}/connect")
    async def connect_integration(itype: str, user=Depends(current_user)):
        if itype not in INTEGRATION_TYPES:
            raise HTTPException(400, "Unknown integration")
        doc = {
            "id": new_id(), "tenant_id": user["tenant_id"], "type": itype,
            "status": "connected", "credentials": {"mocked": True},
            "last_synced_at": now_iso(), "connected_at": now_iso(),
        }
        await db.integrations.update_one(
            {"tenant_id": user["tenant_id"], "type": itype},
            {"$set": doc}, upsert=True,
        )
        await _notify(user["tenant_id"], f"Integration connected: {itype.upper()}", "integration")
        return {"ok": True}

    @r.post("/integrations/{itype}/disconnect")
    async def disconnect_integration(itype: str, user=Depends(current_user)):
        await db.integrations.update_one(
            {"tenant_id": user["tenant_id"], "type": itype},
            {"$set": {"status": "disconnected"}}, upsert=True,
        )
        return {"ok": True}

    # ---------- Reports ----------
    @r.post("/reports/generate")
    async def gen_report(user=Depends(current_user)):
        tenant_id = user["tenant_id"]
        month = now_month()
        goals = await db.monthly_goals.find({"tenant_id": tenant_id, "month": month},
                                             {"_id": 0}).to_list(20)
        tasks = await db.tasks.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(200)
        integ = await db.integrations.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(20)
        report = await generate_monthly_report(tenant_id, goals, tasks,
                                                 mock_analytics_snapshot(),
                                                 {x["type"]: x["status"] for x in integ})
        doc = {
            "id": new_id(), "tenant_id": tenant_id, "month": month,
            "content": report, "generated_at": now_iso(),
        }
        await db.monthly_reports.insert_one(doc)
        doc.pop("_id", None)
        await _notify(tenant_id, f"Monthly report ready for {month}", "report")
        return doc

    @r.get("/reports")
    async def list_reports(user=Depends(current_user)):
        return await db.monthly_reports.find(
            {"tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("generated_at", -1).to_list(50)

    # ---------- Notifications ----------
    @r.get("/notifications")
    async def list_notifs(user=Depends(current_user)):
        return await db.agent_notifications.find(
            {"tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("sent_at", -1).limit(50).to_list(50)

    @r.post("/notifications/read")
    async def read_all(user=Depends(current_user)):
        await db.agent_notifications.update_many(
            {"tenant_id": user["tenant_id"]}, {"$set": {"read": True}})
        return {"ok": True}

    @r.get("/welcome")
    async def welcome(user=Depends(current_user)):
        tenant_id = user["tenant_id"]
        tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0}) or {}
        site = await db.sites.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}
        roadmap = await db.roadmaps.find_one({"tenant_id": tenant_id, "status": "active"}, {"_id": 0})
        goals_count = await db.monthly_goals.count_documents({"tenant_id": tenant_id, "month": now_month()})
        tasks_done = await db.tasks.count_documents({"tenant_id": tenant_id, "status": "done"})
        tasks_pending = await db.tasks.count_documents({"tenant_id": tenant_id, "status": "pending"})
        actions_pending = await db.agent_actions.count_documents({"tenant_id": tenant_id, "status": "proposed"})
        integrations = await db.integrations.find({"tenant_id": tenant_id, "status": "connected"}, {"_id": 0}).to_list(20)
        unread = await db.agent_notifications.count_documents({"tenant_id": tenant_id, "read": False})

        checklist = [
            {"id": "discovery", "label": "Complete discovery so I can plan your year",
             "done": bool(tenant.get("discovery_done")), "cta": "/admin/agent"},
            {"id": "roadmap", "label": "Activate your 1-year growth roadmap",
             "done": bool(roadmap), "cta": "/admin/agent"},
            {"id": "goals", "label": "Generate this month's goals",
             "done": goals_count > 0, "cta": "/admin/agent"},
            {"id": "integrations", "label": "Connect Google Search Console + GA4",
             "done": any(i["type"] in ("gsc", "ga4") for i in integrations),
             "cta": "/admin/agent"},
            {"id": "site_published", "label": "Review and publish your site",
             "done": bool(site.get("published_at")) or bool(site.get("pages")),
             "cta": "/admin/content"},
            {"id": "approvals", "label": f"Review {actions_pending} pending agent proposal(s)" if actions_pending else "Review pending agent proposals",
             "done": actions_pending == 0, "cta": "/admin/agent"},
        ]
        done_count = sum(1 for c in checklist if c["done"])

        # Site health quick check
        theme_ok = bool(site.get("theme_config", {}).get("typography"))
        seo_ok = bool(site.get("seo", {}).get("meta_description"))
        site_health = {
            "theme_complete": theme_ok,
            "seo_meta_set": seo_ok,
            "pages_count": len(site.get("pages", [])),
            "schema_ok": all((site.get("seo", {}).get("schema_status") or {}).values()) if site.get("seo", {}).get("schema_status") else False,
        }

        hour = datetime.now(timezone.utc).hour
        salute = "Good morning" if hour < 12 else "Good afternoon" if hour < 18 else "Good evening"
        first_name = (await db.users.find_one({"id": user["user_id"]}, {"_id": 0}) or {}).get("name", "there").split()[0]

        if done_count == 0:
            headline = f"{salute}, {first_name}. Let's get you set up."
            body = "I'm your AI Website Manager. Walk through this short checklist and I'll start working on your site today."
        elif done_count < len(checklist):
            headline = f"{salute}, {first_name}. You're {done_count}/{len(checklist)} of the way there."
            body = f"{tasks_done} task(s) shipped, {tasks_pending} pending, {actions_pending} need your approval. Pick up where we left off."
        else:
            headline = f"{salute}, {first_name}. Everything looks good."
            body = f"{tasks_done} tasks shipped so far. {actions_pending} proposal(s) awaiting approval. Want to run today's cycle?"

        return {
            "headline": headline, "body": body,
            "checklist": checklist, "done_count": done_count, "total": len(checklist),
            "site_health": site_health,
            "stats": {
                "tasks_done": tasks_done, "tasks_pending": tasks_pending,
                "actions_pending": actions_pending, "unread_notifications": unread,
                "connected_integrations": len(integrations),
            },
        }

    @r.post("/reset")
    async def reset_agent(user=Depends(current_user)):
        """Wipe all agent state for the current tenant — clears demo/old data."""
        tid = user["tenant_id"]
        results = {}
        for coll in ("roadmaps", "monthly_goals", "tasks", "agent_actions",
                     "monthly_reports", "agent_notifications"):
            res = await db[coll].delete_many({"tenant_id": tid})
            results[coll] = res.deleted_count
        await db.tenants.update_one({"id": tid}, {"$set": {"discovery_done": False}})
        return {"ok": True, "deleted": results}

    @r.get("/blogs")
    async def list_blogs(user=Depends(current_user)):
        return await db.blog_posts.find(
            {"tenant_id": user["tenant_id"], "status": {"$ne": "archived"}}, {"_id": 0}
        ).sort("updated_at", -1).to_list(200)

    @r.get("/blogs/{blog_id}")
    async def get_blog(blog_id: str, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        return blog

    @r.post("/blogs/generate")
    async def generate_blog(payload: dict, user=Depends(current_user)):
        action = await _propose_content_blog(payload, user)
        return action["blog"]

    @r.delete("/blogs/{blog_id}")
    async def delete_blog(blog_id: str, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        await db.blog_posts.update_one({"id": blog_id}, {"$set": {"status": "archived", "updated_at": now_iso()}})
        return {"ok": True, "status": "archived"}

    @r.post("/blogs/{blog_id}/duplicate")
    async def duplicate_blog(blog_id: str, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        copy = json.loads(json.dumps(blog))
        copy["id"] = new_id()
        copy["title"] = f"{blog.get('title', 'Untitled blog')} Copy"
        copy["slug"] = f"{blog.get('slug', 'blog-post')}-{copy['id'][:6]}"
        copy["status"] = "draft"
        copy["published_at"] = None
        copy["created_at"] = now_iso()
        copy["updated_at"] = now_iso()
        copy["versions"] = [{
            "id": new_id(),
            "label": "Version 1",
            "summary": "Duplicated blog",
            "snapshot": _deliverable_from_blog(copy),
            "created_at": now_iso(),
        }]
        await db.blog_posts.insert_one(copy)
        copy.pop("_id", None)
        return copy

    @r.patch("/blogs/{blog_id}")
    async def update_blog(blog_id: str, payload: dict, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        allowed = {
            "title", "slug", "audience", "word_count", "keywords", "search_intent",
            "outline", "markdown", "body", "meta_title", "meta_description", "faqs",
            "internal_links", "external_references", "image_suggestions", "thumbnail_url",
            "featured_image_url", "image_prompt", "tags", "category", "cta", "brand_voice",
            "review_notes", "agent_mind", "quality_checks",
        }
        updates = {key: value for key, value in payload.items() if key in allowed}
        if "markdown" in updates and "body" not in updates:
            updates["body"] = updates["markdown"]
        if "thumbnail_url" in updates and "featured_image_url" not in updates:
            updates["featured_image_url"] = updates["thumbnail_url"]
        image_ref = updates.get("featured_image_url") or updates.get("thumbnail_url")
        if _is_inline_image(image_ref):
            image_url, cloudinary = _normalize_blog_image_ref(image_ref, blog)
            updates["thumbnail_url"] = image_url
            updates["featured_image_url"] = image_url
            updates["cloudinary"] = cloudinary
        if updates:
            updates["updated_at"] = now_iso()
            next_blog = {**blog, **updates}
            await db.blog_posts.update_one({"id": blog_id}, {
                "$set": updates,
                "$push": {"versions": {
                    "id": new_id(),
                    "label": f"Version {len(blog.get('versions', [])) + 1}",
                    "summary": "Manual edit",
                    "snapshot": _deliverable_from_blog(next_blog),
                    "created_at": now_iso(),
                }},
            })
        return await db.blog_posts.find_one({"id": blog_id}, {"_id": 0})

    @r.post("/blogs/{blog_id}/image")
    async def save_blog_image(blog_id: str, payload: dict, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        image_url = payload.get("image_url") or payload.get("thumbnail_url") or ""
        cloudinary = {}
        if payload.get("image_data_url"):
            image_url, cloudinary = _normalize_blog_image_ref(payload["image_data_url"], blog)
        elif _is_inline_image(image_url):
            image_url, cloudinary = _normalize_blog_image_ref(image_url, blog)
        featured_image_url = payload.get("featured_image_url") or image_url
        if _is_inline_image(featured_image_url):
            featured_image_url, cloudinary = _normalize_blog_image_ref(featured_image_url, {**blog, "cloudinary": cloudinary or blog.get("cloudinary", {})})
        updates = {
            "thumbnail_url": image_url,
            "featured_image_url": featured_image_url,
            "cloudinary": cloudinary or blog.get("cloudinary", {}),
            "updated_at": now_iso(),
        }
        await db.blog_posts.update_one({"id": blog_id}, {"$set": updates})
        return await db.blog_posts.find_one({"id": blog_id}, {"_id": 0})

    @r.post("/blogs/{blog_id}/image/generate")
    async def generate_blog_image(blog_id: str, payload: dict, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        if payload.get("image_prompt"):
            blog["image_prompt"] = payload["image_prompt"]
        generated = _generate_openai_blog_image(blog)
        image_url = generated.get("url") or generated.get("data_url") or ""
        cloudinary = {}
        source_image = generated.get("data_url") or generated.get("url")
        if source_image:
            public_id = (blog.get("cloudinary") or {}).get("public_id") or blog.get("slug", blog_id)
            cloudinary = _upload_image_to_cloudinary(source_image, public_id)
            image_url = cloudinary.get("secure_url") or image_url
        updates = {
            "thumbnail_url": image_url,
            "featured_image_url": image_url,
            "image_prompt": generated.get("prompt") or blog.get("image_prompt", ""),
            "cloudinary": cloudinary or blog.get("cloudinary", {}),
            "updated_at": now_iso(),
        }
        timeline = {
            "agent": "Image Agent",
            "event": f"Generated image via {generated.get('source', 'openai')}",
            "status": "done",
            "time": now_iso(),
        }
        await db.blog_posts.update_one({"id": blog_id}, {"$set": updates, "$push": {"agent_timeline": timeline}})
        return await db.blog_posts.find_one({"id": blog_id}, {"_id": 0})

    @r.get("/blogs/{blog_id}/versions")
    async def list_blog_versions(blog_id: str, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        return blog.get("versions", [])

    @r.post("/blogs/{blog_id}/versions/{version_id}/restore")
    async def restore_blog_version(blog_id: str, version_id: str, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        version = next((item for item in blog.get("versions", []) if item.get("id") == version_id), None)
        if not version:
            raise HTTPException(404, "Version not found")
        snapshot = version.get("snapshot", {})
        updates = {k: v for k, v in snapshot.items() if k not in {"id", "tenant_id", "status", "created_at", "published_at"}}
        updates["updated_at"] = now_iso()
        await db.blog_posts.update_one({"id": blog_id}, {"$set": updates, "$push": {"agent_timeline": {
            "agent": "Manager", "event": f"Restored {version.get('label', 'version')}",
            "status": "done", "time": now_iso(),
        }}})
        return await db.blog_posts.find_one({"id": blog_id}, {"_id": 0})

    @r.get("/blogs/{blog_id}/preview")
    async def preview_blog(blog_id: str, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        site = await _site(user)
        preview = json.loads(json.dumps(site))
        pages = [page for page in preview.get("pages", []) if page.get("slug") != blog.get("slug")]
        pages.append(_article_page_from_blog(blog))
        preview["pages"] = pages
        preview["seo"] = {
            **preview.get("seo", {}),
            "meta_title": blog.get("meta_title") or preview.get("seo", {}).get("meta_title"),
            "meta_description": blog.get("meta_description") or preview.get("seo", {}).get("meta_description"),
            "keywords": blog.get("keywords") or preview.get("seo", {}).get("keywords", []),
        }
        return {"blog": blog, "preview_site": preview, "preview_page": _article_page_from_blog(blog)}

    @r.post("/blogs/{blog_id}/publish")
    async def publish_blog(blog_id: str, payload: dict, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        if payload.get("image_data_url"):
            image_url, cloudinary = _normalize_blog_image_ref(payload["image_data_url"], blog)
            blog["thumbnail_url"] = image_url
            blog["featured_image_url"] = image_url
            blog["cloudinary"] = cloudinary
        elif payload.get("image_url"):
            if _is_inline_image(payload["image_url"]):
                image_url, cloudinary = _normalize_blog_image_ref(payload["image_url"], blog)
            else:
                public_id = (blog.get("cloudinary") or {}).get("public_id") or blog.get("slug", blog_id)
                cloudinary = _upload_image_to_cloudinary(payload["image_url"], public_id)
                image_url = cloudinary.get("secure_url") or payload["image_url"]
            blog["thumbnail_url"] = image_url
            blog["featured_image_url"] = image_url
            if cloudinary.get("configured"):
                blog["cloudinary"] = cloudinary
        site = await _site(user)
        await db.versions.insert_one({
            "id": new_id(), "site_id": site["id"], "tenant_id": user["tenant_id"],
            "snapshot": site, "summary": f"Blog publish: {blog.get('title', '')[:80]}",
            "created_by": user["user_id"], "created_at": now_iso(),
        })
        pages = [page for page in site.get("pages", []) if page.get("slug") != blog.get("slug")]
        pages.append(_article_page_from_blog(blog))
        seo = {
            **site.get("seo", {}),
            "meta_title": blog.get("meta_title") or site.get("seo", {}).get("meta_title"),
            "meta_description": blog.get("meta_description") or site.get("seo", {}).get("meta_description"),
            "keywords": blog.get("keywords") or site.get("seo", {}).get("keywords", []),
        }
        await db.sites.update_one({"id": site["id"]}, {"$set": {
            "pages": pages,
            "seo": seo,
            "updated_at": now_iso(),
        }})
        await db.blog_posts.update_one({"id": blog_id}, {"$set": {
            "status": "published",
            "thumbnail_url": blog.get("thumbnail_url", ""),
            "featured_image_url": blog.get("featured_image_url", ""),
            "cloudinary": blog.get("cloudinary", {}),
            "published_at": now_iso(),
            "updated_at": now_iso(),
        }})
        await _notify(user["tenant_id"], f"Blog published: {blog.get('title', 'Untitled')}", "blog")
        return await db.blog_posts.find_one({"id": blog_id}, {"_id": 0})

    @r.post("/blogs/{blog_id}/unpublish")
    async def unpublish_blog(blog_id: str, user=Depends(current_user)):
        blog = await db.blog_posts.find_one({"id": blog_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if not blog:
            raise HTTPException(404, "Blog not found")
        site = await _site(user)
        await db.versions.insert_one({
            "id": new_id(), "site_id": site["id"], "tenant_id": user["tenant_id"],
            "snapshot": site, "summary": f"Blog unpublish: {blog.get('title', '')[:80]}",
            "created_by": user["user_id"], "created_at": now_iso(),
        })
        pages = [page for page in site.get("pages", []) if page.get("slug") != blog.get("slug")]
        await db.sites.update_one({"id": site["id"]}, {"$set": {"pages": pages, "updated_at": now_iso()}})
        await db.blog_posts.update_one({"id": blog_id}, {"$set": {
            "status": "draft", "published_at": None, "updated_at": now_iso(),
        }, "$push": {"agent_timeline": {
            "agent": "Publisher Agent", "event": "Unpublished blog and restored it to draft",
            "status": "done", "time": now_iso(),
        }}})
        return await db.blog_posts.find_one({"id": blog_id}, {"_id": 0})

    @r.post("/content/blog/propose")
    async def propose_content_blog(payload: dict, user=Depends(current_user)):
        """Generate a structured Content Agent blog deliverable awaiting approval."""
        return await _propose_content_blog(payload, user)

    @r.post("/blog/propose")
    async def propose_blog(payload: dict, user=Depends(current_user)):
        """Compatibility alias for the Phase 1 Content Agent blog endpoint."""
        return await _propose_content_blog(payload, user)

        await _notify(tid, "Blog post drafted — awaiting your approval", "blog")
    return r
