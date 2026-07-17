"""Pydantic models for AREVEI."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Auth / User ----------
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "founder_admin"  # super_admin | agency_admin | founder_admin | team_member
    tenant_id: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    company: Optional[str] = None


class UserPublic(UserBase):
    id: str
    tenant_id: Optional[str] = None
    created_at: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


# ---------- Tenant / Site ----------
class TenantCreate(BaseModel):
    name: str
    plan_tier: str = "self_serve"


class Tenant(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    plan_tier: str = "self_serve"  # self_serve | managed
    billing_status: str = "trial"  # trial | active | suspended
    setup_fee_paid: bool = False
    ai_modules: list[str] = Field(default_factory=lambda: ["content", "design", "seo"])
    ai_tokens_used: int = 0
    ai_cost_usd: float = 0.0
    monthly_revenue: float = 0.0
    created_at: str = Field(default_factory=now_iso)


class Site(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    slug: str
    domain: Optional[str] = None
    theme_config: dict[str, Any] = Field(default_factory=dict)
    pages: list[dict[str, Any]] = Field(default_factory=list)
    seo: dict[str, Any] = Field(default_factory=dict)
    published_at: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


# ---------- Versions ----------
class Version(BaseModel):
    id: str = Field(default_factory=new_id)
    site_id: str
    tenant_id: str
    snapshot: dict[str, Any]
    summary: str
    created_by: str
    created_at: str = Field(default_factory=now_iso)


# ---------- AI ----------
class AIActionLog(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    user_id: str
    action_type: str
    prompt: str
    response_summary: str
    tools_called: list[str] = Field(default_factory=list)
    tokens_used: int = 0
    cost_usd: float = 0.0
    status: str = "proposed"  # proposed | accepted | rejected
    diff: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now_iso)


class AIChatRequest(BaseModel):
    site_id: str
    message: str


class AIChatResponse(BaseModel):
    log_id: str
    assistant_message: str
    proposed_changes: list[dict[str, Any]]
    preview_site: dict[str, Any]


class ApplyChangeRequest(BaseModel):
    log_id: str
    accept: bool


# ---------- Team ----------
class TeamInvite(BaseModel):
    email: EmailStr
    role: str = "team_member"  # team_member | founder_admin
    permission: str = "editor"  # editor | viewer | admin


# ---------- Billing ----------
class BillingRecord(BaseModel):
    id: str = Field(default_factory=new_id)
    tenant_id: str
    type: str  # setup | monthly
    amount: float
    status: str  # paid | pending | failed
    description: str = ""
    created_at: str = Field(default_factory=now_iso)
