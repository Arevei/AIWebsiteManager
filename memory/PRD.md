# AREVEI — Product Requirements

## Original Problem Statement
Build AREVEI — an **AI Native Website & CMS for Founders**. A multi-tenant SaaS platform where one AI engine (Claude Sonnet 4.6) replaces the need for a developer, designer, copywriter, and SEO agency. Single codebase, multi-tenant, data-driven sites (theme tokens + content JSON), shared theme engine. AI never writes raw HTML/CSS — only structured tool calls that update theme tokens and content blocks.

## User Personas
1. **Super Admin (AREVEI team)** — manages every tenant, sees MRR, AI usage, billing
2. **Agency / Account Manager** — handles assigned managed-tier clients
3. **Founder / Client Admin** — runs their site via the CMS + AI Studio
4. **Team Member** — invited by the founder, role-based access (editor/viewer/admin)

## Stack (decided with user)
- Backend: FastAPI + MongoDB (motor)
- Frontend: React (CRA) + Tailwind + shadcn + Phosphor icons
- AI: Claude Sonnet 4.6 via `emergentintegrations` (EMERGENT_LLM_KEY)
- Auth: JWT (HS256) + bcrypt
- Hosting: Single deployment, tenant sites at `/s/:slug`

## Core Architecture
- Every site = `theme_config` (colors, typography, layout) + `pages[].sections[].content` (JSON), all stored in one collection
- AI tool calls: `update_theme_color`, `update_typography`, `update_component_layout`, `update_content_block`, `generate_blog_post`, `generate_meta_tags`, `suggest_seo_improvements`
- AI flow: chat → JSON tool calls → preview computed → user accepts → snapshot → publish

## ✅ Implemented (2026-06-28)
- **Auth** — JWT signup/login/me, bcrypt, role-based protected routes
- **Multi-tenant DB** — tenants, sites, users, ai_logs, versions, billing_records collections
- **Public marketing landing page** at `/` — hero, problem/solution, how-it-works (4 steps), features, pricing (self-serve + managed), CTA, footer
- **Auth pages** — `/login`, `/signup` with split-screen Swiss design
- **Founder Admin** — `/admin` dashboard with SEO/AEO/GEO + AI usage stats, recent AI actions, plan card
- **AI Studio** — `/admin/ai` chat with Claude Sonnet 4.6, structured tool-call parsing, diff view, Accept/Reject/publish
- **Content Editor** — `/admin/content` page tabs + per-section field editors
- **Design Settings** — `/admin/design` color picker, typography selectors, layout variants, live preview
- **SEO Dashboard** — `/admin/seo` meta tags, schema status, AI suggestions
- **Versions** — `/admin/versions` snapshot list + one-click restore
- **Team** — `/admin/team` invite + member list with permissions
- **Billing** — `/admin/billing` mocked invoice table, fair-use cap meter
- **Super Admin** — `/super` tenant table, MRR/AI cost stats, tenant detail panel, suspend/activate
- **Tenant Site Renderer** — `/s/:slug` renders the seeded site from theme_config + pages JSON (hero, features, testimonials, FAQ with FAQPage schema, CTA, article)
- **Deep merge** on PUT /api/site so partial updates never wipe untouched theme keys
- **Defensive theme defaults** in TenantSite — partial theme_config can't crash the public site
- **Graceful AI fallback** — if Claude fails (budget/network), endpoint returns 200 with empty changes + descriptive message

## Test Credentials
See `/app/memory/test_credentials.md`

## ✅ Phase 2 — AI Website Manager Agent (2026-06-28)
- New collections: `roadmaps`, `monthly_goals`, `tasks`, `agent_actions`, `integrations`, `monthly_reports`, `agent_notifications`
- Agent engine (`/app/backend/agent_engine.py`): structured JSON tool calls for `generate_growth_roadmap`, `parse_founder_strategy`, `generate_monthly_goals`, `decompose_goal_into_tasks`, `generate_monthly_report` — all using `claude-sonnet-4-6`
- Agent routes (`/api/agent/*`): discovery, roadmap activate, goals/tasks generate, daily cycle (manual trigger), actions approve/reject, integrations connect (MOCKED), reports generate, notifications, settings (auto-publish toggle)
- Unified Agent UI page at `/admin/agent` with tabs: Roadmap · Goals & Tasks · Daily Cycle · Integrations · Reports · Activity
- Daily cycle reuses existing AI tool-calling engine — each task produces a proposed change that flows through the same approval/version snapshot pipeline as AI Studio actions
- Verified end-to-end via curl: discovery (4 quarters), 5 goals, 6 tasks, cycle ran 3 tasks → 4 proposed actions with real tool calls (suggest_seo_improvements, generate_blog_post, generate_meta_tags), monthly report generated.

## P1 Backlog
- Real Stripe billing (setup fee + monthly subscription)
- AI streaming responses in chat (SSE)
- Multi-page blog management UI (currently AI-add only)
- Custom-domain mapping for tenants
- Real-time analytics integration (GA / Search Console)
- "Impersonate tenant" mode in Super Admin (with audit log)

## P2 Backlog
- Advanced/Custom Code Mode (gated tier) with sandbox + visual-regression checks
- Additional website templates in the global library
- Email notifications on AI actions / version restores
- Prompt caching to reduce token cost

## Next Tasks
1. Stripe integration when user confirms
2. SSE streaming for AI chat
3. Per-section "Ask AI" inline editor in Content Editor
