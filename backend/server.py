"""AREVEI main FastAPI server."""
from __future__ import annotations

import json
import logging
import os
import re
import certifi
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlsplit

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from auth import create_token, current_user, hash_password, require_super_admin, verify_password
from ai_engine import apply_tool_calls, run_ai
from agent_engine import _ask_json
from models import (
    AIActionLog,
    AIChatRequest,
    AIChatResponse,
    ApplyChangeRequest,
    AuthResponse,
    BillingRecord,
    LoginRequest,
    Site,
    TeamInvite,
    Tenant,
    UserCreate,
    UserPublic,
    Version,
    new_id,
    now_iso,
)
from site_defaults import default_pages, default_seo, default_theme

logger = logging.getLogger("arevei")
logging.basicConfig(level=logging.INFO)

mongo_url = os.environ["MONGO_URL"]
mock_db_enabled = os.environ.get("USE_MOCK_DB", "").lower() == "true"
if os.environ.get("USE_MOCK_DB", "").lower() == "true":
    from mongomock_motor import AsyncMongoMockClient

    mongo_client = AsyncMongoMockClient()
    logger.info("Using in-memory mock MongoDB")
else:
    mongo_client_options = {}
    is_local_mongo = (urlsplit(mongo_url).hostname or "").lower() in {"localhost", "127.0.0.1", "::1"}
    mongo_tls_requested = any(token in mongo_url.lower() for token in ("tls=true", "ssl=true"))
    if mongo_url.startswith("mongodb+srv://") or (mongo_tls_requested and not is_local_mongo):
        mongo_client_options["tlsCAFile"] = certifi.where()
    mongo_client = AsyncIOMotorClient(mongo_url, **mongo_client_options)
db = mongo_client[os.environ["DB_NAME"]]
logger.info(
    "Mongo persistence configured: mock=%s db=%s host=%s",
    mock_db_enabled,
    os.environ["DB_NAME"],
    urlsplit(mongo_url).hostname or "unknown",
)

