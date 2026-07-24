"""GitHub development platform routes.

This is the MVP persistent workspace engine: it uses the GitHub API when a
GitHub App is configured, and falls back to a seeded mock repository for local
demos. Runtime compute is provider-neutral so Daytona, DevPod, Coder, or a
managed Kubernetes backend can be wired behind the same workspace API.
"""
from __future__ import annotations

import base64
import difflib
import html
import json
import os
import posixpath
import re
import shlex
import time
from typing import Any
from urllib.parse import parse_qsl, parse_qs, urlencode, urlsplit, urlunsplit

import jwt
import requests
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import current_user, decode_token
from models import new_id, now_iso

GITHUB_API = "https://api.github.com"
MAX_INDEX_FILES = 120
MAX_FILE_BYTES = 180_000
MAX_TREE_FILES = 5000


MOCK_FILES = {
    "README.md": "# Starter App\n\nThis repository is ready for AI-assisted development.\n",
    "package.json": json.dumps(
        {
            "scripts": {"dev": "vite --host 0.0.0.0", "build": "vite build"},
            "dependencies": {"@vitejs/plugin-react": "latest", "vite": "latest", "react": "latest"},
        },
        indent=2,
    ),
    "src/App.jsx": (
        "import React from 'react';\n\n"
        "export default function App() {\n"
        "  return <main><h1>Ship something useful.</h1></main>;\n"
        "}\n"
    ),
    "src/styles.css": "body { font-family: system-ui, sans-serif; margin: 0; }\n",
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
        try:
            data = _gh_request(
                "POST",
                f"/app/installations/{installation_id}/access_tokens",
                token=_github_app_jwt(),
            )
        except HTTPException as exc:
            if exc.status_code == 404:
                raise HTTPException(
                    404,
                    "GitHub installation was not found for the configured GitHub App. Reconnect GitHub, or verify GITHUB_APP_ID and GITHUB_PRIVATE_KEY belong to the same installed app.",
                )
            raise
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
        return doc

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

    async def _openai_code_proposal(message: str, files: list[dict]) -> tuple[str, list[dict]] | None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return None
        context_files = []
        for f in files[:35]:
            path = f["path"]
            if path.endswith((".png", ".jpg", ".jpeg", ".gif", ".ico", ".lock")):
                continue
            context_files.append({
                "path": path,
                "language": f.get("language", "plaintext"),
                "content": _safe_text(f.get("content", ""), 7000),
            })
        prompt = {
            "task": message,
            "repo_files": context_files,
            "rules": [
                "Return ONLY valid JSON.",
                "Make practical code edits across one or more files.",
                "Each change must contain path, content, and reason.",
                "content must be the complete new file content, not a patch.",
                "Do not include unchanged files.",
                "Prefer small cohesive changes that can be previewed and committed.",
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
                    "model": os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"),
                    "input": [
                        {
                            "role": "developer",
                            "content": "You are a senior coding agent. Produce safe preview-first file edits as strict JSON.",
                        },
                        {"role": "user", "content": json.dumps(prompt)},
                    ],
                    "temperature": 0.2,
                },
                timeout=60,
            )
            if res.status_code >= 400:
                return None
            parsed = _extract_json_object(_response_output_text(res.json()))
        except Exception:
            return None

        by_path = {f["path"]: f for f in files}
        diffs: list[dict] = []
        for change in parsed.get("changes", [])[:8]:
            path = str(change.get("path", "")).strip().replace("\\", "/")
            content = change.get("content")
            if not path or content is None or path.startswith("../") or "/../" in path:
                continue
            old = by_path.get(path, {}).get("content", "")
            if old == content:
                continue
            diff = _make_diff(path, old, str(content))
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
                    "model": os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"),
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

    def _replace_app_for_feature(message: str) -> str:
        title = "AI Development Workspace"
        if "landing" in message.lower():
            title = "Launch faster with AI"
        elif "dashboard" in message.lower():
            title = "Project Control Center"
        return (
            "import React from 'react';\n"
            "import './styles.css';\n\n"
            "const features = [\n"
            "  'Connect a GitHub repository',\n"
            "  'Ask AI to edit multiple files',\n"
            "  'Review every diff before committing',\n"
            "];\n\n"
            "export default function App() {\n"
            "  return (\n"
            "    <main className=\"page-shell\">\n"
            "      <section className=\"hero-panel\">\n"
            f"        <p className=\"eyebrow\">{html.escape(message[:70])}</p>\n"
            f"        <h1>{title}</h1>\n"
            "        <p className=\"lede\">A polished workspace experience generated from your prompt, ready to review before it is committed.</p>\n"
            "        <div className=\"actions\"><button>Preview change</button><button className=\"secondary\">Commit safely</button></div>\n"
            "      </section>\n"
            "      <section className=\"feature-grid\">\n"
            "        {features.map((feature) => <article key={feature}><span /> <h2>{feature}</h2><p>Built as a real file edit, not a comment placeholder.</p></article>)}\n"
            "      </section>\n"
            "    </main>\n"
            "  );\n"
            "}\n"
        )

    def _feature_css() -> str:
        return (
            ":root { color: #17211f; background: #f4f7f3; font-family: Inter, system-ui, sans-serif; }\n"
            "body { margin: 0; background: #f4f7f3; }\n"
            ".page-shell { min-height: 100vh; padding: 48px; box-sizing: border-box; }\n"
            ".hero-panel { max-width: 980px; background: #ffffff; border: 1px solid #d9dfd7; padding: 44px; box-shadow: 0 24px 60px rgba(23,33,31,.08); }\n"
            ".eyebrow { margin: 0 0 14px; color: #087a67; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }\n"
            "h1 { margin: 0; max-width: 780px; font-size: clamp(42px, 8vw, 82px); line-height: .95; letter-spacing: 0; }\n"
            ".lede { max-width: 620px; font-size: 18px; line-height: 1.7; color: #5d6864; }\n"
            ".actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 26px; }\n"
            "button { border: 0; background: #111917; color: #fff; padding: 13px 18px; font-weight: 800; cursor: pointer; }\n"
            "button.secondary { background: #dff7ee; color: #0b4d40; }\n"
            ".feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 18px; max-width: 980px; }\n"
            "article { background: #ffffff; border: 1px solid #d9dfd7; padding: 22px; }\n"
            "article span { display: block; width: 34px; height: 4px; background: #10b798; margin-bottom: 18px; }\n"
            "article h2 { font-size: 18px; margin: 0 0 8px; }\n"
            "article p { color: #64706c; line-height: 1.55; margin: 0; }\n"
            "@media (max-width: 760px) { .page-shell { padding: 20px; } .hero-panel { padding: 26px; } .feature-grid { grid-template-columns: 1fr; } }\n"
        )

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
        return await db.workspace_files.find(
            {"workspace_id": workspace_id}, {"_id": 0}
        ).sort("path", 1).to_list(1000)

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
        auth = f"-c http.extraHeader={shlex.quote('AUTHORIZATION: bearer ' + token)} " if token else ""
        repo_url = f"https://github.com/{full_name}.git"
        command = (
            f"mkdir -p {shlex.quote(posixpath.dirname(root))} && "
            f"if [ -d {shlex.quote(root)}/.git ]; then "
            f"git -C {shlex.quote(root)} {auth}fetch origin {shlex.quote(branch)} && "
            f"git -C {shlex.quote(root)} checkout {shlex.quote(branch)} && "
            f"git -C {shlex.quote(root)} reset --hard FETCH_HEAD; "
            f"else "
            f"rm -rf {shlex.quote(root)} && "
            f"git {auth}clone --depth 1 --branch {shlex.quote(branch)} {shlex.quote(repo_url)} {shlex.quote(root)}; "
            f"fi"
        )
        _daytona_exec(sandbox, command, timeout=300)

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
        for f in files:
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
        for f in files:
            remote_path = _remote_file_path(runtime, f["path"])
            remote_dir = posixpath.dirname(remote_path)
            _daytona_exec(sandbox, f"mkdir -p {shlex.quote(remote_dir)}", timeout=60)
            sandbox.fs.upload_file((f.get("content") or "").encode("utf-8"), remote_path)
        return len(files)

    def _daytona_exec_output(response: Any) -> str:
        artifacts = getattr(response, "artifacts", None)
        stdout = getattr(artifacts, "stdout", None) if artifacts else None
        stderr = getattr(artifacts, "stderr", None) if artifacts else None
        result = getattr(response, "result", None)
        return "\n".join(part for part in (stdout, stderr, result) if part)[:8000]

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
                "output": f"Started `{dev_command}` on Daytona sandbox {sandbox_id}. Port {port} is responding.\n\nDev server log:\n{log_tail}",
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

    async def _build_ai_proposal(workspace: dict, message: str) -> tuple[str, list[dict]]:
        files = await _active_files(workspace["id"])
        by_path = {f["path"]: f for f in files}
        lower = message.lower()
        diffs: list[dict] = []

        openai_result = await _openai_code_proposal(message, files)
        if openai_result:
            return openai_result

        target_path = None
        for path in by_path:
            if path.lower() in lower:
                target_path = path
                break

        wants_ui = any(word in lower for word in ("create", "new", "feature", "landing", "dashboard", "component", "page", "ui", "website", "design"))
        if wants_ui or not files:
            app_path = "src/App.jsx" if "src/App.jsx" in by_path or "src/App.js" not in by_path else "src/App.js"
            css_path = "src/styles.css"
            readme_path = "README.md"
            app_old = by_path.get(app_path, {}).get("content", "")
            css_old = by_path.get(css_path, {}).get("content", "")
            readme_old = by_path.get(readme_path, {}).get("content", "")
            diffs.append(_make_diff(app_path, app_old, _replace_app_for_feature(message)))
            diffs.append(_make_diff(css_path, css_old, _feature_css()))
            if "readme" in lower or "document" in lower or "full" in lower:
                readme_new = readme_old.rstrip() + f"\n\n## AI change\n\nImplemented a multi-file UI update for: {message}\n"
                diffs.append(_make_diff(readme_path, readme_old, readme_new))
            return f"I prepared a multi-file website change across {len(diffs)} files. Review the diffs, accept them, then open Preview.", diffs

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
        diffs.append(_make_diff(target_path, current, new))
        return f"I prepared a safe proposal touching {target_path}.", diffs

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
            updates["preview_url"] = result["preview_url"]
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
            initial_paths = _initial_context_paths([item["path"] for item in tree])
            for item in [entry for entry in tree if entry["path"] in initial_paths]:
                try:
                    fetched = await _fetch_real_file(repo, item["path"], branch)
                    await _upsert_workspace_file(workspace["id"], fetched["path"], fetched["content"], fetched["content"])
                except Exception:
                    continue
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

    @r.put("/workspaces/{workspace_id}/files/{path:path}")
    async def put_workspace_file(workspace_id: str, path: str, payload: dict, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        existing = await _workspace_file(workspace_id, path)
        original = existing.get("original_content") if existing else payload.get("original_content", "")
        await _upsert_workspace_file(workspace_id, path, payload.get("content", ""), original)
        await _refresh_workspace_knowledge(workspace_id)
        return await _workspace_file(workspace_id, path)

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

    @r.get("/runtime/providers")
    async def runtime_providers(user=Depends(current_user)):
        await _tenant_id(user)
        return {
            "active": _runtime_provider(),
            "recommended": "daytona",
            "architecture": "AREVEI controls auth, AI, review, commit, billing, memory, and deployment. The runtime provider supplies the isolated persistent filesystem, terminal commands, snapshots, dependency install, and live preview.",
        }

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

    async def _proxy_workspace_preview_response(workspace_id: str, path: str, request: Request) -> Response:
        user = _preview_user_from_request(request)
        await _workspace(workspace_id, user)
        runtime = await _runtime_session(workspace_id, user)
        if not runtime or not runtime.get("preview_url"):
            raise HTTPException(404, "Preview URL is not ready. Run the dev server first.")
        base_parts = urlsplit(runtime["preview_url"])
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
        except requests.RequestException as exc:
            raise HTTPException(502, f"Preview upstream is not reachable: {str(exc)[:180]}")
        content_type = upstream.headers.get("content-type", "text/html")
        body = upstream.content
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
        return response

    @r.api_route("/workspaces/{workspace_id}/runtime/preview-proxy", methods=["GET", "HEAD"])
    async def proxy_workspace_preview_root(workspace_id: str, request: Request):
        return await _proxy_workspace_preview_response(workspace_id, "", request)

    @r.api_route("/workspaces/{workspace_id}/runtime/preview-proxy/{path:path}", methods=["GET", "HEAD"])
    async def proxy_workspace_preview_path(workspace_id: str, path: str, request: Request):
        return await _proxy_workspace_preview_response(workspace_id, path, request)

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
        loaded_bootstrap = await _ensure_runtime_bootstrap_files(workspace, repo)
        files = await _active_files(workspace_id)
        if runtime.get("provider") == "daytona" and runtime.get("capabilities", {}).get("commands"):
            try:
                synced = _daytona_sync_files(runtime, files, repo=repo, token=repo_token)
                await db.runtime_sessions.update_one(
                    {"id": runtime["id"]},
                    {"$set": {"files_synced": synced, "root_path": _remote_workspace_root(runtime), "status": "ready", "updated_at": now_iso()}},
                )
                await _append_runtime_log(runtime["id"], f"Synced {synced} file(s) into Daytona sandbox.")
                if loaded_bootstrap:
                    await _append_runtime_log(runtime["id"], f"Loaded {loaded_bootstrap} missing startup file(s) from GitHub before sync.")
                return await db.runtime_sessions.find_one({"id": runtime["id"]}, {"_id": 0})
            except Exception as exc:
                await db.runtime_sessions.update_one(
                    {"id": runtime["id"]},
                    {"$set": {"status": "bridge_error", "updated_at": now_iso()}},
                )
                await _append_runtime_log(runtime["id"], f"Daytona sync failed: {str(exc)[:240]}", "error")
                raise HTTPException(500, f"Daytona sync failed: {str(exc)[:240]}")
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
            repo_token = await _installation_token(repo["installation_id"]) if repo.get("provider") == "github" else None
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
                synced = _daytona_sync_files(runtime, files, repo=repo, token=repo_token)
                await _append_runtime_log(runtime["id"], f"Prepared full Git checkout and synced {synced} loaded/edited file(s) before `{command}`.")
                result = _daytona_run_command(runtime, files, command)
            except Exception as exc:
                if _is_daytona_shell_error(exc):
                    try:
                        replacement = {**runtime}
                        old_sandbox_id = replacement.pop("provider_runtime_id", None)
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
                updates["preview_url"] = result["preview_url"]
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
        await _append_workspace_activity(
            workspace,
            "Reading workspace files, project index, and previous chat context before proposing code edits.",
        )
        runtime_output = await _run_agent_runtime_intent(workspace, message, user)
        edit_words = ("edit", "change", "create", "update", "fix", "build", "add", "remove", "design", "page", "component")
        if runtime_output and not any(word in message.lower() for word in edit_words):
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
                "messages": [
                    {k: v for k, v in user_message.items() if k != "_id"},
                    {k: v for k, v in assistant_doc.items() if k != "_id"},
                ],
            }
        assistant_message, diffs = await _build_ai_proposal(workspace, message)
        if diffs:
            await _append_workspace_activity(
                workspace,
                f"Prepared {len(diffs)} editable file change(s): {', '.join([item.get('path', '') for item in diffs[:6]])}. Waiting for Accept or Reject.",
            )
        else:
            await _append_workspace_activity(workspace, "No file edits were proposed for this request.")
        knowledge = await db.workspace_knowledge.find_one(
            {"workspace_id": workspace_id, "tenant_id": user.get("tenant_id")}, {"_id": 0}
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
            "changes": diffs,
            "knowledge_snapshot": {
                "summary": knowledge.get("memory", {}).get("summary") if knowledge else None,
                "updated_at": knowledge.get("updated_at") if knowledge else None,
            },
            "status": "proposed",
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
            "changed_files": [c.get("path") for c in diffs],
            "created_at": now_iso(),
        }
        await db.workspace_chat_messages.insert_one(assistant_doc)
        change.pop("_id", None)
        change["messages"] = [
            {k: v for k, v in user_message.items() if k != "_id"},
            {k: v for k, v in assistant_doc.items() if k != "_id"},
        ]
        return change

    @r.get("/workspaces/{workspace_id}/chat")
    async def workspace_chat_history(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        messages = await db.workspace_chat_messages.find(
            {"workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", 1).to_list(300)
        return {"messages": messages}

    @r.get("/workspaces/{workspace_id}/changes")
    async def list_workspace_changes(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        return await db.ai_change_sets.find(
            {"workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

    @r.get("/workspaces/{workspace_id}/commits")
    async def list_workspace_commits(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
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
        await _workspace(workspace_id, user)
        change = await db.ai_change_sets.find_one(
            {"id": change_id, "workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
        )
        if not change:
            raise HTTPException(404, "Change set not found")
        accept = bool(payload.get("accept"))
        if not accept:
            await db.ai_change_sets.update_one({"id": change_id}, {"$set": {"status": "rejected", "updated_at": now_iso()}})
            workspace = await _workspace(workspace_id, user)
            await _append_workspace_activity(workspace, f"Rejected change set {change_id}. No files were changed.")
            return {"ok": True, "status": "rejected"}
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
                blob = _gh_request("POST", f"/repos/{owner}/{name}/git/blobs", token=token, json={
                    "content": _encode_blob(f["content"]),
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
        for f in changed:
            await db.workspace_files.update_one(
                {"workspace_id": workspace_id, "path": f["path"]},
                {"$set": {"original_content": f["content"], "updated_at": now_iso()}},
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
        if provider == "vercel" and os.environ.get("VERCEL_TOKEN") and payload.get("project_id"):
            job.update({
                "status": "ready_for_provider",
                "note": "Vercel token and project were detected. Production deploy upload is reserved for the container workspace phase.",
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
