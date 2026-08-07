"""GitHub development platform routes.

This is the MVP persistent workspace engine: it uses the GitHub API when a
GitHub App is configured, and falls back to a seeded mock repository for local
demos. Runtime compute is provider-neutral so Daytona, DevPod, Coder, or a
managed Kubernetes backend can be wired behind the same workspace API.
"""
from __future__ import annotations

import base64
import asyncio
import difflib
import html
import json
import os
import posixpath
import re
import shlex
import time
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, parse_qs, urlencode, urlsplit, urlunsplit

# pyrefly: ignore [missing-import]
import jwt
import requests
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import StreamingResponse
# pyrefly: ignore [missing-import]
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import current_user, decode_token
from models import new_id, now_iso
import model_router

GITHUB_API = "https://api.github.com"
MAX_INDEX_FILES = 120
MAX_FILE_BYTES = 180_000
MAX_TREE_FILES = 5000
CODEX_AGENT_DIR = "/tmp/arevei-codex-agent"
CODEX_AGENT_TIMEOUT_SECONDS = 1800
CODEX_AGENT_SOURCE_DIR = Path(__file__).with_name("codex_agent")


MOCK_FILES = {
    "README.md": "# Starter App\n\nThis repository is ready for AI-assisted development.\n",
    "package.json": json.dumps(
        {
            "scripts": {"dev": "vite --host 0.0.0.0", "build": "vite build", "preview": "vite preview"},
            "dependencies": {"react": "^18.2.0", "react-dom": "^18.2.0"},
            "devDependencies": {"@vitejs/plugin-react": "^4.2.1", "vite": "^5.1.4"}
        },
        indent=2,
    ),
    "vite.config.js": "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n});\n",
    "tsconfig.json": json.dumps(
        {
            "compilerOptions": {
                "target": "ES2020",
                "useDefineForClassFields": True,
                "lib": ["ES2020", "DOM", "DOM.Iterable"],
                "module": "ESNext",
                "skipLibCheck": True,
                "moduleResolution": "bundler",
                "allowImportingTsExtensions": True,
                "resolveJsonModule": True,
                "isolatedModules": True,
                "noEmit": True,
                "jsx": "react-jsx",
                "strict": True,
                "noUnusedLocals": True,
                "noUnusedParameters": True,
                "noFallthroughCasesInSwitch": True
            },
            "include": ["src"],
            "references": [{ "path": "./tsconfig.node.json" }]
        },
        indent=2,
    ),
    "tsconfig.node.json": json.dumps(
        {
            "compilerOptions": {
                "composite": True,
                "skipLibCheck": True,
                "module": "ESNext",
                "moduleResolution": "bundler",
                "allowSyntheticDefaultImports": True
            },
            "include": ["vite.config.js"]
        },
        indent=2,
    ),
    "index.html": (
        "<!doctype html>\n"
        "<html lang=\"en\">\n"
        "  <head>\n"
        "    <meta charset=\"UTF-8\" />\n"
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n"
        "    <title>AI Workspace App</title>\n"
        "  </head>\n"
        "  <body>\n"
        "    <div id=\"root\"></div>\n"
        "    <script type=\"module\" src=\"/src/main.jsx\"></script>\n"
        "  </body>\n"
        "</html>\n"
    ),
    "src/main.jsx": (
        "import React from 'react';\n"
        "import ReactDOM from 'react-dom/client';\n"
        "import App from './App.jsx';\n"
        "import './index.css';\n\n"
        "ReactDOM.createRoot(document.getElementById('root')).render(\n"
        "  <React.StrictMode>\n"
        "    <App />\n"
        "  </React.StrictMode>,\n"
        ");\n"
    ),
    "src/App.jsx": (
        "import React from 'react';\n\n"
        "const services = ['Website strategy', 'SEO systems', 'Conversion pages'];\n\n"
        "export default function App() {\n"
        "  return (\n"
        "    <main className=\"site-shell\">\n"
        "      <nav className=\"nav\">\n"
        "        <div className=\"brand\"><span className=\"brand-dot\" />DemoBiz</div>\n"
        "        <div className=\"links\"><a href=\"#home\">Home</a><a href=\"#about\">About</a><a href=\"#services\">Services</a><a href=\"#blog\">Blog</a><a href=\"#contact\">Contact</a></div>\n"
        "        <a className=\"nav-cta\" href=\"#contact\">Get In Touch</a>\n"
        "      </nav>\n"
        "      <section id=\"home\" className=\"hero\">\n"
        "        <div className=\"hero-copy\">\n"
        "          <span className=\"eyebrow\">We help brands grow</span>\n"
        "          <h1>We build digital experiences that <strong>drive growth</strong></h1>\n"
        "          <p>DemoBiz helps businesses grow with stunning websites, smart strategy, SEO foundations, and measurable conversion systems.</p>\n"
        "          <div className=\"actions\"><a href=\"#services\">Our Services</a><a href=\"#about\" className=\"ghost\">About Us</a></div>\n"
        "        </div>\n"
        "        <div className=\"house-art\" aria-hidden=\"true\"><span /><span /><span /></div>\n"
        "      </section>\n"
        "      <section className=\"logos\"><span>Trusted by growing brands</span><b>acme</b><b>Cloudify</b><b>Layers</b><b>aven.</b><b>Circooes</b></section>\n"
        "      <section id=\"services\" className=\"cards\">\n"
        "        {services.map((item) => <article key={item}><span /> <h2>{item}</h2><p>Built by Arevei to keep your website sharp, searchable, and ready for leads.</p></article>)}\n"
        "      </section>\n"
        "    </main>\n"
        "  );\n"
        "}\n"
    ),
    "src/index.css": (
        "* { box-sizing: border-box; }\n"
        "body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #070b0f; color: white; }\n"
        "a { color: inherit; text-decoration: none; }\n"
        ".site-shell { min-height: 100vh; background: radial-gradient(circle at 76% 28%, rgba(63, 238, 207, .14), transparent 34%), linear-gradient(135deg, #081018, #05080b 64%, #070b0f); overflow: hidden; }\n"
        ".nav { height: 78px; display: flex; align-items: center; justify-content: space-between; padding: 0 6vw; border-bottom: 1px solid rgba(255,255,255,.08); }\n"
        ".brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; }\n"
        ".brand-dot { width: 14px; height: 14px; border-radius: 999px; background: #c8ff45; box-shadow: 0 0 24px rgba(200,255,69,.5); }\n"
        ".links { display: flex; align-items: center; gap: 34px; color: rgba(255,255,255,.72); font-size: 14px; }\n"
        ".nav-cta, .actions a { border-radius: 10px; background: #c8ff45; color: #071014; padding: 13px 22px; font-weight: 800; font-size: 14px; }\n"
        ".hero { position: relative; min-height: 630px; display: grid; align-items: center; padding: 70px 6vw 90px; }\n"
        ".hero-copy { position: relative; z-index: 2; max-width: 690px; }\n"
        ".eyebrow { display: inline-flex; border: 1px solid rgba(200,255,69,.35); color: #c8ff45; border-radius: 999px; padding: 8px 14px; font-size: 13px; margin-bottom: 28px; }\n"
        "h1 { margin: 0; max-width: 650px; font-size: clamp(46px, 7vw, 76px); line-height: .96; letter-spacing: 0; }\n"
        "h1 strong { color: #c8ff45; font-style: normal; }\n"
        "p { color: rgba(255,255,255,.68); font-size: 18px; line-height: 1.7; max-width: 560px; }\n"
        ".actions { display: flex; gap: 16px; margin-top: 34px; }\n"
        ".actions .ghost { background: transparent; color: white; border: 1px solid rgba(255,255,255,.28); }\n"
        ".house-art { position: absolute; right: 4vw; bottom: 0; width: min(620px, 52vw); height: 480px; opacity: .92; background: linear-gradient(130deg, transparent 0 30%, rgba(255,255,255,.12) 30% 31%, transparent 31%), linear-gradient(100deg, rgba(255,176,83,.18), rgba(255,176,83,.42)); clip-path: polygon(12% 42%, 74% 10%, 100% 27%, 100% 100%, 0 100%, 0 56%); filter: drop-shadow(0 34px 80px rgba(0,0,0,.6)); }\n"
        ".house-art span { position: absolute; background: rgba(255,190,93,.5); border: 1px solid rgba(255,255,255,.18); }\n"
        ".house-art span:nth-child(1) { left: 25%; top: 40%; width: 28%; height: 24%; }\n"
        ".house-art span:nth-child(2) { left: 58%; top: 32%; width: 24%; height: 30%; }\n"
        ".house-art span:nth-child(3) { left: 42%; top: 70%; width: 42%; height: 20%; }\n"
        ".logos { display: flex; align-items: center; justify-content: space-around; gap: 26px; background: white; color: #20252a; padding: 28px 5vw; flex-wrap: wrap; }\n"
        ".logos span { color: #5f6871; font-size: 13px; }\n"
        ".cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; padding: 70px 6vw; }\n"
        ".cards article { border: 1px solid rgba(255,255,255,.1); border-radius: 18px; background: rgba(255,255,255,.035); padding: 26px; }\n"
        ".cards article span { display: block; width: 34px; height: 34px; border-radius: 999px; background: #49e8ca; box-shadow: 0 0 30px rgba(73,232,202,.35); }\n"
        ".cards h2 { margin: 20px 0 8px; }\n"
        "@media (max-width: 780px) { .links { display: none; } .hero { min-height: 620px; } .house-art { opacity: .45; width: 90vw; } .cards { grid-template-columns: 1fr; } }\n"
    ),
}


