"""Agent routes — roadmap, goals, tasks, execution, integrations, reports, notifications."""
from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from agent_engine import (
    decompose_goal_into_tasks, execute_task_to_prompt, generate_growth_roadmap,
    generate_monthly_goals, generate_monthly_report, mock_analytics_snapshot,
    now_month, parse_founder_strategy,
)
from ai_engine import apply_tool_calls, run_ai
from auth import current_user
from models import new_id, now_iso

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
                "type": t.get("type", "content"),
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
                   if k in {"status", "description", "priority", "scheduled_date"}}
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
                "tool_used": ",".join(c.get("name", "?") for c in ai_res.get("tool_calls", [])),
                "input": prompt, "output": ai_res.get("assistant_message", ""),
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
            {"tenant_id": user["tenant_id"]}, {"_id": 0}
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

    @r.post("/blog/propose")
    async def propose_blog(payload: dict, user=Depends(current_user)):
        """Generate a blog post proposal aligned with the active roadmap.
        Returns a proposed agent_action awaiting approval."""
        tid = user["tenant_id"]
        site = await _site(user)
        rm = await db.roadmaps.find_one({"tenant_id": tid, "status": "active"}, {"_id": 0})
        if not rm:
            raise HTTPException(400, "No active roadmap. Activate one first.")
        topic_hint = payload.get("topic", "")
        themes = ", ".join((q.get("theme", "") for q in rm["content"].get("quarters", [])))
        prompt = (
            f"Write a launch-worthy blog post aligned with this roadmap (themes: {themes}). "
            f"Topic hint: {topic_hint or 'pick the most impactful Q1 theme'}. "
            "Use the generate_blog_post tool with a clear title, 400-600 word body, and SEO-friendly slug."
        )
        session = f"blog-{tid}-{now_iso()[:10]}"
        ctx = json.dumps({"theme": site["theme_config"],
                          "pages": [p["slug"] for p in site.get("pages", [])]})[:2000]
        try:
            ai_res = await run_ai(session, ctx, prompt)
        except Exception as e:
            raise HTTPException(502, f"AI error: {e}")
        preview, diffs = apply_tool_calls(site, ai_res.get("tool_calls", []))
        action = {
            "id": new_id(), "task_id": None, "tenant_id": tid,
            "tool_used": ",".join(c.get("name", "?") for c in ai_res.get("tool_calls", [])),
            "input": prompt, "output": ai_res.get("assistant_message", "")[:500],
            "diff": {"changes": diffs, "preview": preview},
            "status": "proposed", "created_at": now_iso(),
        }
        await db.agent_actions.insert_one(action)
        action.pop("_id", None)
        await _notify(tid, "Blog post drafted — awaiting your approval", "blog")
        return action

    return r