app = FastAPI(title="AREVEI API")
api = APIRouter(prefix="/api")


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "")
    configured = [
        origin.strip().strip('"').strip("'")
        for origin in raw.split(",")
        if origin.strip()
    ]
    defaults = [
        "https://app.arevei.com",
        "https://arevei.com",
        "https://www.arevei.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    if not configured or "*" in configured:
        return defaults
    return sorted(set(configured + defaults))


# ----------------------- Helpers -----------------------
def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "site"


def _strip_mongo(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc


async def _get_site_for_user(user: dict) -> dict:
    if not user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="No tenant associated with user")
    site = await db.sites.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


async def _seed_super_admin():
    existing = await db.users.find_one({"email": "admin@arevei.com"})
    if existing:
        return
    pw = hash_password("Admin@1234")
    user_doc = {
        "id": new_id(),
        "email": "admin@arevei.com",
        "name": "AREVEI Super Admin",
        "role": "super_admin",
        "tenant_id": None,
        "password_hash": pw,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    logger.info("Seeded super admin: admin@arevei.com / Admin@1234")


async def _seed_demo_founder():
    existing = await db.users.find_one({"email": "founder@demo.com"})
    # Always ensure the demo site has a complete theme — re-seed if broken
    if existing:
        site = await db.sites.find_one({"tenant_id": existing.get("tenant_id")})
        if not site:
            tenant = await db.tenants.find_one({"id": existing.get("tenant_id")})
            if not tenant:
                tenant = Tenant(name="Northwind Studio", plan_tier="self_serve",
                                billing_status="active", setup_fee_paid=True,
                                monthly_revenue=99.0).model_dump()
                await db.tenants.insert_one(tenant)
                await db.users.update_one(
                    {"id": existing["id"]},
                    {"$set": {"tenant_id": tenant["id"]}},
                )
            site = Site(
                tenant_id=tenant["id"] if isinstance(tenant, dict) else existing.get("tenant_id"),
                slug=_slugify("Northwind Studio"),
                theme_config=default_theme(),
                pages=default_pages("Northwind Studio"),
                seo=default_seo("Northwind Studio"),
            ).model_dump()
            await db.sites.insert_one(site)
            logger.info("Re-created missing demo site")
        elif "typography" not in (site.get("theme_config") or {}):
            await db.sites.update_one(
                {"id": site["id"]},
                {"$set": {
                    "theme_config": default_theme(),
                    "pages": default_pages("Northwind Studio"),
                    "seo": default_seo("Northwind Studio"),
                    "updated_at": now_iso(),
                }},
            )
            logger.info("Re-seeded broken demo site theme_config")
        return
    tenant = Tenant(name="Northwind Studio", plan_tier="self_serve",
                    billing_status="active", setup_fee_paid=True,
                    monthly_revenue=99.0).model_dump()
    await db.tenants.insert_one(tenant)

    site = Site(
        tenant_id=tenant["id"],
        slug=_slugify(tenant["name"]),
        theme_config=default_theme(),
        pages=default_pages(tenant["name"]),
        seo=default_seo(tenant["name"]),
    ).model_dump()
    await db.sites.insert_one(site)

    pw = hash_password("Demo@1234")
    await db.users.insert_one({
        "id": new_id(),
        "email": "founder@demo.com",
        "name": "Demo Founder",
        "role": "founder_admin",
        "tenant_id": tenant["id"],
        "password_hash": pw,
        "created_at": now_iso(),
    })

    # Seed some billing records
    await db.billing_records.insert_many([
        BillingRecord(tenant_id=tenant["id"], type="setup", amount=499.0,
                      status="paid", description="One-time setup fee").model_dump(),
        BillingRecord(tenant_id=tenant["id"], type="monthly", amount=99.0,
                      status="paid", description="Monthly — self-serve").model_dump(),
    ])
    logger.info("Seeded demo founder: founder@demo.com / Demo@1234")


@app.on_event("startup")
async def on_startup():
    await _seed_super_admin()
    await _seed_demo_founder()


@app.on_event("shutdown")
async def on_shutdown():
    mongo_client.close()


# ----------------------- Auth -----------------------
@api.post("/auth/signup", response_model=AuthResponse)
async def signup(payload: UserCreate):
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    tenant_name = payload.company or f"{payload.name}'s Site"
    tenant = Tenant(name=tenant_name).model_dump()
    await db.tenants.insert_one(tenant)

    site = Site(
        tenant_id=tenant["id"],
        slug=_slugify(tenant_name),
        theme_config=default_theme(),
        pages=default_pages(tenant_name),
        seo=default_seo(tenant_name),
    ).model_dump()
    await db.sites.insert_one(site)

    user_doc = {
        "id": new_id(),
        "email": payload.email,
        "name": payload.name,
        "role": "founder_admin",
        "tenant_id": tenant["id"],
        "password_hash": hash_password(payload.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_doc["id"], user_doc["role"], user_doc["tenant_id"])
    public = UserPublic(
        id=user_doc["id"], email=user_doc["email"], name=user_doc["name"],
        role=user_doc["role"], tenant_id=user_doc["tenant_id"],
        created_at=user_doc["created_at"],
    )
    return AuthResponse(token=token, user=public)


@api.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["role"], user.get("tenant_id"))
    public = UserPublic(
        id=user["id"], email=user["email"], name=user["name"],
        role=user["role"], tenant_id=user.get("tenant_id"),
        created_at=user["created_at"],
    )
    return AuthResponse(token=token, user=public)


@api.get("/auth/me", response_model=UserPublic)
async def me(user=Depends(current_user)):
    doc = await db.users.find_one({"id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublic(**doc)


@api.get("/debug/persistence")
async def persistence_debug(user=Depends(current_user)):
    tenant_id = user.get("tenant_id")
    user_id = user["user_id"]
    mongo_host = urlsplit(mongo_url).hostname or "unknown"
    return {
        "mock_db": mock_db_enabled,
        "db_name": os.environ["DB_NAME"],
        "mongo_host": mongo_host,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "counts": {
            "users_same_email_scope": await db.users.count_documents({"id": user_id}),
            "general_chats": await db.general_chats.count_documents({"tenant_id": tenant_id, "user_id": user_id}),
            "general_chat_messages": await db.general_chat_messages.count_documents({"tenant_id": tenant_id, "user_id": user_id}),
            "workspace_sessions": await db.workspace_sessions.count_documents({"tenant_id": tenant_id, "user_id": user_id}),
            "workspace_chat_messages": await db.workspace_chat_messages.count_documents({"tenant_id": tenant_id, "user_id": user_id}),
            "projects": await db.projects.count_documents({"tenant_id": tenant_id}),
            "project_chats": await db.project_chats.count_documents({"tenant_id": tenant_id}),
        },
        "latest": {
            "general_chat": await db.general_chats.find_one(
                {"tenant_id": tenant_id, "user_id": user_id},
                {"_id": 0, "id": 1, "title": 1, "updated_at": 1},
                sort=[("updated_at", -1)],
            ),
            "workspace": await db.workspace_sessions.find_one(
                {"tenant_id": tenant_id, "user_id": user_id},
                {"_id": 0, "id": 1, "repo_full_name": 1, "updated_at": 1},
                sort=[("updated_at", -1)],
            ),
        },
    }


# ----------------------- Site / CMS -----------------------
@api.get("/site")
async def get_site(user=Depends(current_user)):
    return await _get_site_for_user(user)


def _deep_merge(base: dict, overlay: dict) -> dict:
    """Recursively merge overlay into base. Returns a new dict."""
    out = dict(base)
    for k, v in overlay.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


@api.put("/site")
async def update_site(payload: dict, user=Depends(current_user)):
    """Manual edits — deep-merge theme_config / seo; replace pages list."""
    site = await _get_site_for_user(user)
    updates: dict[str, Any] = {"updated_at": now_iso()}
    if "theme_config" in payload and isinstance(payload["theme_config"], dict):
        updates["theme_config"] = _deep_merge(site.get("theme_config", {}), payload["theme_config"])
    if "seo" in payload and isinstance(payload["seo"], dict):
        updates["seo"] = _deep_merge(site.get("seo", {}), payload["seo"])
    if "pages" in payload:
        updates["pages"] = payload["pages"]
    await db.sites.update_one({"id": site["id"]}, {"$set": updates})

    # Save a version snapshot
    await _snapshot_version(site["id"], site["tenant_id"], user["user_id"], "Manual edit")
    return await db.sites.find_one({"id": site["id"]}, {"_id": 0})


@api.get("/site/public/{slug}")
async def public_site(slug: str):
    site = await db.sites.find_one({"slug": slug}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    tenant = await db.tenants.find_one({"id": site["tenant_id"]}, {"_id": 0})
    return {"site": site, "tenant": {"name": tenant["name"] if tenant else "Site"}}


# ----------------------- Versions -----------------------
async def _snapshot_version(site_id: str, tenant_id: str, user_id: str, summary: str):
    site = await db.sites.find_one({"id": site_id}, {"_id": 0})
    if not site:
        return
    v = Version(site_id=site_id, tenant_id=tenant_id,
                snapshot=site, summary=summary, created_by=user_id).model_dump()
    await db.versions.insert_one(v)


@api.get("/versions")
async def list_versions(user=Depends(current_user)):
    site = await _get_site_for_user(user)
    cursor = db.versions.find({"site_id": site["id"]}, {"_id": 0}).sort("created_at", -1).limit(50)
    return await cursor.to_list(50)


@api.post("/versions/{version_id}/restore")
async def restore_version(version_id: str, user=Depends(current_user)):
    v = await db.versions.find_one({"id": version_id}, {"_id": 0})
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    site = await _get_site_for_user(user)
    if v["site_id"] != site["id"]:
        raise HTTPException(status_code=403, detail="Version belongs to another site")
    snap = v["snapshot"]
    await db.sites.update_one(
        {"id": site["id"]},
        {"$set": {
            "theme_config": snap.get("theme_config", {}),
            "pages": snap.get("pages", []),
            "seo": snap.get("seo", {}),
            "updated_at": now_iso(),
        }},
    )
    await _snapshot_version(site["id"], site["tenant_id"], user["user_id"],
                            f"Restored: {v['summary']}")
    return {"ok": True}


# ----------------------- AI -----------------------
@api.post("/ai/chat", response_model=AIChatResponse)
async def ai_chat(payload: AIChatRequest, user=Depends(current_user)):
    site = await _get_site_for_user(user)
    if site["id"] != payload.site_id:
        raise HTTPException(status_code=403, detail="Site mismatch")

    brain = await db.company_brains.find_one({"tenant_id": site["tenant_id"]}, {"_id": 0})
    context = json.dumps({
        "company_brain": brain or {},
        "theme": site["theme_config"],
        "pages": [{"slug": p["slug"], "sections": [s["id"] for s in p.get("sections", [])]}
                  for p in site.get("pages", [])],
        "seo": site.get("seo", {}),
    }, indent=2)[:4000]

    session_id = f"site-{site['id']}-{user['user_id']}"
    try:
        ai_result = await run_ai(session_id, context, payload.message)
    except Exception as e:
        logger.error(f"AI engine error: {e}")
        ai_result = {
            "assistant_message": f"AI service is temporarily unavailable. ({str(e)[:120]})",
            "tool_calls": [],
        }

    preview_site, diffs = apply_tool_calls(site, ai_result.get("tool_calls", []))

    # Estimate ~1.5 tokens/word both sides for logging
    tokens = len(payload.message.split()) + len(ai_result.get("assistant_message", "").split())
    tokens = int(tokens * 1.5)
    cost = tokens * 0.000003

    log = AIActionLog(
        tenant_id=site["tenant_id"], user_id=user["user_id"],
        action_type="chat", prompt=payload.message,
        response_summary=ai_result.get("assistant_message", "")[:500],
        tools_called=[c.get("name", "?") for c in ai_result.get("tool_calls", [])],
        tokens_used=tokens, cost_usd=cost,
        status="proposed", diff={"changes": diffs, "preview": preview_site},
    ).model_dump()
    await db.ai_logs.insert_one(log)

    # Update tenant counters
    await db.tenants.update_one(
        {"id": site["tenant_id"]},
        {"$inc": {"ai_tokens_used": tokens, "ai_cost_usd": cost}},
    )

    return AIChatResponse(
        log_id=log["id"],
        assistant_message=ai_result.get("assistant_message", ""),
        proposed_changes=diffs,
        preview_site=preview_site,
    )


@api.post("/ai/apply")
async def ai_apply(payload: ApplyChangeRequest, user=Depends(current_user)):
    log = await db.ai_logs.find_one({"id": payload.log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    if log["tenant_id"] != user.get("tenant_id"):
        raise HTTPException(status_code=403, detail="Wrong tenant")

    if not payload.accept:
        await db.ai_logs.update_one({"id": log["id"]}, {"$set": {"status": "rejected"}})
        return {"ok": True, "status": "rejected"}

    preview = log.get("diff", {}).get("preview")
    if not preview:
        raise HTTPException(status_code=400, detail="No preview to apply")
    site = await _get_site_for_user(user)
    await _snapshot_version(site["id"], site["tenant_id"], user["user_id"],
                            f"AI: {log['response_summary'][:80]}")
    await db.sites.update_one(
        {"id": site["id"]},
        {"$set": {
            "theme_config": preview.get("theme_config", {}),
            "pages": preview.get("pages", []),
            "seo": preview.get("seo", {}),
            "updated_at": now_iso(),
        }},
    )
    await db.ai_logs.update_one({"id": log["id"]}, {"$set": {"status": "accepted"}})
    return {"ok": True, "status": "accepted"}


@api.get("/ai/logs")
async def ai_logs(user=Depends(current_user)):
    if not user.get("tenant_id"):
        return []
    cursor = db.ai_logs.find(
        {"tenant_id": user["tenant_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(50)
    docs = await cursor.to_list(50)
    # Strip large preview field for list view
    for d in docs:
        if "diff" in d and "preview" in d["diff"]:
            d["diff"] = {"changes": d["diff"].get("changes", [])}
    return docs


# ----------------------- Team -----------------------
@api.get("/team")
async def list_team(user=Depends(current_user)):
    if not user.get("tenant_id"):
        return []
    cursor = db.users.find(
        {"tenant_id": user["tenant_id"]},
        {"_id": 0, "password_hash": 0},
    )
    return await cursor.to_list(100)


@api.post("/team/invite")
async def invite_team(payload: TeamInvite, user=Depends(current_user)):
    if not user.get("tenant_id"):
        raise HTTPException(status_code=400, detail="No tenant")
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "id": new_id(),
        "email": payload.email,
        "name": payload.email.split("@")[0],
        "role": payload.role,
        "tenant_id": user["tenant_id"],
        "permission": payload.permission,
        "password_hash": hash_password("ChangeMe@123"),
        "created_at": now_iso(),
        "invited": True,
    }
    await db.users.insert_one(user_doc)
    return {"ok": True, "temp_password": "ChangeMe@123"}


# ----------------------- Billing -----------------------
@api.get("/billing")
async def billing(user=Depends(current_user)):
    if not user.get("tenant_id"):
        return {"tenant": None, "records": []}
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    records = await db.billing_records.find(
        {"tenant_id": user["tenant_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"tenant": tenant, "records": records}


# ----------------------- SEO -----------------------
@api.get("/seo")
async def seo(user=Depends(current_user)):
    from scoring import score_site
    site = await _get_site_for_user(user)
    scores = score_site(site)
    return {**site.get("seo", {}),
            "computed": scores,
            "aeo_coverage": scores["aeo"]["score"],
            "geo_readiness": scores["geo"]["score"],
            "seo_score": scores["seo"]["score"]}


@api.put("/seo")
async def update_seo(payload: dict, user=Depends(current_user)):
    site = await _get_site_for_user(user)
    new_seo = {**site.get("seo", {}), **payload}
    await db.sites.update_one({"id": site["id"]}, {"$set": {"seo": new_seo, "updated_at": now_iso()}})
    return new_seo


# ----------------------- Super Admin -----------------------
@api.get("/admin/overview")
async def admin_overview(_=Depends(require_super_admin)):
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(500)
    total_clients = len(tenants)
    mrr = sum(t.get("monthly_revenue", 0) for t in tenants)
    active = sum(1 for t in tenants if t.get("billing_status") == "active")
    trial = sum(1 for t in tenants if t.get("billing_status") == "trial")
    suspended = sum(1 for t in tenants if t.get("billing_status") == "suspended")
    total_tokens = sum(t.get("ai_tokens_used", 0) for t in tenants)
    total_ai_cost = sum(t.get("ai_cost_usd", 0) for t in tenants)
    return {
        "total_clients": total_clients,
        "mrr": mrr,
        "active": active,
        "trial": trial,
        "suspended": suspended,
        "ai_tokens": total_tokens,
        "ai_cost_usd": total_ai_cost,
        "tenants": tenants,
    }


@api.get("/admin/tenants/{tenant_id}")
async def admin_tenant_detail(tenant_id: str, _=Depends(require_super_admin)):
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Not found")
    site = await db.sites.find_one({"tenant_id": tenant_id}, {"_id": 0})
    users = await db.users.find(
        {"tenant_id": tenant_id}, {"_id": 0, "password_hash": 0}
    ).to_list(50)
    logs = await db.ai_logs.find(
        {"tenant_id": tenant_id}, {"_id": 0, "diff": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    billing_records = await db.billing_records.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {
        "tenant": tenant, "site": site, "users": users,
        "ai_logs": logs, "billing": billing_records,
    }


@api.patch("/admin/tenants/{tenant_id}")
async def admin_update_tenant(tenant_id: str, payload: dict, _=Depends(require_super_admin)):
    allowed = {"billing_status", "plan_tier", "setup_fee_paid", "ai_modules"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if updates:
        await db.tenants.update_one({"id": tenant_id}, {"$set": updates})
    return await db.tenants.find_one({"id": tenant_id}, {"_id": 0})


@api.get("/brain")
async def get_brain(user=Depends(current_user)):
    doc = await db.company_brains.find_one({"tenant_id": user.get("tenant_id")}, {"_id": 0})
    return doc or {"tenant_id": user.get("tenant_id")}


@api.put("/brain")
async def put_brain(payload: dict, user=Depends(current_user)):
    payload["tenant_id"] = user["tenant_id"]
    payload["last_updated"] = now_iso()
    await db.company_brains.update_one(
        {"tenant_id": user["tenant_id"]}, {"$set": payload}, upsert=True)
    return await db.company_brains.find_one({"tenant_id": user["tenant_id"]}, {"_id": 0})


@api.post("/dashboard-assistant/chat")
async def dashboard_assistant_chat(payload: dict, user=Depends(current_user)):
    """Read-only tenant assistant. It may update allowlisted Brain fields, never website or repo data."""
    message = str(payload.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    tenant_id = user["tenant_id"]
    site = await db.sites.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}
    brain = await db.company_brains.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}
    workspace = await db.workspace_sessions.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}, sort=[("updated_at", -1)]
    ) or {}
    knowledge = {}
    if workspace.get("id"):
        knowledge = await db.workspace_knowledge.find_one(
            {"workspace_id": workspace["id"], "tenant_id": tenant_id}, {"_id": 0}
        ) or {}

    database_context = {
        "pages": len(site.get("pages", [])),
        "team_members": await db.users.count_documents({"tenant_id": tenant_id}),
        "tasks": await db.tasks.count_documents({"tenant_id": tenant_id}),
        "agent_actions": await db.agent_actions.count_documents({"tenant_id": tenant_id}),
        "roadmaps": await db.roadmaps.count_documents({"tenant_id": tenant_id}),
        "recent_actions": await db.agent_actions.find(
            {"tenant_id": tenant_id}, {"_id": 0, "tenant_id": 0}
        ).sort("created_at", -1).limit(8).to_list(8),
    }
    context = {
        "brain": brain,
        "site": {
            "slug": site.get("slug"),
            "domain": site.get("domain"),
            "seo": site.get("seo", {}),
            "pages": [
                {"slug": page.get("slug"), "section_ids": [s.get("id") for s in page.get("sections", [])]}
                for page in site.get("pages", [])[:30]
            ],
        },
        "repository": {
            "name": workspace.get("repo_full_name") or workspace.get("name"),
            "branch": workspace.get("branch"),
            "structure": knowledge.get("repository_structure", {}),
            "components": knowledge.get("component_graph", [])[:30],
            "routes": knowledge.get("page_graph", [])[:30],
            "apis": knowledge.get("api_graph", [])[:30],
            "symbols": knowledge.get("symbol_index", [])[:40],
            "memory": knowledge.get("memory", {}),
        },
        "database": database_context,
    }
    history = [
        {
            "role": item.get("role"),
            "content": str(item.get("content") or "")[:1600],
        }
        for item in (payload.get("history") or [])[-10:]
        if item.get("role") in {"user", "assistant"}
    ]
    system = (
        "You are Arevei's dashboard assistant. Answer questions using the supplied tenant Brain, website, "
        "repository index, and database summary. You are strictly read-only for website files, repository files, "
        "site content, SEO, settings, tasks, and all database records. Never claim to edit, apply, publish, run, "
        "commit, or change the website. If asked to change the website, explain that Command+K is read-only and "
        "direct the user to AI Workspace. You may update Brain information only when the user explicitly asks. "
        "Allowed Brain keys are business_description, target_audience, brand_voice, goals, and competitors. "
        "Return JSON with {\"answer\": string, \"brain_updates\": object}. brain_updates must be empty unless the "
        "request explicitly asks to update Brain information. Keep answers concise and useful."
    )
    result = await _ask_json(
        f"dashboard-assistant-{tenant_id}-{user['user_id']}",
        system,
        json.dumps({"message": message, "history": history, "context": context}, default=str)[:24000],
    )
    answer = str(result.get("answer") or "").strip()
    if not answer:
        answer = (
            "I can answer questions about your website repository, indexed knowledge, business Brain, and "
            "workspace data. Website changes remain disabled here; use AI Workspace when you want to edit the site."
        )

    allowed_brain_keys = {"business_description", "target_audience", "brand_voice", "goals", "competitors"}
    requested_updates = result.get("brain_updates") if isinstance(result.get("brain_updates"), dict) else {}
    brain_updates = {
        key: str(value).strip()[:4000]
        for key, value in requested_updates.items()
        if key in allowed_brain_keys and str(value).strip()
    }
    updated_brain = None
    if brain_updates:
        brain_updates["last_updated"] = now_iso()
        brain_updates["tenant_id"] = tenant_id
        await db.company_brains.update_one(
            {"tenant_id": tenant_id}, {"$set": brain_updates}, upsert=True
        )
        updated_brain = await db.company_brains.find_one({"tenant_id": tenant_id}, {"_id": 0})

    return {
        "answer": answer,
        "brain_updated": bool(updated_brain),
        "brain": updated_brain,
        "read_only": True,
    }


@api.get("/")
async def root():
    return {"ok": True, "service": "arevei"}


app.include_router(api)
from agent_routes import build_agent_router
app.include_router(build_agent_router(db))
from github_platform import build_github_platform_router
app.include_router(build_github_platform_router(db))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)