def build_github_platform_router(db: AsyncIOMotorDatabase) -> APIRouter:
    r = APIRouter(prefix="/api")

    def _app_configured() -> bool:
        if os.environ.get("USE_MOCK_GITHUB", "").lower() == "true":
            return False
        return bool(os.environ.get("GITHUB_APP_ID") and os.environ.get("GITHUB_PRIVATE_KEY"))

    def _runtime_provider() -> dict:
        requested = os.environ.get("WORKSPACE_RUNTIME_PROVIDER", "").strip().lower()
        candidates = [
            ("daytona", "DAYTONA_API_KEY", "DAYTONA_BRIDGE_ENABLED"),
            ("devpod", "DEVPOD_API_KEY", "DEVPOD_BRIDGE_ENABLED"),
            ("coder", "CODER_API_TOKEN", "CODER_BRIDGE_ENABLED"),
            ("gitpod", "GITPOD_TOKEN", "GITPOD_BRIDGE_ENABLED"),
            ("e2b", "E2B_API_KEY", "E2B_BRIDGE_ENABLED"),
        ]
        selected = next((item for item in candidates if item[0] == requested), None)
        if not selected:
            selected = next((item for item in candidates if os.environ.get(item[1])), candidates[0])
        provider, token_key, bridge_key = selected
        configured = bool(os.environ.get(token_key))
        bridge_enabled = (
            os.environ.get("WORKSPACE_RUNTIME_BRIDGE_ENABLED", "").lower() == "true"
            or os.environ.get(bridge_key, "").lower() == "true"
        )
        return {
            "provider": provider if configured else "managed-static",
            "configured": configured,
            "recommended": "daytona",
            "bridge_enabled": bridge_enabled,
            "capabilities": {
                "filesystem": True,
                "commands": configured and bridge_enabled,
                "live_preview": configured and bridge_enabled,
                "snapshots": configured and bridge_enabled,
                "git_persistence": configured and bridge_enabled,
            },
            "setup_hint": (
                "Set DAYTONA_API_KEY or WORKSPACE_RUNTIME_PROVIDER with a provider token to enable persistent workspace compute."
                if not configured
                else f"{provider} credentials detected. Enable WORKSPACE_RUNTIME_BRIDGE_ENABLED=true after wiring the runtime bridge."
                if not bridge_enabled
                else None
            ),
        }

    def _public_base_url() -> str:
        return os.environ.get("PUBLIC_BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL") or ""

    def _preview_proxy_base_url(workspace_id: str) -> str | None:
        domain = (os.environ.get("PREVIEW_BASE_DOMAIN") or os.environ.get("WORKSPACE_PREVIEW_DOMAIN") or "").strip().strip(".")
        if domain:
            return f"https://{workspace_id}.{domain}"
        if os.environ.get("WORKSPACE_PREVIEW_PROXY_MODE", "").strip().lower() != "path":
            return None
        public_base = _public_base_url().rstrip("/")
        if public_base:
            return f"{public_base}/api/workspaces/{workspace_id}/runtime/preview-proxy"
        return None

    def _is_preview_proxy_url(url: str | None, workspace_id: str) -> bool:
        if not url:
            return False
        parsed = urlsplit(url)
        if f"/api/workspaces/{workspace_id}/runtime/preview-proxy" in parsed.path:
            return True
        domain = (os.environ.get("PREVIEW_BASE_DOMAIN") or os.environ.get("WORKSPACE_PREVIEW_DOMAIN") or "").strip().strip(".")
        return bool(domain and parsed.hostname == f"{workspace_id}.{domain}")

    def _github_app_jwt() -> str:
        private_key = os.environ.get("GITHUB_PRIVATE_KEY", "").replace("\\n", "\n")
        app_id = os.environ.get("GITHUB_APP_ID")
        if not private_key or not app_id:
            raise HTTPException(400, "GitHub App is not configured")
        now = int(time.time())
        return jwt.encode({"iat": now - 60, "exp": now + 540, "iss": app_id}, private_key, algorithm="RS256")

    def _gh_request(method: str, path: str, token: str | None = None, **kwargs):
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        kwargs.setdefault("timeout", 30)
        res = requests.request(method, f"{GITHUB_API}{path}", headers=headers, **kwargs)
        if res.status_code >= 400:
            detail = res.text[:500]
            raise HTTPException(res.status_code, f"GitHub API error: {detail}")
        if not res.text:
            return None
        return res.json()

    async def _installation_token(installation_id: int | str) -> str:
        data = _gh_request(
            "POST",
            f"/app/installations/{installation_id}/access_tokens",
            token=_github_app_jwt(),
        )
        return data["token"]

    async def _tenant_id(user: dict) -> str:
        tid = user.get("tenant_id")
        if not tid:
            raise HTTPException(400, "No tenant associated with user")
        return tid

    async def _workspace(workspace_id: str, user: dict) -> dict:
        doc = await db.workspace_sessions.find_one(
            {"id": workspace_id, "tenant_id": user.get("tenant_id")}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(404, "Workspace not found")
        return await _cleanup_pseudo_workspace_paths(doc)

    async def _repo(repo_id: str, user: dict) -> dict:
        doc = await db.repositories.find_one(
            {"id": repo_id, "tenant_id": user.get("tenant_id")}, {"_id": 0}
        )
        if not doc:
            raise HTTPException(404, "Repository not found")
        return doc

    def _mock_tree() -> list[dict]:
        return [
            {"path": path, "type": "blob", "size": len(content.encode()), "language": _language_for_path(path)}
            for path, content in sorted(MOCK_FILES.items())
        ]

    async def _ensure_mock_repo(user: dict) -> dict:
        tid = await _tenant_id(user)
        existing = await db.repositories.find_one(
            {"tenant_id": tid, "provider": "mock", "full_name": "arevei/demo-starter"},
            {"_id": 0},
        )
        if existing:
            if isinstance(existing.get("content"), str):
                fixed = _dedupe_repeated_text(existing.get("content", ""))
                if fixed != existing.get("content"):
                    existing = {**existing, "content": fixed, "updated_at": now_iso()}
                    await db.workspace_files.update_one(
                        {"workspace_id": workspace_id, "path": path},
                        {"$set": {"content": fixed, "updated_at": existing["updated_at"]}},
                    )
            return existing
        repo = {
            "id": new_id(),
            "tenant_id": tid,
            "provider": "mock",
            "installation_id": "mock",
            "github_repo_id": 1,
            "name": "demo-starter",
            "full_name": "arevei/demo-starter",
            "private": False,
            "default_branch": "main",
            "html_url": "https://github.com/arevei/demo-starter",
            "permissions": {"contents": "write", "pull_requests": "write"},
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.repositories.insert_one(repo)
        repo.pop("_id", None)
        return repo

    def _language_for_path(path: str) -> str:
        ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
        return {
            "js": "javascript",
            "jsx": "javascript",
            "ts": "typescript",
            "tsx": "typescript",
            "py": "python",
            "css": "css",
            "html": "html",
            "json": "json",
            "md": "markdown",
            "yml": "yaml",
            "yaml": "yaml",
        }.get(ext, "plaintext")

    def _decode_blob(blob: dict) -> str:
        content = (blob.get("content") or "").replace("\n", "")
        try:
            return base64.b64decode(content).decode("utf-8")
        except UnicodeDecodeError:
            return "[binary file omitted]"

    def _encode_blob(content: str) -> str:
        return base64.b64encode(content.encode("utf-8")).decode("ascii")

    def _manifest_summary(paths: list[str]) -> dict:
        package_manager = "npm"
        if "pnpm-lock.yaml" in paths:
            package_manager = "pnpm"
        elif "yarn.lock" in paths:
            package_manager = "yarn"
        elif "bun.lockb" in paths or "bun.lock" in paths:
            package_manager = "bun"
        return {
            "framework_hints": [
                hint
                for marker, hint in {
                    "package.json": "node/javascript",
                    "vite.config.js": "vite",
                    "next.config.js": "next.js",
                    "requirements.txt": "python",
                    "pyproject.toml": "python",
                    "tailwind.config.js": "tailwind",
                }.items()
                if marker in paths
            ],
            "important_files": [p for p in paths if p in {"package.json", "requirements.txt", "README.md", "pyproject.toml"}],
            "package_manager": package_manager,
        }

    def _initial_context_paths(paths: list[str]) -> list[str]:
        important = {
            "package.json",
            "pnpm-lock.yaml",
            "yarn.lock",
            "bun.lock",
            "bun.lockb",
            "package-lock.json",
            "README.md",
            "tsconfig.json",
            "jsconfig.json",
            "next.config.js",
            "next.config.mjs",
            "next.config.ts",
            "vite.config.js",
            "vite.config.ts",
            "postcss.config.js",
            "tailwind.config.js",
            "tailwind.config.ts",
            ".env.example",
            "index.html",
            "public/index.html",
            "src/App.jsx",
            "src/App.js",
            "src/App.tsx",
            "src/index.js",
            "src/index.jsx",
            "src/index.ts",
            "src/index.tsx",
            "src/main.jsx",
            "src/main.js",
            "src/main.tsx",
            "src/main.ts",
            "app/page.tsx",
            "app/page.jsx",
            "pages/index.tsx",
            "pages/index.jsx",
        }
        selected = [path for path in paths if path in important]
        selected.extend(path for path in paths if path.startswith("src/") and path.endswith((".jsx", ".tsx")) and path not in selected)
        return selected[:30]

    def _runtime_commands(paths: list[str], package_json: str | None = None) -> dict:
        package_manager = _manifest_summary(paths)["package_manager"]
        scripts = {}
        package_lower = (package_json or "").lower()
        if package_json:
            try:
                scripts = json.loads(package_json).get("scripts", {}) or {}
            except Exception:
                scripts = {}
        runner = {
            "pnpm": "pnpm",
            "yarn": "yarn",
            "bun": "bun",
            "npm": "npm run",
        }.get(package_manager, "npm run")
        install = {
            "pnpm": "pnpm install",
            "yarn": "yarn install",
            "bun": "bun install",
            "npm": "npm install",
        }.get(package_manager, "npm install")

        def script(name: str, fallback: str) -> str:
            if name in scripts:
                return f"{runner} {name}" if package_manager == "npm" else f"{package_manager} {name}"
            return fallback

        if "react-scripts" in package_lower and "start" in scripts:
            framework = "create-react-app"
            preview_port = 3000
            dev = script("start", "npm start")
        elif "next" in package_lower:
            framework = "next"
            preview_port = 3000
            dev = script("dev", "npx next dev")
        elif "vite" in package_lower:
            framework = "vite"
            preview_port = 5173
            dev = script("dev", "npx vite")
        elif "dev" in scripts:
            framework = "node"
            preview_port = 3000
            dev = script("dev", "npm run dev")
        else:
            framework = "node"
            preview_port = 3000
            dev = script("start", "npm run dev")
        return {
            "framework": framework,
            "preview_port": preview_port,
            "package_manager": package_manager,
            "install_command": install,
            "dev_command": dev,
            "build_command": script("build", "npm run build"),
            "test_command": script("test", "npm test -- --watch=false"),
            "lint_command": script("lint", "npm run lint"),
        }

    def _route_for_path(path: str) -> str | None:
        normalized = path.replace("\\", "/")
        for prefix in ("app/", "pages/", "src/pages/"):
            if not normalized.startswith(prefix):
                continue
            route = normalized[len(prefix):]
            route = re.sub(r"\.(jsx|tsx|js|ts|mdx)$", "", route)
            route = route.replace("/page", "").replace("index", "")
            route = "/" + route.strip("/")
            return route or "/"
        return None

    def _imported_modules(source: str) -> list[str]:
        modules: list[str] = []
        for match in re.finditer(r"import\s+(?:[\s\S]*?\s+from\s+)?['\"]([^'\"]+)['\"]", source or ""):
            value = match.group(1)
            if value.startswith(".") and value not in modules:
                modules.append(value)
        return modules[:30]

    def _exported_symbols(source: str) -> list[str]:
        symbols: list[str] = []
        patterns = [
            r"export\s+default\s+function\s+([A-Za-z0-9_]+)",
            r"export\s+function\s+([A-Za-z0-9_]+)",
            r"export\s+const\s+([A-Za-z0-9_]+)",
            r"function\s+([A-Z][A-Za-z0-9_]+)",
            r"const\s+([A-Z][A-Za-z0-9_]+)\s*=",
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, source or ""):
                if match.group(1) not in symbols:
                    symbols.append(match.group(1))
        return symbols[:30]

    async def _refresh_workspace_knowledge(workspace_id: str) -> dict:
        workspace = await db.workspace_sessions.find_one({"id": workspace_id}, {"_id": 0})
        files = await _active_files(workspace_id)
        if files:
            paths = [f["path"] for f in files]
        elif workspace:
            paths = [item["path"] for item in workspace.get("tree", [])]
        else:
            paths = []
        source_files = [
            f for f in files
            if f["path"].endswith((".js", ".jsx", ".ts", ".tsx", ".py", ".css", ".json", ".md"))
        ]
        component_graph = []
        api_graph = []
        page_graph = []
        symbol_index = []
        file_embeddings = []
        dependency_graph = []
        for f in source_files:
            path = f["path"]
            content = f.get("content", "")
            route = _route_for_path(path)
            imports = _imported_modules(content)
            exports = _exported_symbols(content)
            if path.endswith((".jsx", ".tsx", ".js", ".ts")):
                component_graph.append({"path": path, "imports": imports, "exports": exports})
            if route:
                page_graph.append({"path": path, "route": route, "imports": imports})
            if "/api/" in path or path.startswith("api/") or path.startswith("backend/"):
                api_graph.append({"path": path, "exports": exports})
            if imports:
                dependency_graph.append({"path": path, "imports": imports})
            if exports:
                symbol_index.append({"path": path, "symbols": exports})
            file_embeddings.append({
                "path": path,
                "status": "placeholder",
                "summary": _safe_text(re.sub(r"\s+", " ", content), 220),
            })
        knowledge = {
            "id": workspace_id,
            "workspace_id": workspace_id,
            "tenant_id": workspace.get("tenant_id") if workspace else None,
            "repository_structure": _manifest_summary(paths),
            "component_graph": component_graph[:80],
            "dependency_graph": dependency_graph[:80],
            "page_graph": page_graph[:80],
            "api_graph": api_graph[:80],
            "file_embeddings": file_embeddings[:120],
            "symbol_index": symbol_index[:120],
            "memory": {
                "status": "indexed",
                "summary": f"Indexed {len(paths)} file path(s), {len(source_files)} loaded source file(s), {len(component_graph)} component/module file(s), and {len(page_graph)} route file(s).",
                "last_task": None,
            },
            "updated_at": now_iso(),
        }
        await db.workspace_knowledge.update_one(
            {"workspace_id": workspace_id},
            {"$set": knowledge, "$setOnInsert": {"created_at": now_iso()}},
            upsert=True,
        )
        await db.workspace_sessions.update_one(
            {"id": workspace_id},
            {"$set": {"index": knowledge["repository_structure"], "knowledge_updated_at": knowledge["updated_at"]}},
        )
        return knowledge

    def _make_diff(path: str, old: str, new: str) -> dict:
        return {
            "path": path,
            "old": old,
            "new": new,
            "patch": "\n".join(
                difflib.unified_diff(
                    old.splitlines(),
                    new.splitlines(),
                    fromfile=f"a/{path}",
                    tofile=f"b/{path}",
                    lineterm="",
                )
            ),
        }

    def _normalize_generated_file_content(path: str, content: str) -> str:
        value = str(content or "").replace("\r\n", "\n")
        stripped = value.strip()
        if not stripped:
            return value

        if len(stripped) % 2 == 0:
            midpoint = len(stripped) // 2
            left = stripped[:midpoint].strip()
            right = stripped[midpoint:].strip()
            if left and left == right:
                value = left + ("\n" if content.endswith(("\n", "\r\n")) else "")
                stripped = value.strip()

        if path.endswith((".js", ".jsx", ".ts", ".tsx")):
            default_count = len(re.findall(r"\bexport\s+default\s+function\b|\bexport\s+default\s+", stripped))
            if default_count > 1:
                starts = [m.start() for m in re.finditer(r"(?:^|\n)import\s+", stripped)]
                if len(starts) > 1:
                    value = stripped[:starts[1]].rstrip() + "\n"
        return value

    def _dedupe_repeated_text(value: str) -> str:
        text = str(value or "")
        normalized = text.replace("\r\n", "\n")
        stripped = normalized.strip()
        if not stripped or len(stripped) % 2:
            return text
        midpoint = len(stripped) // 2
        left = stripped[:midpoint].strip()
        right = stripped[midpoint:].strip()
        if left and left == right:
            suffix = "\n" if normalized.endswith("\n") else ""
            return left + suffix
        return text

    def _make_normalized_diff(path: str, old: str, new: str) -> dict:
        return _make_diff(path, old, _normalize_generated_file_content(path, new))

    def _agent_event(event_type: str, message: str, **extra) -> dict:
        return {
            "id": new_id(),
            "type": event_type,
            "message": message,
            "created_at": now_iso(),
            **extra,
        }

    def _stream_event(event_type: str, message: str, **extra) -> dict:
        aliases = {
            "agent_started": "activity_started",
            "agent_finished": "agent_finished",
            "tool_started": "activity_started",
            "tool_finished": "activity_finished",
            "tool_failed": "error",
            "terminal_output": "command_output",
            "git_changed": "diff_ready",
            "open_file": "file_read",
            "file_edit_started": "file_edit_started",
            "file_edit_finished": "file_edit_finished",
            "message_delta": "message_delta",
        }
        return _agent_event(aliases.get(event_type, event_type), message, raw_type=event_type, **extra)

    def _approval_risk(command: str) -> str:
        lower = (command or "").lower()
        destructive = (" rm ", "rm -", "git reset", "git clean", "drop ", "delete ", "shutdown", "kill ")
        if any(token in f" {lower} " for token in destructive):
            return "high"
        if any(token in lower for token in ("install", "build", "test", "lint", "dev", "start")):
            return "medium"
        return "low"

    def _attachment_context(attachments: list[dict]) -> str:
        if not attachments:
            return ""
        lines = ["\n\nAttached user context files:"]
        for item in attachments[:12]:
            name = item.get("name") or item.get("filename") or item.get("id")
            mime = item.get("mime_type") or "unknown"
            sandbox_path = item.get("sandbox_path") or item.get("stored_path")
            lines.append(f"- {name} ({mime}) at {sandbox_path}")
            preview = (item.get("text_preview") or "").strip()
            if preview:
                lines.append(f"  Preview: {preview[:500]}")
        return "\n".join(lines)

    def _plan_markdown(message: str, attachments: list[dict]) -> str:
        attach_line = ""
        if attachments:
            names = ", ".join((item.get("name") or item.get("filename") or "attachment") for item in attachments[:6])
            attach_line = f"\n- Use attached context: {names}"
        return (
            "## Implementation Plan\n\n"
            "### Goal\n"
            f"- {message.strip()[:500]}\n"
            f"{attach_line}\n\n"
            "### Steps\n"
            "- Inspect the relevant project files before editing.\n"
            "- Make focused changes in the existing code style.\n"
            "- Run only necessary checks after asking for terminal approval when required.\n"
            "- Return changed files, verification notes, and remaining risks.\n"
        )

    def _safe_text(text: str, limit: int = 5000) -> str:
        return (text or "")[:limit]

    def _extract_json_object(text: str) -> dict:
        cleaned = (text or "").strip()
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if not match:
                return {}
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}

    def _response_output_text(data: dict) -> str:
        if data.get("output_text"):
            return data["output_text"]
        chunks: list[str] = []
        for item in data.get("output", []):
            for part in item.get("content", []):
                if part.get("type") in {"output_text", "text"} and part.get("text"):
                    chunks.append(part["text"])
        return "\n".join(chunks)

    def _coding_model_from_payload(value: str | None) -> str:
        allowed = {"gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.2", "gpt-5.3-codex"}
        model = (value or "").strip()
        if model in allowed:
            return model
        return os.environ.get("OPENAI_CODING_MODEL") or os.environ.get("OPENAI_MODEL", "gpt-5.6-sol")

    def _codex_agent_enabled() -> bool:
        return os.environ.get("WORKSPACE_CODEX_AGENT_ENABLED", "").lower() in {"1", "true", "yes", "on"}

    def _codex_agent_api_key() -> str | None:
        return os.environ.get("SANDBOX_OPENAI_API_KEY") or os.environ.get("CODEX_API_KEY") or os.environ.get("OPENAI_API_KEY")

    def _codex_use_existing_sandbox_auth() -> bool:
        return os.environ.get("WORKSPACE_CODEX_USE_SANDBOX_ENV", "").lower() in {"1", "true", "yes", "on"}

    def _codex_agent_timeout_seconds() -> int:
        try:
            return int(os.environ.get("WORKSPACE_CODEX_AGENT_TIMEOUT_SECONDS") or os.environ.get("WORKSPACE_CODEX_AGENT_TIMEOUT") or CODEX_AGENT_TIMEOUT_SECONDS)
        except ValueError:
            return CODEX_AGENT_TIMEOUT_SECONDS

    def _codebase_design_brief(files: list[dict]) -> dict:
        by_path = {f["path"]: f for f in files}
        brand = _extract_brand_context(by_path)
        css_files = [
            {
                "path": f["path"],
                "tokens": sorted(set(re.findall(r"--[a-zA-Z0-9_-]+", f.get("content", ""))))[:80],
                "classes": sorted(set(re.findall(r"\.([a-zA-Z][a-zA-Z0-9_-]+)", f.get("content", ""))))[:120],
                "colors": sorted(set(re.findall(r"#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)", f.get("content", ""))))[:80],
            }
            for f in files
            if f["path"].endswith(".css") and not f["path"].endswith(".min.css")
        ][:8]
        component_files = [
            f["path"] for f in files
            if f["path"].endswith((".jsx", ".tsx", ".js", ".ts")) and (
                "/components/" in f["path"] or f["path"].lower().endswith(("app.jsx", "app.tsx", "page.tsx", "index.tsx"))
            )
        ][:80]
        route_files = [
            f["path"] for f in files
            if any(part in f["path"].lower() for part in ("/pages/", "/app/")) or f["path"].lower().endswith(("router.jsx", "router.tsx"))
        ][:80]
        return {
            "brand": brand,
            "css_files": css_files,
            "component_files": component_files,
            "route_files": route_files,
            "instruction": (
                "Preserve the existing visual system. Reuse current components, class names, CSS variables, spacing, "
                "colors, typography, route conventions, and file naming. Do not replace the app with a generic template. "
                "For new pages, create separate route/page/component files and wire them through the existing routing style. "
                "For homepage expansions, keep the current brand and layout language, add sections where they belong, "
                "and only extend CSS using the existing naming and token style."
            ),
        }

    async def _openai_code_proposal(message: str, files: list[dict], model: str | None = None) -> tuple[str, list[dict]] | None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return None
        design_brief = _codebase_design_brief(files)
        context_files = []
        priority_files = sorted(
            files,
            key=lambda f: (
                0 if f["path"] in {"package.json", "src/App.jsx", "src/App.tsx", "src/index.css", "src/App.css"} else
                1 if f["path"].endswith((".css", ".jsx", ".tsx", ".js", ".ts")) else
                2
            ),
        )
        for f in priority_files[:60]:
            path = f["path"]
            if path.endswith((".png", ".jpg", ".jpeg", ".gif", ".ico", ".lock")):
                continue
            context_files.append({
                "path": path,
                "language": f.get("language", "plaintext"),
                "content": _safe_text(f.get("content", ""), 10000),
            })
        prompt = {
            "task": message,
            "design_brief": design_brief,
            "repository_tree": [f["path"] for f in files[:800]],
            "repo_files": context_files,
            "rules": [
                "Return ONLY valid JSON.",
                "Do not ask the user for repository context. The repository_tree and repo_files in this payload are the available context; produce edits from them.",
                "Never create files named __REQUEST_FOR_REPO_CONTEXT__, REQUEST_CONTEXT, TODO_CONTEXT, or similar.",
                "You are operating a real codebase. Read the provided files and infer the framework, routing style, component structure, and design system before editing.",
                "Make practical code edits across one or more files. Create new files when the task asks for pages, routes, components, policies, contact flows, or larger app structure.",
                "Each change must contain path, content, and reason.",
                "content must be the complete new file content, not a patch.",
                "Do not include unchanged files.",
                "Never duplicate an entire file inside itself.",
                "Never replace the existing design with a generic template unless the user explicitly asks for a redesign.",
                "Reuse existing colors, spacing, typography, class naming, components, route conventions, and page layout patterns.",
                "For a request like many homepage sections plus pages, update/create the necessary Home/page/component files and wire navigation/routes completely.",
                "Prefer cohesive multi-file changes that can be previewed, built, tested, and committed.",
            ],
            "schema": {
                "assistant_message": "short summary",
                "changes": [{"path": "file path", "content": "complete replacement content", "reason": "why"}],
            },
        }
        try:
            res = requests.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": _coding_model_from_payload(model),
                    "input": [
                        {
                            "role": "developer",
                            "content": (
                                "You are Codex inside an AI coding workspace. Produce production-quality code edits as strict JSON. "
                                "Your first responsibility is to preserve and extend the existing project design and architecture. "
                                "Do not use generic placeholder layouts when the repository provides design signals."
                            ),
                        },
                        {"role": "user", "content": json.dumps(prompt)},
                    ],
                },
                timeout=60,
            )
            if res.status_code >= 400:
                detail = res.text[:500]
                raise RuntimeError(f"OpenAI Responses API error {res.status_code}: {detail}")
            parsed = _extract_json_object(_response_output_text(res.json()))
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(f"OpenAI coding request failed: {str(exc)[:500]}") from exc

        by_path = {f["path"]: f for f in files}
        diffs: list[dict] = []
        for change in parsed.get("changes", [])[:8]:
            path = str(change.get("path", "")).strip().replace("\\", "/")
            content = change.get("content")
            if path.startswith("__") or path.upper().startswith("REQUEST_") or path.upper().endswith("_CONTEXT__"):
                continue
            if not path or content is None or path.startswith("../") or "/../" in path:
                continue
            old = by_path.get(path, {}).get("content", "")
            if old == content:
                continue
            diff = _make_normalized_diff(path, old, str(content))
            diff["reason"] = change.get("reason", "")
            diffs.append(diff)
        if not diffs:
            return None
        return parsed.get("assistant_message") or f"I prepared {len(diffs)} file change(s).", diffs

    async def _openai_general_chat(message: str, history: list[dict]) -> str:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return (
                "I can help with planning, product questions, and implementation guidance. "
                "Switch to Project mode when you want me to edit files, run terminal commands, or open a preview."
            )
        recent = [
            {"role": item.get("role", "user"), "content": _safe_text(item.get("content", ""), 1800)}
            for item in history[-12:]
            if item.get("role") in {"user", "assistant"}
        ]
        try:
            res = requests.post(
                "https://api.openai.com/v1/responses",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": os.environ.get("OPENAI_CHAT_MODEL") or os.environ.get("OPENAI_MODEL", "gpt-5.6-terra"),
                    "input": [
                        {
                            "role": "developer",
                            "content": "You are AREVEI's general assistant. Do not propose file edits unless the user explicitly asks to switch to a project workspace.",
                        },
                        *recent,
                        {"role": "user", "content": message},
                    ],
                    "temperature": 0.4,
                },
                timeout=45,
            )
            if res.status_code >= 400:
                raise RuntimeError(res.text[:240])
            return _response_output_text(res.json()) or "I understand. What should we work through next?"
        except Exception as exc:
            return f"General chat is temporarily unavailable. ({str(exc)[:120]})"

    def _extract_brand_context(files_by_path: dict[str, dict]) -> dict:
        app_source = "\n".join(
            str(files_by_path.get(path, {}).get("content", ""))
            for path in ("src/App.jsx", "src/App.tsx", "src/App.js", "app/page.tsx", "pages/index.tsx")
        )
        css_source = "\n".join(
            str(doc.get("content", ""))
            for path, doc in files_by_path.items()
            if path.endswith(".css") and not path.endswith(".min.css")
        )
        brand = "DemoBiz"
        for pattern in (
            r"className=\{[^}]*brand[^}]*\}[^>]*>([^<{]+)",
            r"className=\"[^\"]*brand[^\"]*\"[^>]*>([^<{]+)",
            r"<div className=\"brand\"[^>]*>(?:<span[^>]*>\s*</span>)?([^<{]+)",
        ):
            match = re.search(pattern, app_source)
            if match and match.group(1).strip():
                brand = html.unescape(match.group(1)).strip()
                break
        colors = re.findall(r"#[0-9a-fA-F]{6}", css_source)
        accent = next((color for color in colors if color.lower() not in {"#ffffff", "#000000", "#111111"}), "#0b7f6d")
        dark = next((color for color in colors if color.lower() in {"#111917", "#071014", "#070b0f", "#141917"}), "#111917")
        return {"brand": brand[:40], "accent": accent, "dark": dark}

    def _text_from_jsx(source: str) -> str:
        texts = []
        for tag in ("h1", "h2", "h3", "p", "button"):
            for match in re.finditer(rf"<{tag}[^>]*>([\s\S]*?)</{tag}>", source or "", re.IGNORECASE):
                value = re.sub(r"<[^>]+>", "", match.group(1))
                value = re.sub(r"\{[^}]+\}", "", value)
                value = html.unescape(value).strip()
                if value and value not in texts:
                    texts.append(value)
        return "\n".join(texts)

    def _preview_html(files: list[dict]) -> dict:
        by_path = {f["path"]: f.get("content", "") for f in files}
        css = "\n".join(
            content for path, content in by_path.items()
            if path.endswith(".css") and not path.endswith(".min.css")
        )
        html_file = by_path.get("index.html") or by_path.get("public/index.html")
        if html_file and "<body" in html_file.lower():
            injected = html_file.replace("</head>", f"<style>{css}</style></head>")
            return {"kind": "html", "html": injected}

        app_source = (
            by_path.get("src/App.jsx")
            or by_path.get("src/App.js")
            or by_path.get("app/page.jsx")
            or by_path.get("app/page.tsx")
            or ""
        )
        extracted = _text_from_jsx(app_source)
        if not extracted:
            extracted = "No renderable frontend text found yet.\nAsk AI to create or update a page/component."
        rows = "".join(
            f"<section><p>{html.escape(line)}</p></section>"
            for line in extracted.splitlines()
            if line.strip()
        )
        shell = f"""
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {{ margin: 0; font-family: Inter, system-ui, sans-serif; background: #f4f7f3; color: #17211f; }}
      .preview-root {{ min-height: 100vh; padding: 42px; box-sizing: border-box; }}
      section {{ max-width: 900px; background: white; border: 1px solid #d9dfd7; padding: 26px; margin: 0 0 14px; box-shadow: 0 18px 50px rgba(23,33,31,.06); }}
      section:first-child p {{ font-size: clamp(34px, 7vw, 70px); line-height: .98; font-weight: 900; letter-spacing: 0; color: #111917; }}
      p {{ margin: 0; font-size: 17px; line-height: 1.65; color: #56615d; }}
      {css}
    </style>
  </head>
  <body><main class="preview-root">{rows}</main></body>
</html>
"""
        return {"kind": "static-jsx-preview", "html": shell}

    async def _active_files(workspace_id: str) -> list[dict]:
        files = await db.workspace_files.find(
            {"workspace_id": workspace_id}, {"_id": 0}
        ).sort("path", 1).to_list(1000)
        cleaned = []
        for f in files:
            if _is_pseudo_agent_path(f.get("path")):
                continue
            if isinstance(f.get("content"), str):
                f = {**f, "content": _dedupe_repeated_text(f.get("content", ""))}
            cleaned.append(f)
        return cleaned

    async def _runtime_session(workspace_id: str, user: dict) -> dict | None:
        return await db.runtime_sessions.find_one(
            {"workspace_id": workspace_id, "tenant_id": user.get("tenant_id")},
            {"_id": 0},
        )

    async def _append_runtime_log(runtime_id: str, message: str, level: str = "info"):
        await db.runtime_logs.insert_one({
            "id": new_id(),
            "runtime_id": runtime_id,
            "level": level,
            "message": message,
            "created_at": now_iso(),
        })

    async def _append_workspace_activity(workspace: dict, content: str, role: str = "agent"):
        await db.workspace_chat_messages.insert_one({
            "id": new_id(),
            "tenant_id": workspace["tenant_id"],
            "workspace_id": workspace["id"],
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace.get("repo_id"),
            "user_id": workspace.get("user_id"),
            "role": role,
            "content": content,
            "created_at": now_iso(),
        })

    def _daytona_client():
        try:
            # pyrefly: ignore [missing-import]
            from daytona import Daytona
        except ImportError as exc:
            raise RuntimeError("Install the Daytona Python SDK with `pip install daytona`.") from exc
        return Daytona()

    def _daytona_workspace_labels(runtime: dict) -> dict[str, str]:
        return {
            "arevei": "user-workspace",
            "arevei_user_id": str(runtime.get("user_id") or ""),
            "arevei_tenant_id": str(runtime.get("tenant_id") or ""),
        }

    def _preview_url_value(preview_link: Any) -> str | None:
        if not preview_link:
            return None
        if isinstance(preview_link, dict):
            url = preview_link.get("url")
            token = preview_link.get("token")
        else:
            url = getattr(preview_link, "url", None)
            token = getattr(preview_link, "token", None)
        if url and token and "token=" not in url:
            separator = "&" if "?" in url else "?"
            return f"{url}{separator}token={token}"
        return url

    def _remote_workspace_root(runtime: dict) -> str:
        default_root = f"/home/daytona/workspaces/{runtime.get('workspace_id') or 'project'}"
        root = os.environ.get("DAYTONA_WORKSPACE_ROOT") or runtime.get("root_path") or default_root
        root = root.replace("\\", "/")
        if root.startswith("/workspace"):
            root = default_root
        if not root.startswith("/"):
            root = f"/{root}"
        return posixpath.normpath(root)

    def _remote_file_path(runtime: dict, path: str) -> str:
        clean = posixpath.normpath(path.replace("\\", "/")).lstrip("/")
        if clean.startswith("../") or clean == "..":
            raise ValueError("Unsafe workspace path")
        return posixpath.join(_remote_workspace_root(runtime), clean)

    def _clean_workspace_path(path: str) -> str:
        clean = posixpath.normpath((path or "").replace("\\", "/")).lstrip("/")
        if not clean or clean.startswith("../") or clean == ".." or "/../" in f"/{clean}/":
            raise HTTPException(400, "Unsafe workspace path")
        return clean

    def _safe_attachment_name(name: str) -> str:
        base = posixpath.basename((name or "attachment").replace("\\", "/"))
        safe = re.sub(r"[^a-zA-Z0-9._-]+", "-", base).strip(".-")
        return safe[:120] or "attachment"

    def _attachment_allowed(filename: str, content_type: str | None) -> bool:
        ext = posixpath.splitext(filename.lower())[1]
        allowed_ext = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".txt", ".md", ".json", ".csv", ".html", ".css", ".js", ".jsx", ".ts", ".tsx", ".pdf", ".doc", ".docx"}
        allowed_mime_prefix = ("image/", "text/")
        allowed_mime = {
            "application/json",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        mime = content_type or ""
        return ext in allowed_ext or mime.startswith(allowed_mime_prefix) or mime in allowed_mime

    def _attachment_text_preview(data: bytes, content_type: str | None, filename: str) -> str:
        ext = posixpath.splitext(filename.lower())[1]
        if (content_type or "").startswith("text/") or ext in {".txt", ".md", ".json", ".csv", ".html", ".css", ".js", ".jsx", ".ts", ".tsx"}:
            try:
                return data[:8000].decode("utf-8", errors="replace")[:2000]
            except Exception:
                return ""
        return ""

    def _is_pseudo_agent_path(path: str | None) -> bool:
        value = (path or "").strip().replace("\\", "/")
        upper = value.upper()
        return bool(value.startswith("__") or upper.startswith("REQUEST_") or upper.endswith("_CONTEXT__"))

    def _infer_preview_port(files: list[dict], command: str | None = None) -> int:
        command = command or ""
        port_match = re.search(r"(?:--port|-p|PORT=)\s*(\d{2,5})", command)
        if port_match:
            return int(port_match.group(1))
        package = next((f.get("content", "") for f in files if f.get("path") == "package.json"), "")
        package_lower = package.lower()
        if "vite" in package_lower:
            return 5173
        if "next" in package_lower or "react-scripts" in package_lower:
            return 3000
        return 3000

    def _host_bound_dev_command(files: list[dict], command: str, port: int) -> str:
        package = next((f.get("content", "") for f in files if f.get("path") == "package.json"), "")
        package_lower = package.lower()
        command_lower = command.lower()
        if "--host" in command_lower or "0.0.0.0" in command_lower:
            return command
        if "vite" in package_lower:
            if re.search(r"\b(npm|pnpm|yarn)\s+run\s+dev\b", command):
                return f"{command} -- --host 0.0.0.0 --port {port}"
            return f"{command} --host 0.0.0.0 --port {port}"
        if "next" in package_lower and "-h" not in command_lower and "--hostname" not in command_lower:
            if re.search(r"\b(npm|pnpm|yarn)\s+run\s+dev\b", command):
                return f"{command} -- -H 0.0.0.0 -p {port}"
            return f"{command} -H 0.0.0.0 -p {port}"
        if "react-scripts" in package_lower:
            return f"BROWSER=none HOST=0.0.0.0 PORT={port} {command}"
        return f"HOST=0.0.0.0 PORT={port} {command}"

    def _daytona_sandbox_state(sandbox: Any) -> str:
        state = getattr(sandbox, "state", "")
        value = getattr(state, "value", state)
        return str(value or "").lower()

    def _daytona_wait_for_commands(sandbox: Any, timeout_seconds: int = 75):
        deadline = time.time() + timeout_seconds
        last_error: Exception | None = None
        while time.time() < deadline:
            try:
                sandbox.process.exec("/bin/sh -lc pwd", timeout=15)
                return
            except Exception as exc:
                last_error = exc
                message = str(exc).lower()
                if hasattr(sandbox, "start") and any(token in message for token in ("no ip address", "not started", "stopped", "paused")):
                    try:
                        sandbox.start(timeout=60)
                    except Exception:
                        pass
                time.sleep(3)
        raise RuntimeError(f"Daytona sandbox did not become command-ready: {last_error}")

    def _daytona_exec(sandbox: Any, command: str, cwd: str | None = None, timeout: int | None = None):
        safe_command = command.replace("'", "'\"'\"'")
        try:
            return sandbox.process.exec(f"/bin/sh -lc '{safe_command}'", cwd=cwd, timeout=timeout)
        except Exception as exc:
            if "zsh" not in str(exc).lower():
                raise
            sandbox.process.exec("mkdir -p /usr/bin && ln -sf /bin/sh /usr/bin/zsh", timeout=30)
            return sandbox.process.exec(f"/bin/sh -lc '{safe_command}'", cwd=cwd, timeout=timeout)

    def _daytona_start_sandbox(sandbox: Any):
        state = _daytona_sandbox_state(sandbox)
        if "start" not in state and hasattr(sandbox, "start"):
            sandbox.start(timeout=90)
        if hasattr(sandbox, "wait_for_sandbox_start"):
            sandbox.wait_for_sandbox_start(timeout=90)
        _daytona_wait_for_commands(sandbox)
        return sandbox

    def _daytona_find_reusable_sandbox(daytona: Any, runtime: dict):
        try:
            # pyre-ignore[28,29]
            from daytona import ListSandboxesQuery
            query = ListSandboxesQuery(labels=_daytona_workspace_labels(runtime), limit=20)
            sandboxes = list(daytona.list(query))
        except Exception:
            sandboxes = []
        reusable = [
            sandbox for sandbox in sandboxes
            if not any(token in _daytona_sandbox_state(sandbox) for token in ("destroy", "archive", "deleted"))
        ]
        return reusable[0] if reusable else None

    def _is_daytona_shell_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return "zsh" in message and ("no such file" in message or "fork/exec" in message)

    def _daytona_prepare_git_checkout(sandbox: Any, runtime: dict, repo: dict | None, token: str | None = None):
        root = _remote_workspace_root(runtime)
        if not repo or repo.get("provider") == "mock":
            _daytona_exec(sandbox, f"mkdir -p {shlex.quote(root)}", timeout=60)
            return
        branch = runtime.get("branch") or repo.get("default_branch") or "main"
        full_name = repo.get("full_name")
        if not full_name:
            _daytona_exec(sandbox, f"mkdir -p {shlex.quote(root)}", timeout=60)
            return
        if token:
            repo_url = f"https://x-access-token:{token}@github.com/{full_name}.git"
        else:
            repo_url = f"https://github.com/{full_name}.git"
        command = (
            f"mkdir -p {shlex.quote(posixpath.dirname(root))} && "
            f"if [ -d {shlex.quote(root)}/.git ]; then "
            f"git -C {shlex.quote(root)} fetch origin {shlex.quote(branch)} && "
            f"git -C {shlex.quote(root)} checkout {shlex.quote(branch)}; "
            f"else "
            f"rm -rf {shlex.quote(root)} && "
            f"git clone --depth 1 --branch {shlex.quote(branch)} {shlex.quote(repo_url)} {shlex.quote(root)}; "
            f"fi"
        )
        response = _daytona_exec(sandbox, command, timeout=300)
        result = getattr(response, "result", None)
        code = getattr(result, "code", 0) if result else 0
        if code != 0:
            out = _daytona_exec_output(response)
            raise RuntimeError(f"Git clone failed (code {code}): {out}")

    def _daytona_remove_workspace_folder(runtime: dict):
        sandbox_id = runtime.get("provider_runtime_id")
        if not sandbox_id:
            return
        root = _remote_workspace_root(runtime)
        if not root.startswith("/home/daytona/workspaces/"):
            raise RuntimeError(f"Refusing to delete unsafe Daytona path: {root}")
        sandbox = _daytona_start_sandbox(_daytona_client().get(sandbox_id))
        _daytona_exec(sandbox, f"rm -rf {shlex.quote(root)}", timeout=120)

    def _daytona_create_and_sync(runtime: dict, files: list[dict], sandbox_id: str | None = None, repo: dict | None = None, token: str | None = None) -> dict:
        daytona = _daytona_client()
        sandbox = None
        requested_id = (sandbox_id or runtime.get("provider_runtime_id") or "").strip()
        if requested_id:
            sandbox = daytona.get(requested_id)
        if sandbox is None:
            sandbox = _daytona_find_reusable_sandbox(daytona, runtime)
        reused = sandbox is not None
        if sandbox is None:
            try:
                # pyrefly: ignore [missing-import]
                from daytona import CodeLanguage, CreateSandboxFromSnapshotParams
                sandbox = daytona.create(CreateSandboxFromSnapshotParams(
                    name=f"arevei-{str(runtime.get('workspace_id') or new_id())[:18]}",
                    language=CodeLanguage.JAVASCRIPT,
                    labels=_daytona_workspace_labels(runtime),
                    auto_stop_interval=30,
                    auto_archive_interval=0,
                    auto_delete_interval=-1,
                ))
            except Exception:
                sandbox = daytona.create()
        sandbox = _daytona_start_sandbox(sandbox)
        root = _remote_workspace_root(runtime)
        _daytona_prepare_git_checkout(sandbox, runtime, repo, token)
        _daytona_exec(sandbox, f"mkdir -p {shlex.quote(root)}", timeout=60)
        if repo and repo.get("provider") == "github":
            sync_list = [f for f in files if f.get("content") != f.get("original_content") or not f.get("original_content")]
        else:
            sync_list = files

        for f in sync_list:
            remote_path = _remote_file_path(runtime, f["path"])
            remote_dir = posixpath.dirname(remote_path)
            _daytona_exec(sandbox, f"mkdir -p {shlex.quote(remote_dir)}", timeout=60)
            sandbox.fs.upload_file((f.get("content") or "").encode("utf-8"), remote_path)
        return {"sandbox_id": sandbox.id, "root_path": root, "reused": reused}

    def _daytona_sync_files(runtime: dict, files: list[dict], repo: dict | None = None, token: str | None = None) -> int:
        sandbox_id = runtime.get("provider_runtime_id")
        if not sandbox_id:
            raise RuntimeError("Runtime has no Daytona sandbox id")
        sandbox = _daytona_start_sandbox(_daytona_client().get(sandbox_id))
        root = _remote_workspace_root(runtime)
        _daytona_prepare_git_checkout(sandbox, runtime, repo, token)
        _daytona_exec(sandbox, f"mkdir -p {shlex.quote(root)}", timeout=60)
        if repo and repo.get("provider") == "github":
            sync_list = [f for f in files if f.get("content") != f.get("original_content") or not f.get("original_content")]
        else:
            sync_list = files

        for f in sync_list:
            remote_path = _remote_file_path(runtime, f["path"])
            remote_dir = posixpath.dirname(remote_path)
            _daytona_exec(sandbox, f"mkdir -p {shlex.quote(remote_dir)}", timeout=60)
            sandbox.fs.upload_file((f.get("content") or "").encode("utf-8"), remote_path)
        return len(sync_list)

    def _daytona_workspace_sandbox(runtime: dict):
        sandbox_id = runtime.get("provider_runtime_id")
        if not sandbox_id:
            raise RuntimeError("Runtime has no Daytona sandbox id")
        return _daytona_start_sandbox(_daytona_client().get(sandbox_id))

    def _daytona_read_workspace_file(runtime: dict, path: str) -> dict:
        clean = _clean_workspace_path(path)
        sandbox = _daytona_workspace_sandbox(runtime)
        remote_path = _remote_file_path(runtime, clean)
        response = _daytona_exec(
            sandbox,
            f"if [ -f {shlex.quote(remote_path)} ]; then cat {shlex.quote(remote_path)}; else exit 44; fi",
            timeout=30,
        )
        exit_code = getattr(response, "exit_code", None)
        if exit_code not in (0, None):
            raise HTTPException(404, "File not found in sandbox")
        content = _daytona_exec_output(response, MAX_FILE_BYTES)
        return {
            "workspace_id": runtime.get("workspace_id"),
            "path": clean,
            "content": content,
            "language": _language_for_path(clean),
            "source": "sandbox",
            "updated_at": now_iso(),
        }

    def _daytona_write_workspace_file(runtime: dict, path: str, content: str) -> dict:
        clean = _clean_workspace_path(path)
        sandbox = _daytona_workspace_sandbox(runtime)
        remote_path = _remote_file_path(runtime, clean)
        _daytona_exec(sandbox, f"mkdir -p {shlex.quote(posixpath.dirname(remote_path))}", timeout=60)
        sandbox.fs.upload_file((content or "").encode("utf-8"), remote_path)
        return {
            "workspace_id": runtime.get("workspace_id"),
            "path": clean,
            "content": content or "",
            "language": _language_for_path(clean),
            "source": "sandbox",
            "updated_at": now_iso(),
        }

    def _daytona_git_diff(runtime: dict, paths: list[str] | None = None) -> str:
        sandbox = _daytona_workspace_sandbox(runtime)
        root = _remote_workspace_root(runtime)
        path_args = ""
        if paths:
            path_args = " -- " + " ".join(shlex.quote(_clean_workspace_path(path)) for path in paths)
        response = _daytona_exec(sandbox, f"git diff --no-ext-diff --binary{path_args}", cwd=root, timeout=60)
        return _daytona_exec_output(response, 240_000)

    def _parse_git_status(output: str) -> list[dict]:
        changed: list[dict] = []
        for line in output.splitlines():
            if not line.strip():
                continue
            status = line[:2].strip() or "M"
            path = line[3:] if len(line) > 3 else line[2:].strip()
            if " -> " in path:
                path = path.split(" -> ", 1)[1]
            if path:
                changed.append({"path": path, "status": status, "language": _language_for_path(path)})
        return changed

    def _daytona_git_status(runtime: dict, paths: list[str] | None = None) -> list[dict]:
        sandbox = _daytona_workspace_sandbox(runtime)
        root = _remote_workspace_root(runtime)
        path_args = ""
        if paths:
            path_args = " -- " + " ".join(shlex.quote(_clean_workspace_path(path)) for path in paths)
        response = _daytona_exec(sandbox, f"git status --porcelain{path_args}", cwd=root, timeout=45)
        return _parse_git_status(_daytona_exec_output(response))

    def _daytona_restore_paths(runtime: dict, paths: list[str]) -> int:
        if not paths:
            return 0
        sandbox = _daytona_workspace_sandbox(runtime)
        root = _remote_workspace_root(runtime)
        quoted = " ".join(shlex.quote(_clean_workspace_path(path)) for path in paths)
        _daytona_exec(sandbox, f"git restore --staged --worktree -- {quoted}; git clean -fd -- {quoted}", cwd=root, timeout=90)
        return len(paths)

    def _daytona_list_git_files(runtime: dict, limit: int = MAX_TREE_FILES) -> list[str]:
        sandbox = _daytona_workspace_sandbox(runtime)
        root = _remote_workspace_root(runtime)
        response = _daytona_exec(sandbox, "git ls-files", cwd=root, timeout=45)
        return [line.strip() for line in _daytona_exec_output(response).splitlines() if line.strip()][:limit]

    def _daytona_context_files(runtime: dict, message: str, tree: list[dict]) -> list[dict]:
        try:
            paths = _daytona_list_git_files(runtime)
        except Exception:
            paths = [item["path"] for item in tree]
        lower = message.lower()
        important = _initial_context_paths(paths)
        mentioned = [
            path for path in paths
            if path.lower() in lower or posixpath.basename(path).lower() in lower
        ]
        source_like = [
            path for path in paths
            if path.endswith((".js", ".jsx", ".ts", ".tsx", ".py", ".css", ".json", ".md", ".html"))
        ]
        selected: list[str] = []
        for path in [*mentioned, *important, *source_like]:
            if path not in selected:
                selected.append(path)
            if len(selected) >= 35:
                break
        docs: list[dict] = []
        for path in selected:
            try:
                doc = _daytona_read_workspace_file(runtime, path)
            except Exception:
                continue
            if len(doc.get("content", "").encode("utf-8")) <= MAX_FILE_BYTES:
                docs.append(doc)
        return docs

    def _daytona_exec_output(response: Any, limit: int = 8000) -> str:
        artifacts = getattr(response, "artifacts", None)
        stdout = getattr(artifacts, "stdout", None) if artifacts else None
        stderr = getattr(artifacts, "stderr", None) if artifacts else None
        result = getattr(response, "result", None)
        parts: list[str] = []
        seen: set[str] = set()
        for part in (stdout, stderr, result):
            if not part:
                continue
            value = str(part)
            if value in seen:
                continue
            seen.add(value)
            parts.append(value)
        return "\n".join(parts)[:limit]

    def _codex_agent_package_json() -> str:
        return (CODEX_AGENT_SOURCE_DIR / "package.json").read_text(encoding="utf-8")

    def _codex_agent_index_mjs() -> str:
        return (CODEX_AGENT_SOURCE_DIR / "index.mjs").read_text(encoding="utf-8")

    def _codex_developer_instructions(root: str, preview_pattern: str | None = None) -> str:
        preview_note = (
            f"When you run a web server, bind to 0.0.0.0 and tell the user it is available through {preview_pattern}."
            if preview_pattern else
            "When you run a web server, bind to 0.0.0.0 so AREVEI can create a Daytona preview link."
        )
        return " ".join([
            "You are running as the AREVEI coding agent inside a Daytona sandbox.",
            f"Use {root} as the repository workspace root for all file and terminal work.",
            "Inspect the existing project before editing and preserve its framework, routing, styling, naming, and conventions.",
            preview_note,
            "Make real file edits in the repository; do not return full-file JSON patches.",
            "Use git status and project build/test commands when they help verify the change.",
            "Keep final responses concise and mention changed files, commands run, and any remaining risk.",
        ])

    def _daytona_write_codex_config(sandbox: Any, runtime: dict):
        root = _remote_workspace_root(runtime)
        config_dir = posixpath.join(root, ".codex")
        preview_pattern = None
        if runtime.get("preview_url"):
            preview_pattern = runtime.get("preview_url")
        config = f"developer_instructions = {json.dumps(_codex_developer_instructions(root, preview_pattern))}\n"
        _daytona_exec(sandbox, f"mkdir -p {shlex.quote(config_dir)}", timeout=60)
        sandbox.fs.upload_file(config.encode("utf-8"), posixpath.join(config_dir, "config.toml"))

    def _daytona_install_codex_agent(sandbox: Any):
        _daytona_exec(sandbox, f"mkdir -p {shlex.quote(CODEX_AGENT_DIR)}", timeout=60)
        sandbox.fs.upload_file(_codex_agent_package_json().encode("utf-8"), f"{CODEX_AGENT_DIR}/package.json")
        sandbox.fs.upload_file(_codex_agent_index_mjs().encode("utf-8"), f"{CODEX_AGENT_DIR}/index.mjs")
        node_response = _daytona_exec(sandbox, "node --version", timeout=30)
        node_exit = getattr(node_response, "exit_code", None)
        if node_exit not in (0, None):
            raise RuntimeError(f"Node.js 18+ is required in the Daytona sandbox: {_daytona_exec_output(node_response, 1200)}")
        response = _daytona_exec(
            sandbox,
            "if [ ! -d node_modules/@openai/codex-sdk ]; then npm install --silent; else echo 'Codex SDK dependencies already installed.'; fi",
            cwd=CODEX_AGENT_DIR,
            timeout=900,
        )
        exit_code = getattr(response, "exit_code", None)
        if exit_code not in (0, None):
            raise RuntimeError(f"Codex SDK dependency install failed: {_daytona_exec_output(response, 4000)}")
        import_response = _daytona_exec(
            sandbox,
            "node -e \"import('@openai/codex-sdk').then(() => console.log('Codex SDK ready'))\"",
            cwd=CODEX_AGENT_DIR,
            timeout=60,
        )
        import_exit = getattr(import_response, "exit_code", None)
        if import_exit not in (0, None):
            raise RuntimeError(f"Codex SDK package is unavailable: {_daytona_exec_output(import_response, 2000)}")

    def _daytona_prepare_codex_agent(runtime: dict) -> dict:
        sandbox = _daytona_workspace_sandbox(runtime)
        _daytona_write_codex_config(sandbox, runtime)
        _daytona_install_codex_agent(sandbox)
        return {"ok": True, "agent_dir": CODEX_AGENT_DIR}

    def _codex_agent_env_path(runtime: dict) -> str:
        workspace_id = str(runtime.get("workspace_id") or "workspace")
        safe = re.sub(r"[^a-zA-Z0-9_.-]", "_", workspace_id)
        return f"{CODEX_AGENT_DIR}/env-{safe}.sh"

    def _daytona_write_codex_env(sandbox: Any, runtime: dict, prompt: str, model: str | None, effort: str | None = None) -> str | None:
        api_key = _codex_agent_api_key()
        if not api_key and not _codex_use_existing_sandbox_auth():
            raise RuntimeError("Set SANDBOX_OPENAI_API_KEY, CODEX_API_KEY, OPENAI_API_KEY, or WORKSPACE_CODEX_USE_SANDBOX_ENV=true to run the Codex SDK agent.")
        env = {
            "PROMPT": prompt,
            "WORKSPACE_ROOT": _remote_workspace_root(runtime),
            "WORKSPACE_ID": runtime.get("workspace_id") or "workspace",
            "CODEX_MODEL": model or os.environ.get("OPENAI_CODING_MODEL") or os.environ.get("OPENAI_MODEL", ""),
            "CODEX_EFFORT": effort or "medium",
            "OPENAI_BASE_URL": os.environ.get("OPENAI_BASE_URL", ""),
        }
        if api_key:
            env["OPENAI_API_KEY"] = api_key
            env["CODEX_API_KEY"] = api_key
        lines = [
            "#!/bin/sh",
            "# Generated by AREVEI for one Codex SDK agent turn.",
            *[f"export {key}={shlex.quote(str(value))}" for key, value in env.items() if value is not None],
        ]
        env_path = _codex_agent_env_path(runtime)
        sandbox.fs.upload_file(("\n".join(lines) + "\n").encode("utf-8"), env_path)
        _daytona_exec(sandbox, f"chmod 600 {shlex.quote(env_path)}", timeout=30)
        return env_path

    def _codex_agent_command(runtime: dict) -> str:
        env_path = _codex_agent_env_path(runtime)
        return f"set -a; . {shlex.quote(env_path)}; set +a; node {shlex.quote(CODEX_AGENT_DIR + '/index.mjs')}"

    def _daytona_run_codex_agent(runtime: dict, prompt: str, model: str | None, on_event=None, effort: str | None = None) -> dict:
        sandbox = _daytona_workspace_sandbox(runtime)
        _daytona_write_codex_config(sandbox, runtime)
        _daytona_install_codex_agent(sandbox)
        _daytona_write_codex_env(sandbox, runtime, prompt, model, effort)
        response = _daytona_exec(
            sandbox,
            _codex_agent_command(runtime),
            cwd=_remote_workspace_root(runtime),
            timeout=_codex_agent_timeout_seconds(),
        )
        output = _daytona_exec_output(response, 500_000)
        events: list[dict] = []
        codex_events: list[dict] = []
        final_response = ""
        usage = None
        thread_id = None
        for raw in output.splitlines():
            raw = raw.strip()
            if not raw:
                continue
            try:
                item = json.loads(raw)
            except json.JSONDecodeError:
                events.append(_agent_event("terminal_output", raw[:700], name="codex"))
                continue
            if item.get("type") == "agent_event":
                event = item.get("event") or {}
                message = event.get("message") or "Codex event."
                mapped = _stream_event(
                    _map_codex_event_type(event.get("kind") or event.get("item_type")),
                    message,
                    name=event.get("item_type") or event.get("kind"),
                    command=event.get("command"),
                    output=_safe_text(event.get("output") or "", 2400),
                    path=event.get("path"),
                    paths=event.get("paths") or [],
                    status=event.get("status"),
                    plan_markdown=event.get("plan_markdown"),
                    thread_id=event.get("thread_id"),
                )
                events.append(mapped)
                if on_event:
                    on_event(mapped)
            elif item.get("type") == "codex_event":
                codex_events.append(item.get("event") or {})
            elif item.get("type") == "result":
                final_response = item.get("finalResponse") or ""
                usage = item.get("usage")
                thread_id = item.get("threadId")
            elif item.get("type") == "error":
                raise RuntimeError(item.get("detail") or "Codex agent failed")
        exit_code = getattr(response, "exit_code", None)
        if exit_code not in (0, None):
            raise RuntimeError(f"Codex agent failed with exit code {exit_code}: {output[-4000:]}")
        return {
            "assistant_message": final_response or "Codex completed the workspace task.",
            "events": events,
            "codex_events": codex_events[-200:],
            "usage": usage,
            "thread_id": thread_id,
        }

    async def _daytona_stream_codex_agent(runtime: dict, prompt: str, model: str | None, effort: str | None = None):
        sandbox = _daytona_workspace_sandbox(runtime)
        _daytona_write_codex_config(sandbox, runtime)
        _daytona_install_codex_agent(sandbox)
        _daytona_write_codex_env(sandbox, runtime, prompt, model, effort)
        try:
            from daytona import SessionExecuteRequest
        except ImportError as exc:
            raise RuntimeError("Daytona SDK SessionExecuteRequest is unavailable.") from exc

        session_id = f"arevei-codex-{new_id()[:12]}"
        command = _codex_agent_command(runtime)
        sandbox.process.create_session(session_id, request_timeout=30)
        response = sandbox.process.execute_session_command(
            session_id,
            SessionExecuteRequest(command=command, run_async=True, suppress_input_echo=True),
            timeout=30,
        )
        command_id = getattr(response, "cmd_id", None)
        if not command_id:
            raise RuntimeError("Daytona did not return a command id for the Codex agent session.")

        queue: asyncio.Queue[dict | None] = asyncio.Queue()
        stdout_buffer = ""
        stderr_buffer = ""
        final: dict[str, Any] = {
            "assistant_message": "",
            "events": [],
            "codex_events": [],
            "usage": None,
            "thread_id": None,
            "stdout": "",
            "stderr": "",
            "session_id": session_id,
            "command_id": command_id,
        }

        async def emit(data: dict):
            await queue.put(data)

        async def handle_stdout(chunk: str):
            nonlocal stdout_buffer
            final["stdout"] += chunk
            stdout_buffer += chunk
            lines = stdout_buffer.splitlines(keepends=True)
            stdout_buffer = ""
            if lines and not lines[-1].endswith(("\n", "\r")):
                stdout_buffer = lines.pop()
            for raw in lines:
                text = raw.strip()
                if text:
                    await _handle_codex_stream_line(text, final, emit)

        async def handle_stderr(chunk: str):
            nonlocal stderr_buffer
            final["stderr"] += chunk
            stderr_buffer += chunk
            if len(stderr_buffer) > 1200:
                text = stderr_buffer.strip().splitlines()[0] if stderr_buffer.strip() else "Codex stderr output received."
                event = _agent_event("tool_failed", text[:700], name="codex_stderr")
                final["events"].append(event)
                await emit({"type": "event", "event": event})
                stderr_buffer = ""

        async def consume_logs():
            try:
                await sandbox.process.get_session_command_logs_async(session_id, command_id, handle_stdout, handle_stderr)
                if stdout_buffer.strip():
                    await _handle_codex_stream_line(stdout_buffer.strip(), final, emit)
                if stderr_buffer.strip():
                    text = stderr_buffer.strip().splitlines()[0]
                    event = _agent_event("tool_failed", text[:700], name="codex_stderr")
                    final["events"].append(event)
                    await emit({"type": "event", "event": event})
                cmd = sandbox.process.get_session_command(session_id, command_id, request_timeout=30)
                final["exit_code"] = getattr(cmd, "exit_code", None)
                if final["exit_code"] not in (0, None):
                    raise RuntimeError(f"Codex agent exited with code {final['exit_code']}.")
            except Exception as exc:
                await emit({"type": "error", "detail": str(exc)[:900]})
            finally:
                try:
                    sandbox.process.delete_session(session_id, request_timeout=15)
                except Exception:
                    pass
                await queue.put(None)

        task = asyncio.create_task(consume_logs())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                yield item
        finally:
            if not task.done():
                task.cancel()
        yield {"type": "codex_final", "result": final}

    async def _handle_codex_stream_line(line_text: str, final: dict, emit):
        try:
            item = json.loads(line_text)
        except json.JSONDecodeError:
            event = _stream_event("terminal_output", line_text[:900], name="codex")
            final.setdefault("events", []).append(event)
            await emit({"type": "event", "event": event})
            return

        if item.get("type") == "agent_event":
            event = item.get("event") or {}
            mapped = _stream_event(
                _map_codex_event_type(event.get("kind") or event.get("item_type")),
                event.get("message") or "Codex event.",
                name=event.get("item_type") or event.get("kind"),
                command=event.get("command"),
                output=_safe_text(event.get("output") or "", 2400),
                path=event.get("path"),
                paths=event.get("paths") or [],
                status=event.get("status"),
                plan_markdown=event.get("plan_markdown"),
                thread_id=event.get("thread_id"),
            )
            final.setdefault("events", []).append(mapped)
            await emit({"type": "event", "event": mapped})
        elif item.get("type") == "codex_event":
            event = item.get("event") or {}
            final.setdefault("codex_events", []).append(event)
        elif item.get("type") == "delta":
            text = item.get("text") or ""
            if text:
                await emit({"type": "delta", "text": text})
        elif item.get("type") == "result":
            final["assistant_message"] = item.get("finalResponse") or final.get("assistant_message") or ""
            final["usage"] = item.get("usage")
            final["thread_id"] = item.get("threadId")
        elif item.get("type") == "error":
            await emit({"type": "error", "detail": item.get("detail") or "Codex agent failed"})

    class CodexDaytonaAgentRunner:
        def __init__(self, runtime: dict, model: str | None):
            self.runtime = runtime
            self.model = model

        @property
        def available(self) -> bool:
            return bool(
                _codex_agent_enabled()
                and self.runtime
                and self.runtime.get("provider") == "daytona"
                and self.runtime.get("capabilities", {}).get("commands")
                and self.runtime.get("provider_runtime_id")
            )

        def prepare(self) -> dict:
            return _daytona_prepare_codex_agent(self.runtime)

        async def stream(self, prompt: str, effort: str | None = None):
            async for item in _daytona_stream_codex_agent(self.runtime, prompt, self.model, effort):
                yield item

    def _map_codex_event_type(kind: str | None) -> str:
        value = (kind or "").lower()
        if "error" in value or "failed" in value:
            return "tool_failed"
        if "plan" in value or "todo" in value:
            return "plan_created"
        if "command" in value:
            return "tool_finished" if "completed" in value or "finished" in value else "tool_started"
        if "file" in value:
            return "file_edit_finished" if "completed" in value else "file_edit_started"
        if "agent_message" in value:
            return "message_delta"
        if "reasoning" in value:
            return "activity_started"
        if "turn_completed" in value or "turn_finished" in value or "codex_turn_finished" in value:
            return "agent_finished"
        if "started" in value:
            return "agent_started"
        return "tool_finished"

    def _daytona_dev_log(sandbox: Any) -> str:
        try:
            response = _daytona_exec(sandbox, "tail -n 160 /tmp/arevei-dev.log 2>/dev/null || true", timeout=20)
            return _daytona_exec_output(response)
        except Exception as exc:
            return f"Could not read dev server log: {str(exc)[:240]}"

    def _daytona_wait_for_http(sandbox: Any, port: int, timeout_seconds: int = 120) -> tuple[bool, str]:
        deadline = time.time() + timeout_seconds
        last_output = ""
        while time.time() < deadline:
            try:
                response = _daytona_exec(
                    sandbox,
                    f"curl -fsS --max-time 5 http://127.0.0.1:{port}/ >/dev/null",
                    timeout=10,
                )
                exit_code = getattr(response, "exit_code", None)
                last_output = _daytona_exec_output(response)
                if exit_code in (0, None):
                    return True, last_output
            except Exception as exc:
                last_output = str(exc)
            time.sleep(2)
        return False, last_output

    def _daytona_run_command(runtime: dict, files: list[dict], command: str) -> dict:
        sandbox_id = runtime.get("provider_runtime_id")
        if not sandbox_id:
            raise RuntimeError("Runtime has no Daytona sandbox id")
        sandbox = _daytona_start_sandbox(_daytona_client().get(sandbox_id))
        root = _remote_workspace_root(runtime)
        is_dev_server = any(token in command for token in (
            "npm run dev",
            "npm run start",
            "npm start",
            "yarn dev",
            "yarn start",
            "pnpm dev",
            "pnpm start",
            "next dev",
            "vite",
            "react-scripts start",
        ))
        if is_dev_server:
            port = _infer_preview_port(files, command)
            dev_command = _host_bound_dev_command(files, command, port)
            install_command = runtime.get("install_command") or _runtime_commands(
                [f.get("path", "") for f in files],
                next((f.get("content") for f in files if f.get("path") == "package.json"), None),
            )["install_command"]
            dependency_output = ""
            try:
                install_response = _daytona_exec(
                    sandbox,
                    (
                        "if [ -f package.json ] && "
                        "( [ ! -d node_modules ] || (grep -qi '\"vite\"' package.json && [ ! -x node_modules/.bin/vite ]) ); "
                        f"then {install_command}; "
                        "else echo 'Dependencies already installed.'; fi"
                    ),
                    cwd=root,
                    timeout=900,
                )
                dependency_output = (
                    getattr(getattr(install_response, "artifacts", None), "stdout", None)
                    or getattr(install_response, "result", "")
                    or ""
                )
                install_exit = getattr(install_response, "exit_code", None)
                if install_exit not in (0, None):
                    return {
                        "status": "command_failed",
                        "output": f"Dependency install failed before preview startup.\n\n{dependency_output}",
                        "exit_code": install_exit,
                        "preview_port": port,
                    }
            except Exception as exc:
                return {
                    "status": "command_failed",
                    "output": f"Dependency install failed before preview startup: {str(exc)[:600]}",
                    "exit_code": 1,
                    "preview_port": port,
                }
            _daytona_exec(
                sandbox,
                f"rm -f /tmp/arevei-dev.log; (lsof -ti:{port} 2>/dev/null | xargs -r kill 2>/dev/null || true); nohup /bin/sh -lc {shlex.quote(dev_command)} > /tmp/arevei-dev.log 2>&1 &",
                cwd=root,
                timeout=30,
            )
            ready, probe_output = _daytona_wait_for_http(sandbox, port)
            log_tail = _daytona_dev_log(sandbox)
            if not ready:
                return {
                    "status": "command_failed",
                    "output": (
                        f"Started `{dev_command}` on Daytona sandbox {sandbox_id}, but port {port} did not become ready within 120 seconds.\n\n"
                        f"Dependency check:\n{dependency_output[-2000:] or '(none)'}\n\n"
                        f"Probe output:\n{probe_output or '(none)'}\n\n"
                        f"Dev server log:\n{log_tail or '(empty)'}"
                    ),
                    "exit_code": 1,
                    "preview_port": port,
                }
            try:
                preview_link = sandbox.create_signed_preview_url(port, expires_in_seconds=60 * 60 * 24)
            except Exception:
                preview_link = sandbox.get_preview_link(port)
            return {
                "status": "preview_ready",
                "output": f"Started `{dev_command}` on Daytona sandbox {sandbox_id}. Port {port} is responding.\n\nDependency check:\n{dependency_output[-2000:] or '(none)'}\n\nDev server log:\n{log_tail}",
                "preview_url": _preview_url_value(preview_link),
                "preview_port": port,
            }
        response = _daytona_exec(sandbox, command, cwd=root, timeout=900)
        stdout = getattr(getattr(response, "artifacts", None), "stdout", None) or getattr(response, "result", "")
        exit_code = getattr(response, "exit_code", None)
        return {
            "status": "command_succeeded" if exit_code in (0, None) else "command_failed",
            "output": stdout or f"`{command}` finished with exit code {exit_code}.",
            "exit_code": exit_code,
        }

    async def _upgrade_runtime_to_current_provider(runtime: dict, workspace_id: str) -> dict:
        provider = _runtime_provider()
        needs_provider_update = runtime.get("provider") != provider["provider"]
        needs_capability_update = runtime.get("capabilities") != provider["capabilities"]
        needs_daytona_sandbox = (
            provider["provider"] == "daytona"
            and provider["capabilities"]["commands"]
            and not runtime.get("provider_runtime_id")
        )
        if not (needs_provider_update or needs_capability_update or needs_daytona_sandbox):
            return runtime

        files = await _active_files(workspace_id)
        workspace = await db.workspace_sessions.find_one({"id": workspace_id}, {"_id": 0}) or {}
        repo = await db.repositories.find_one({"id": workspace.get("repo_id") or runtime.get("repo_id")}, {"_id": 0})
        token = await _installation_token(repo["installation_id"]) if repo and repo.get("provider") == "github" else None
        updates: dict[str, Any] = {
            "provider": provider["provider"],
            "provider_configured": provider["configured"],
            "capabilities": provider["capabilities"],
            "setup_hint": provider["setup_hint"],
            "updated_at": now_iso(),
        }
        if needs_daytona_sandbox:
            upgraded = {**runtime, **updates}
            try:
                bridge = _daytona_create_and_sync(upgraded, files, repo=repo, token=token)
                updates.update({
                    "provider_runtime_id": bridge["sandbox_id"],
                    "root_path": bridge["root_path"],
                    "status": "ready",
                    "preview_mode": "external_runtime",
                    "note": "Daytona sandbox is ready. Commands run inside the persistent workspace.",
                    "files_synced": len(files),
                })
                action = "Reused" if bridge.get("reused") else "Created"
                await _append_runtime_log(runtime["id"], f"{action} Daytona sandbox {bridge['sandbox_id']} while upgrading runtime.")
            except Exception as exc:
                updates.update({
                    "status": "bridge_error",
                    "note": f"Daytona bridge failed: {str(exc)[:240]}",
                })
                await _append_runtime_log(runtime["id"], updates["note"], "error")
        await db.runtime_sessions.update_one({"id": runtime["id"]}, {"$set": updates})
        runtime.update(updates)
        return runtime

    async def _create_project_chat_workspace(
        user: dict,
        repo: dict,
        branch: str,
        mode: str,
        tree: list[dict],
        git_meta: dict,
        source: str,
        initial_prompt: str | None = None,
    ) -> tuple[dict, dict, dict]:
        project = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "user_id": user["user_id"],
            "repo_id": repo["id"],
            "name": repo.get("name") or "Untitled app",
            "repo_full_name": repo.get("full_name"),
            "default_branch": branch,
            "root_directory": "",
            "framework": "unknown",
            "source": source,
            "status": "active",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        chat = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "user_id": user["user_id"],
            "project_id": project["id"],
            "title": (initial_prompt or f"Work on {project['name']}")[:80],
            "branch": f"arevei/chat-{new_id()[:8]}",
            "status": "active",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        workspace = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "user_id": user["user_id"],
            "project_id": project["id"],
            "chat_id": chat["id"],
            "repo_id": repo["id"],
            "repo_full_name": repo["full_name"],
            "branch": branch,
            "working_branch": chat["branch"],
            "mode": mode,
            "status": "loaded",
            "tree": tree,
            "index": _manifest_summary([item["path"] for item in tree]),
            "git": git_meta,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        project["active_chat_id"] = chat["id"]
        project["active_workspace_id"] = workspace["id"]
        chat["workspace_id"] = workspace["id"]
        await db.projects.insert_one(project)
        await db.project_chats.insert_one(chat)
        await db.workspace_sessions.insert_one(workspace)
        await db.developer_states.update_one(
            {"tenant_id": user["tenant_id"], "user_id": user["user_id"]},
            {"$set": {
                "tenant_id": user["tenant_id"],
                "user_id": user["user_id"],
                "active_project_id": project["id"],
                "active_chat_id": chat["id"],
                "active_workspace_id": workspace["id"],
                "active_repo_id": repo["id"],
                "updated_at": now_iso(),
            }, "$setOnInsert": {"id": new_id(), "created_at": now_iso()}},
            upsert=True,
        )
        project.pop("_id", None)
        chat.pop("_id", None)
        workspace.pop("_id", None)
        return project, chat, workspace

    async def _load_real_repo(repo: dict, branch: str) -> tuple[list[dict], dict]:
        token = await _installation_token(repo["installation_id"])
        owner, name = repo["full_name"].split("/", 1)
        ref = _gh_request("GET", f"/repos/{owner}/{name}/git/ref/heads/{branch}", token=token)
        sha = ref["object"]["sha"]
        tree = _gh_request("GET", f"/repos/{owner}/{name}/git/trees/{sha}?recursive=1", token=token)
        blobs = []
        for item in tree.get("tree", []):
            if item.get("type") == "blob" and item.get("size", 0) <= MAX_FILE_BYTES:
                blobs.append({
                    "path": item["path"],
                    "sha": item.get("sha"),
                    "size": item.get("size", 0),
                    "type": "blob",
                    "language": _language_for_path(item["path"]),
                })
        important = set(_initial_context_paths([item["path"] for item in blobs]))
        files = [item for item in blobs if item["path"] in important]
        files.extend(item for item in blobs if item["path"] not in important)
        files = files[:MAX_TREE_FILES]
        return files, {"head_sha": sha, "tree_sha": tree.get("sha")}

    async def _fetch_real_file(repo: dict, path: str, branch: str) -> dict:
        token = await _installation_token(repo["installation_id"])
        owner, name = repo["full_name"].split("/", 1)
        data = _gh_request("GET", f"/repos/{owner}/{name}/contents/{path}?ref={branch}", token=token)
        if isinstance(data, list):
            raise HTTPException(400, "Path is a directory")
        return {
            "path": path,
            "content": _decode_blob(data),
            "sha": data.get("sha"),
            "size": data.get("size", 0),
            "language": _language_for_path(path),
        }

    async def _ensure_runtime_bootstrap_files(workspace: dict, repo: dict) -> int:
        if repo.get("provider") != "github":
            return 0
        existing = {f["path"] for f in await _active_files(workspace["id"])}
        paths = [item["path"] for item in workspace.get("tree", [])]
        required = [path for path in _initial_context_paths(paths) if path not in existing]
        loaded = 0
        for path in required:
            try:
                fetched = await _fetch_real_file(repo, path, workspace.get("branch") or repo.get("default_branch") or "main")
                if fetched.get("content") == "[binary file omitted]":
                    continue
                await _upsert_workspace_file(workspace["id"], fetched["path"], fetched["content"], fetched["content"])
                loaded += 1
            except Exception:
                continue
        return loaded

    async def _workspace_file(workspace_id: str, path: str) -> dict | None:
        return await db.workspace_files.find_one(
            {"workspace_id": workspace_id, "path": path}, {"_id": 0}
        )

    async def _upsert_workspace_file(workspace_id: str, path: str, content: str, original: str | None = None):
        existing = await _workspace_file(workspace_id, path)
        doc = {
            "workspace_id": workspace_id,
            "path": path,
            "content": content,
            "language": _language_for_path(path),
            "updated_at": now_iso(),
        }
        if original is not None:
            doc["original_content"] = original
        elif existing and "original_content" in existing:
            doc["original_content"] = existing["original_content"]
        else:
            doc["original_content"] = content
        await db.workspace_files.update_one(
            {"workspace_id": workspace_id, "path": path},
            {"$set": doc, "$setOnInsert": {"id": new_id(), "created_at": now_iso()}},
            upsert=True,
        )

    async def _ensure_tree_file(workspace: dict, path: str):
        path = _clean_workspace_path(path)
        if any(item.get("path") == path for item in workspace.get("tree", [])):
            return
        await _add_tree_entry(workspace, path, "file")
        workspace.setdefault("tree", []).append({
            "path": path,
            "type": "blob",
            "size": 0,
            "language": _language_for_path(path),
        })

    async def _set_workspace_tree(workspace_id: str, tree: list[dict]):
        tree = [item for item in tree if not _is_pseudo_agent_path(item.get("path"))]
        tree = sorted(tree, key=lambda item: (item.get("type") != "tree", item.get("path", "")))
        await db.workspace_sessions.update_one(
            {"id": workspace_id},
            {"$set": {"tree": tree[:MAX_TREE_FILES], "index": _manifest_summary([item["path"] for item in tree if item.get("type") == "blob"]), "updated_at": now_iso()}},
        )

    async def _cleanup_pseudo_workspace_paths(workspace: dict) -> dict:
        bad_paths = [item.get("path") for item in workspace.get("tree", []) if _is_pseudo_agent_path(item.get("path"))]
        if bad_paths:
            await db.workspace_files.delete_many({"workspace_id": workspace["id"], "path": {"$in": bad_paths}})
            tree = [item for item in workspace.get("tree", []) if item.get("path") not in bad_paths]
            await _set_workspace_tree(workspace["id"], tree)
            workspace = {**workspace, "tree": tree}
        return workspace

    async def _add_tree_entry(workspace: dict, path: str, item_type: str):
        path = _clean_workspace_path(path)
        tree = [item for item in workspace.get("tree", []) if item.get("path") != path]
        tree.append({
            "path": path,
            "type": "tree" if item_type == "folder" else "blob",
            "size": 0,
            "language": "folder" if item_type == "folder" else _language_for_path(path),
        })
        await _set_workspace_tree(workspace["id"], tree)

    async def _remove_tree_entries(workspace: dict, path: str) -> list[str]:
        path = _clean_workspace_path(path)
        prefix = f"{path}/"
        removed = [item["path"] for item in workspace.get("tree", []) if item.get("path") == path or item.get("path", "").startswith(prefix)]
        tree = [item for item in workspace.get("tree", []) if item.get("path") not in removed]
        await _set_workspace_tree(workspace["id"], tree)
        return removed

    async def _rename_tree_entries(workspace: dict, old_path: str, new_path: str) -> list[tuple[str, str]]:
        old_path = _clean_workspace_path(old_path)
        new_path = _clean_workspace_path(new_path)
        prefix = f"{old_path}/"
        mappings: list[tuple[str, str]] = []
        tree: list[dict] = []
        for item in workspace.get("tree", []):
            item_path = item.get("path", "")
            if item_path == old_path or item_path.startswith(prefix):
                renamed = new_path + item_path[len(old_path):]
                mappings.append((item_path, renamed))
                tree.append({**item, "path": renamed, "language": item.get("language") if item.get("type") == "tree" else _language_for_path(renamed)})
            else:
                tree.append(item)
        if not mappings:
            tree.append({"path": new_path, "type": "blob", "size": 0, "language": _language_for_path(new_path)})
            mappings.append((old_path, new_path))
        await _set_workspace_tree(workspace["id"], tree)
        return mappings

    def _daytona_delete_workspace_path(runtime: dict, path: str):
        sandbox = _daytona_workspace_sandbox(runtime)
        remote_path = _remote_file_path(runtime, _clean_workspace_path(path))
        _daytona_exec(sandbox, f"rm -rf {shlex.quote(remote_path)}", timeout=60)

    def _daytona_rename_workspace_path(runtime: dict, old_path: str, new_path: str):
        sandbox = _daytona_workspace_sandbox(runtime)
        old_remote = _remote_file_path(runtime, _clean_workspace_path(old_path))
        new_remote = _remote_file_path(runtime, _clean_workspace_path(new_path))
        _daytona_exec(sandbox, f"mkdir -p {shlex.quote(posixpath.dirname(new_remote))} && mv {shlex.quote(old_remote)} {shlex.quote(new_remote)}", timeout=60)

    async def _build_ai_proposal(workspace: dict, message: str, context_files: list[dict] | None = None, model: str | None = None) -> tuple[str, list[dict]]:
        files = context_files if context_files is not None else await _active_files(workspace["id"])
        by_path = {f["path"]: f for f in files}
        paths = [f["path"] for f in files]
        lower = message.lower()
        diffs: list[dict] = []

        openai_result = await _openai_code_proposal(message, files, model)
        if not openai_result and context_files is not None:
            cached_files = await _active_files(workspace["id"])
            cached_paths = {f["path"] for f in cached_files}
            merged = [*files]
            merged.extend(f for f in cached_files if f["path"] not in {item["path"] for item in merged})
            if len(cached_paths) > len({f["path"] for f in files}):
                openai_result = await _openai_code_proposal(message, merged, model)
        if openai_result:
            return openai_result

        target_path = None
        for path in by_path:
            if path.lower() in lower:
                target_path = path
                break

        wants_ui = any(word in lower for word in ("create", "new", "feature", "landing", "dashboard", "component", "page", "ui", "website", "design"))
        if wants_ui or not files:
            return (
                "A coding model is required for broad UI/app edits so I can preserve this project design instead of using a template. Configure OPENAI_API_KEY and OPENAI_CODING_MODEL.",
                [],
            )

        if "readme" in lower:
            target_path = "README.md"
        if not target_path:
            target_path = next((p for p in by_path if p.endswith(("App.jsx", "App.js", "README.md"))), files[0]["path"])

        current = by_path[target_path]["content"]
        if "fix" in lower or "bug" in lower:
            new = current.replace("TODO", "Done").rstrip()
            if new == current.rstrip():
                new += "\n\n// AI fix: added a safe guard point for the requested bug. Share the error stack for a surgical patch.\n"
        elif "refactor" in lower:
            new = current.rstrip() + "\n\n// AI refactor: next step is extracting repeated logic from this file into named helpers.\n"
        elif "explain" in lower or "understand" in lower:
            return f"{target_path} has {len(current.splitlines())} lines. I can propose edits when you ask for a concrete change.", []
        else:
            new = current.rstrip() + f"\n\n// AI implementation note: {message[:220].replace(chr(10), ' ')}\n"
        diffs.append(_make_normalized_diff(target_path, current, new))
        return f"I applied a focused edit touching {target_path}.", diffs

    async def _run_agent_runtime_intent(workspace: dict, message: str, user: dict) -> str | None:
        lower = message.lower()
        runtime = await _runtime_session(workspace["id"], user)
        if not runtime or runtime.get("provider") != "daytona" or not runtime.get("capabilities", {}).get("commands"):
            return None
        command = None
        if "install" in lower:
            command = runtime.get("install_command")
        elif "run dev" in lower or "start dev" in lower or "preview" in lower:
            command = runtime.get("dev_command")
        elif "build" in lower:
            command = runtime.get("build_command")
        elif "test" in lower:
            command = runtime.get("test_command")
        elif "lint" in lower or "debug" in lower:
            command = runtime.get("lint_command")
        if not command:
            return None
        files = await _active_files(workspace["id"])
        repo = await _repo(workspace["repo_id"], user)
        repo_token = await _installation_token(repo["installation_id"]) if repo.get("provider") == "github" else None
        _daytona_sync_files(runtime, files, repo=repo, token=repo_token)
        await _append_workspace_activity(workspace, f"Agent selected runtime command `{command}` from project configuration.")
        result = _daytona_run_command(runtime, files, command)
        updates = {
            "status": result["status"],
            "last_command": command,
            "last_exit_code": result.get("exit_code"),
            "updated_at": now_iso(),
        }
        if result.get("preview_url"):
            updates["direct_preview_url"] = result["preview_url"]
            updates["preview_proxy_url"] = _preview_proxy_base_url(workspace["id"])
            updates["preview_url"] = updates["preview_proxy_url"] or result["preview_url"]
            updates["preview_port"] = result.get("preview_port")
        await db.runtime_sessions.update_one({"id": runtime["id"]}, {"$set": updates})
        await _append_runtime_log(runtime["id"], result.get("output", "Command completed."))
        await _append_workspace_activity(workspace, result.get("output", "Command completed."))
        return result.get("output")

    @r.get("/github/install/start")
    async def github_install_start(user=Depends(current_user)):
        tid = await _tenant_id(user)
        if not _app_configured():
            repo = await _ensure_mock_repo(user)
            await db.github_installations.update_one(
                {"tenant_id": tid, "installation_id": "mock"},
                {"$set": {
                    "id": new_id(),
                    "tenant_id": tid,
                    "installation_id": "mock",
                    "account_login": "arevei",
                    "status": "connected",
                    "mode": "mock",
                    "updated_at": now_iso(),
                }},
                upsert=True,
            )
            return {"mode": "mock", "connected": True, "repo": repo}

        state = new_id()
        await db.github_oauth_states.insert_one({
            "id": state,
            "tenant_id": tid,
            "user_id": user["user_id"],
            "created_at": now_iso(),
        })
        slug = os.environ.get("GITHUB_APP_SLUG")
        if not slug:
            raise HTTPException(400, "GITHUB_APP_SLUG is required")
        params = urlencode({"state": state})
        return {"mode": "github_app", "url": f"https://github.com/apps/{slug}/installations/new?{params}"}

    @r.get("/github/install/callback")
    async def github_install_callback(request: Request, installation_id: str | None = None, setup_action: str | None = None, state: str | None = None, user=Depends(current_user)):
        tid = await _tenant_id(user)
        if not installation_id:
            raise HTTPException(400, "Missing installation_id")
        if state:
            known = await db.github_oauth_states.find_one({"id": state, "tenant_id": tid})
            if not known:
                raise HTTPException(400, "Invalid installation state")
        account_login = "github"
        try:
            installation = _gh_request("GET", f"/app/installations/{installation_id}", token=_github_app_jwt())
            account_login = installation.get("account", {}).get("login") or account_login
        except Exception:
            pass
        doc = {
            "id": new_id(),
            "tenant_id": tid,
            "installation_id": installation_id,
            "account_login": account_login,
            "status": "connected",
            "setup_action": setup_action,
            "callback_url": str(request.url),
            "updated_at": now_iso(),
        }
        await db.github_installations.update_one(
            {"tenant_id": tid, "installation_id": installation_id},
            {"$set": doc, "$setOnInsert": {"created_at": now_iso()}},
            upsert=True,
        )
        return {"ok": True, "installation": doc}

    @r.get("/github/repos")
    async def github_repos(user=Depends(current_user)):
        tid = await _tenant_id(user)
        if not _app_configured():
            await _ensure_mock_repo(user)
        installations = await db.github_installations.find({"tenant_id": tid}, {"_id": 0}).to_list(50)
        sync_errors: list[dict] = []

        if _app_configured():
            for inst in installations:
                try:
                    token = await _installation_token(inst["installation_id"])
                    data = _gh_request("GET", "/installation/repositories?per_page=100", token=token)
                except HTTPException as e:
                    detail = str(e.detail)
                    if e.status_code == 404:
                        detail = (
                            "This saved GitHub installation is stale or belongs to a different GitHub App. "
                            "Reconnect GitHub from the import modal."
                        )
                        await db.repositories.delete_many(
                            {"tenant_id": tid, "installation_id": inst.get("installation_id")}
                        )
                    sync_errors.append({
                        "installation_id": inst.get("installation_id"),
                        "account_login": inst.get("account_login"),
                        "status_code": e.status_code,
                        "detail": detail,
                    })
                    await db.github_installations.update_one(
                        {"tenant_id": tid, "installation_id": inst.get("installation_id")},
                        {"$set": {"status": "stale" if e.status_code == 404 else "sync_error", "last_error": detail, "updated_at": now_iso()}},
                    )
                    continue
                for repo_data in data.get("repositories", []):
                    repo = {
                        "id": f"github-{repo_data['id']}",
                        "tenant_id": tid,
                        "provider": "github",
                        "installation_id": inst["installation_id"],
                        "github_repo_id": repo_data["id"],
                        "name": repo_data["name"],
                        "full_name": repo_data["full_name"],
                        "private": repo_data["private"],
                        "default_branch": repo_data.get("default_branch") or "main",
                        "html_url": repo_data.get("html_url"),
                        "permissions": repo_data.get("permissions", {}),
                        "updated_at": now_iso(),
                    }
                    await db.repositories.update_one(
                        {"tenant_id": tid, "id": repo["id"]},
                        {"$set": repo, "$setOnInsert": {"created_at": now_iso()}},
                        upsert=True,
                    )

        repos = await db.repositories.find({"tenant_id": tid}, {"_id": 0}).sort("full_name", 1).to_list(200)
        if sync_errors:
            installations = await db.github_installations.find({"tenant_id": tid}, {"_id": 0}).to_list(50)
        return {
            "installations": installations,
            "repositories": repos,
            "github_configured": _app_configured(),
            "sync_errors": sync_errors,
        }

    @r.delete("/github/installations")
    async def clear_github_installations(user=Depends(current_user)):
        tid = await _tenant_id(user)
        results = {}
        for coll in (
            "github_installations",
            "repositories",
            "workspace_sessions",
            "workspace_files",
            "workspace_knowledge",
            "ai_change_sets",
            "commit_jobs",
            "deployment_jobs",
            "runtime_sessions",
            "runtime_logs",
            "developer_states",
            "workspace_chat_messages",
            "projects",
            "project_chats",
        ):
            res = await db[coll].delete_many({"tenant_id": tid})
            results[coll] = res.deleted_count
        return {"ok": True, "deleted": results}

    def _api_public_base_url(request: Request | None = None) -> str:
        configured = (
            os.environ.get("PUBLIC_API_URL")
            or os.environ.get("BACKEND_PUBLIC_URL")
            or os.environ.get("REACT_APP_BACKEND_URL")
        )
        if configured:
            return configured.rstrip("/")
        if request:
            return str(request.base_url).rstrip("/")
        return "http://localhost:8000"

    @r.get("/vercel/install/start")
    async def vercel_install_start(request: Request, redirect_uri: str = None, return_to: str = None, user=Depends(current_user)):
        tid = await _tenant_id(user)
        client_id = os.environ.get("VERCEL_CLIENT_ID")
        if not client_id:
            raise HTTPException(400, "VERCEL_CLIENT_ID is not configured in backend environment")
        active_redirect_uri = (
            redirect_uri
            or os.environ.get("VERCEL_REDIRECT_URI")
            or f"{_api_public_base_url(request)}/api/vercel/install/callback"
        )
        
        state = new_id()
        await db.vercel_oauth_states.insert_one({
            "id": state,
            "tenant_id": tid,
            "user_id": user["user_id"],
            "redirect_uri": active_redirect_uri,
            "return_to": return_to,
            "created_at": now_iso(),
        })
        
        params = {"client_id": client_id, "state": state, "redirect_uri": active_redirect_uri}
        return {"url": f"https://vercel.com/oauth/authorize?{urlencode(params)}"}

    @r.get("/vercel/install/callback")
    async def vercel_install_callback(code: str = None, state: str = None):
        # Vercel redirects the browser here without the app's bearer token. The
        # stored random state is the authority for the pending tenant/user.
        if not code or not state:
            raise HTTPException(400, "Missing Vercel authorization code or state")
        
        known = await db.vercel_oauth_states.find_one({"id": state})
        if not known:
            raise HTTPException(400, "Invalid installation state (session expired or mismatched)")
            
        client_id = os.environ.get("VERCEL_CLIENT_ID")
        client_secret = os.environ.get("VERCEL_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise HTTPException(400, "Vercel OAuth credentials (Client ID / Secret) are not configured on the server")
            
        try:
            # We must use exactly the same redirect_uri that was used in the authorize step
            active_redirect_uri = known.get("redirect_uri") or os.environ.get("VERCEL_REDIRECT_URI") or f"{_api_public_base_url()}/api/vercel/install/callback"
            resp = requests.post(
                "https://api.vercel.com/v2/oauth/access_token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": active_redirect_uri
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10
            )
            resp.raise_for_status()
            token_data = resp.json()
        except Exception as e:
            raise HTTPException(400, f"Failed to exchange Vercel token: {str(e)}")
            
        await db.vercel_installations.update_one(
            {"tenant_id": known["tenant_id"]},
            {"$set": {
                "access_token": token_data.get("access_token"),
                "team_id": token_data.get("team_id"),
                "user_id": token_data.get("user_id"),
                "updated_at": now_iso()
            }},
            upsert=True
        )
        # Clear the state to prevent replay
        await db.vercel_oauth_states.delete_one({"id": state})
        
        # pyrefly: ignore [missing-import]
        from fastapi.responses import RedirectResponse
        return_to = known.get("return_to") or os.environ.get("FRONTEND_PUBLIC_URL") or "/"
        separator = "&" if "?" in return_to else "?"
        return RedirectResponse(url=f"{return_to}{separator}vercel=connected")


    @r.post("/repos/{repo_id}/load")
    async def load_repo(repo_id: str, payload: dict, user=Depends(current_user)):
        repo = await _repo(repo_id, user)
        branch = payload.get("branch") or repo.get("default_branch") or "main"
        mode = payload.get("mode") or "ai_branch"
        if repo.get("provider") == "mock":
            tree = _mock_tree()
            git_meta = {"head_sha": "mock-head", "tree_sha": "mock-tree"}
        else:
            tree, git_meta = await _load_real_repo(repo, branch)
        project, chat, workspace = await _create_project_chat_workspace(
            user=user,
            repo=repo,
            branch=branch,
            mode=mode,
            tree=tree,
            git_meta=git_meta,
            source="github_import",
            initial_prompt=payload.get("initial_prompt"),
        )
        if repo.get("provider") == "mock":
            for path, content in MOCK_FILES.items():
                await _upsert_workspace_file(workspace["id"], path, content, content)
        else:
            import asyncio
            initial_paths = _initial_context_paths([item["path"] for item in tree])
            
            async def fetch_and_upsert(path):
                try:
                    fetched = await _fetch_real_file(repo, path, branch)
                    await _upsert_workspace_file(workspace["id"], fetched["path"], fetched["content"], fetched["content"])
                except Exception:
                    pass

            tasks = [fetch_and_upsert(entry["path"]) for entry in tree if entry["path"] in initial_paths]
            if tasks:
                await asyncio.gather(*tasks)
        active_files = await _active_files(workspace["id"])
        package_json = next((f.get("content") for f in active_files if f.get("path") == "package.json"), None)
        runtime_config = _runtime_commands([item["path"] for item in tree], package_json)
        await db.workspace_sessions.update_one(
            {"id": workspace["id"]},
            {"$set": {"runtime_config": runtime_config, "updated_at": now_iso()}},
        )
        workspace["runtime_config"] = runtime_config
        await _refresh_workspace_knowledge(workspace["id"])
        workspace["project"] = project
        workspace["chat"] = chat
        return workspace

    @r.post("/projects/start")
    async def start_project_from_prompt(payload: dict, user=Depends(current_user)):
        prompt = (payload.get("prompt") or "").strip()
        if not prompt:
            raise HTTPException(400, "Prompt is required")
        repo = await _ensure_mock_repo(user)
        tree = _mock_tree()
        project, chat, workspace = await _create_project_chat_workspace(
            user=user,
            repo={**repo, "name": payload.get("name") or "AI generated app", "full_name": "arevei/generated-workspace"},
            branch="main",
            mode="prompt_first",
            tree=tree,
            git_meta={"head_sha": "prompt-start", "tree_sha": "prompt-tree"},
            source="prompt",
            initial_prompt=prompt,
        )
        for path, content in MOCK_FILES.items():
            await _upsert_workspace_file(workspace["id"], path, content, content)
        active_files = await _active_files(workspace["id"])
        package_json = next((f.get("content") for f in active_files if f.get("path") == "package.json"), None)
        runtime_config = _runtime_commands([item["path"] for item in tree], package_json)
        await db.workspace_sessions.update_one(
            {"id": workspace["id"]},
            {"$set": {"runtime_config": runtime_config, "updated_at": now_iso()}},
        )
        workspace["runtime_config"] = runtime_config
        await _refresh_workspace_knowledge(workspace["id"])
        workspace["project"] = project
        workspace["chat"] = chat
        return workspace

    @r.get("/workspaces/current")
    async def current_workspace(user=Depends(current_user)):
        state = await db.developer_states.find_one(
            {"tenant_id": user.get("tenant_id"), "user_id": user["user_id"]}, {"_id": 0}
        )
        if not state or not state.get("active_workspace_id"):
            return {"workspace": None}
        workspace = await db.workspace_sessions.find_one(
            {"id": state["active_workspace_id"], "tenant_id": user.get("tenant_id")}, {"_id": 0}
        )
        if not workspace:
            return {"workspace": None}
        project = await db.projects.find_one(
            {"id": workspace.get("project_id"), "tenant_id": user.get("tenant_id")}, {"_id": 0}
        )
        chat = await db.project_chats.find_one(
            {"id": workspace.get("chat_id"), "tenant_id": user.get("tenant_id")}, {"_id": 0}
        )
        files = await _active_files(workspace["id"])
        loaded = {f["path"] for f in files}
        tree = [{**item, "loaded": item["path"] in loaded} for item in workspace.get("tree", [])]
        changes = await db.ai_change_sets.find(
            {"workspace_id": workspace["id"], "tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        messages = await db.workspace_chat_messages.find(
            {"workspace_id": workspace["id"], "tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(300)
        runtime = await _runtime_session(workspace["id"], user)
        logs = []
        if runtime:
            logs = await db.runtime_logs.find(
                {"runtime_id": runtime["id"]}, {"_id": 0}
            ).sort("created_at", 1).to_list(200)
        knowledge = await db.workspace_knowledge.find_one(
            {"workspace_id": workspace["id"], "tenant_id": user.get("tenant_id")}, {"_id": 0}
        )
        return {
            "project": project,
            "chat": chat,
            "workspace": workspace,
            "tree": tree,
            "loaded_files": files,
            "knowledge": knowledge,
            "changes": changes,
            "messages": messages,
            "runtime": runtime,
            "runtime_logs": logs,
            "provider": _runtime_provider(),
        }

    @r.get("/workspaces")
    async def list_workspaces(user=Depends(current_user)):
        await _tenant_id(user)
        workspaces = await db.workspace_sessions.find(
            {"tenant_id": user["tenant_id"], "user_id": user["user_id"]}, {"_id": 0}
        ).sort("updated_at", -1).limit(50).to_list(50)
        project_ids = [w.get("project_id") for w in workspaces if w.get("project_id")]
        chat_ids = [w.get("chat_id") for w in workspaces if w.get("chat_id")]
        projects = {
            p["id"]: p
            for p in await db.projects.find(
                {"id": {"$in": project_ids}, "tenant_id": user["tenant_id"]}, {"_id": 0}
            ).to_list(50)
        }
        chats = {
            c["id"]: c
            for c in await db.project_chats.find(
                {"id": {"$in": chat_ids}, "tenant_id": user["tenant_id"]}, {"_id": 0}
            ).to_list(50)
        }
        return {
            "workspaces": [
                {
                    **workspace,
                    "project": projects.get(workspace.get("project_id")),
                    "chat": chats.get(workspace.get("chat_id")),
                }
                for workspace in workspaces
            ]
        }

    @r.get("/general-chats")
    async def list_general_chats(user=Depends(current_user)):
        await _tenant_id(user)
        chats = await db.general_chats.find(
            {"tenant_id": user["tenant_id"], "user_id": user["user_id"]}, {"_id": 0}
        ).sort("updated_at", -1).limit(50).to_list(50)
        return {"chats": chats}

    @r.get("/general-chats/{chat_id}")
    async def get_general_chat(chat_id: str, user=Depends(current_user)):
        await _tenant_id(user)
        chat = await db.general_chats.find_one(
            {"id": chat_id, "tenant_id": user["tenant_id"], "user_id": user["user_id"]}, {"_id": 0}
        )
        if not chat:
            raise HTTPException(404, "Chat not found")
        messages = await db.general_chat_messages.find(
            {"chat_id": chat_id, "tenant_id": user["tenant_id"], "user_id": user["user_id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(300)
        return {"chat": chat, "messages": messages}

    @r.delete("/general-chats/{chat_id}")
    async def delete_general_chat(chat_id: str, user=Depends(current_user)):
        await _tenant_id(user)
        chat = await db.general_chats.find_one(
            {"id": chat_id, "tenant_id": user["tenant_id"], "user_id": user["user_id"]}, {"_id": 0}
        )
        if not chat:
            raise HTTPException(404, "Chat not found")
        await db.general_chat_messages.delete_many(
            {"chat_id": chat_id, "tenant_id": user["tenant_id"], "user_id": user["user_id"]}
        )
        await db.general_chats.delete_one({"id": chat_id, "tenant_id": user["tenant_id"]})
        return {"ok": True, "deleted": chat_id}

    @r.post("/general-chats")
    async def general_chat(payload: dict, user=Depends(current_user)):
        await _tenant_id(user)
        message = (payload.get("message") or "").strip()
        if not message:
            raise HTTPException(400, "Message is required")
        chat_id = payload.get("chat_id")
        chat = None
        if chat_id:
            chat = await db.general_chats.find_one(
                {"id": chat_id, "tenant_id": user["tenant_id"], "user_id": user["user_id"]}, {"_id": 0}
            )
        if not chat:
            chat = {
                "id": new_id(),
                "tenant_id": user["tenant_id"],
                "user_id": user["user_id"],
                "title": message[:80],
                "kind": "general",
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            await db.general_chats.insert_one(chat)
        history = await db.general_chat_messages.find(
            {"chat_id": chat["id"], "tenant_id": user["tenant_id"], "user_id": user["user_id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(300)
        user_message = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "user_id": user["user_id"],
            "chat_id": chat["id"],
            "role": "user",
            "content": message,
            "created_at": now_iso(),
        }
        await db.general_chat_messages.insert_one(user_message)
        assistant_text = await _openai_general_chat(message, [*history, user_message])
        assistant_message = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "user_id": user["user_id"],
            "chat_id": chat["id"],
            "role": "assistant",
            "content": assistant_text,
            "created_at": now_iso(),
        }
        await db.general_chat_messages.insert_one(assistant_message)
        await db.general_chats.update_one({"id": chat["id"]}, {"$set": {"updated_at": now_iso()}})
        chat.pop("_id", None)
        user_message.pop("_id", None)
        assistant_message.pop("_id", None)
        return {"chat": chat, "messages": [user_message, assistant_message]}

    @r.get("/workspaces/{workspace_id}/tree")
    async def workspace_tree(workspace_id: str, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        files = await _active_files(workspace_id)
        loaded = {f["path"] for f in files}
        tree = [{**item, "loaded": item["path"] in loaded} for item in workspace.get("tree", [])]
        return {"workspace": workspace, "tree": tree, "loaded_files": files}

    @r.delete("/workspaces/{workspace_id}")
    async def delete_workspace(workspace_id: str, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        if runtime and runtime.get("provider") == "daytona" and runtime.get("provider_runtime_id"):
            try:
                _daytona_remove_workspace_folder(runtime)
                await _append_runtime_log(runtime["id"], f"Removed Daytona project folder {_remote_workspace_root(runtime)} after workspace delete.")
            except Exception as exc:
                await _append_runtime_log(runtime["id"], f"Daytona project folder cleanup failed: {str(exc)[:240]}", "warning")
        await db.workspace_files.delete_many({"workspace_id": workspace_id})
        await db.workspace_knowledge.delete_many({"workspace_id": workspace_id, "tenant_id": user["tenant_id"]})
        await db.ai_change_sets.delete_many({"workspace_id": workspace_id, "tenant_id": user["tenant_id"]})
        if runtime:
            await db.runtime_logs.delete_many({"runtime_id": runtime["id"]})
        await db.runtime_sessions.delete_many({"workspace_id": workspace_id, "tenant_id": user["tenant_id"]})
        await db.workspace_chat_messages.delete_many({"workspace_id": workspace_id, "tenant_id": user["tenant_id"]})
        await db.project_chats.delete_many({"workspace_id": workspace_id, "tenant_id": user["tenant_id"]})
        await db.workspace_sessions.delete_one({"id": workspace_id, "tenant_id": user["tenant_id"]})
        state = await db.developer_states.find_one({"tenant_id": user["tenant_id"], "user_id": user["user_id"]})
        if state and state.get("active_workspace_id") == workspace_id:
            await db.developer_states.update_one(
                {"tenant_id": user["tenant_id"], "user_id": user["user_id"]},
                {"$unset": {"active_workspace_id": "", "active_chat_id": "", "active_project_id": ""}, "$set": {"updated_at": now_iso()}},
            )
        return {"ok": True, "deleted": workspace["id"], "runtime_stopped": bool(runtime)}

    @r.get("/workspaces/{workspace_id}/files/{path:path}")
    async def get_workspace_file(workspace_id: str, path: str, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        path = _clean_workspace_path(path)
        runtime = await _runtime_session(workspace_id, user)
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("filesystem"):
            try:
                doc = _daytona_read_workspace_file(runtime, path)
                cached = await _workspace_file(workspace_id, path)
                await db.workspace_files.update_one(
                    {"workspace_id": workspace_id, "path": path},
                    {"$set": {
                        "workspace_id": workspace_id,
                        "path": path,
                        "content": doc["content"],
                        "language": doc["language"],
                        "source": "sandbox_cache",
                        "updated_at": now_iso(),
                    }, "$setOnInsert": {
                        "id": new_id(),
                        "created_at": now_iso(),
                        "original_content": cached.get("original_content") if cached else doc["content"],
                    }},
                    upsert=True,
                )
                return doc
            except Exception:
                pass
        existing = await _workspace_file(workspace_id, path)
        if existing:
            return existing
        repo = await _repo(workspace["repo_id"], user)
        if repo.get("provider") == "mock":
            content = MOCK_FILES.get(path, "")
            await _upsert_workspace_file(workspace_id, path, content, content)
        else:
            fetched = await _fetch_real_file(repo, path, workspace["branch"])
            await _upsert_workspace_file(workspace_id, path, fetched["content"], fetched["content"])
        doc = await _workspace_file(workspace_id, path)
        return doc

    @r.post("/workspaces/{workspace_id}/files")
    async def create_workspace_path(workspace_id: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        path = _clean_workspace_path(payload.get("path", ""))
        item_type = "folder" if payload.get("type") == "folder" else "file"
        content = payload.get("content", "") if item_type == "file" else ""
        runtime = await _runtime_session(workspace_id, user)
        if any(item.get("path") == path for item in workspace.get("tree", [])):
            raise HTTPException(400, "Path already exists")
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("filesystem"):
            if item_type == "folder":
                sandbox = _daytona_workspace_sandbox(runtime)
                _daytona_exec(sandbox, f"mkdir -p {shlex.quote(_remote_file_path(runtime, path))}", timeout=60)
            else:
                _daytona_write_workspace_file(runtime, path, content)
        if item_type == "file":
            await _upsert_workspace_file(workspace_id, path, content, content)
        await _add_tree_entry(workspace, path, item_type)
        await _refresh_workspace_knowledge(workspace_id)
        return {"ok": True, "path": path, "type": item_type, "language": _language_for_path(path)}

    @r.get("/workspaces/{workspace_id}/search")
    async def search_workspace(workspace_id: str, q: str = "", user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        query = (q or "").strip()
        if not query:
            return {"query": query, "results": []}
        runtime = await _runtime_session(workspace_id, user)
        results: list[dict] = []
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("commands"):
            try:
                sandbox = _daytona_workspace_sandbox(runtime)
                root = _remote_workspace_root(runtime)
                response = _daytona_exec(
                    sandbox,
                    f"rg --line-number --color never --hidden -g '!node_modules' -g '!.git' {shlex.quote(query)} . || true",
                    cwd=root,
                    timeout=45,
                )
                for line in _daytona_exec_output(response, 60_000).splitlines()[:80]:
                    match = re.match(r"^\./([^:]+):(\d+):(.*)$", line)
                    if match:
                        results.append({"path": match.group(1), "line": int(match.group(2)), "preview": match.group(3)[:240], "kind": "content"})
            except Exception:
                results = []
        if not results:
            lowered = query.lower()
            for item in workspace.get("tree", []):
                path = item.get("path", "")
                if lowered in path.lower():
                    results.append({"path": path, "line": None, "preview": path, "kind": "path", "type": item.get("type")})
            files = await _active_files(workspace_id)
            for f in files:
                for index, line in enumerate((f.get("content") or "").splitlines(), start=1):
                    if lowered in line.lower():
                        results.append({"path": f["path"], "line": index, "preview": line[:240], "kind": "content"})
                        break
                if len(results) >= 80:
                    break
        return {"query": query, "results": results[:80]}

    @r.put("/workspaces/{workspace_id}/files/{path:path}")
    async def put_workspace_file(workspace_id: str, path: str, payload: dict, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        path = _clean_workspace_path(path)
        runtime = await _runtime_session(workspace_id, user)
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("filesystem"):
            try:
                doc = _daytona_write_workspace_file(runtime, path, payload.get("content", ""))
                await db.workspace_files.update_one(
                    {"workspace_id": workspace_id, "path": path},
                    {"$set": {
                        "workspace_id": workspace_id,
                        "path": path,
                        "content": doc["content"],
                        "language": doc["language"],
                        "source": "sandbox_cache",
                        "updated_at": now_iso(),
                    }, "$setOnInsert": {
                        "id": new_id(),
                        "created_at": now_iso(),
                        "original_content": payload.get("original_content", ""),
                    }},
                    upsert=True,
                )
                await db.workspace_sessions.update_one(
                    {"id": workspace_id},
                    {"$set": {"active_file_path": path, "updated_at": now_iso()}},
                )
                return doc
            except Exception as exc:
                raise HTTPException(500, f"Sandbox file save failed: {str(exc)[:240]}")
        existing = await _workspace_file(workspace_id, path)
        original = existing.get("original_content") if existing else payload.get("original_content", "")
        await _upsert_workspace_file(workspace_id, path, payload.get("content", ""), original)
        await _refresh_workspace_knowledge(workspace_id)
        return await _workspace_file(workspace_id, path)

    @r.patch("/workspaces/{workspace_id}/files/{path:path}")
    async def rename_workspace_path(workspace_id: str, path: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        old_path = _clean_workspace_path(path)
        new_path = _clean_workspace_path(payload.get("new_path", ""))
        if old_path == new_path:
            return {"ok": True, "path": new_path}
        if any(item.get("path") == new_path for item in workspace.get("tree", [])):
            raise HTTPException(400, "Destination path already exists")
        runtime = await _runtime_session(workspace_id, user)
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("filesystem"):
            _daytona_rename_workspace_path(runtime, old_path, new_path)
        mappings = await _rename_tree_entries(workspace, old_path, new_path)
        for source, target in mappings:
            await db.workspace_files.update_many(
                {"workspace_id": workspace_id, "path": source},
                {"$set": {"path": target, "language": _language_for_path(target), "updated_at": now_iso()}},
            )
        await _refresh_workspace_knowledge(workspace_id)
        return {"ok": True, "old_path": old_path, "path": new_path, "renamed": len(mappings)}

    @r.delete("/workspaces/{workspace_id}/files/{path:path}")
    async def delete_workspace_path(workspace_id: str, path: str, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        path = _clean_workspace_path(path)
        runtime = await _runtime_session(workspace_id, user)
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("filesystem"):
            _daytona_delete_workspace_path(runtime, path)
        removed = await _remove_tree_entries(workspace, path)
        await db.workspace_files.delete_many({"workspace_id": workspace_id, "path": {"$in": removed or [path]}})
        await _refresh_workspace_knowledge(workspace_id)
        return {"ok": True, "deleted": removed or [path]}

    @r.get("/workspaces/{workspace_id}/preview")
    async def workspace_preview(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        files = await _active_files(workspace_id)
        return _preview_html(files)

    @r.get("/workspaces/{workspace_id}/knowledge")
    async def workspace_knowledge(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        knowledge = await db.workspace_knowledge.find_one(
            {"workspace_id": workspace_id, "tenant_id": user.get("tenant_id")}, {"_id": 0}
        )
        if not knowledge:
            knowledge = await _refresh_workspace_knowledge(workspace_id)
        return knowledge

    @r.post("/workspaces/{workspace_id}/knowledge/reindex")
    async def reindex_workspace_knowledge(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        return await _refresh_workspace_knowledge(workspace_id)

    @r.get("/ai/models")
    async def list_ai_models(user=Depends(current_user)):
        return {
            "models": model_router.public_models(),
            "default": model_router.default_model(),
            "router_ready": model_router.router_ready(),
        }

    @r.get("/runtime/providers")
    async def runtime_providers(user=Depends(current_user)):
        await _tenant_id(user)
        configured_model = _coding_model_from_payload(None)
        return {
            "active": _runtime_provider(),
            "recommended": "daytona",
            "coding_ai": {
                "configured": bool(os.environ.get("OPENAI_API_KEY")),
                "model": configured_model,
                "model_env": "OPENAI_CODING_MODEL" if os.environ.get("OPENAI_CODING_MODEL") else "OPENAI_MODEL" if os.environ.get("OPENAI_MODEL") else "default",
                "required_env": ["OPENAI_API_KEY", "OPENAI_CODING_MODEL"],
            },
            "architecture": "AREVEI controls auth, AI, review, commit, billing, memory, and deployment. The runtime provider supplies the isolated persistent filesystem, terminal commands, snapshots, dependency install, and live preview.",
            "preview_proxy": {
                "mode": "subdomain" if (os.environ.get("PREVIEW_BASE_DOMAIN") or os.environ.get("WORKSPACE_PREVIEW_DOMAIN")) else "path",
                "base_domain": os.environ.get("PREVIEW_BASE_DOMAIN") or os.environ.get("WORKSPACE_PREVIEW_DOMAIN"),
                "requires": "Route wildcard preview hosts to /api/workspaces/{workspace_id}/runtime/preview-proxy and preserve WebSocket upgrades.",
            },
        }

    @r.get("/workspaces/{workspace_id}/ai/config")
    async def workspace_ai_config(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        return {
            "openai_api_key_present": bool(os.environ.get("OPENAI_API_KEY")),
            "openai_api_key_prefix": (os.environ.get("OPENAI_API_KEY") or "")[:7] if os.environ.get("OPENAI_API_KEY") else None,
            "coding_model": _coding_model_from_payload(None),
            "openai_coding_model": os.environ.get("OPENAI_CODING_MODEL"),
            "openai_model": os.environ.get("OPENAI_MODEL"),
        }

    async def _prepare_codex_agent_for_runtime(runtime: dict) -> dict:
        if not (
            _codex_agent_enabled()
            and runtime.get("provider") == "daytona"
            and runtime.get("capabilities", {}).get("commands")
            and runtime.get("provider_runtime_id")
            and runtime.get("status") == "ready"
        ):
            return runtime
        try:
            CodexDaytonaAgentRunner(runtime, _coding_model_from_payload(None)).prepare()
            updates = {
                "codex_agent_enabled": True,
                "codex_agent_status": "ready",
                "codex_agent_dir": CODEX_AGENT_DIR,
                "codex_model": _coding_model_from_payload(None),
                "updated_at": now_iso(),
            }
            await db.runtime_sessions.update_one({"id": runtime["id"]}, {"$set": updates})
            await _append_runtime_log(runtime["id"], "Codex SDK agent is installed in the Daytona sandbox.")
            runtime.update(updates)
        except Exception as exc:
            updates = {
                "codex_agent_enabled": True,
                "codex_agent_status": "setup_error",
                "codex_agent_error": str(exc)[:700],
                "updated_at": now_iso(),
            }
            await db.runtime_sessions.update_one({"id": runtime["id"]}, {"$set": updates})
            await _append_runtime_log(runtime["id"], f"Codex SDK agent setup failed: {str(exc)[:500]}", "error")
            runtime.update(updates)
        return runtime

    @r.post("/workspaces/{workspace_id}/runtime/start")
    async def start_workspace_runtime(workspace_id: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        repo = await _repo(workspace["repo_id"], user)
        repo_token = await _installation_token(repo["installation_id"]) if repo.get("provider") == "github" else None
        provider = _runtime_provider()
        loaded_bootstrap = await _ensure_runtime_bootstrap_files(workspace, repo)
        files = await _active_files(workspace_id)
        existing = await _runtime_session(workspace_id, user)
        runtime_config = workspace.get("runtime_config") or _runtime_commands([item["path"] for item in workspace.get("tree", [])])
        if existing:
            supplied_runtime_id = (
                payload.get("provider_runtime_id")
                or payload.get("sandbox_id")
                or payload.get("daytona_sandbox_id")
            )
            updates: dict[str, Any] = {
                "provider": provider["provider"],
                "provider_configured": provider["configured"],
                "capabilities": provider["capabilities"],
                "setup_hint": provider["setup_hint"],
                "root_path": payload.get("root_path") or existing.get("root_path") or f"/home/daytona/workspaces/{workspace_id}",
                "install_command": payload.get("install_command") or existing.get("install_command") or runtime_config["install_command"],
                "dev_command": payload.get("dev_command") or existing.get("dev_command") or runtime_config["dev_command"],
                "build_command": payload.get("build_command") or existing.get("build_command") or runtime_config["build_command"],
                "test_command": payload.get("test_command") or existing.get("test_command") or runtime_config["test_command"],
                "lint_command": payload.get("lint_command") or existing.get("lint_command") or runtime_config["lint_command"],
                "package_manager": existing.get("package_manager") or runtime_config["package_manager"],
                "framework": existing.get("framework") or runtime_config.get("framework"),
                "preview_port": existing.get("preview_port") or runtime_config.get("preview_port", 3000),
                "updated_at": now_iso(),
            }
            if supplied_runtime_id:
                updates.update({
                    "provider_runtime_id": str(supplied_runtime_id).strip(),
                    "status": "ready",
                    "preview_mode": "external_runtime",
                    "note": "Attached existing Daytona sandbox. Commands run inside the persistent workspace.",
                })
                existing.update(updates)
                try:
                    synced = _daytona_sync_files(existing, files, repo=repo, token=repo_token)
                    updates["files_synced"] = synced
                    await _append_runtime_log(existing["id"], f"Attached Daytona sandbox {updates['provider_runtime_id']} and synced {synced} file(s).")
                except Exception as exc:
                    updates.update({
                        "status": "bridge_error",
                        "note": f"Daytona attach failed: {str(exc)[:240]}",
                    })
                    await _append_runtime_log(existing["id"], updates["note"], "error")
            active_sandbox_id = updates.get("provider_runtime_id") or existing.get("provider_runtime_id")
            if provider["provider"] == "daytona" and provider["capabilities"]["commands"] and active_sandbox_id and not supplied_runtime_id:
                upgraded = {**existing, **updates, "provider_runtime_id": active_sandbox_id}
                try:
                    synced = _daytona_sync_files(upgraded, files, repo=repo, token=repo_token)
                    updates.update({
                        "provider_runtime_id": active_sandbox_id,
                        "files_synced": synced,
                        "status": "ready",
                        "preview_mode": "external_runtime",
                        "note": "Daytona sandbox is started and synced. Commands run inside the persistent workspace.",
                    })
                    await _append_runtime_log(existing["id"], f"Started Daytona sandbox {active_sandbox_id} and synced {synced} file(s).")
                except Exception as exc:
                    if _is_daytona_shell_error(exc):
                        try:
                            replacement = {**upgraded}
                            replacement.pop("provider_runtime_id", None)
                            bridge = _daytona_create_and_sync(replacement, files, repo=repo, token=repo_token)
                            updates.update({
                                "provider_runtime_id": bridge["sandbox_id"],
                                "root_path": bridge["root_path"],
                                "files_synced": len(files),
                                "status": "ready",
                                "preview_mode": "external_runtime",
                                "note": "Replaced a Daytona sandbox whose command shell was not usable.",
                            })
                            await _append_runtime_log(existing["id"], f"Replaced unusable Daytona sandbox {active_sandbox_id} with {bridge['sandbox_id']}.")
                        except Exception as replacement_exc:
                            updates.update({
                                "status": "bridge_error",
                                "note": f"Daytona replacement failed: {str(replacement_exc)[:240]}",
                            })
                            await _append_runtime_log(existing["id"], updates["note"], "error")
                    else:
                        updates.update({
                            "status": "bridge_error",
                            "note": f"Daytona start failed: {str(exc)[:240]}",
                        })
                        await _append_runtime_log(existing["id"], updates["note"], "error")
            if provider["provider"] == "daytona" and provider["capabilities"]["commands"] and not active_sandbox_id:
                upgraded = {**existing, **updates}
                try:
                    bridge = _daytona_create_and_sync(upgraded, files, repo=repo, token=repo_token)
                    updates.update({
                        "provider_runtime_id": bridge["sandbox_id"],
                        "root_path": bridge["root_path"],
                        "status": "ready",
                        "preview_mode": "external_runtime",
                        "note": "Daytona sandbox is ready. Commands run inside the persistent workspace.",
                        "files_synced": len(files),
                    })
                    action = "Reused" if bridge.get("reused") else "Created"
                    await _append_runtime_log(existing["id"], f"{action} Daytona sandbox {bridge['sandbox_id']} for existing runtime.")
                    await _append_runtime_log(existing["id"], f"Synced {len(files)} workspace file(s) into Daytona.")
                except Exception as exc:
                    updates.update({
                        "status": "bridge_error",
                        "note": f"Daytona bridge failed: {str(exc)[:240]}",
                    })
                    await _append_runtime_log(existing["id"], updates["note"], "error")
            await db.runtime_sessions.update_one({"id": existing["id"]}, {"$set": updates})
            existing.update(updates)
            existing = await _prepare_codex_agent_for_runtime(existing)
            return existing

        runtime = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "user_id": user["user_id"],
            "workspace_id": workspace_id,
            "repo_id": repo["id"],
            "provider": provider["provider"],
            "provider_configured": provider["configured"],
            "status": "ready" if provider["capabilities"]["commands"] else "bridge_pending" if provider["configured"] else "fallback_ready",
            "repo_full_name": workspace["repo_full_name"],
            "branch": workspace["branch"],
            "root_path": payload.get("root_path") or f"/home/daytona/workspaces/{workspace_id}",
            "install_command": payload.get("install_command") or runtime_config["install_command"],
            "dev_command": payload.get("dev_command") or runtime_config["dev_command"],
            "build_command": payload.get("build_command") or runtime_config["build_command"],
            "test_command": payload.get("test_command") or runtime_config["test_command"],
            "lint_command": payload.get("lint_command") or runtime_config["lint_command"],
            "package_manager": runtime_config["package_manager"],
            "framework": runtime_config.get("framework"),
            "preview_port": runtime_config.get("preview_port", 3000),
            "preview_url": None,
            "files_synced": len(files),
            "capabilities": provider["capabilities"],
            "setup_hint": provider["setup_hint"],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        supplied_runtime_id = (
            payload.get("provider_runtime_id")
            or payload.get("sandbox_id")
            or payload.get("daytona_sandbox_id")
        )
        if supplied_runtime_id:
            runtime["provider_runtime_id"] = str(supplied_runtime_id).strip()
            runtime["status"] = "ready"
            runtime["preview_mode"] = "external_runtime"
            runtime["note"] = "Attached existing Daytona sandbox. Commands run inside the persistent workspace."
        if not provider["configured"]:
            runtime["preview_mode"] = "static_workspace_preview"
            runtime["note"] = "Using AREVEI static preview. Connect Daytona or another workspace runtime for terminal, dependency install, and live dev server."
        else:
            runtime["preview_mode"] = "external_runtime" if provider["capabilities"]["commands"] else "external_runtime_pending"
            runtime["note"] = (
                f"{provider['provider']} runtime bridge is enabled."
                if provider["capabilities"]["commands"]
                else f"{provider['provider']} credentials are configured, but command execution is pending the runtime bridge."
            )

        if runtime.get("provider_runtime_id"):
            try:
                synced = _daytona_sync_files(runtime, files, repo=repo, token=repo_token)
                runtime["files_synced"] = synced
                runtime["status"] = "ready"
            except Exception as exc:
                runtime.update({
                    "status": "bridge_error",
                    "preview_mode": "static_workspace_preview",
                    "note": f"Daytona attach failed: {str(exc)[:240]}",
                    "updated_at": now_iso(),
                })
        elif provider["provider"] == "daytona" and provider["capabilities"]["commands"]:
            try:
                bridge = _daytona_create_and_sync(runtime, files, repo=repo, token=repo_token)
                runtime.update({
                    "provider_runtime_id": bridge["sandbox_id"],
                    "root_path": bridge["root_path"],
                    "status": "ready",
                    "preview_mode": "external_runtime",
                    "note": "Daytona sandbox is ready. Commands run inside the persistent workspace.",
                    "sandbox_reused": bridge.get("reused", False),
                    "updated_at": now_iso(),
                })
            except Exception as exc:
                runtime.update({
                    "status": "bridge_error",
                    "preview_mode": "static_workspace_preview",
                    "note": f"Daytona bridge failed: {str(exc)[:240]}",
                    "updated_at": now_iso(),
                })

        await db.runtime_sessions.insert_one(runtime)
        await _append_runtime_log(runtime["id"], f"Runtime session created for {workspace['repo_full_name']} using {runtime['provider']}.")
        if runtime.get("provider_runtime_id"):
            action = "Reused" if runtime.get("sandbox_reused") else "Created"
            await _append_runtime_log(runtime["id"], f"{action} Daytona sandbox {runtime['provider_runtime_id']}.")
        await _append_runtime_log(runtime["id"], f"Synced {len(files)} workspace file(s) into runtime state.")
        if loaded_bootstrap:
            await _append_runtime_log(runtime["id"], f"Loaded {loaded_bootstrap} missing startup file(s) from GitHub before sync.")
        if runtime.get("status") == "bridge_error":
            await _append_runtime_log(runtime["id"], runtime["note"], "error")
        runtime = await _prepare_codex_agent_for_runtime(runtime)
        runtime.pop("_id", None)
        return runtime

    @r.get("/workspaces/{workspace_id}/runtime")
    async def get_workspace_runtime(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        if not runtime:
            return {"runtime": None, "logs": [], "provider": _runtime_provider()}
        logs = await db.runtime_logs.find(
            {"runtime_id": runtime["id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(200)
        return {"runtime": runtime, "logs": logs, "provider": _runtime_provider()}

    async def _ensure_workspace_preview_runtime(workspace_id: str, user: dict) -> dict:
        workspace = await _workspace(workspace_id, user)
        repo = await _repo(workspace["repo_id"], user)
        runtime = await _runtime_session(workspace_id, user)
        if not runtime:
            raise HTTPException(400, "Start runtime first")
        runtime = await _upgrade_runtime_to_current_provider(runtime, workspace_id)
        if runtime.get("provider") != "daytona" or not runtime.get("capabilities", {}).get("commands"):
            return {"ok": True, "status": runtime.get("status"), "runtime": runtime}

        loaded_bootstrap = await _ensure_runtime_bootstrap_files(workspace, repo)
        files = await _active_files(workspace_id)
        command = runtime.get("dev_command") or "npm run dev"

        try:
            if not runtime.get("provider_runtime_id"):
                repo_token = await _installation_token(repo["installation_id"]) if repo.get("provider") == "github" else None
                bridge = _daytona_create_and_sync(runtime, files, repo=repo, token=repo_token)
                runtime.update({
                    "provider_runtime_id": bridge["sandbox_id"],
                    "root_path": bridge["root_path"],
                    "status": "ready",
                })
                await db.runtime_sessions.update_one(
                    {"id": runtime["id"]},
                    {"$set": {
                        "provider_runtime_id": bridge["sandbox_id"],
                        "root_path": bridge["root_path"],
                        "status": "ready",
                        "updated_at": now_iso(),
                    }},
                )
                await _append_runtime_log(runtime["id"], f"Created Daytona sandbox {bridge['sandbox_id']} for preview.")
            if loaded_bootstrap:
                await _append_runtime_log(runtime["id"], f"Loaded {loaded_bootstrap} missing startup file(s) from GitHub before preview.")
            await _append_runtime_log(runtime["id"], "Opening preview from sandbox filesystem without a full file sync.")
            result = _daytona_run_command(runtime, files, command)
        except Exception as exc:
            await db.runtime_sessions.update_one(
                {"id": runtime["id"]},
                {"$set": {"status": "bridge_error", "updated_at": now_iso()}},
            )
            await _append_runtime_log(runtime["id"], f"Preview auto-start failed: {str(exc)[:240]}", "error")
            raise HTTPException(500, f"Preview auto-start failed: {str(exc)[:240]}")

        updates: dict[str, Any] = {
            "status": result["status"],
            "last_command": command,
            "last_exit_code": result.get("exit_code"),
            "updated_at": now_iso(),
        }
        if result.get("preview_url"):
            updates["direct_preview_url"] = result["preview_url"]
            updates["preview_proxy_url"] = _preview_proxy_base_url(workspace_id)
            updates["preview_url"] = updates["preview_proxy_url"] or result["preview_url"]
            updates["preview_port"] = result.get("preview_port")
        await db.runtime_sessions.update_one({"id": runtime["id"]}, {"$set": updates})
        await _append_runtime_log(runtime["id"], result.get("output", "Preview is ready."))
        runtime = await db.runtime_sessions.find_one({"id": runtime["id"]}, {"_id": 0})
        logs = await db.runtime_logs.find(
            {"runtime_id": runtime["id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(200)
        return {"ok": True, "status": runtime.get("status"), "runtime": runtime, "logs": logs}

    @r.post("/workspaces/{workspace_id}/runtime/ensure-preview")
    async def ensure_workspace_preview(workspace_id: str, user=Depends(current_user)):
        return await _ensure_workspace_preview_runtime(workspace_id, user)

    def _preview_user_from_request(request: Request) -> dict:
        auth = request.headers.get("authorization", "")
        token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
        token = token or request.query_params.get("arevei_token", "")
        token = token or request.cookies.get("arevei_preview_token", "")
        if not token:
            raise HTTPException(401, "Missing preview auth token")
        payload = decode_token(token)
        return {
            "user_id": payload["sub"],
            "role": payload.get("role", "founder_admin"),
            "tenant_id": payload.get("tenant_id"),
        }

    def _preview_waiting_html(title: str = "Preparing your preview", subtitle: str = "Waking up the workspace sandbox…") -> str:
        return (
            "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"/>"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>"
            "<title>AREVEI · Preview</title>"
            "<style>"
            "*{box-sizing:border-box}html,body{height:100%;margin:0}"
            "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
            "background:radial-gradient(1200px 600px at 50% -10%,#0b2b25 0%,#061012 55%,#04090a 100%);color:#e6fffa;"
            "display:flex;align-items:center;justify-content:center;overflow:hidden}"
            ".wrap{position:relative;text-align:center;padding:32px;max-width:520px;z-index:2}"
            ".logo{width:64px;height:64px;margin:0 auto 22px;border-radius:18px;"
            "background:linear-gradient(135deg,#32d6af,#0d9f7c);display:flex;align-items:center;justify-content:center;"
            "box-shadow:0 0 40px rgba(50,214,175,.45);animation:pulse 1.8s ease-in-out infinite}"
            ".logo svg{width:34px;height:34px}"
            "h1{font-size:20px;font-weight:700;margin:0 0 8px;letter-spacing:-.01em}"
            "p{margin:0;color:#8fb7ae;font-size:14px;line-height:1.5}"
            ".bar{margin:26px auto 0;width:240px;height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}"
            ".bar span{display:block;height:100%;width:40%;border-radius:99px;background:linear-gradient(90deg,#32d6af,#7af5db);"
            "animation:slide 1.4s ease-in-out infinite}"
            ".dots{margin-top:14px;font-size:12px;color:#5f857d;letter-spacing:.3em;text-transform:uppercase}"
            ".orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:.5;z-index:1}"
            ".orb.a{width:340px;height:340px;background:#0d9f7c;top:-120px;left:-80px;animation:float 7s ease-in-out infinite}"
            ".orb.b{width:300px;height:300px;background:#1f7fff33;bottom:-120px;right:-60px;animation:float 9s ease-in-out infinite reverse}"
            "@keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 40px rgba(50,214,175,.35)}"
            "50%{transform:scale(1.08);box-shadow:0 0 60px rgba(50,214,175,.6)}}"
            "@keyframes slide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}"
            "@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-24px)}}"
            "</style></head><body>"
            "<div class=\"orb a\"></div><div class=\"orb b\"></div>"
            "<div class=\"wrap\">"
            "<div class=\"logo\"><svg viewBox=\"0 0 24 24\" fill=\"none\"><path d=\"M12 2L2 21h20L12 2z\" fill=\"#04120f\"/></svg></div>"
            f"<h1>{html.escape(title)}</h1>"
            f"<p>{html.escape(subtitle)}</p>"
            "<div class=\"bar\"><span></span></div>"
            "<div class=\"dots\" id=\"msg\">Starting sandbox</div>"
            "</div>"
            "<script>"
            "var msgs=['Starting sandbox','Booting dev server','Compiling app','Almost ready'];var i=0;"
            "var el=document.getElementById('msg');"
            "setInterval(function(){i=(i+1)%msgs.length;if(el)el.textContent=msgs[i];},2200);"
            "setTimeout(function(){location.reload();},3500);"
            "</script>"
            "</body></html>"
        )

    def _wants_preview_html(request: Request, path: str) -> bool:
        accept = request.headers.get("accept", "")
        if "text/html" in accept:
            return True
        last = path.rsplit("/", 1)[-1]
        return path == "" or "." not in last

    def _preview_waiting_response(request: Request, path: str, title: str, subtitle: str) -> Response:
        if _wants_preview_html(request, path):
            return Response(
                content=_preview_waiting_html(title, subtitle),
                media_type="text/html",
                status_code=200,
                headers={"Cache-Control": "no-store", "X-AREVEI-Preview": "warming"},
            )
        return Response(content=b"preview warming up", media_type="text/plain", status_code=503, headers={"Cache-Control": "no-store"})

    def _is_daytona_daemon_error(status_code: int, body: bytes) -> bool:
        if status_code in (502, 503, 504):
            return True
        try:
            sample = body[:600].decode("utf-8", errors="ignore")
        except Exception:
            return False
        return ("DAYTONA_DAEMON" in sample) or ("proxy upstream error" in sample and "statusCode" in sample)

    async def _proxy_workspace_preview_response(workspace_id: str, path: str, request: Request) -> Response:
        user = _preview_user_from_request(request)
        await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        if not runtime:
            return _preview_waiting_response(request, path, "Starting your workspace", "Provisioning the preview runtime…")
        if (
            runtime.get("provider") == "daytona"
            and runtime.get("capabilities", {}).get("commands")
            and (
                not runtime.get("preview_url")
                or not runtime.get("direct_preview_url")
                or _is_preview_proxy_url(runtime.get("direct_preview_url"), workspace_id)
                or runtime.get("status") in {"stopped", "bridge_error", "ready", "command_succeeded"}
            )
        ):
            ensured = await _ensure_workspace_preview_runtime(workspace_id, user)
            runtime = ensured.get("runtime") or runtime
        upstream_preview_url = runtime.get("direct_preview_url") or runtime.get("preview_url")
        if _is_preview_proxy_url(upstream_preview_url, workspace_id):
            return _preview_waiting_response(request, path, "Preparing your preview", "Refreshing the sandbox preview link…")
        if not runtime or not upstream_preview_url:
            return _preview_waiting_response(request, path, "Preparing your preview", "The dev server is starting up…")
        base_parts = urlsplit(upstream_preview_url)
        upstream_path = "/" + path.lstrip("/")
        base_query_map = parse_qs(base_parts.query, keep_blank_values=True)
        base_query = [(k, v) for k, values in base_query_map.items() for v in values]
        incoming_query = [(k, v) for k, v in parse_qsl(str(request.url.query), keep_blank_values=True) if k != "arevei_token"]
        upstream_url = urlunsplit((
            base_parts.scheme,
            base_parts.netloc,
            upstream_path,
            urlencode(base_query + incoming_query),
            "",
        ))
        headers = {
            "User-Agent": request.headers.get("user-agent", "AREVEI-Preview"),
            "Accept": request.headers.get("accept", "*/*"),
            "X-Daytona-Skip-Preview-Warning": "true",
            "x-daytona-skip-preview-warning": "true",
        }
        daytona_token = (base_query_map.get("token") or [""])[0]
        if daytona_token:
            headers["x-daytona-preview-token"] = daytona_token
        try:
            upstream = requests.get(
                upstream_url,
                headers=headers,
                timeout=30,
                allow_redirects=True,
            )
        except requests.RequestException:
            return _preview_waiting_response(request, path, "Preview is waking up", "The sandbox was asleep and is starting again…")
        # Never surface the raw Daytona daemon error (502 "proxy upstream error")
        # to the iframe — show a branded waking-up page that auto-retries instead.
        if _is_daytona_daemon_error(upstream.status_code, upstream.content):
            return _preview_waiting_response(request, path, "Preview is waking up", "Your sandbox was asleep and is booting the app…")
        content_type = upstream.headers.get("content-type", "text/html")
        body = upstream.content
        if path.startswith(("@vite/", "@react-refresh", "src/")) and "text/html" in content_type:
            raise HTTPException(
                502,
                f"Preview upstream returned HTML for module path /{path}. Restart the dev preview so AREVEI can refresh the direct Daytona preview URL.",
            )
        if any(kind in content_type for kind in ("text/html", "javascript", "text/css", "application/json")):
            try:
                text = body.decode(upstream.encoding or "utf-8", errors="replace")
                proxy_prefix = f"/api/workspaces/{workspace_id}/runtime/preview-proxy"
                text = re.sub(r'((?:src|href|action)=["\'])/(?!/)', rf"\1{proxy_prefix}/", text, flags=re.IGNORECASE)
                text = re.sub(r'(url\(["\']?)/(?!/)', rf"\1{proxy_prefix}/", text, flags=re.IGNORECASE)
                for prefix in ("/@vite/", "/@react-refresh", "/src/", "/assets/", "/node_modules/", "/public/"):
                    text = text.replace(f'"{prefix}', f'"{proxy_prefix}{prefix}')
                    text = text.replace(f"'{prefix}", f"'{proxy_prefix}{prefix}")
                    text = text.replace(f"`{prefix}", f"`{proxy_prefix}{prefix}")
                body = text.encode("utf-8")
            except Exception:
                body = upstream.content
        response = Response(
            content=body,
            status_code=upstream.status_code,
            media_type=content_type,
            headers={"Cache-Control": "no-store"},
        )
        if request.query_params.get("arevei_token"):
            response.set_cookie(
                "arevei_preview_token",
                request.query_params["arevei_token"],
                httponly=True,
                samesite="lax",
                max_age=60 * 60 * 6,
            )
            response.set_cookie(
                "arevei_preview_workspace_id",
                workspace_id,
                httponly=True,
                samesite="lax",
                max_age=60 * 60 * 6,
            )
        return response

    @r.api_route("/workspaces/{workspace_id}/runtime/preview-proxy", methods=["GET", "HEAD"])
    async def proxy_workspace_preview_root(workspace_id: str, request: Request):
        return await _proxy_workspace_preview_response(workspace_id, "", request)

    @r.api_route("/workspaces/{workspace_id}/runtime/preview-proxy/{path:path}", methods=["GET", "HEAD"])
    async def proxy_workspace_preview_path(workspace_id: str, path: str, request: Request):
        return await _proxy_workspace_preview_response(workspace_id, path, request)

    @r.post("/workspaces/{workspace_id}/runtime/keepalive")
    async def keepalive_workspace_runtime(workspace_id: str, user=Depends(current_user)):
        """Called periodically by the UI while a workspace/preview is open so the
        Daytona sandbox does not auto-sleep. Pinging the direct preview URL resets
        Daytona's idle auto-stop timer cheaply (no command execution)."""
        await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        url = runtime.get("direct_preview_url") if runtime else None
        if not url or _is_preview_proxy_url(url, workspace_id):
            return {"ok": True, "awake": False}
        try:
            requests.get(url, timeout=8, headers={"x-daytona-skip-preview-warning": "true"})
            return {"ok": True, "awake": True}
        except Exception:
            return {"ok": True, "awake": False}

    @r.post("/workspaces/{workspace_id}/runtime/stop")
    async def stop_workspace_runtime(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        if not runtime:
            raise HTTPException(400, "Start runtime first")
        if runtime.get("provider") == "daytona" and runtime.get("provider_runtime_id"):
            try:
                sandbox = _daytona_client().get(runtime["provider_runtime_id"])
                sandbox.stop(timeout=60)
                await _append_runtime_log(runtime["id"], f"Stopped Daytona sandbox {runtime['provider_runtime_id']}.")
            except Exception as exc:
                await _append_runtime_log(runtime["id"], f"Daytona stop failed: {str(exc)[:240]}", "error")
                raise HTTPException(500, f"Daytona stop failed: {str(exc)[:240]}")
        await db.runtime_sessions.update_one(
            {"id": runtime["id"]},
            {"$set": {"status": "stopped", "preview_url": None, "updated_at": now_iso()}},
        )
        return await db.runtime_sessions.find_one({"id": runtime["id"]}, {"_id": 0})

    @r.post("/workspaces/{workspace_id}/runtime/sync")
    async def sync_workspace_runtime(workspace_id: str, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        repo = await _repo(workspace["repo_id"], user)
        repo_token = await _installation_token(repo["installation_id"]) if repo.get("provider") == "github" else None
        runtime = await _runtime_session(workspace_id, user)
        if not runtime:
            raise HTTPException(400, "Start runtime first")
        runtime = await _upgrade_runtime_to_current_provider(runtime, workspace_id)
        if runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("commands"):
            try:
                if runtime.get("direct_preview_url") and runtime.get("preview_url") != runtime.get("direct_preview_url") and not _preview_proxy_base_url(workspace_id):
                    await db.runtime_sessions.update_one(
                        {"id": runtime["id"]},
                        {"$set": {
                            "preview_url": runtime["direct_preview_url"],
                            "preview_proxy_url": None,
                            "updated_at": now_iso(),
                        }},
                    )
                    runtime["preview_url"] = runtime["direct_preview_url"]
                    runtime["preview_proxy_url"] = None
                changed = _daytona_git_status(runtime)
                await db.runtime_sessions.update_one(
                    {"id": runtime["id"]},
                    {"$set": {
                        "files_synced": 0,
                        "root_path": _remote_workspace_root(runtime),
                        "status": "ready",
                        "last_git_status": changed,
                        "updated_at": now_iso(),
                    }},
                )
                await _append_runtime_log(runtime["id"], f"Sandbox is source of truth; skipped full sync. Git reports {len(changed)} changed file(s).")
                return await db.runtime_sessions.find_one({"id": runtime["id"]}, {"_id": 0})
            except Exception as exc:
                await db.runtime_sessions.update_one(
                    {"id": runtime["id"]},
                    {"$set": {"status": "bridge_error", "updated_at": now_iso()}},
                )
                await _append_runtime_log(runtime["id"], f"Daytona sync failed: {str(exc)[:240]}", "error")
                raise HTTPException(500, f"Daytona sync failed: {str(exc)[:240]}")
        files = await _active_files(workspace_id)
        await db.runtime_sessions.update_one(
            {"id": runtime["id"]},
            {"$set": {"files_synced": len(files), "updated_at": now_iso()}},
        )
        await _append_runtime_log(runtime["id"], f"Synced {len(files)} file(s) after review/apply.")
        return await db.runtime_sessions.find_one({"id": runtime["id"]}, {"_id": 0})

    @r.post("/workspaces/{workspace_id}/runtime/commands")
    async def run_runtime_command(workspace_id: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        if not runtime:
            raise HTTPException(400, "Start runtime first")
        runtime = await _upgrade_runtime_to_current_provider(runtime, workspace_id)
        command = (payload.get("command") or "").strip()
        if not command:
            raise HTTPException(400, "Command is required")
        approval_id = payload.get("approval_id")
        if approval_id:
            approval = await db.workspace_command_approvals.find_one(
                {"id": approval_id, "workspace_id": workspace_id, "tenant_id": user["tenant_id"]},
                {"_id": 0},
            )
            if not approval or approval.get("command") != command:
                raise HTTPException(403, "Command approval does not match this command")
            if approval.get("status") != "allowed":
                raise HTTPException(403, "Command was not approved")
            await db.workspace_command_approvals.update_one(
                {"id": approval_id},
                {"$set": {"status": "used", "used_at": now_iso()}},
            )
        else:
            approval = {
                "id": new_id(),
                "tenant_id": user["tenant_id"],
                "workspace_id": workspace_id,
                "project_id": workspace.get("project_id"),
                "chat_id": workspace.get("chat_id"),
                "user_id": user["user_id"],
                "command": command,
                "cwd": runtime.get("root_path"),
                "reason": payload.get("reason") or "Terminal command requested from AI Workspace.",
                "risk": _approval_risk(command),
                "status": "pending",
                "created_at": now_iso(),
            }
            await db.workspace_command_approvals.insert_one(approval)
            approval.pop("_id", None)
            return {
                "ok": False,
                "status": "approval_required",
                "approval": approval,
                "event": _stream_event(
                    "command_approval_required",
                    f"Approve terminal command: {command}",
                    approval=approval,
                    command=command,
                    risk=approval["risk"],
                ),
            }
        await _append_workspace_activity(workspace, f"Running terminal command: `{command}`.")
        if not runtime.get("capabilities", {}).get("commands"):
            msg = (
                f"Skipped `{command}` because runtime command execution is not enabled yet. "
                "Static preview is still available while the persistent workspace runtime bridge is being wired."
            )
            await _append_runtime_log(runtime["id"], msg, "warning")
            await _append_workspace_activity(workspace, msg)
            await db.runtime_sessions.update_one(
                {"id": runtime["id"]},
                {"$set": {"status": runtime.get("status", "fallback_ready"), "updated_at": now_iso()}},
            )
            return {"ok": True, "status": runtime.get("status", "fallback_ready"), "output": msg}

        if runtime.get("provider") == "daytona":
            repo = await _repo(workspace["repo_id"], user)
            loaded_bootstrap = await _ensure_runtime_bootstrap_files(workspace, repo)
            files = await _active_files(workspace_id)
            if loaded_bootstrap:
                await _append_runtime_log(runtime["id"], f"Loaded {loaded_bootstrap} missing startup file(s) from GitHub before command.")
            if not runtime.get("provider_runtime_id"):
                msg = (
                    "Daytona runtime has no sandbox id. Click Start again after setting Daytona region, "
                    "or attach one of the sandbox IDs from Daytona Dashboard."
                )
                await db.runtime_sessions.update_one(
                    {"id": runtime["id"]},
                    {"$set": {"status": "needs_sandbox_id", "updated_at": now_iso()}},
                )
                await _append_runtime_log(runtime["id"], msg, "error")
                await _append_workspace_activity(workspace, msg)
                raise HTTPException(400, msg)
            try:
                await _append_runtime_log(runtime["id"], f"Running `{command}` against sandbox filesystem source of truth.")
                result = _daytona_run_command(runtime, files, command)
            except Exception as exc:
                if _is_daytona_shell_error(exc):
                    try:
                        replacement = {**runtime}
                        old_sandbox_id = replacement.pop("provider_runtime_id", None)
                        repo_token = await _installation_token(repo["installation_id"]) if repo.get("provider") == "github" else None
                        bridge = _daytona_create_and_sync(replacement, files, repo=repo, token=repo_token)
                        runtime.update({
                            "provider_runtime_id": bridge["sandbox_id"],
                            "root_path": bridge["root_path"],
                            "status": "ready",
                        })
                        await db.runtime_sessions.update_one(
                            {"id": runtime["id"]},
                            {"$set": {
                                "provider_runtime_id": bridge["sandbox_id"],
                                "root_path": bridge["root_path"],
                                "status": "ready",
                                "updated_at": now_iso(),
                            }},
                        )
                        await _append_runtime_log(runtime["id"], f"Replaced unusable Daytona sandbox {old_sandbox_id} with {bridge['sandbox_id']} and retried `{command}`.")
                        result = _daytona_run_command(runtime, files, command)
                    except Exception as replacement_exc:
                        await db.runtime_sessions.update_one(
                            {"id": runtime["id"]},
                            {"$set": {"status": "bridge_error", "last_command": command, "updated_at": now_iso()}},
                        )
                        await _append_runtime_log(runtime["id"], f"Daytona command failed: {str(replacement_exc)[:240]}", "error")
                        raise HTTPException(500, f"Daytona command failed: {str(replacement_exc)[:240]}")
                else:
                    await db.runtime_sessions.update_one(
                        {"id": runtime["id"]},
                        {"$set": {"status": "bridge_error", "last_command": command, "updated_at": now_iso()}},
                    )
                    await _append_runtime_log(runtime["id"], f"Daytona command failed: {str(exc)[:240]}", "error")
                    raise HTTPException(500, f"Daytona command failed: {str(exc)[:240]}")
            updates: dict[str, Any] = {
                "status": result["status"],
                "last_command": command,
                "last_exit_code": result.get("exit_code"),
                "updated_at": now_iso(),
            }
            if result.get("preview_url"):
                updates["direct_preview_url"] = result["preview_url"]
                updates["preview_proxy_url"] = _preview_proxy_base_url(workspace_id)
                updates["preview_url"] = updates["preview_proxy_url"] or result["preview_url"]
                updates["preview_port"] = result.get("preview_port")
            await db.runtime_sessions.update_one({"id": runtime["id"]}, {"$set": updates})
            await _append_runtime_log(runtime["id"], result.get("output", "Command completed."))
            await _append_workspace_activity(workspace, result.get("output", "Command completed."))
            return {"ok": True, "status": updates["status"], "output": result.get("output"), "preview_url": updates.get("preview_url")}

        output = f"Runtime provider `{runtime.get('provider')}` is configured, but no command bridge is implemented for it yet."
        updates: dict[str, Any] = {"status": "bridge_pending", "last_command": command, "updated_at": now_iso()}
        await db.runtime_sessions.update_one({"id": runtime["id"]}, {"$set": updates})
        await _append_runtime_log(runtime["id"], output, "warning")
        await _append_workspace_activity(workspace, output)
        return {"ok": True, "status": updates["status"], "output": output}

    @r.post("/workspaces/{workspace_id}/ai/chat")
    async def workspace_ai_chat(workspace_id: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        message = payload.get("message", "").strip()
        if not message:
            raise HTTPException(400, "Message is required")
        selected_model = _coding_model_from_payload(payload.get("model"))
        events: list[dict] = [
            _agent_event("agent_started", "Analyzing workspace request."),
            _agent_event("tool_started", "Reading workspace context.", name="list_files"),
        ]
        user_message = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "role": "user",
            "content": message,
            "created_at": now_iso(),
        }
        await db.workspace_chat_messages.insert_one(user_message)
        runtime = await _runtime_session(workspace_id, user)
        runtime = await _upgrade_runtime_to_current_provider(runtime, workspace_id) if runtime else None
        runner = CodexDaytonaAgentRunner(runtime, selected_model) if runtime else None
        if not runner or not runner.available:
            provider = runtime.get("provider") if runtime else "none"
            setup_hint = (
                runtime.get("setup_hint")
                if runtime
                else "Start a Daytona runtime before sending project coding prompts."
            )
            raise HTTPException(
                409,
                (
                    "AI Workspace project chat requires the Daytona Codex SDK runtime. "
                    f"Current runtime provider is `{provider}`. "
                    "Set DAYTONA_API_KEY, WORKSPACE_RUNTIME_BRIDGE_ENABLED=true, "
                    "WORKSPACE_CODEX_AGENT_ENABLED=true, and SANDBOX_OPENAI_API_KEY "
                    "or WORKSPACE_CODEX_USE_SANDBOX_ENV=true. "
                    f"{setup_hint or ''}"
                ).strip(),
            )
        repo = await _repo(workspace["repo_id"], user)
        repo_token = await _installation_token(repo["installation_id"]) if repo.get("provider") == "github" else None
        files = await _active_files(workspace_id)
        _daytona_sync_files(runtime, files, repo=repo, token=repo_token)
        await _append_workspace_activity(workspace, "Running Codex SDK agent inside Daytona.")
        codex_result = _daytona_run_codex_agent(runtime, message, selected_model)
        return await _finalize_codex_daytona_turn(
            workspace,
            runtime,
            user,
            message,
            selected_model,
            user_message,
            codex_result,
            [
                _agent_event("agent_started", "Starting Daytona Codex workflow."),
                _agent_event("tool_finished", "Workspace files are synced in Daytona.", name="daytona_sync"),
                *codex_result.get("events", []),
            ],
        )
        await _append_workspace_activity(
            workspace,
            "Reading workspace files, project index, and previous chat context before applying code edits.",
        )
        events.append(_agent_event("tool_finished", "Workspace context loaded.", name="list_files"))
        edit_words = ("edit", "change", "create", "update", "fix", "build", "add", "remove", "design", "page", "component")
        is_edit_request = any(word in message.lower() for word in edit_words)
        if not is_edit_request:
            runtime_output = await _run_agent_runtime_intent(workspace, message, user)
            if runtime_output:
                events.extend([
                    _agent_event("tool_finished", "Runtime command finished.", name="run_terminal"),
                    _agent_event("agent_finished", "Done."),
                ])
                assistant_doc = {
                    "id": new_id(),
                    "tenant_id": user["tenant_id"],
                    "workspace_id": workspace_id,
                    "project_id": workspace.get("project_id"),
                    "chat_id": workspace.get("chat_id"),
                    "repo_id": workspace["repo_id"],
                    "user_id": user["user_id"],
                    "role": "assistant",
                    "content": runtime_output,
                    "changed_files": [],
                    "created_at": now_iso(),
                }
                await db.workspace_chat_messages.insert_one(assistant_doc)
                return {
                    "id": new_id(),
                    "tenant_id": user["tenant_id"],
                    "workspace_id": workspace_id,
                    "prompt": message,
                    "assistant_message": runtime_output,
                    "changes": [],
                    "status": "command_completed",
                    "events": events,
                    "messages": [
                        {k: v for k, v in user_message.items() if k != "_id"},
                        {k: v for k, v in assistant_doc.items() if k != "_id"},
                    ],
                }
        runtime = await _runtime_session(workspace_id, user)
        context_files = None
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("filesystem"):
            events.append(_agent_event("tool_started", "Reading files from Daytona.", name="read_file"))
            context_files = _daytona_context_files(runtime, message, workspace.get("tree", []))
            events.append(_agent_event("tool_finished", f"Loaded {len(context_files)} context file(s).", name="read_file"))
        else:
            events.append(_agent_event("tool_finished", "Loaded cached workspace files.", name="read_file"))
        events.append(_agent_event("tool_started", "Generating code edits.", name="generate_diff"))
        try:
            assistant_message, diffs = await _build_ai_proposal(workspace, message, context_files, selected_model)
        except RuntimeError as exc:
            assistant_message = str(exc)[:700]
            diffs = []
            events.append(_agent_event("tool_failed", assistant_message, name="generate_diff"))
        events.append(_agent_event("tool_finished", f"Generated {len(diffs)} file edit(s).", name="generate_diff"))
        sandbox_patch = None
        sandbox_changed_files: list[dict] = []
        if diffs and runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("filesystem"):
            touched_paths = [_clean_workspace_path(item["path"]) for item in diffs if item.get("path")]
            try:
                for item in diffs:
                    clean_path = _clean_workspace_path(item["path"])
                    events.append(_agent_event("file_edit_started", f"Editing {clean_path}.", path=clean_path))
                    _daytona_write_workspace_file(runtime, clean_path, item.get("new", ""))
                    await db.workspace_files.update_one(
                        {"workspace_id": workspace_id, "path": clean_path},
                        {"$set": {
                            "workspace_id": workspace_id,
                            "path": clean_path,
                            "content": item.get("new", ""),
                            "language": _language_for_path(clean_path),
                            "source": "sandbox_cache",
                            "updated_at": now_iso(),
                        }, "$setOnInsert": {
                            "id": new_id(),
                            "created_at": now_iso(),
                            "original_content": item.get("old", ""),
                        }},
                        upsert=True,
                    )
                    await _ensure_tree_file(workspace, clean_path)
                    events.append(_agent_event("file_edit_finished", f"Saved {clean_path}.", path=clean_path))
                sandbox_patch = _daytona_git_diff(runtime, touched_paths)
                sandbox_changed_files = _daytona_git_status(runtime, touched_paths)
                if sandbox_patch:
                    for item in diffs:
                        item["sandbox_applied"] = True
                        item["patch_source"] = "git"
            except Exception as exc:
                await _append_workspace_activity(workspace, f"Sandbox edit failed: {str(exc)[:240]}")
                raise HTTPException(500, f"Sandbox edit failed: {str(exc)[:240]}")
        elif diffs:
            for item in diffs:
                clean_path = _clean_workspace_path(item["path"])
                events.append(_agent_event("file_edit_started", f"Editing {clean_path}.", path=clean_path))
                existing = await _workspace_file(workspace_id, clean_path)
                original = existing.get("original_content") if existing else item.get("old", "")
                await _upsert_workspace_file(workspace_id, clean_path, item.get("new", ""), original)
                await _ensure_tree_file(workspace, clean_path)
                events.append(_agent_event("file_edit_finished", f"Saved {clean_path}.", path=clean_path))
        if diffs:
            await _append_workspace_activity(
                workspace,
                f"Applied {len(diffs)} file edit(s): {', '.join([item.get('path', '') for item in diffs[:6]])}. Review the git diff, then commit or revert.",
            )
        else:
            await _append_workspace_activity(workspace, "No file edits were needed for this request.")
        knowledge = None
        if diffs:
            events.append(_agent_event("tool_started", "Refreshing workspace index.", name="semantic_index"))
            knowledge = await _refresh_workspace_knowledge(workspace_id)
            await db.workspace_knowledge.update_one(
                {"workspace_id": workspace_id},
                {"$set": {"memory.last_task": assistant_message, "updated_at": knowledge["updated_at"]}},
            )
            events.append(_agent_event("tool_finished", "Workspace index refreshed.", name="semantic_index"))
        if runtime and diffs and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("commands"):
            events.append(_agent_event("git_changed", f"Git reports {len(sandbox_changed_files)} changed file(s).", files=sandbox_changed_files))
        knowledge = await db.workspace_knowledge.find_one(
            {"workspace_id": workspace_id, "tenant_id": user.get("tenant_id")}, {"_id": 0}
        )
        files_changed = sandbox_changed_files or [
            {"path": item.get("path"), "language": _language_for_path(item.get("path", "")), "status": "M"}
            for item in diffs
        ]
        active_path = next((item.get("path") for item in files_changed if item.get("path")), None)
        if active_path:
            await db.workspace_sessions.update_one(
                {"id": workspace_id},
                {"$set": {"active_file_path": active_path, "updated_at": now_iso()}},
            )
            events.append(_agent_event("open_file", f"Opening {active_path}.", path=active_path))
        events.append(_agent_event("agent_finished", "Done. Changes are in the workspace; commit or revert from Git controls."))
        change = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "prompt": message,
            "assistant_message": assistant_message,
            "model": selected_model,
            "changes": diffs,
            "files_changed": files_changed,
            "patch": sandbox_patch,
            "events": events,
            "knowledge_snapshot": {
                "summary": knowledge.get("memory", {}).get("summary") if knowledge else None,
                "updated_at": knowledge.get("updated_at") if knowledge else None,
            },
            "status": "applied" if diffs else "no_changes",
            "applied_at": now_iso() if diffs else None,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.ai_change_sets.insert_one(change)
        assistant_doc = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "role": "assistant",
            "content": assistant_message,
            "change_set_id": change["id"],
            "model": selected_model,
            "changed_files": [c.get("path") for c in diffs],
            "events": events,
            "created_at": now_iso(),
        }
        await db.workspace_chat_messages.insert_one(assistant_doc)
        change.pop("_id", None)
        change["messages"] = [
            {k: v for k, v in user_message.items() if k != "_id"},
            {k: v for k, v in assistant_doc.items() if k != "_id"},
        ]
        return change

    async def _finalize_codex_daytona_turn(
        workspace: dict,
        runtime: dict,
        user: dict,
        message: str,
        model: str,
        user_message: dict,
        codex_result: dict,
        streamed_events: list[dict],
        attachments: list[dict] | None = None,
        plan_markdown: str = "",
        effort: str = "medium",
    ) -> dict:
        workspace_id = workspace["id"]
        changed_files = _daytona_git_status(runtime)
        diffs: list[dict] = []
        for changed in changed_files[:80]:
            path = changed.get("path")
            if not path or _is_pseudo_agent_path(path):
                continue
            clean_path = _clean_workspace_path(path)
            existing = await _workspace_file(workspace_id, clean_path)
            old = _dedupe_repeated_text(existing.get("content", "")) if existing else ""
            if "D" in (changed.get("status") or ""):
                await db.workspace_files.delete_one({"workspace_id": workspace_id, "path": clean_path})
                try:
                    await _remove_tree_entries(workspace, clean_path)
                except Exception:
                    pass
                diffs.append(_make_normalized_diff(clean_path, old, ""))
                continue
            try:
                doc = _daytona_read_workspace_file(runtime, clean_path)
            except Exception:
                continue
            new_content = doc.get("content", "")
            await db.workspace_files.update_one(
                {"workspace_id": workspace_id, "path": clean_path},
                {"$set": {
                    "workspace_id": workspace_id,
                    "path": clean_path,
                    "content": new_content,
                    "language": _language_for_path(clean_path),
                    "source": "codex_sandbox",
                    "updated_at": now_iso(),
                }, "$setOnInsert": {
                    "id": new_id(),
                    "created_at": now_iso(),
                    "original_content": old,
                }},
                upsert=True,
            )
            await _ensure_tree_file(workspace, clean_path)
            if old != new_content:
                diff = _make_normalized_diff(clean_path, old, new_content)
                diff["sandbox_applied"] = True
                diff["patch_source"] = "codex_sdk"
                diffs.append(diff)

        patch = _daytona_git_diff(runtime) if changed_files else ""
        stdout_lines = codex_result.get("stdout", "").strip().splitlines()
        assistant_message = codex_result.get("assistant_message") or (stdout_lines[-1] if stdout_lines else "") or "Codex completed the workspace task."
        knowledge = None
        if changed_files:
            knowledge = await _refresh_workspace_knowledge(workspace_id)
            await db.workspace_knowledge.update_one(
                {"workspace_id": workspace_id},
                {"$set": {"memory.last_task": assistant_message, "updated_at": knowledge["updated_at"]}},
            )
        else:
            knowledge = await db.workspace_knowledge.find_one(
                {"workspace_id": workspace_id, "tenant_id": user.get("tenant_id")}, {"_id": 0}
            )

        events = [*streamed_events]
        if changed_files:
            events.append(_stream_event("git_changed", f"Git reports {len(changed_files)} changed file(s).", files=changed_files))
        active_path = next((item.get("path") for item in changed_files if item.get("path")), None)
        if active_path:
            await db.workspace_sessions.update_one(
                {"id": workspace_id},
                {"$set": {"active_file_path": active_path, "updated_at": now_iso()}},
            )
            events.append(_stream_event("open_file", f"Opening {active_path}.", path=active_path))
        events.append(_stream_event("agent_finished", "Done. Codex changes are in the Daytona workspace; commit or revert from Git controls."))

        thread_id = codex_result.get("thread_id")
        if thread_id:
            await db.project_chats.update_one(
                {"id": workspace.get("chat_id"), "tenant_id": user["tenant_id"]},
                {"$set": {"codex_thread_id": thread_id, "updated_at": now_iso()}},
            )
            await db.workspace_sessions.update_one(
                {"id": workspace_id},
                {"$set": {"codex_thread_id": thread_id, "updated_at": now_iso()}},
            )
        await db.runtime_sessions.update_one(
            {"id": runtime["id"]},
            {"$set": {
                "last_command": "codex_sdk_agent",
                "last_exit_code": codex_result.get("exit_code"),
                "codex_thread_id": thread_id,
                "updated_at": now_iso(),
            }},
        )

        change = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "prompt": message,
            "assistant_message": assistant_message,
            "model": model,
            "effort": effort,
            "changes": diffs,
            "files_changed": changed_files,
            "attachments": attachments or [],
            "plan_markdown": plan_markdown,
            "patch": patch,
            "events": events,
            "codex_thread_id": thread_id,
            "codex_usage": codex_result.get("usage"),
            "preview_url": runtime.get("preview_url"),
            "knowledge_snapshot": {
                "summary": knowledge.get("memory", {}).get("summary") if knowledge else None,
                "updated_at": knowledge.get("updated_at") if knowledge else None,
            },
            "status": "applied" if changed_files else "no_changes",
            "applied_at": now_iso() if changed_files else None,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.ai_change_sets.insert_one(change)
        assistant_doc = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "role": "assistant",
            "content": assistant_message,
            "change_set_id": change["id"],
            "model": model,
            "effort": effort,
            "changed_files": [c.get("path") for c in changed_files],
            "attachments": attachments or [],
            "plan_markdown": plan_markdown,
            "codex_usage": codex_result.get("usage"),
            "events": events,
            "created_at": now_iso(),
        }
        await db.workspace_chat_messages.insert_one(assistant_doc)
        await _append_workspace_activity(
            workspace,
            f"Codex SDK changed {len(changed_files)} file(s): {', '.join([item.get('path', '') for item in changed_files[:6]]) or 'none'}.",
        )
        change.pop("_id", None)
        change["messages"] = [
            {k: v for k, v in user_message.items() if k != "_id"},
            {k: v for k, v in assistant_doc.items() if k != "_id"},
        ]
        return change

    def _agent_tools_schema() -> list[dict]:
        return [
            {"type": "function", "function": {
                "name": "list_files",
                "description": "List all file paths in the workspace so you understand the project structure.",
                "parameters": {"type": "object", "properties": {}},
            }},
            {"type": "function", "function": {
                "name": "read_file",
                "description": "Read the full text content of one file in the workspace.",
                "parameters": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]},
            }},
            {"type": "function", "function": {
                "name": "write_file",
                "description": "Create or overwrite a file. Always pass the COMPLETE new file content, not a diff.",
                "parameters": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]},
            }},
            {"type": "function", "function": {
                "name": "run_command",
                "description": "Run a shell command in the workspace runtime. Only works when a sandbox is running.",
                "parameters": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]},
            }},
        ]

    def _chunk_text(text: str, size: int = 24):
        for i in range(0, len(text), size):
            yield text[i:i + size]

    def _tool_call_parts(call: Any) -> tuple[str, str, str]:
        if isinstance(call, dict):
            fn = call.get("function", {}) or {}
            return call.get("id") or new_id(), fn.get("name") or "", fn.get("arguments") or "{}"
        fn = getattr(call, "function", None)
        return (
            getattr(call, "id", None) or new_id(),
            getattr(fn, "name", "") if fn else "",
            getattr(fn, "arguments", "{}") if fn else "{}",
        )

    async def _finalize_local_agent_turn(workspace, user, message, model_name, user_message,
                                         assistant_message, touched, run_outputs, events,
                                         attachments, plan_markdown, effort):
        workspace_id = workspace["id"]
        diffs: list[dict] = []
        files_changed: list[dict] = []
        for path, info in touched.items():
            if info["old"] == info["new"]:
                continue
            diff = _make_normalized_diff(path, info["old"], info["new"])
            diff["patch_source"] = "litellm_agent"
            diff["sandbox_applied"] = False
            diffs.append(diff)
            files_changed.append({"path": path, "status": info["status"]})
        if files_changed:
            events.append(_stream_event("git_changed", f"{len(files_changed)} file(s) changed.", files=files_changed))
            first_path = files_changed[0]["path"]
            await db.workspace_sessions.update_one(
                {"id": workspace_id},
                {"$set": {"active_file_path": first_path, "updated_at": now_iso()}},
            )
            events.append(_stream_event("open_file", f"Opening {first_path}.", path=first_path))
        events.append(_stream_event("agent_finished", "Done. Review the diff, then commit or revert from Git controls."))
        change = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "prompt": message,
            "assistant_message": assistant_message,
            "model": model_name,
            "effort": effort,
            "changes": diffs,
            "files_changed": files_changed,
            "attachments": attachments or [],
            "plan_markdown": plan_markdown,
            "patch": "",
            "events": events,
            "command_output": "\n\n".join(run_outputs)[:8000],
            "status": "applied" if files_changed else "no_changes",
            "applied_at": now_iso() if files_changed else None,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.ai_change_sets.insert_one(change)
        assistant_doc = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "role": "assistant",
            "content": assistant_message,
            "change_set_id": change["id"],
            "model": model_name,
            "effort": effort,
            "changed_files": [c["path"] for c in files_changed],
            "attachments": attachments or [],
            "plan_markdown": plan_markdown,
            "events": events,
            "created_at": now_iso(),
        }
        await db.workspace_chat_messages.insert_one(assistant_doc)
        summary = ", ".join([c["path"] for c in files_changed[:6]]) or "none"
        await _append_workspace_activity(workspace, f"Agent changed {len(files_changed)} file(s): {summary}.")
        change.pop("_id", None)
        change["messages"] = [
            {k: v for k, v in user_message.items() if k != "_id"},
            {k: v for k, v in assistant_doc.items() if k != "_id"},
        ]
        return change

    async def _stream_litellm_workspace_agent(workspace, message, enriched_message, user,
                                              model_name, effort, attachments, plan_markdown):
        workspace_id = workspace["id"]
        friendly, model_slug, _note = model_router.resolve_model(model_name, tier="paid")

        user_message = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "role": "user",
            "content": message,
            "attachments": attachments,
            "plan_markdown": plan_markdown,
            "effort": effort,
            "created_at": now_iso(),
        }
        await db.workspace_chat_messages.insert_one(user_message)

        files = await _active_files(workspace_id)
        files_by_path: dict[str, dict] = {f["path"]: f for f in files if f.get("path")}
        file_list = [p for p in files_by_path.keys()][:400]
        runtime = await _runtime_session(workspace_id, user)

        events: list[dict] = []
        touched: dict[str, dict] = {}
        run_outputs: list[str] = []

        def ev(kind, msg, **extra):
            event = _stream_event(kind, msg, **extra)
            events.append(event)
            return event

        system_prompt = (
            "You are AREVEI's coding agent working directly on the user's real project files.\n"
            "Rules:\n"
            "- Use tools to inspect and modify files. Call read_file before editing an existing file.\n"
            "- write_file must contain the COMPLETE new content of the file (never a diff or a fragment).\n"
            "- Make minimal, correct edits and keep the existing code style.\n"
            "- Never paste large code blocks into the chat; put code ONLY through write_file.\n"
            "- If the request is ambiguous, ask ONE short clarifying question instead of guessing.\n"
            "- When finished, reply with a concise 2-4 sentence summary of exactly what you changed and why.\n\n"
            f"Workspace files ({len(file_list)}):\n" + "\n".join(file_list[:200])
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": enriched_message},
        ]
        tools = _agent_tools_schema()

        yield {"type": "event", "event": ev("agent_started", f"Thinking with {friendly}...")}
        await asyncio.sleep(0)

        final_text = ""
        clarifying = False
        for _step in range(8):
            try:
                resp = await model_router.acompletion(model_slug, messages, tools=tools, tool_choice="auto")
            except Exception as exc:
                yield {"type": "error", "detail": f"Model call failed: {exc}"}
                return
            choice = resp.choices[0]
            assistant = model_router.message_to_dict(choice.message)
            messages.append(assistant)
            tool_calls = assistant.get("tool_calls") or []
            if not tool_calls:
                final_text = assistant.get("content") or ""
                clarifying = not touched
                break
            for call in tool_calls:
                call_id, fn, raw_args = _tool_call_parts(call)
                try:
                    args = json.loads(raw_args or "{}")
                except Exception:
                    args = {}
                path = _clean_workspace_path(args.get("path", "")) if args.get("path") else None

                if fn == "write_file" and path:
                    yield {"type": "event", "event": ev("file_edit_started", f"Editing {path}", path=path)}
                elif fn == "read_file" and path:
                    yield {"type": "event", "event": ev("open_file", f"Reading {path}", path=path)}
                elif fn == "run_command":
                    yield {"type": "event", "event": ev("tool_started", f"Running: {args.get('command', '')}", command=args.get("command", ""))}
                await asyncio.sleep(0)

                # --- execute tool ---
                if fn == "list_files":
                    result = json.dumps({"files": file_list})
                elif fn == "read_file":
                    doc = files_by_path.get(path) if path else None
                    if not doc and path:
                        doc = await _workspace_file(workspace_id, path)
                    result = (doc.get("content") or "")[:60000] if doc else json.dumps({"error": "file not found", "path": path})
                elif fn == "write_file" and path:
                    content = args.get("content", "")
                    existing = files_by_path.get(path) or await _workspace_file(workspace_id, path)
                    old = existing.get("content", "") if existing else ""
                    original = existing.get("original_content", old) if existing else ""
                    await _upsert_workspace_file(workspace_id, path, content, original=original if existing else "")
                    await _ensure_tree_file(workspace, path)
                    files_by_path[path] = {"path": path, "content": content, "language": _language_for_path(path)}
                    if path not in file_list:
                        file_list.append(path)
                    prev = touched.get(path, {})
                    touched[path] = {"old": prev.get("old", old), "new": content, "status": "M" if existing else "A"}
                    if runtime and runtime.get("provider") == "daytona" and runtime.get("provider_runtime_id"):
                        try:
                            _daytona_write_workspace_file(runtime, path, content)
                        except Exception:
                            pass
                    result = json.dumps({"ok": True, "path": path, "bytes": len(content)})
                    yield {"type": "event", "event": ev("file_edit_finished", f"Updated {path}", path=path, status="M")}
                elif fn == "run_command":
                    cmd = (args.get("command") or "").strip()
                    if not (runtime and runtime.get("provider") == "daytona" and runtime.get("provider_runtime_id")):
                        result = json.dumps({"error": "No sandbox is running. Ask the user to click Start runtime for commands or preview."})
                    else:
                        try:
                            active = await _active_files(workspace_id)
                            res = _daytona_run_command(runtime, active, cmd)
                            out = (res.get("output") or "")[:6000]
                            run_outputs.append(f"$ {cmd}\n{out}")
                            result = json.dumps({"exit_code": res.get("exit_code"), "output": out})
                        except Exception as exc:
                            result = json.dumps({"error": str(exc)})
                    yield {"type": "event", "event": ev("command_output", "Command finished.", command=(args.get("command") or ""), output=result[:2000])}
                else:
                    result = json.dumps({"error": f"unknown tool {fn}"})

                messages.append({"role": "tool", "tool_call_id": call_id, "content": result})
                await asyncio.sleep(0)

        if not final_text:
            final_text = "I applied the requested changes." if touched else "I reviewed the workspace but did not need to change any files."
        for chunk in _chunk_text(final_text):
            yield {"type": "delta", "text": chunk}
            await asyncio.sleep(0)

        result = await _finalize_local_agent_turn(
            workspace, user, message, friendly, user_message, final_text,
            {} if clarifying else touched, run_outputs, events, attachments, plan_markdown, effort,
        )
        yield {"type": "result", "result": result}

    @r.post("/workspaces/{workspace_id}/ai/chat/stream")
    async def workspace_ai_chat_stream(workspace_id: str, payload: dict, user=Depends(current_user)):
        async def stream():
            def line(data: dict) -> bytes:
                return (json.dumps(data, default=str) + "\n").encode("utf-8")

            started = _stream_event("agent_started", "Starting AI coding agent.")
            yield line({"type": "event", "event": started})
            await asyncio.sleep(0)
            try:
                workspace = await _workspace(workspace_id, user)
                message = (payload.get("message") or "").strip()
                if not message:
                    yield line({"type": "error", "detail": "Message is required"})
                    return
                selected_model = _coding_model_from_payload(payload.get("model"))
                effort = str(payload.get("effort") or "medium").lower()
                if effort not in {"low", "medium", "high"}:
                    effort = "medium"
                attachment_ids = [str(item) for item in (payload.get("attachments") or []) if str(item).strip()]
                attachments = await db.workspace_attachments.find(
                    {"workspace_id": workspace_id, "tenant_id": user["tenant_id"], "id": {"$in": attachment_ids}},
                    {"_id": 0},
                ).to_list(20) if attachment_ids else []
                plan_markdown = _plan_markdown(message, attachments) if payload.get("plan_mode") else ""
                enriched_message = message
                if plan_markdown:
                    enriched_message += "\n\nUse this implementation plan before editing:\n" + plan_markdown
                    plan_event = _stream_event("plan_created", "Implementation plan created.", plan_markdown=plan_markdown)
                    yield line({"type": "event", "event": plan_event})
                    yield line({"type": "plan", "markdown": plan_markdown})
                enriched_message += _attachment_context(attachments)

                # --- Primary path: cheap LiteLLM/OpenRouter server-side agent ---
                # Edits the workspace file store directly (single source of truth for
                # the editor), streams live file-edit events, and does NOT require a
                # running sandbox. Replaces the expensive Codex-SDK-in-Daytona path.
                if model_router.router_ready() and not payload.get("use_codex"):
                    async for item in _stream_litellm_workspace_agent(
                        workspace, message, enriched_message, user,
                        payload.get("model"), effort, attachments, plan_markdown,
                    ):
                        yield line(item)
                        await asyncio.sleep(0)
                    return

                runtime = await _runtime_session(workspace_id, user)
                runtime = await _upgrade_runtime_to_current_provider(runtime, workspace_id) if runtime else None
                runner = CodexDaytonaAgentRunner(runtime, selected_model) if runtime else None
                if runner and runner.available:
                    user_message = {
                        "id": new_id(),
                        "tenant_id": user["tenant_id"],
                        "workspace_id": workspace_id,
                        "project_id": workspace.get("project_id"),
                        "chat_id": workspace.get("chat_id"),
                        "repo_id": workspace["repo_id"],
                        "user_id": user["user_id"],
                        "role": "user",
                        "content": message,
                        "attachments": attachments,
                        "plan_markdown": plan_markdown,
                        "effort": effort,
                        "created_at": now_iso(),
                    }
                    await db.workspace_chat_messages.insert_one(user_message)
                    repo = await _repo(workspace["repo_id"], user)
                    repo_token = await _installation_token(repo["installation_id"]) if repo.get("provider") == "github" else None
                    files = await _active_files(workspace_id)
                    sync_event = _stream_event("tool_started", "Syncing workspace files into Daytona.", name="daytona_sync")
                    yield line({"type": "event", "event": sync_event})
                    _daytona_sync_files(runtime, files, repo=repo, token=repo_token)
                    sync_done = _stream_event("tool_finished", "Workspace files are synced in Daytona.", name="daytona_sync")
                    yield line({"type": "event", "event": sync_done})
                    await _append_workspace_activity(workspace, "Running Codex SDK agent inside Daytona.")
                    streamed_events = [started, sync_event, sync_done]
                    codex_final: dict | None = None
                    async for item in runner.stream(enriched_message, effort):
                        if item.get("type") == "event" and item.get("event"):
                            streamed_events.append(item["event"])
                        elif item.get("type") == "codex_final":
                            codex_final = item.get("result") or {}
                            continue
                        yield line(item)
                        if item.get("type") == "error":
                            detail = item.get("detail") or "Codex SDK failed inside Daytona."
                            assistant_doc = {
                                "id": new_id(),
                                "tenant_id": user["tenant_id"],
                                "workspace_id": workspace_id,
                                "project_id": workspace.get("project_id"),
                                "chat_id": workspace.get("chat_id"),
                                "repo_id": workspace["repo_id"],
                                "user_id": user["user_id"],
                                "role": "assistant",
                                "content": detail,
                                "model": selected_model,
                                "events": streamed_events,
                                "status": "error",
                                "created_at": now_iso(),
                            }
                            await db.workspace_chat_messages.insert_one(assistant_doc)
                            await _append_workspace_activity(workspace, detail[:700])
                            return
                        await asyncio.sleep(0)
                    result = await _finalize_codex_daytona_turn(
                        workspace,
                        runtime,
                        user,
                        message,
                        selected_model,
                        user_message,
                        codex_final or {},
                        streamed_events,
                        attachments,
                        plan_markdown,
                        effort,
                    )
                    for event in result.get("events", [])[len(streamed_events):]:
                        yield line({"type": "event", "event": event})
                        await asyncio.sleep(0)
                    yield line({"type": "result", "result": result})
                    return

                provider = runtime.get("provider") if runtime else "none"
                setup_hint = (
                    runtime.get("setup_hint")
                    if runtime
                    else "Start a Daytona runtime before sending project coding prompts."
                )
                detail = (
                    "AI Workspace project chat requires the Daytona Codex SDK runtime. "
                    f"Current runtime provider is `{provider}`. "
                    "Set DAYTONA_API_KEY, WORKSPACE_RUNTIME_BRIDGE_ENABLED=true, "
                    "WORKSPACE_CODEX_AGENT_ENABLED=true, and SANDBOX_OPENAI_API_KEY "
                    "or WORKSPACE_CODEX_USE_SANDBOX_ENV=true. "
                    f"{setup_hint or ''}"
                ).strip()
                yield line({"type": "error", "detail": detail})
            except Exception as exc:
                yield line({"type": "error", "detail": str(exc)})

        return StreamingResponse(stream(), media_type="application/x-ndjson")

    @r.get("/workspaces/{workspace_id}/chat")
    async def workspace_chat_history(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        messages = await db.workspace_chat_messages.find(
            {"workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(300)
        return {"messages": messages}

    @r.post("/workspaces/{workspace_id}/attachments")
    async def upload_workspace_attachment(workspace_id: str, file: UploadFile = File(...), user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        filename = _safe_attachment_name(file.filename or "attachment")
        if not _attachment_allowed(filename, file.content_type):
            raise HTTPException(400, "Unsupported attachment type")
        data = await file.read()
        if len(data) > 8 * 1024 * 1024:
            raise HTTPException(400, "Attachment is too large")
        attachment_id = new_id()
        stored_path = f".arevei/attachments/{attachment_id}-{filename}"
        text_preview = _attachment_text_preview(data, file.content_type, filename)
        runtime = await _runtime_session(workspace_id, user)
        sandbox_path = stored_path
        if runtime and runtime.get("provider") == "daytona" and runtime.get("provider_runtime_id"):
            try:
                sandbox = _daytona_workspace_sandbox(runtime)
                remote_path = _remote_file_path(runtime, stored_path)
                _daytona_exec(sandbox, f"mkdir -p {shlex.quote(posixpath.dirname(remote_path))}", timeout=30)
                sandbox.fs.upload_file(data, remote_path)
                sandbox_path = remote_path
            except Exception as exc:
                await _append_workspace_activity(workspace, f"Attachment upload to Daytona failed: {str(exc)[:240]}")
        doc = {
            "id": attachment_id,
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "project_id": workspace.get("project_id"),
            "chat_id": workspace.get("chat_id"),
            "user_id": user["user_id"],
            "name": filename,
            "mime_type": file.content_type,
            "size": len(data),
            "stored_path": stored_path,
            "sandbox_path": sandbox_path,
            "text_preview": text_preview,
            "created_at": now_iso(),
        }
        await db.workspace_attachments.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @r.post("/workspaces/{workspace_id}/approvals/{approval_id}")
    async def decide_workspace_approval(workspace_id: str, approval_id: str, payload: dict, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        decision = str(payload.get("decision") or "").lower()
        if decision not in {"allow", "deny"}:
            raise HTTPException(400, "decision must be allow or deny")
        approval = await db.workspace_command_approvals.find_one(
            {"id": approval_id, "workspace_id": workspace_id, "tenant_id": user["tenant_id"]},
            {"_id": 0},
        )
        if not approval:
            raise HTTPException(404, "Approval not found")
        if approval.get("status") != "pending":
            raise HTTPException(409, "Approval has already been used")
        updates = {"status": "allowed" if decision == "allow" else "denied", "decision": decision, "decided_at": now_iso()}
        await db.workspace_command_approvals.update_one({"id": approval_id}, {"$set": updates})
        return {"ok": True, "approval_id": approval_id, **updates}

    @r.get("/workspaces/{workspace_id}/changes")
    async def list_workspace_changes(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        return await db.ai_change_sets.find(
            {"workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

    @r.get("/workspaces/{workspace_id}/commits")
    async def list_workspace_commits(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("commands"):
            try:
                changed = _daytona_git_status(runtime)
                commits = await db.commit_jobs.find(
                    {"workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
                ).sort("created_at", -1).to_list(50)
                return {"changed_files": changed, "commits": commits}
            except Exception:
                pass
        files = await _active_files(workspace_id)
        changed = [
            {"path": f["path"], "language": f.get("language", "plaintext")}
            for f in files
            if f.get("content") != f.get("original_content")
        ]
        commits = await db.commit_jobs.find(
            {"workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        return {"changed_files": changed, "commits": commits}

    @r.post("/workspaces/{workspace_id}/revert")
    async def revert_workspace_changes(workspace_id: str, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        if runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("commands"):
            changed = _daytona_git_status(runtime)
            paths = [item["path"] for item in changed]
            reverted = _daytona_restore_paths(runtime, paths)
            await db.workspace_files.delete_many({"workspace_id": workspace_id, "path": {"$in": paths}})
            await _refresh_workspace_knowledge(workspace_id)
            await _append_workspace_activity(workspace, f"Reverted {reverted} sandbox file change(s) with git restore/clean.")
            return {"ok": True, "reverted": reverted, "files": paths}
        files = await _active_files(workspace_id)
        changed = [f for f in files if f.get("content") != f.get("original_content")]
        for f in changed:
            await db.workspace_files.update_one(
                {"workspace_id": workspace_id, "path": f["path"]},
                {"$set": {"content": f.get("original_content", ""), "updated_at": now_iso()}},
            )
        await _refresh_workspace_knowledge(workspace_id)
        await _append_workspace_activity(
            workspace,
            f"Reverted {len(changed)} uncommitted file change(s) back to the last committed workspace state.",
        )
        return {"ok": True, "reverted": len(changed), "files": [f["path"] for f in changed]}

    @r.post("/workspaces/{workspace_id}/changes/{change_id}/apply")
    async def apply_workspace_change(workspace_id: str, change_id: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        change = await db.ai_change_sets.find_one(
            {"id": change_id, "workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
        )
        if not change:
            raise HTTPException(404, "Change set not found")
        accept = bool(payload.get("accept"))
        runtime = await _runtime_session(workspace_id, user)
        sandbox_active = bool(runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("commands"))
        touched_paths = [_clean_workspace_path(item["path"]) for item in change.get("changes", []) if item.get("path")]
        if not accept:
            if sandbox_active:
                _daytona_restore_paths(runtime, touched_paths)
                await db.workspace_files.delete_many({"workspace_id": workspace_id, "path": {"$in": touched_paths}})
            await db.ai_change_sets.update_one({"id": change_id}, {"$set": {"status": "rejected", "updated_at": now_iso()}})
            await _append_workspace_activity(workspace, f"Rejected change set {change_id}. Restored {len(touched_paths)} touched file(s).")
            return {"ok": True, "status": "rejected"}
        if sandbox_active:
            patch = _daytona_git_diff(runtime, touched_paths)
            await db.ai_change_sets.update_one(
                {"id": change_id},
                {"$set": {
                    "status": "accepted",
                    "patch": patch or change.get("patch"),
                    "files_changed": _daytona_git_status(runtime, touched_paths),
                    "updated_at": now_iso(),
                }},
            )
            knowledge = await _refresh_workspace_knowledge(workspace_id)
            await db.workspace_knowledge.update_one(
                {"workspace_id": workspace_id},
                {"$set": {"memory.last_task": change.get("assistant_message"), "updated_at": knowledge["updated_at"]}},
            )
            await _append_workspace_activity(workspace, f"Accepted change set {change_id}. Sandbox git diff remains available for commit or further edits.")
            return {"ok": True, "status": "accepted", "files": touched_paths}
        for item in change.get("changes", []):
            existing = await _workspace_file(workspace_id, item["path"])
            original = existing.get("original_content") if existing else item.get("old", "")
            await _upsert_workspace_file(workspace_id, item["path"], item.get("new", ""), original)
        knowledge = await _refresh_workspace_knowledge(workspace_id)
        await db.workspace_knowledge.update_one(
            {"workspace_id": workspace_id},
            {"$set": {"memory.last_task": change.get("assistant_message"), "updated_at": knowledge["updated_at"]}},
        )
        await db.ai_change_sets.update_one({"id": change_id}, {"$set": {"status": "accepted", "updated_at": now_iso()}})
        workspace = await _workspace(workspace_id, user)
        await _append_workspace_activity(
            workspace,
            f"Applied change set {change_id} to {len(change.get('changes', []))} file(s) and refreshed workspace knowledge.",
        )
        return {"ok": True, "status": "accepted"}

    @r.post("/workspaces/{workspace_id}/commit")
    async def commit_workspace(workspace_id: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        repo = await _repo(workspace["repo_id"], user)
        runtime = await _runtime_session(workspace_id, user)
        sandbox_active = bool(runtime and runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("commands"))
        if sandbox_active:
            changed_status = _daytona_git_status(runtime)
            changed = []
            for item in changed_status:
                if "D" in item.get("status", ""):
                    changed.append({**item, "content": None, "deleted": True})
                else:
                    doc = _daytona_read_workspace_file(runtime, item["path"])
                    changed.append({**item, "content": doc.get("content", "")})
        else:
            files = await _active_files(workspace_id)
            changed = [f for f in files if f.get("content") != f.get("original_content")]
        if not changed:
            raise HTTPException(400, "No changes to commit")
        message = payload.get("message") or "Apply AI-assisted changes"
        branch = payload.get("branch") or workspace.get("working_branch") or workspace["branch"]
        job = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "repo_id": repo["id"],
            "branch": branch,
            "message": message,
            "files_changed": [f["path"] for f in changed],
            "status": "queued",
            "created_at": now_iso(),
        }

        if repo.get("provider") == "mock":
            job.update({"status": "committed", "commit_sha": f"mock-{new_id()[:8]}", "html_url": repo["html_url"]})
        else:
            token = await _installation_token(repo["installation_id"])
            owner, name = repo["full_name"].split("/", 1)
            try:
                ref = _gh_request("GET", f"/repos/{owner}/{name}/git/ref/heads/{branch}", token=token)
            except HTTPException as exc:
                if exc.status_code != 404:
                    raise
                base_ref = _gh_request("GET", f"/repos/{owner}/{name}/git/ref/heads/{workspace['branch']}", token=token)
                _gh_request("POST", f"/repos/{owner}/{name}/git/refs", token=token, json={
                    "ref": f"refs/heads/{branch}",
                    "sha": base_ref["object"]["sha"],
                })
                ref = _gh_request("GET", f"/repos/{owner}/{name}/git/ref/heads/{branch}", token=token)
            base_commit_sha = ref["object"]["sha"]
            base_commit = _gh_request("GET", f"/repos/{owner}/{name}/git/commits/{base_commit_sha}", token=token)
            tree_items = []
            for f in changed:
                if f.get("deleted"):
                    tree_items.append({"path": f["path"], "mode": "100644", "type": "blob", "sha": None})
                else:
                    blob = _gh_request("POST", f"/repos/{owner}/{name}/git/blobs", token=token, json={
                        "content": _encode_blob(f.get("content", "")),
                        "encoding": "base64",
                    })
                    tree_items.append({"path": f["path"], "mode": "100644", "type": "blob", "sha": blob["sha"]})
            new_tree = _gh_request("POST", f"/repos/{owner}/{name}/git/trees", token=token, json={
                "base_tree": base_commit["tree"]["sha"],
                "tree": tree_items,
            })
            commit = _gh_request("POST", f"/repos/{owner}/{name}/git/commits", token=token, json={
                "message": message,
                "tree": new_tree["sha"],
                "parents": [base_commit_sha],
            })
            _gh_request("PATCH", f"/repos/{owner}/{name}/git/refs/heads/{branch}", token=token, json={"sha": commit["sha"]})
            job.update({"status": "committed", "commit_sha": commit["sha"], "html_url": commit.get("html_url")})

        await db.commit_jobs.insert_one(job)
        if sandbox_active and job.get("commit_sha"):
            try:
                sandbox = _daytona_workspace_sandbox(runtime)
                root = _remote_workspace_root(runtime)
                _daytona_exec(sandbox, f"git fetch origin {shlex.quote(branch)} && git reset --hard {shlex.quote(job['commit_sha'])}", cwd=root, timeout=180)
            except Exception as exc:
                await _append_workspace_activity(workspace, f"Committed remotely, but sandbox HEAD refresh failed: {str(exc)[:240]}")
        for f in changed:
            if f.get("deleted"):
                await db.workspace_files.delete_one({"workspace_id": workspace_id, "path": f["path"]})
            else:
                await db.workspace_files.update_one(
                    {"workspace_id": workspace_id, "path": f["path"]},
                    {"$set": {"content": f.get("content", ""), "original_content": f.get("content", ""), "updated_at": now_iso()}},
                    upsert=True,
                )
        await _append_workspace_activity(
            workspace,
            f"Committed and pushed {len(changed)} file(s) to `{branch}` with commit `{job.get('commit_sha')}`.",
        )
        job.pop("_id", None)
        return job

    @r.post("/workspaces/{workspace_id}/deploy")
    async def deploy_workspace(workspace_id: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        provider = payload.get("provider") or "vercel"
        job = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "repo_id": workspace["repo_id"],
            "provider": provider,
            "status": "queued",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        vercel_installation = await db.vercel_installations.find_one({"tenant_id": user["tenant_id"]})
        vercel_token = vercel_installation.get("access_token") if vercel_installation else os.environ.get("VERCEL_TOKEN")
        
        if provider == "vercel" and vercel_token and payload.get("project_id"):
            job.update({
                "status": "ready_for_provider",
                "note": "Vercel token and project were detected. Production deploy upload is reserved for the container workspace phase.",
            })
        elif provider == "vercel" and vercel_token and not payload.get("project_id"):
            job.update({
                "status": "pending_project_link",
                "note": "Vercel token found, but repository is not yet linked to a Vercel project.",
            })
        else:
            job.update({
                "status": "preview_recorded",
                "preview_url": f"https://preview.arevei.local/{workspace['id']}",
                "note": "Connect Vercel/Netlify credentials to trigger real provider deployments.",
            })
        await db.deployment_jobs.insert_one(job)
        job.pop("_id", None)
        return job

    return r
