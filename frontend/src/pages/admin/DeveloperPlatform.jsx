import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  GitBranch,
  GithubLogo,
  GitCommit,
  Lightning,
  PaperPlaneRight,
  RocketLaunch,
  Sparkle,
} from "@phosphor-icons/react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function shortPatch(patch) {
  if (!patch) return "No textual patch.";
  const lines = patch.split("\n");
  return lines.slice(0, 90).join("\n") + (lines.length > 90 ? "\n..." : "");
}

function FileTree({ tree, selectedPath, onSelect }) {
  if (!tree?.length) {
    return <div className="p-4 font-mono text-xs text-[color:var(--ar-ink-3)]">Load a repository to inspect files.</div>;
  }
  return (
    <div className="overflow-y-auto h-full">
      {tree.map((item) => (
        <button
          key={item.path}
          onClick={() => onSelect(item.path)}
          className={`w-full text-left px-3 py-2 border-b border-[color:var(--ar-line)] font-mono text-xs hover:bg-[color:var(--ar-surface)] ${
            selectedPath === item.path ? "bg-[color:var(--ar-soft-teal-bg)] text-[color:var(--ar-ai)]" : ""
          }`}
        >
          <div className="truncate">{item.path}</div>
          <div className="text-[10px] text-[color:var(--ar-ink-3)]">{item.language} {item.loaded ? "loaded" : ""}</div>
        </button>
      ))}
    </div>
  );
}

