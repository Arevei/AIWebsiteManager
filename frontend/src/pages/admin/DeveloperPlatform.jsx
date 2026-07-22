import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  GitBranch,
  GithubLogo,
  GitCommit,
  Lightning,
  Play,
  PaperPlaneRight,
  RocketLaunch,
  Sparkle,
  Terminal,
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
  const [project, setProject] = useState(null);
  const [chat, setChat] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [tree, setTree] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [file, setFile] = useState(null);
  const [editorValue, setEditorValue] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [startPrompt, setStartPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [changes, setChanges] = useState([]);
  const [preview, setPreview] = useState(null);
  const [mainView, setMainView] = useState("editor");
  const [runtime, setRuntime] = useState(null);
  const [runtimeLogs, setRuntimeLogs] = useState([]);
  const [runtimeProvider, setRuntimeProvider] = useState(null);
  const [commitMessage, setCommitMessage] = useState("Apply AI-assisted changes");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedRepoDoc = useMemo(
    () => repos.find((repo) => repo.id === selectedRepo),
    [repos, selectedRepo]
  );

  const applyWorkspaceState = async (data) => {
    if (!data?.workspace) return false;
    setProject(data.project || data.workspace.project || null);
    setChat(data.chat || data.workspace.chat || null);
    setWorkspace(data.workspace);
    setSelectedRepo(data.workspace.repo_id);
    setTree(data.tree || []);
    setChanges(data.changes || []);
    setChatMessages(data.messages || []);
    setRuntime(data.runtime || null);
    setRuntimeLogs(data.runtime_logs || []);
    setRuntimeProvider(data.provider || null);
    const first = data.tree?.[0]?.path;
    if (first) await openFile(data.workspace.id, first);
    await loadPreview(data.workspace.id);
    return true;
  };

  const refreshCurrentWorkspace = async () => {
    try {
      const res = await api.get("/workspaces/current");
      return await applyWorkspaceState(res.data);
    } catch {
      return false;
    }
  };

  const refreshProvider = async () => {
    try {
      const res = await api.get("/runtime/providers");
      setRuntimeProvider(res.data.active || null);
    } catch {
      setRuntimeProvider(null);
    }
  };

  const refreshRepos = async () => {
    try {
      await refreshProvider();
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
        .finally(async () => {
          await refreshRepos();
          await refreshCurrentWorkspace();
        });
    } else {
      refreshRepos().then(() => refreshCurrentWorkspace());
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
      setProject(null);
      setChat(null);
      setWorkspace(null);
      setTree([]);
      setFile(null);
      setEditorValue("");
      setChanges([]);
      setChatMessages([]);
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
      setProject(res.data.project || null);
      setChat(res.data.chat || null);
      const treeRes = await api.get(`/workspaces/${res.data.id}/tree`);
      setTree(treeRes.data.tree || []);
      setChanges([]);
      setRuntime(null);
      setRuntimeLogs([]);
      setRuntimeProvider(null);
      setChatMessages([]);
      const first = treeRes.data.tree?.[0]?.path;
      if (first) await openFile(res.data.id, first);
      await loadPreview(res.data.id);
      const runtimeRes = await api.post(`/workspaces/${res.data.id}/runtime/start`, {
        install_command: "npm install",
        dev_command: "npm run dev",
      });
      setRuntime(runtimeRes.data);
      await refreshRuntime(res.data.id);
      toast.success("Repository imported into workspace");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load repository");
    } finally {
      setLoading(false);
    }
  };

  const startFromPrompt = async (e) => {
    e.preventDefault();
    const prompt = startPrompt.trim();
    if (!prompt) return;
    setLoading(true);
    try {
      const res = await api.post("/projects/start", { prompt });
      setStartPrompt("");
      setProject(res.data.project || null);
      setChat(res.data.chat || null);
      setWorkspace(res.data);
      const treeRes = await api.get(`/workspaces/${res.data.id}/tree`);
      setTree(treeRes.data.tree || []);
      const first = treeRes.data.tree?.[0]?.path;
      if (first) await openFile(res.data.id, first);
      await loadPreview(res.data.id);
      const runtimeRes = await api.post(`/workspaces/${res.data.id}/runtime/start`, {
        install_command: "npm install",
        dev_command: "npm run dev",
      });
      setRuntime(runtimeRes.data);
      await refreshRuntime(res.data.id);
      const aiRes = await api.post(`/workspaces/${res.data.id}/ai/chat`, { message: prompt });
      await refreshWorkspaceFor(res.data.id);
      if (aiRes.data.changes?.length) toast.success("Workspace created and AI proposal is ready");
      else toast.success("Workspace created");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not start workspace");
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkspace = async () => {
    if (!workspace) return;
    await refreshWorkspaceFor(workspace.id);
  };

  const refreshWorkspaceFor = async (workspaceId) => {
    const treeRes = await api.get(`/workspaces/${workspaceId}/tree`);
    setTree(treeRes.data.tree || []);
    const changesRes = await api.get(`/workspaces/${workspaceId}/changes`);
    setChanges(changesRes.data || []);
    const chatRes = await api.get(`/workspaces/${workspaceId}/chat`);
    setChatMessages(chatRes.data.messages || []);
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

  const refreshRuntime = async (workspaceId) => {
    const id = workspaceId || workspace?.id;
    if (!id) return;
    try {
      const res = await api.get(`/workspaces/${id}/runtime`);
      setRuntime(res.data.runtime);
      setRuntimeLogs(res.data.logs || []);
      setRuntimeProvider(res.data.provider || null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load runtime status");
    }
  };

  const startRuntime = async () => {
    if (!workspace) return;
    try {
      const res = await api.post(`/workspaces/${workspace.id}/runtime/start`, {
        install_command: selectedRepoDoc?.install_command || "npm install",
        dev_command: selectedRepoDoc?.dev_command || "npm run dev",
      });
      setRuntime(res.data);
      await refreshRuntime(workspace.id);
      toast.success("Workspace runtime started");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not start runtime");
    }
  };

  const syncRuntime = async () => {
    if (!workspace) return;
    try {
      const res = await api.post(`/workspaces/${workspace.id}/runtime/sync`);
      setRuntime(res.data);
      await refreshRuntime(workspace.id);
      toast.success("Runtime synced with accepted files");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not sync runtime");
    }
  };

  const runRuntimeCommand = async (command) => {
    if (!workspace) return;
    try {
      const res = await api.post(`/workspaces/${workspace.id}/runtime/commands`, { command });
      await refreshRuntime(workspace.id);
      toast.success(res.data.status || "Command queued");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not run runtime command");
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
        if (runtime) await syncRuntime();
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
      subtitle={workspace ? `${project?.name || workspace.repo_full_name} · ${chat?.title || workspace.branch}` : "Prompt-first AI workspace"}
      actions={
        <div className="flex gap-2">
          <button onClick={connectGithub} className="btn-outline px-4 py-2 text-xs">
            <GithubLogo size={16} /> Connect GitHub
          </button>
          <button onClick={resetGithub} className="btn-outline px-4 py-2 text-xs">
            Reset GitHub
          </button>
          <button onClick={loadWorkspace} disabled={!selectedRepo || loading} className="btn-primary px-4 py-2 text-xs">
            <GitBranch size={16} /> Import repo
          </button>
        </div>
      }
    >
      {!workspace ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-6 min-h-[560px]">
          <section className="ar-card p-8 flex flex-col justify-between">
            <div>
              <div className="eyebrow mb-4">Start with chat</div>
              <h2 className="font-display text-4xl font-black tracking-tighter mb-4">What do you want to build or change?</h2>
              <p className="text-[color:var(--ar-ink-2)] max-w-2xl leading-7">
                Start from a prompt, or attach a GitHub repository when the AI needs an existing codebase. The workspace, chat context, files, runtime logs, and proposals will persist for this account.
              </p>

              <form onSubmit={startFromPrompt} className="mt-8 max-w-3xl">
                <textarea
                  value={startPrompt}
                  onChange={(e) => setStartPrompt(e.target.value)}
                  placeholder="Build a landing page for my silver jewellery brand, improve my existing Next.js app, fix a layout bug, add auth..."
                  className="w-full min-h-[150px] border border-[color:var(--ar-line)] rounded-[8px] bg-white p-4 text-base leading-7 focus:outline-none focus:border-[color:var(--ar-ink)]"
                />
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <button disabled={!startPrompt.trim() || loading} className="btn-primary px-5 py-3 text-sm">
                    <Sparkle size={18} /> Start AI workspace
                  </button>
                  <span className="font-mono text-xs text-[color:var(--ar-ink-3)]">GitHub import is optional.</span>
                </div>
              </form>

              {syncErrors.length > 0 && (
                <div className="mt-6 border border-[color:var(--ar-error)] bg-red-50 p-4 font-mono text-xs text-red-700">
                  <div className="font-bold mb-1">GitHub sync issue</div>
                  <div>{syncErrors[0].detail}</div>
                </div>
              )}

              <div className="mt-10 grid gap-4 max-w-xl">
                <label>
                  <span className="eyebrow block mb-2">Optional GitHub repository</span>
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="input h-12 font-mono text-sm"
                  >
                    {repos.length === 0 && <option value="">No repositories loaded</option>}
                    {repos.map((repo) => (
                      <option key={repo.id} value={repo.id}>{repo.full_name}</option>
                    ))}
                  </select>
                </label>

                <button onClick={loadWorkspace} disabled={!selectedRepo || loading} className="btn-primary px-5 py-3 text-sm w-fit">
                  <GitBranch size={18} /> Import repository into workspace
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--ar-line)] border border-[color:var(--ar-line)] mt-8">
              {[
                ["Connect", githubConfigured ? "GitHub App mode" : "Mock mode"],
                ["Import", `${repos.length} repo(s) available`],
                ["Runtime", runtimeProvider?.provider || "managed-static"],
              ].map(([label, value]) => (
                <div key={label} className="bg-white p-4">
                  <div className="eyebrow mb-2">{label}</div>
                  <div className="font-mono text-xs text-[color:var(--ar-ink-2)]">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <aside className="ar-card p-6">
            <div className="eyebrow mb-4">Workspace engine</div>
            <div className="font-display text-2xl font-bold tracking-tighter">CodeSandbox runtime path</div>
            <div className="mt-4 space-y-3 text-sm text-[color:var(--ar-ink-2)] leading-6">
              <p>AREVEI owns GitHub auth, custom AI, diff review, accept/reject, commits, billing, and deployment control.</p>
              <p>The runtime provider supplies isolated filesystem, install commands, terminal, and live preview when the SDK bridge is connected.</p>
            </div>
            <div className="mt-6 border border-[color:var(--ar-line)] bg-[color:var(--ar-surface)] p-4 font-mono text-xs text-[color:var(--ar-ink-2)]">
              <div>Provider: {runtimeProvider?.provider || "managed-static"}</div>
              <div>Commands: {runtimeProvider?.capabilities?.commands ? "enabled" : "needs CodeSandbox bridge"}</div>
              <div>Live preview: {runtimeProvider?.capabilities?.live_preview ? "enabled" : "static fallback"}</div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={connectGithub} className="btn-outline px-4 py-2 text-xs">
                <GithubLogo size={16} /> Connect GitHub
              </button>
              <button onClick={resetGithub} className="btn-outline px-4 py-2 text-xs">
                Reset
              </button>
            </div>
          </aside>
        </div>
      ) : (
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
              runtime?.preview_url ? (
                <iframe
                  title="Live runtime preview"
                  src={runtime.preview_url}
                  className="w-full h-full bg-white"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                />
              ) : preview?.html ? (
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

          <div className="border-b border-[color:var(--ar-line)] p-4 max-h-56 overflow-y-auto">
            <div className="eyebrow mb-3">Chat history</div>
            {chatMessages.length === 0 ? (
              <div className="font-mono text-xs text-[color:var(--ar-ink-3)]">
                No messages yet. Ask the AI to inspect or change this workspace.
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.slice(-12).map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 border border-[color:var(--ar-line)] text-xs ${
                      message.role === "user" ? "bg-white" : "bg-[color:var(--ar-surface)]"
                    }`}
                  >
                    <div className="font-mono text-[10px] uppercase text-[color:var(--ar-ink-3)] mb-1">
                      {message.role}
                    </div>
                    <div className="text-sm leading-5 whitespace-pre-wrap">{message.content}</div>
                    {message.changed_files?.length > 0 && (
                      <div className="mt-2 font-mono text-[10px] text-[color:var(--ar-ai)]">
                        {message.changed_files.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-b border-[color:var(--ar-line)] bg-[color:var(--ar-surface)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow">Runtime</div>
                <div className="font-mono text-[11px] text-[color:var(--ar-ink-3)] mt-1">
                  {runtime?.provider || runtimeProvider?.provider || "not started"} · {runtime?.status || "idle"}
                </div>
              </div>
              <Terminal size={18} className="text-[color:var(--ar-ai)]" />
            </div>
            {runtime?.setup_hint && (
              <div className="mt-3 border border-[color:var(--ar-line)] bg-white p-2 font-mono text-[11px] text-[color:var(--ar-ink-2)]">
                {runtime.setup_hint}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={startRuntime} disabled={!workspace} className="btn-outline px-2 py-2 text-xs">
                <Play size={14} /> Start
              </button>
              <button onClick={syncRuntime} disabled={!runtime} className="btn-outline px-2 py-2 text-xs">
                Sync files
              </button>
              <button onClick={() => runRuntimeCommand(runtime?.install_command || "npm install")} disabled={!runtime} className="btn-outline px-2 py-2 text-xs">
                Install
              </button>
              <button onClick={() => runRuntimeCommand(runtime?.dev_command || "npm run dev")} disabled={!runtime} className="btn-outline px-2 py-2 text-xs">
                Run dev
              </button>
            </div>
            {runtimeLogs.length > 0 && (
              <div className="mt-3 max-h-24 overflow-y-auto border border-[color:var(--ar-line)] bg-white p-2">
                {runtimeLogs.slice(-6).map((log) => (
                  <div key={log.id} className="font-mono text-[10px] text-[color:var(--ar-ink-3)]">
                    {log.level}: {log.message}
                  </div>
                ))}
              </div>
            )}
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
      )}
    </AdminShell>
  );
}
