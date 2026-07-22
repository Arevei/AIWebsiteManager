"""GitHub development platform routes.

This is the MVP workspace engine: it uses the GitHub API when a GitHub App is
configured, and falls back to a seeded mock repository for local demos.
"""
from __future__ import annotations

import base64
import difflib
import html
import json
import os
import re
import time
from typing import Any
from urllib.parse import urlencode

import jwt
import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import current_user
from models import new_id, now_iso

GITHUB_API = "https://api.github.com"
MAX_INDEX_FILES = 120
MAX_FILE_BYTES = 180_000


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
        return bool(os.environ.get("GITHUB_APP_ID") and os.environ.get("GITHUB_PRIVATE_KEY"))

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
        }

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

    async def _load_real_repo(repo: dict, branch: str) -> tuple[list[dict], dict]:
        token = await _installation_token(repo["installation_id"])
        owner, name = repo["full_name"].split("/", 1)
        ref = _gh_request("GET", f"/repos/{owner}/{name}/git/ref/heads/{branch}", token=token)
        sha = ref["object"]["sha"]
        tree = _gh_request("GET", f"/repos/{owner}/{name}/git/trees/{sha}?recursive=1", token=token)
        files = []
        for item in tree.get("tree", []):
            if item.get("type") == "blob" and item.get("size", 0) <= MAX_FILE_BYTES:
                files.append({
                    "path": item["path"],
                    "sha": item.get("sha"),
                    "size": item.get("size", 0),
                    "type": "blob",
                    "language": _language_for_path(item["path"]),
                })
            if len(files) >= MAX_INDEX_FILES:
                break
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
                            "GitHub installation token lookup returned 404. Check that GITHUB_APP_ID "
                            "and GITHUB_PRIVATE_KEY belong to the exact GitHub App you just installed, "
                            "then restart the backend."
                        )
                    sync_errors.append({
                        "installation_id": inst.get("installation_id"),
                        "account_login": inst.get("account_login"),
                        "status_code": e.status_code,
                        "detail": detail,
                    })
                    await db.github_installations.update_one(
                        {"tenant_id": tid, "installation_id": inst.get("installation_id")},
                        {"$set": {"status": "sync_error", "last_error": detail, "updated_at": now_iso()}},
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
            "ai_change_sets",
            "commit_jobs",
            "deployment_jobs",
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
        paths = [item["path"] for item in tree]
        workspace = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "user_id": user["user_id"],
            "repo_id": repo["id"],
            "repo_full_name": repo["full_name"],
            "branch": branch,
            "mode": mode,
            "status": "loaded",
            "tree": tree,
            "index": _manifest_summary(paths),
            "git": git_meta,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.workspace_sessions.insert_one(workspace)
        if repo.get("provider") == "mock":
            for path, content in MOCK_FILES.items():
                await _upsert_workspace_file(workspace["id"], path, content, content)
        else:
            for item in tree[:25]:
                try:
                    fetched = await _fetch_real_file(repo, item["path"], branch)
                    await _upsert_workspace_file(workspace["id"], fetched["path"], fetched["content"], fetched["content"])
                except Exception:
                    continue
        workspace.pop("_id", None)
        return workspace

    @r.get("/workspaces/{workspace_id}/tree")
    async def workspace_tree(workspace_id: str, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        files = await _active_files(workspace_id)
        loaded = {f["path"] for f in files}
        tree = [{**item, "loaded": item["path"] in loaded} for item in workspace.get("tree", [])]
        return {"workspace": workspace, "tree": tree, "loaded_files": files}

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
        return await _workspace_file(workspace_id, path)

    @r.get("/workspaces/{workspace_id}/preview")
    async def workspace_preview(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        files = await _active_files(workspace_id)
        return _preview_html(files)

    @r.post("/workspaces/{workspace_id}/ai/chat")
    async def workspace_ai_chat(workspace_id: str, payload: dict, user=Depends(current_user)):
        workspace = await _workspace(workspace_id, user)
        message = payload.get("message", "").strip()
        if not message:
            raise HTTPException(400, "Message is required")
        assistant_message, diffs = await _build_ai_proposal(workspace, message)
        change = {
            "id": new_id(),
            "tenant_id": user["tenant_id"],
            "workspace_id": workspace_id,
            "repo_id": workspace["repo_id"],
            "user_id": user["user_id"],
            "prompt": message,
            "assistant_message": assistant_message,
            "changes": diffs,
            "status": "proposed",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.ai_change_sets.insert_one(change)
        change.pop("_id", None)
        return change

    @r.get("/workspaces/{workspace_id}/changes")
    async def list_workspace_changes(workspace_id: str, user=Depends(current_user)):
        await _workspace(workspace_id, user)
        return await db.ai_change_sets.find(
            {"workspace_id": workspace_id, "tenant_id": user["tenant_id"]}, {"_id": 0}
        ).sort("created_at", -1).to_list(100)

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
            return {"ok": True, "status": "rejected"}
        for item in change.get("changes", []):
            existing = await _workspace_file(workspace_id, item["path"])
            original = existing.get("original_content") if existing else item.get("old", "")
            await _upsert_workspace_file(workspace_id, item["path"], item.get("new", ""), original)
        await db.ai_change_sets.update_one({"id": change_id}, {"$set": {"status": "accepted", "updated_at": now_iso()}})
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
        branch = payload.get("branch") or workspace["branch"]
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