function ChangeReview({ changes, onApply }) {
  if (!changes?.length) {
    return <div className="font-mono text-xs text-[color:var(--ar-ink-3)]">AI proposals will appear here before they touch the workspace.</div>;
  }
  return (
    <div className="space-y-3">
      {changes.map((change) => (
        <div key={change.id} className="border border-[color:var(--ar-line)] bg-white">
          <div className="p-3 border-b border-[color:var(--ar-line)] flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">{change.status}</div>
              <div className="text-sm font-medium mt-1">{change.assistant_message}</div>
            </div>
            {change.status === "proposed" && (
              <div className="flex gap-2">
                <button onClick={() => onApply(change.id, false)} className="btn-outline px-3 py-1.5 text-xs">Reject</button>
                <button onClick={() => onApply(change.id, true)} className="btn-primary px-3 py-1.5 text-xs">Accept</button>
              </div>
            )}
          </div>
          <div className="divide-y divide-[color:var(--ar-line)]">
            {change.changes?.map((file) => (
              <div key={file.path} className="p-3">
                <div className="font-mono text-xs text-[color:var(--ar-ai)] mb-2">{file.path}</div>
                <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto bg-[color:var(--ar-surface)] p-3 border border-[color:var(--ar-line)] max-h-72">
                  {shortPatch(file.patch)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DeveloperPlatform() {
  const location = useLocation();
  const [repos, setRepos] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [syncErrors, setSyncErrors] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [tree, setTree] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [file, setFile] = useState(null);
  const [editorValue, setEditorValue] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [changes, setChanges] = useState([]);
  const [preview, setPreview] = useState(null);
  const [mainView, setMainView] = useState("editor");
  const [commitMessage, setCommitMessage] = useState("Apply AI-assisted changes");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedRepoDoc = useMemo(
    () => repos.find((repo) => repo.id === selectedRepo),
    [repos, selectedRepo]
  );

  const refreshRepos = async () => {
    try {
      const res = await api.get("/github/repos");
      setRepos(res.data.repositories || []);
      setInstallations(res.data.installations || []);
      setGithubConfigured(!!res.data.github_configured);
      setSyncErrors(res.data.sync_errors || []);
      if (res.data.sync_errors?.length) {
        toast.error(res.data.sync_errors[0].detail || "GitHub sync issue");
      }
      if (!selectedRepo && res.data.repositories?.[0]) setSelectedRepo(res.data.repositories[0].id);
    } catch (e) {
      const detail = e.response?.data?.detail || "Could not load GitHub repositories";
      setSyncErrors([{ detail }]);
      toast.error(detail);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const installationId = params.get("installation_id");
    if (installationId) {
      api.get(`/github/install/callback?${params.toString()}`)
        .then(() => toast.success("GitHub App connected"))
        .catch((e) => toast.error(e.response?.data?.detail || "GitHub callback failed"))
        .finally(() => refreshRepos());
    } else {
      refreshRepos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const connectGithub = async () => {
    try {
      const res = await api.get("/github/install/start");
      if (res.data.url) {
        window.location.href = res.data.url;
        return;
      }
      toast.success("Mock GitHub repository connected");
      refreshRepos();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not start GitHub connection");
    }
  };

  const resetGithub = async () => {
    try {
      await api.delete("/github/installations");
      setRepos([]);
      setInstallations([]);
      setSyncErrors([]);
      setSelectedRepo("");
      setWorkspace(null);
      setTree([]);
      setFile(null);
      setEditorValue("");
      setChanges([]);
      setPreview(null);
      toast.success("GitHub workspace data cleared. Connect GitHub again.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not reset GitHub data");
    }
  };

  const loadWorkspace = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      const res = await api.post(`/repos/${selectedRepo}/load`, {
        branch: selectedRepoDoc?.default_branch || "main",
        mode: "ai_branch",
      });
      setWorkspace(res.data);
      const treeRes = await api.get(`/workspaces/${res.data.id}/tree`);
      setTree(treeRes.data.tree || []);
      setChanges([]);
      const first = treeRes.data.tree?.[0]?.path;
      if (first) await openFile(res.data.id, first);
      await loadPreview(res.data.id);
      toast.success("Repository workspace loaded");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load repository");
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkspace = async () => {
    if (!workspace) return;
    const treeRes = await api.get(`/workspaces/${workspace.id}/tree`);
    setTree(treeRes.data.tree || []);
    const changesRes = await api.get(`/workspaces/${workspace.id}/changes`);
    setChanges(changesRes.data || []);
  };

  const loadPreview = async (workspaceId) => {
    const id = workspaceId || workspace?.id;
    if (!id) return;
    try {
      const res = await api.get(`/workspaces/${id}/preview`);
      setPreview(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not build preview");
    }
  };

  const openFile = async (workspaceId, path) => {
    const id = workspaceId || workspace?.id;
    if (!id || !path) return;
    try {
      const res = await api.get(`/workspaces/${id}/files/${encodePath(path)}`);
      setSelectedPath(path);
      setFile(res.data);
      setEditorValue(res.data.content || "");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not open file");
    }
  };

  const saveFile = async () => {
    if (!workspace || !selectedPath) return;
    try {
      const res = await api.put(`/workspaces/${workspace.id}/files/${encodePath(selectedPath)}`, {
        content: editorValue,
      });
      setFile(res.data);
      await refreshWorkspace();
      await loadPreview();
      toast.success("Workspace file saved");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save file");
    }
  };

  const sendAi = async (e) => {
    e.preventDefault();
    if (!workspace || !aiInput.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/workspaces/${workspace.id}/ai/chat`, { message: aiInput.trim() });
      setAiInput("");
      await refreshWorkspace();
      if (!res.data.changes?.length) toast.info(res.data.assistant_message || "AI responded");
      else toast.success("AI proposal ready for review");
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI proposal failed");
    } finally {
      setLoading(false);
    }
  };

  const applyChange = async (changeId, accept) => {
    try {
      await api.post(`/workspaces/${workspace.id}/changes/${changeId}/apply`, { accept });
      await refreshWorkspace();
      if (accept && selectedPath) await openFile(workspace.id, selectedPath);
      if (accept) {
        await loadPreview();
        setMainView("preview");
      }
      toast.success(accept ? "Change accepted" : "Change rejected");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not update proposal");
    }
  };

  const commitWorkspace = async () => {
    if (!workspace) return;
    try {
      const res = await api.post(`/workspaces/${workspace.id}/commit`, {
        message: commitMessage,
        branch: workspace.branch,
      });
      setJobs((items) => [res.data, ...items]);
      await refreshWorkspace();
      toast.success("Commit recorded");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Commit failed");
    }
  };

  const deployWorkspace = async () => {
    if (!workspace) return;
    try {
      const res = await api.post(`/workspaces/${workspace.id}/deploy`, { provider: "vercel" });
      setJobs((items) => [res.data, ...items]);
      toast.success("Deployment job created");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Deployment failed");
    }
  };

  return (
    <AdminShell
      title="AI Development Platform"
      subtitle={workspace ? `${workspace.repo_full_name} · ${workspace.branch}` : "GitHub repos · AI coding workspace"}
      actions={
        <div className="flex gap-2">
          <button onClick={connectGithub} className="btn-outline px-4 py-2 text-xs">
            <GithubLogo size={16} /> Connect GitHub
          </button>
          <button onClick={resetGithub} className="btn-outline px-4 py-2 text-xs">
            Reset GitHub
          </button>
          <button onClick={loadWorkspace} disabled={!selectedRepo || loading} className="btn-primary px-4 py-2 text-xs">
            <GitBranch size={16} /> Load repo
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_420px] gap-4 h-[calc(100vh-250px)] min-h-[680px]">
        <aside className="ar-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[color:var(--ar-line)]">
            <div className="eyebrow mb-3">Repositories</div>
            {syncErrors.length > 0 && (
              <div className="mb-3 border border-[color:var(--ar-error)] bg-red-50 p-3 font-mono text-[11px] text-red-700">
                <div className="font-bold mb-1">GitHub sync issue</div>
                <div>{syncErrors[0].detail}</div>
              </div>
            )}
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="input h-10 font-mono text-xs"
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>{repo.full_name}</option>
              ))}
            </select>
            <div className="mt-3 text-[11px] font-mono text-[color:var(--ar-ink-3)]">
              {githubConfigured ? "GitHub App mode" : "Mock mode until GitHub App env vars are set"} · {installations.length} installation(s)
            </div>
          </div>
          <FileTree tree={tree} selectedPath={selectedPath} onSelect={(path) => openFile(null, path)} />
        </aside>

        <section className="ar-card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[color:var(--ar-line)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="eyebrow">{mainView === "preview" ? "Website preview" : "Editor"}</div>
              <div className="font-mono text-xs truncate">{selectedPath || "No file selected"}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMainView("editor")}
                className={`px-3 py-1.5 text-xs ${mainView === "editor" ? "btn-primary" : "btn-outline"}`}
              >
                Editor
              </button>
              <button
                onClick={() => { loadPreview(); setMainView("preview"); }}
                disabled={!workspace}
                className={`px-3 py-1.5 text-xs ${mainView === "preview" ? "btn-primary" : "btn-outline"}`}
              >
                Preview
              </button>
              <button onClick={saveFile} disabled={!file} className="btn-outline px-3 py-1.5 text-xs">Save file</button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {mainView === "preview" ? (
              preview?.html ? (
                <iframe
                  title="Workspace preview"
                  srcDoc={preview.html}
                  className="w-full h-full bg-white"
                  sandbox="allow-scripts allow-forms"
                />
              ) : (
                <div className="h-full flex items-center justify-center font-mono text-sm text-[color:var(--ar-ink-3)]">
                  Load a workspace, then click Preview.
                </div>
              )
            ) : file ? (
              <Editor
                height="100%"
                language={file.language || "plaintext"}
                value={editorValue}
                theme="vs-light"
                onChange={(value) => setEditorValue(value ?? "")}
                options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on", scrollBeyondLastLine: false }}
              />
            ) : (
              <div className="h-full flex items-center justify-center font-mono text-sm text-[color:var(--ar-ink-3)]">
                Select a file after loading a repository.
              </div>
            )}
          </div>
        </section>

        <aside className="ar-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[color:var(--ar-line)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">AI coding</div>
                <div className="text-sm text-[color:var(--ar-ink-2)] mt-1">Preview-first code changes</div>
              </div>
              <Sparkle size={22} className="text-[color:var(--ar-ai)]" />
            </div>
            <form onSubmit={sendAi} className="mt-4 flex gap-2">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask for a feature, refactor, fix..."
                className="input h-10 font-mono text-xs"
              />
              <button disabled={!workspace || loading} className="btn-primary px-3" title="Send">
                <PaperPlaneRight size={16} />
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <ChangeReview changes={changes} onApply={applyChange} />
          </div>

          <div className="p-4 border-t border-[color:var(--ar-line)] space-y-3">
            <div className="eyebrow">Ship</div>
            <input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="input h-10 font-mono text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={commitWorkspace} disabled={!workspace} className="btn-outline px-3 py-2 text-xs">
                <GitCommit size={16} /> Commit
              </button>
              <button onClick={deployWorkspace} disabled={!workspace} className="btn-accent px-3 py-2 text-xs">
                <RocketLaunch size={16} /> Deploy
              </button>
            </div>
            {jobs.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {jobs.map((job) => (
                  <div key={job.id} className="border border-[color:var(--ar-line)] p-2 font-mono text-[11px]">
                    <div className="flex items-center gap-1"><Lightning size={12} /> {job.status}</div>
                    <div className="text-[color:var(--ar-ink-3)] truncate">{job.commit_sha || job.preview_url || job.note}</div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/admin" className="block text-center font-mono text-[11px] text-[color:var(--ar-ink-3)] underline">
              Return to overview
            </Link>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
