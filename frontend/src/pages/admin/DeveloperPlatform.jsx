import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import {
  ArrowUp,
  CaretDown,
  ChatCircle,
  Code,
  Database,
  DotsThree,
  Eye,
  File,
  Folder,
  FolderOpen,
  GitCommit,
  GithubLogo,
  GridFour,
  House,
  List,
  MagnifyingGlass,
  Microphone,
  Moon,
  PaperPlaneTilt,
  Play,
  Plus,
  Power,
  RocketLaunch,
  ArrowSquareOut,
  SidebarSimple,
  SpinnerGap,
  SquaresFour,
  Sun,
  Terminal,
  Trash,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function shortName(value, max = 34) {
  if (!value) return "New chat";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function workspaceTitle(item) {
  return item?.chat?.title || item?.project?.name || item?.repo_full_name || "Untitled project";
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function palette(theme) {
  const dark = theme === "dark";
  return {
    dark,
    app: dark ? "bg-black text-white" : "bg-[#f7f7f4] text-[#111]",
    side: dark ? "bg-black border-[#202020]" : "bg-[#fbfbf8] border-[#deded8]",
    panel: dark ? "bg-[#0b0b0b] border-[#202020]" : "bg-white border-[#deded8]",
    panelSoft: dark ? "bg-[#151515] border-[#303030]" : "bg-[#f1f1ec] border-[#d8d8d0]",
    hover: dark ? "hover:bg-[#171717]" : "hover:bg-[#ecece5]",
    active: dark ? "bg-[#2b2b2b] text-white" : "bg-[#e7e7df] text-[#111]",
    muted: dark ? "text-[#a7a7a7]" : "text-[#686868]",
    faint: dark ? "text-[#777]" : "text-[#898981]",
    input: dark ? "bg-[#151515] border-[#333] text-white placeholder:text-[#8d8d8d]" : "bg-white border-[#d5d5cc] text-[#111] placeholder:text-[#8a8a84]",
    button: dark ? "bg-white text-black" : "bg-black text-white",
    inverseButton: dark ? "border-[#333] text-[#cfcfcf]" : "border-[#d7d7cf] text-[#333]",
    codeBg: dark ? "bg-[#050505]" : "bg-[#fcfcf9]",
  };
}

function IconButton({ children, title, onClick, className = "" }) {
  return (
    <button onClick={onClick} title={title} className={cx("grid h-9 w-9 place-items-center rounded-md", className)}>
      {children}
    </button>
  );
}

function SidebarItem({ icon: Icon, label, active, collapsed, theme, onClick }) {
  const p = palette(theme);
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cx(
        "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm",
        active ? p.active : `${p.muted} ${p.hover}`,
        collapsed && "justify-center px-0"
      )}
    >
      <Icon size={20} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function PromptBox({ value, setValue, onSubmit, disabled, theme, compact, mode, setMode, openImport }) {
  const p = palette(theme);
  return (
    <form onSubmit={onSubmit} className={cx("rounded-xl border shadow-[0_16px_60px_rgba(0,0,0,.25)]", p.input, compact ? "p-2" : "p-4")}>
      {!compact && (
        <div className={cx("mb-3 flex w-fit rounded-lg border p-1", p.panelSoft)}>
          <button type="button" onClick={() => setMode("chat")} className={cx("rounded-md px-3 py-1.5 text-sm", mode === "chat" ? p.button : p.muted)}>
            Normal chat
          </button>
          <button type="button" onClick={() => setMode("project")} className={cx("rounded-md px-3 py-1.5 text-sm", mode === "project" ? p.button : p.muted)}>
            Project build
          </button>
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={compact ? "Ask a follow-up..." : mode === "chat" ? "Ask anything..." : "Ask AREVEI to build or edit a project..."}
        className={cx("w-full resize-none bg-transparent text-[15px] leading-6 outline-none", compact ? "min-h-[44px]" : "min-h-[88px]")}
      />
      <div className="flex items-center justify-between gap-3">
        <div className={cx("flex items-center gap-2", p.muted)}>
          <IconButton title="Attach" className={p.hover}>
            <Plus size={22} />
          </IconButton>
          <button type="button" className={cx("flex h-9 items-center gap-2 rounded-md px-2 text-sm", p.hover)}>
            <SquaresFour size={18} /> AREVEI Mini <CaretDown size={14} />
          </button>
          {!compact && mode === "project" && (
            <button type="button" onClick={openImport} className={cx("flex h-9 items-center gap-2 rounded-md px-2 text-sm", p.hover)}>
              <GithubLogo size={18} /> Import from GitHub
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <IconButton title="Voice" className={p.button}>
            <Microphone size={18} />
          </IconButton>
          <button disabled={disabled || !value.trim()} className={cx("grid h-9 w-9 place-items-center rounded-md disabled:opacity-40", p.button)} title="Send">
            {disabled ? <SpinnerGap size={18} className="animate-spin" /> : compact ? <PaperPlaneTilt size={18} /> : <ArrowUp size={18} />}
          </button>
        </div>
      </div>
    </form>
  );
}

function ImportGithubModal({ open, onClose, repos, onConnect, onImport, theme, loading }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [query, setQuery] = useState("");
  const p = palette(theme);
  if (!open) return null;
  const filtered = repos.filter((repo) => repo.full_name.toLowerCase().includes(query.toLowerCase()));
  const importUrl = () => {
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/#?]+)/i);
    const fullName = match?.[1]?.replace(/\.git$/, "");
    const repo = repos.find((item) => item.full_name.toLowerCase() === fullName?.toLowerCase());
    if (!repo) {
      toast.error("Connect GitHub and select an installed repository first");
      return;
    }
    onImport(repo.id);
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
      <div className={cx("w-full max-w-[670px] rounded-xl border p-6 shadow-2xl", p.panel)}>
        <div className="mb-7 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Import from GitHub</h2>
          <IconButton onClick={onClose} title="Close" className={p.hover}>
            <X size={20} />
          </IconButton>
        </div>
        <label className={cx("mb-3 block text-sm", p.muted)}>Import from a URL</label>
        <div className="flex gap-3">
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/myorg/myrepo"
            className={cx("h-12 min-w-0 flex-1 rounded-lg border px-4 outline-none", p.input)}
          />
          <button onClick={importUrl} disabled={loading} className={cx("flex h-12 items-center gap-2 rounded-lg px-6 font-semibold disabled:opacity-60", p.button)}>
            {loading && <SpinnerGap size={18} className="animate-spin" />} Import
          </button>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className={cx("text-sm", p.muted)}>Select a Repository</div>
          <button onClick={onConnect} className={cx("flex h-9 items-center gap-2 rounded-md border px-3 text-sm", p.inverseButton)}>
            <GithubLogo size={17} /> Connect
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button className={cx("flex h-12 items-center justify-between rounded-lg border px-3", p.input)}>
            <span className="flex items-center gap-2"><GithubLogo size={20} /> {repos[0]?.full_name?.split("/")[0] || "GitHub"}</span>
            <CaretDown size={18} />
          </button>
          <div className={cx("flex h-12 items-center gap-2 rounded-lg border px-3", p.input)}>
            <MagnifyingGlass size={20} className={p.faint} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search repos" className="min-w-0 flex-1 bg-transparent outline-none" />
          </div>
        </div>
        <div className={cx("mt-3 max-h-[300px] overflow-y-auto rounded-lg border", p.panelSoft)}>
          {filtered.length === 0 ? (
            <div className={cx("p-5 text-sm", p.muted)}>No repositories loaded. Connect GitHub first.</div>
          ) : (
            filtered.map((repo) => (
              <div key={repo.id} className={cx("flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0", p.dark ? "border-[#262626]" : "border-[#deded8]")}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cx("grid h-8 w-8 place-items-center rounded-full border", p.inverseButton)}>N</div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{repo.name}</div>
                    <div className={cx("text-xs", p.faint)}>{repo.full_name}</div>
                  </div>
                </div>
                <button onClick={() => onImport(repo.id)} disabled={loading} className={cx("flex items-center gap-2 rounded-md border px-3 py-1.5 font-semibold disabled:opacity-60", p.inverseButton)}>
                  {loading && <SpinnerGap size={16} className="animate-spin" />} Import
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CommitModal({ open, onClose, onCommit, onRevert, value, setValue, loading, theme, changedFiles, commits }) {
  const p = palette(theme);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
      <div className={cx("w-full max-w-[520px] rounded-xl border p-5 shadow-2xl", p.panel)}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className={cx("font-mono text-xs uppercase tracking-[.16em]", p.faint)}>GitHub</div>
            <h2 className="text-xl font-semibold">Commit changes</h2>
          </div>
          <IconButton onClick={onClose} title="Close" className={p.hover}><X size={20} /></IconButton>
        </div>
        <label className={cx("mb-2 block text-sm", p.muted)}>Commit message</label>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoFocus
          className={cx("min-h-[92px] w-full resize-none rounded-lg border p-3 text-sm outline-none", p.input)}
          placeholder="Describe what changed"
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className={cx("rounded-lg border p-3", p.panelSoft)}>
            <div className={cx("mb-2 font-mono text-[11px] uppercase tracking-[.16em]", p.faint)}>Changed files</div>
            <div className="max-h-36 overflow-auto space-y-1">
              {changedFiles?.length ? changedFiles.map((file) => (
                <div key={file.path} className="truncate font-mono text-xs">{file.path}</div>
              )) : <div className={cx("text-xs", p.faint)}>No uncommitted changes.</div>}
            </div>
          </div>
          <div className={cx("rounded-lg border p-3", p.panelSoft)}>
            <div className={cx("mb-2 font-mono text-[11px] uppercase tracking-[.16em]", p.faint)}>Commit history</div>
            <div className="max-h-36 overflow-auto space-y-2">
              {commits?.length ? commits.map((commit) => (
                <div key={commit.id} className="text-xs">
                  <div className="truncate font-semibold">{commit.message}</div>
                  <div className={cx("truncate font-mono", p.faint)}>{commit.commit_sha || commit.status}</div>
                </div>
              )) : <div className={cx("text-xs", p.faint)}>No commits yet.</div>}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onRevert} disabled={loading || !changedFiles?.length} className={cx("mr-auto rounded-md border px-4 py-2 text-sm disabled:opacity-50", p.inverseButton)}>Revert current changes</button>
          <button onClick={onClose} className={cx("rounded-md border px-4 py-2 text-sm", p.inverseButton)}>Cancel</button>
          <button onClick={onCommit} disabled={loading || !value.trim()} className={cx("flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50", p.button)}>
            {loading && <SpinnerGap size={16} className="animate-spin" />} Commit and push
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingChangeReview({ changes, onApply, loading, theme }) {
  const p = palette(theme);
  const pending = changes?.find((change) => change.status === "proposed");
  if (!pending) return null;
  const files = pending.changes?.map((item) => item.path).filter(Boolean) || [];
  return (
    <div className={cx("mb-3 rounded-lg border p-3", p.panelSoft)}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("font-mono text-[11px] uppercase tracking-[.16em]", p.faint)}>Approve changes</div>
          <div className="mt-1 truncate text-sm font-semibold">{pending.assistant_message}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => onApply(pending.id, false)} disabled={loading} className={cx("rounded-md border px-3 py-1.5 text-xs disabled:opacity-50", p.inverseButton)}>Deny</button>
          <button onClick={() => onApply(pending.id, true)} disabled={loading} className={cx("rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50", p.button)}>Approve</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {files.slice(0, 6).map((path) => (
          <span key={path} className={cx("rounded border px-2 py-1 font-mono text-[11px]", p.inverseButton)}>{path}</span>
        ))}
        {files.length > 6 && <span className={cx("px-2 py-1 font-mono text-[11px]", p.faint)}>+{files.length - 6}</span>}
      </div>
    </div>
  );
}

function buildFileTree(items = []) {
  const root = { name: "", path: "", type: "folder", children: new Map(), loaded: false };
  items.forEach((item) => {
    const parts = item.path.split("/").filter(Boolean);
    let node = root;
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/");
      const isFile = index === parts.length - 1;
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path,
          type: isFile ? "file" : "folder",
          children: new Map(),
          loaded: false,
        });
      }
      node = node.children.get(part);
      if (isFile) {
        node.type = "file";
        node.loaded = Boolean(item.loaded);
        node.language = item.language;
      }
    });
  });

  const toArray = (node) => Array.from(node.children.values())
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((child) => ({ ...child, children: toArray(child) }));

  return toArray(root);
}

function visibleFileRows(nodes, expanded) {
  const rows = [];
  const visit = (items, depth) => {
    items.forEach((node) => {
      const isFolder = node.type === "folder";
      const isOpen = expanded[node.path] ?? depth < 1;
      rows.push({ ...node, depth, isOpen });
      if (isFolder && isOpen) visit(node.children, depth + 1);
    });
  };
  visit(nodes, 0);
  return rows;
}

function FileTree({ tree, selectedPath, onSelect, theme }) {
  const p = palette(theme);
  const nodes = useMemo(() => buildFileTree(tree), [tree]);
  const [expanded, setExpanded] = useState({ src: true, app: true, components: true, public: true });
  const rows = useMemo(() => visibleFileRows(nodes, expanded), [nodes, expanded]);
  const toggle = (path) => setExpanded((value) => ({ ...value, [path]: !(value[path] ?? false) }));
  if (!tree?.length) return <div className={cx("px-4 py-6 text-sm", p.faint)}>No files loaded.</div>;
  return (
    <div className="overflow-y-auto">
      {rows.map((node) => {
        const isFolder = node.type === "folder";
        const Icon = isFolder ? (node.isOpen ? FolderOpen : Folder) : File;
        return (
          <button
            key={node.path}
            onClick={() => (isFolder ? toggle(node.path) : onSelect(node.path))}
            className={cx(
              "flex h-8 w-full items-center gap-2 pr-3 text-left font-mono text-[13px]",
              selectedPath === node.path ? p.active : `${p.muted} ${p.hover}`
            )}
            style={{ paddingLeft: `${12 + node.depth * 14}px` }}
          >
            {isFolder ? (
              <CaretDown size={13} className={cx("shrink-0 transition-transform", !node.isOpen && "-rotate-90")} />
            ) : (
              <span className="w-[13px] shrink-0" />
            )}
            <Icon size={16} className={cx("shrink-0", p.faint)} />
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            {!isFolder && node.loaded && <span className={cx("shrink-0 text-[10px]", p.faint)}>loaded</span>}
          </button>
        );
      })}
    </div>
  );
}

function DiffList({ changes, onApply, onOpenFile, theme }) {
  const p = palette(theme);
  if (!changes?.length) return <div className={cx("text-sm", p.faint)}>Changes appear here for review.</div>;
  return (
    <div className="space-y-3">
      {changes.map((change) => (
        <div key={change.id} className={cx("rounded-lg border p-3", p.panel)}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className={cx("text-xs uppercase tracking-[.15em]", p.faint)}>{change.status}</div>
              <div className="mt-1 text-sm">{change.assistant_message}</div>
            </div>
            {change.status === "proposed" && (
              <div className="flex gap-2">
                <button onClick={() => onApply(change.id, false)} className={cx("rounded-md border px-3 py-1 text-xs", p.inverseButton)}>Reject</button>
                <button onClick={() => onApply(change.id, true)} className={cx("rounded-md px-3 py-1 text-xs font-semibold", p.button)}>Accept</button>
              </div>
            )}
          </div>
          {change.changes?.map((file) => (
            <div key={file.path} className={cx("mt-2 rounded-md p-2", p.codeBg)}>
              <button onClick={() => onOpenFile?.(file.path)} className="mb-1 font-mono text-xs text-[#0d9f7c] hover:underline">{file.path}</button>
              <pre className={cx("max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px]", p.muted)}>
                {file.patch?.split("\n").slice(0, 40).join("\n")}
              </pre>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function DeveloperPlatform() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("arevei_workspace_theme") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("arevei_sidebar_open") !== "false");
  const [activeSection, setActiveSection] = useState("Workspace");
  const [searchQuery, setSearchQuery] = useState("");
  const [homeMode, setHomeMode] = useState("chat");
  const [screen, setScreen] = useState("home");
  const [prompt, setPrompt] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [generalChat, setGeneralChat] = useState(null);
  const [normalMessages, setNormalMessages] = useState([]);
  const [generalChats, setGeneralChats] = useState([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [repos, setRepos] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [project, setProject] = useState(null);
  const [chat, setChat] = useState(null);
  const [tree, setTree] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [file, setFile] = useState(null);
  const [editorValue, setEditorValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [changes, setChanges] = useState([]);
  const [preview, setPreview] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [runtimeLogs, setRuntimeLogs] = useState([]);
  const [knowledge, setKnowledge] = useState(null);
  const [rightView, setRightView] = useState("preview");
  const [commitMessage, setCommitMessage] = useState("");
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitJob, setCommitJob] = useState(null);
  const [commitHistory, setCommitHistory] = useState([]);
  const [changedFiles, setChangedFiles] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const p = palette(theme);

  const currentTitle = useMemo(
    () => workspaceTitle({ workspace, project, chat }),
    [workspace, project, chat]
  );
  const menuItems = ["Overview", "Workspace", "Agent", "AI Studio", "Talk", "Content", "Design", "SEO / AEO", "History", "Team", "Billing"];
  const recentItems = useMemo(
    () => [...generalChats.map((item) => ({ ...item, listKind: "chat" })), ...recentWorkspaces.map((item) => ({ ...item, listKind: "project" }))]
      .filter((item) => workspaceTitle(item).toLowerCase().includes(searchQuery.toLowerCase()) || item.title?.toLowerCase().includes(searchQuery.toLowerCase())),
    [generalChats, recentWorkspaces, searchQuery]
  );
  const workspaceUsage = Math.min(100, Math.round((recentWorkspaces.length / 20) * 100));
  const agentUsage = Math.min(100, Math.round((messages.filter((item) => item.role === "agent").length / 50) * 100));

  useEffect(() => {
    localStorage.setItem("arevei_workspace_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("arevei_sidebar_open", String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    loadStartData();
    handleGithubReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStartData = async () => {
    try {
      const currentRes = await api.get("/workspaces/current");
      if (currentRes.data.workspace) {
        setWorkspace(currentRes.data.workspace);
        setProject(currentRes.data.project || null);
        setChat(currentRes.data.chat || null);
        setScreen("workspace");
        setRightView("preview");
        refreshWorkspace(currentRes.data.workspace.id);
      }
    } catch (e) {}
    await Promise.all([loadRecentWorkspaces(), loadRepos(), loadGeneralChats()]);
  };

  const loadRecentWorkspaces = async () => {
    setRecentLoading(true);
    try {
      const res = await api.get("/workspaces");
      setRecentWorkspaces(res.data.workspaces || []);
    } catch {
      setRecentWorkspaces([]);
    } finally {
      setRecentLoading(false);
    }
  };

  const loadGeneralChats = async () => {
    try {
      const res = await api.get("/general-chats");
      setGeneralChats(res.data.chats || []);
    } catch {
      setGeneralChats([]);
    }
  };

  const loadRepos = async () => {
    try {
      const res = await api.get("/github/repos");
      const repositories = res.data.repositories || [];
      setRepos(repositories);
      return repositories;
    } catch {
      setRepos([]);
      return [];
    }
  };

  const autoSetupWorkspace = async (workspaceDoc) => {
    const config = workspaceDoc?.runtime_config || {};
    setAgentStatus("Starting persistent Daytona workspace...");
    await api.post(`/workspaces/${workspaceDoc.id}/runtime/start`, {
      install_command: config.install_command,
      dev_command: config.dev_command,
      build_command: config.build_command,
      test_command: config.test_command,
      lint_command: config.lint_command,
    });
    if (config.install_command) {
      setAgentStatus(`Installing dependencies with ${config.install_command}...`);
      await api.post(`/workspaces/${workspaceDoc.id}/runtime/commands`, { command: config.install_command });
    }
    if (config.dev_command) {
      setAgentStatus(`Starting preview with ${config.dev_command}...`);
      await api.post(`/workspaces/${workspaceDoc.id}/runtime/commands`, { command: config.dev_command });
    }
  };

  const importRepoDocument = async (repo) => {
    if (!repo?.id) return;
    if (window.__isImporting) return;
    window.__isImporting = true;
    setImportLoading(true);
    setAgentStatus("Importing repository and indexing workspace...");
    try {
      const res = await api.post(`/repos/${repo.id}/load`, {
        branch: repo.default_branch || "main",
        mode: "ai_branch",
      });
      setImportOpen(false);
      setWorkspace(res.data);
      setProject(res.data.project || null);
      setChat(res.data.chat || null);
      setScreen("workspace");
      await autoSetupWorkspace(res.data);
      await refreshWorkspace(res.data.id);
      await loadRecentWorkspaces();
      toast.success(`Loaded ${repo.full_name}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Repository import failed");
      setImportOpen(true);
    } finally {
      window.__isImporting = false;
      setAgentStatus("");
      setImportLoading(false);
    }
  };

  const handleGithubReturn = async () => {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get("installation_id");
    if (!installationId) return;
    setImportOpen(true);
    setImportLoading(true);
    setAgentStatus("Finishing GitHub connection and loading repositories...");
    try {
      await api.get(`/github/install/callback${window.location.search}`);
      await loadRepos();
      window.history.replaceState({}, "", window.location.pathname);
      toast.success("GitHub connected. Please select a repository to import.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "GitHub callback failed");
    } finally {
      setAgentStatus("");
      setImportLoading(false);
    }
  };

  const resetProjectState = () => {
    setWorkspace(null);
    setProject(null);
    setChat(null);
    setTree([]);
    setSelectedPath("");
    setFile(null);
    setEditorValue("");
    setMessages([]);
    setChanges([]);
    setPreview(null);
    setRuntime(null);
    setRuntimeLogs([]);
    setKnowledge(null);
    setCommitJob(null);
    setCommitHistory([]);
    setChangedFiles([]);
    setRightView("preview");
  };

  const newChat = () => {
    resetProjectState();
    setGeneralChat(null);
    setNormalMessages([]);
    setPrompt("");
    setFollowUp("");
    setHomeMode("chat");
    setScreen("home");
  };

  const openGeneralChat = async (chatDoc) => {
    resetProjectState();
    setGeneralChat(chatDoc);
    setScreen("home");
    setHomeMode("chat");
    try {
      const res = await api.get(`/general-chats/${chatDoc.id}`);
      setNormalMessages(res.data.messages || []);
    } catch {
      setNormalMessages([]);
    }
  };

  const openWorkspace = async (workspaceDoc) => {
    setGeneralChat(null);
    setNormalMessages([]);
    setWorkspace(workspaceDoc);
    setProject(workspaceDoc.project || null);
    setChat(workspaceDoc.chat || null);
    setScreen("workspace");
    setRightView("preview");
    await refreshWorkspace(workspaceDoc.id);
  };

  const refreshWorkspace = async (workspaceId) => {
    const [treeRes, changesRes, chatRes, knowledgeRes, runtimeRes, previewRes, commitRes] = await Promise.all([
      api.get(`/workspaces/${workspaceId}/tree`),
      api.get(`/workspaces/${workspaceId}/changes`),
      api.get(`/workspaces/${workspaceId}/chat`),
      api.get(`/workspaces/${workspaceId}/knowledge`),
      api.get(`/workspaces/${workspaceId}/runtime`),
      api.get(`/workspaces/${workspaceId}/preview`),
      api.get(`/workspaces/${workspaceId}/commits`),
    ]);
    const workspaceDoc = treeRes.data.workspace;
    setWorkspace((current) => ({ ...(workspaceDoc || current), project, chat }));
    setTree(treeRes.data.tree || []);
    setChanges(changesRes.data || []);
    setMessages(chatRes.data.messages || []);
    setKnowledge(knowledgeRes.data || null);
    setRuntime(runtimeRes.data.runtime || null);
    setRuntimeLogs(runtimeRes.data.logs || []);
    setPreview(previewRes.data || null);
    setCommitHistory(commitRes.data.commits || []);
    setChangedFiles(commitRes.data.changed_files || []);
    const first = treeRes.data.tree?.[0]?.path;
    if (!selectedPath && first) await openFile(workspaceId, first, false);
  };

  const sendNormalChat = async (message) => {
    const res = await api.post("/general-chats", { chat_id: generalChat?.id, message });
    setGeneralChat(res.data.chat);
    setNormalMessages((items) => [...items, ...(res.data.messages || [])]);
    await loadGeneralChats();
  };

  const createProject = async (message) => {
    setAgentStatus("Creating workspace and starting runtime...");
    const res = await api.post("/projects/start", { prompt: message, name: shortName(message) });
    setWorkspace(res.data);
    setProject(res.data.project || null);
    setChat(res.data.chat || null);
    setScreen("workspace");
    await autoSetupWorkspace(res.data);
    setAgentStatus("Reading files and preparing first code proposal...");
    await api.post(`/workspaces/${res.data.id}/ai/chat`, { message });
    await refreshWorkspace(res.data.id);
    await loadRecentWorkspaces();
    setAgentStatus("");
  };

  const submitHomePrompt = async (e) => {
    e.preventDefault();
    const message = prompt.trim();
    if (!message) return;
    setLoading(true);
    try {
      if (homeMode === "chat") {
        await sendNormalChat(message);
      } else {
        await createProject(message);
      }
      setPrompt("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const submitFollowUp = async (e) => {
    e.preventDefault();
    const message = followUp.trim();
    if (!message) return;
    setLoading(true);
    try {
      if (screen === "workspace" && workspace) {
        setAgentStatus("Reading workspace context and preparing edits...");
        const res = await api.post(`/workspaces/${workspace.id}/ai/chat`, { message });
        await refreshWorkspace(workspace.id);
        await loadRecentWorkspaces();
        toast.success(res.data.changes?.length ? "AI code changes ready" : "AI responded");
      } else {
        await sendNormalChat(message);
      }
      setFollowUp("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Request failed");
    } finally {
      setAgentStatus("");
      setLoading(false);
    }
  };

  const connectGithub = async () => {
    try {
      const res = await api.get("/github/install/start");
      if (res.data.url) window.location.href = res.data.url;
      else {
        toast.success("Demo repository connected");
        await loadRepos();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "GitHub connect failed");
    }
  };

  const importRepo = async (repoId) => {
    if (!repoId) return;
    const repo = repos.find((item) => item.id === repoId);
    await importRepoDocument(repo || { id: repoId, default_branch: "main", full_name: "selected repository" });
  };

  const attachDaytonaSandbox = async () => {
    if (!workspace) return;
    const sandboxId = window.prompt("Paste Daytona sandbox ID");
    if (!sandboxId?.trim()) return;
    try {
      await api.post(`/workspaces/${workspace.id}/runtime/start`, {
        provider_runtime_id: sandboxId.trim(),
        install_command: runtime?.install_command || "npm install",
        dev_command: runtime?.dev_command || "npm run dev",
        build_command: runtime?.build_command,
        test_command: runtime?.test_command,
        lint_command: runtime?.lint_command,
      });
      await refreshWorkspace(workspace.id);
      toast.success("Daytona sandbox attached");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not attach Daytona sandbox");
    }
  };

  const openFile = async (workspaceId, path, switchView = true) => {
    const id = workspaceId || workspace?.id;
    if (!id || !path) return;
    try {
      const res = await api.get(`/workspaces/${id}/files/${encodePath(path)}`);
      setSelectedPath(path);
      setFile(res.data);
      setEditorValue(res.data.content || "");
      if (switchView) setRightView("editor");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not open file");
    }
  };

  const saveFile = async () => {
    if (!workspace || !selectedPath) return;
    try {
      const res = await api.put(`/workspaces/${workspace.id}/files/${encodePath(selectedPath)}`, { content: editorValue });
      setFile(res.data);
      await refreshWorkspace(workspace.id);
      toast.success("Saved");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setAgentStatus("");
    }
  };

  const applyChange = async (changeId, accept) => {
    if (!workspace) return;
    setLoading(true);
    setAgentStatus(accept ? "Applying approved files and syncing runtime..." : "Rejecting proposed changes...");
    try {
      await api.post(`/workspaces/${workspace.id}/changes/${changeId}/apply`, { accept });
      try {
        await api.post(`/workspaces/${workspace.id}/runtime/sync`);
        if (accept) await runBuildCheck("accepted AI changes");
      } catch (syncErr) {
        toast.error(syncErr.response?.data?.detail || "Applied locally, but runtime check failed");
      }
      await refreshWorkspace(workspace.id);
      setRightView("preview");
      toast.success(accept ? "Accepted" : "Rejected");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not apply change");
    } finally {
      setAgentStatus("");
      setLoading(false);
    }
  };

  const runBuildCheck = async (reason = "latest change") => {
    if (!workspace || !runtime?.build_command) return null;
    setAgentStatus(`Checking build with ${runtime.build_command}...`);
    const res = await api.post(`/workspaces/${workspace.id}/runtime/commands`, { command: runtime.build_command });
    if (res.data?.status === "command_failed") {
      setAgentStatus("Build failed. Asking agent to prepare a repair proposal...");
      await api.post(`/workspaces/${workspace.id}/ai/chat`, {
        message: `The build failed after ${reason}. Read the project files and prepare a focused fix. Build command: ${runtime.build_command}\n\nBuild output:\n${res.data.output || ""}`,
      });
      toast.error("Build failed. AI repair proposal is ready to review.");
    }
    return res.data;
  };

  const revertWorkspace = async () => {
    if (!workspace) return;
    setLoading(true);
    setAgentStatus("Reverting uncommitted workspace changes...");
    try {
      await api.post(`/workspaces/${workspace.id}/revert`);
      await refreshWorkspace(workspace.id);
      setCommitOpen(false);
      toast.success("Reverted current changes");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Revert failed");
    } finally {
      setAgentStatus("");
      setLoading(false);
    }
  };

  const runCommand = async (command) => {
    if (!workspace || !runtime) return;
    setLoading(true);
    setAgentStatus(`Running ${command}...`);
    try {
      const res = await api.post(`/workspaces/${workspace.id}/runtime/commands`, { command });
      await refreshWorkspace(workspace.id);
      setRightView(res.data?.status === "preview_ready" ? "preview" : "logs");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Command failed");
      setRightView("logs");
    } finally {
      setAgentStatus("");
      setLoading(false);
    }
  };

  const stopRuntime = async () => {
    if (!workspace || !runtime) return;
    try {
      await api.post(`/workspaces/${workspace.id}/runtime/stop`);
      await refreshWorkspace(workspace.id);
      setRightView("logs");
      toast.success("Runtime stopped");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not stop runtime");
    }
  };

  const publish = async () => {
    if (!workspace) return;
    try {
      await api.post(`/workspaces/${workspace.id}/deploy`, { provider: "vercel" });
      toast.success("Publish job created");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Publish failed");
    }
  };

  const commitWorkspace = async () => {
    if (!workspace) return;
    setLoading(true);
    setAgentStatus("Committing accepted changes and pushing to GitHub...");
    try {
      const res = await api.post(`/workspaces/${workspace.id}/commit`, {
        message: commitMessage.trim(),
        branch: workspace.working_branch || workspace.branch || "main",
      });
      setCommitJob(res.data);
      setCommitOpen(false);
      setCommitMessage("");
      await refreshWorkspace(workspace.id);
      await loadRecentWorkspaces();
      toast.success("Committed and pushed to GitHub");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Commit failed");
    } finally {
      setAgentStatus("");
      setLoading(false);
    }
  };

  const deleteRecentItem = async (event, item) => {
    event.stopPropagation();
    try {
      if (item.listKind === "chat") await api.delete(`/general-chats/${item.id}`);
      else await api.delete(`/workspaces/${item.id}`);
      if ((item.listKind === "chat" && generalChat?.id === item.id) || (item.listKind === "project" && workspace?.id === item.id)) {
        newChat();
      }
      await Promise.all([loadRecentWorkspaces(), loadGeneralChats()]);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  const sideWidth = sidebarOpen ? "w-[342px]" : "w-[72px]";

  return (
    <div className={cx("fixed inset-0 flex overflow-hidden", p.app)}>
    
      <aside className={cx("flex shrink-0 flex-col border-r transition-all", sideWidth, p.side)}>
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d8f7ff] to-[#9575ff] text-xs font-bold text-black">
              {(user?.name || user?.email || "A").slice(0, 1).toUpperCase()}
            </div>
            {sidebarOpen && <div className="truncate font-semibold">Personal</div>}
          </div>
          <div className="flex items-center gap-2">
            {sidebarOpen && <CaretDown size={16} className={p.muted} />}
            <IconButton title="Toggle sidebar" onClick={() => setSidebarOpen((value) => !value)} className={cx(p.muted, p.hover)}>
              <SidebarSimple size={18} />
            </IconButton>
          </div>
        </div>

        <div className="px-2">
          <button onClick={newChat} className={cx("flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold", p.panelSoft, p.hover)}>
            <Plus size={18} />
            {sidebarOpen && "New Chat"}
          </button>
        </div>

        

        {sidebarOpen && (
          <div className="mt-3 px-4">
            <div className={cx("mb-2 flex h-8 items-center gap-2 rounded-md border px-2", p.input)}>
              <MagnifyingGlass size={16} className={p.faint} />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
            <div className="space-y-2">
              <div>
                <div className={cx("mb-1 flex justify-between text-[11px]", p.faint)}><span>Workspaces</span><span>{recentWorkspaces.length}/20</span></div>
                <div className={cx("h-1.5 overflow-hidden rounded-full", p.panelSoft)}><div className="h-full bg-[#0d9f7c]" style={{ width: `${workspaceUsage}%` }} /></div>
              </div>
              <div>
                <div className={cx("mb-1 flex justify-between text-[11px]", p.faint)}><span>Agent usage</span><span>{agentUsage}%</span></div>
                <div className={cx("h-1.5 overflow-hidden rounded-full", p.panelSoft)}><div className="h-full bg-[#8b5cf6]" style={{ width: `${agentUsage}%` }} /></div>
              </div>
            </div>
          </div>
        )}

        {sidebarOpen && (
          <div className="mt-8 flex min-h-0 flex-1 flex-col px-2">
            <div className={cx("mb-3 flex items-center justify-between px-2 text-sm font-semibold", p.muted)}>
              Recent Chats <CaretDown size={14} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {recentLoading && <div className={cx("flex items-center gap-2 px-3 py-2 text-xs", p.faint)}><SpinnerGap className="animate-spin" /> Loading recent...</div>}
              {recentItems.map((item) => (
                <button
                  key={`${item.listKind}-${item.id}`}
                  onClick={() => (item.listKind === "chat" ? openGeneralChat(item) : openWorkspace(item))}
                  className={cx("group flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm", p.muted, p.hover)}
                >
                  <span className="h-4 w-4 rounded-full border border-dashed border-current" />
                  <span className="truncate">{item.listKind === "chat" ? item.title : workspaceTitle(item)}</span>
                  <span className={cx("ml-auto text-[10px] uppercase", p.faint)}>{item.listKind}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => deleteRecentItem(event, item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") deleteRecentItem(event, item);
                    }}
                    title="Delete"
                    className={cx("hidden h-7 w-7 shrink-0 place-items-center rounded group-hover:grid", p.hover)}
                  >
                    <Trash size={15} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={cx("m-2 rounded-xl border p-3", p.panelSoft)}>
          {sidebarOpen ? (
            <>
              <div className="font-semibold">Appearance</div>
              <button onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))} className={cx("mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-semibold", p.inverseButton)}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />} {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </>
          ) : (
            <IconButton title="Toggle theme" onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))} className={cx("mx-auto", p.hover)}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
          )}
        </div>

        {sidebarOpen && (
          <div className={cx("flex h-14 items-center justify-between border-t px-4", p.side)}>
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[#c9e7ff] text-xs font-bold text-black">
                {(user?.email || "a").slice(0, 1).toUpperCase()}
              </div>
              <span className={cx("truncate text-sm", p.muted)}>{user?.email}</span>
            </div>
            <button onClick={logout} className={cx("rounded-md border px-3 py-1 text-sm", p.inverseButton)}>Sign out</button>
          </div>
        )}
      </aside>

      {screen === "home" ? (
        <main className="relative flex flex-1 flex-col">
          <header className={cx("flex h-14 shrink-0 items-center justify-between border-b px-5", p.side)}>
            <div>
              <div className={cx("font-mono text-xs uppercase tracking-[.18em]", p.faint)}>AREVEI</div>
              <div className="text-sm font-semibold">AI Workspace</div>
            </div>
            <IconButton title="Toggle theme" onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))} className={cx("border", p.inverseButton)}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
          </header>
          {normalMessages.length > 0 && (
            <div className="mx-auto mt-10 w-full max-w-[864px] flex-1 overflow-y-auto px-6">
              <div className="space-y-6">
                {normalMessages.map((message) => (
                  <div key={message.id} className={message.role === "user" ? "text-right" : "text-left"}>
                    <div className={cx("inline-block max-w-[78%] rounded-2xl border px-4 py-3 text-[15px] leading-7", message.role === "user" ? p.panelSoft : p.panel)}>
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className={cx("flex flex-1 items-center justify-center", normalMessages.length > 0 && "flex-none pb-8")}>
            <div className="w-full max-w-[864px] px-6">
              {normalMessages.length === 0 && (
                <h1 className="mb-7 text-center text-[38px] font-bold tracking-[-.02em]">
                  {homeMode === "chat" ? "What do you want to know?" : "What do you want to create?"}
                </h1>
              )}
              <PromptBox
                value={normalMessages.length > 0 ? followUp : prompt}
                setValue={normalMessages.length > 0 ? setFollowUp : setPrompt}
                onSubmit={normalMessages.length > 0 ? submitFollowUp : submitHomePrompt}
                disabled={loading}
                theme={theme}
                mode={homeMode}
                setMode={setHomeMode}
                openImport={() => setImportOpen(true)}
              />
            </div>
          </div>
        </main>
      ) : (
        <main className="flex min-w-0 flex-1 flex-col">
          <div className={cx("flex h-8 shrink-0 items-center gap-1 overflow-x-auto border-b px-2", p.side)}>
            {menuItems.map((label) => (
              <button
                key={label}
                onClick={() => {
                  setActiveSection(label);
                  if (label === "Overview") newChat();
                  if (label === "Workspace" && workspace) setScreen("workspace");
                }}
                className={cx(
                  "flex h-6 shrink-0 items-center gap-1.5 rounded px-2 text-[11px]",
                  activeSection === label ? p.active : `${p.muted} ${p.hover}`
                )}
              >
                {label === "Workspace" ? <Code size={13} /> : label === "Agent" ? <Terminal size={13} /> : label === "Talk" ? <ChatCircle size={13} /> : <GridFour size={13} />}
                <span>{label}</span>
              </button>
            ))}
          </div>
          <header className={cx("flex h-12 shrink-0 items-center justify-between border-b px-4", p.side)}>
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={newChat} className={p.faint}><House size={19} /></button>
              <div className="min-w-0">
                <div className={cx("font-mono text-xs uppercase tracking-[.18em]", p.faint)}>
                  {workspace?.repo_full_name || "Project workspace"} / {workspace?.branch || "main"}
                </div>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{shortName(currentTitle, 48)}</span>
                  <CaretDown size={14} className={p.faint} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton title="Toggle theme" onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))} className={cx("border", p.inverseButton)}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </IconButton>
              <button onClick={() => setCommitOpen(true)} disabled={loading || !workspace} className={cx("flex h-9 items-center gap-2 rounded-md border px-3 text-sm disabled:opacity-40", p.inverseButton)}>
                <GitCommit size={18} /> Commit
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <section className={cx("flex w-[390px] shrink-0 flex-col border-r", p.side)}>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {messages.length === 0 ? (
                  <div className={cx("text-sm", p.faint)}>
                    {agentStatus ? (
                      <div className={cx("rounded-lg border p-3", p.panelSoft)}>
                        <div className="flex items-center gap-2">
                          <SpinnerGap size={16} className="animate-spin text-[#0d9f7c]" />
                          <span className="font-mono text-xs">{agentStatus}</span>
                        </div>
                      </div>
                    ) : "Ask for a code change to start the build log."}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((message) => (
                      <div key={message.id}>
                        <div className={cx("mb-2 flex items-center gap-2 text-xs uppercase tracking-[.14em]", p.faint)}>
                          {message.role === "agent" ? <Terminal size={15} /> : <ChatCircle size={15} />} {message.role === "agent" ? "agent activity" : message.role}
                        </div>
                        <div className={cx("whitespace-pre-wrap text-[15px] leading-7", message.role === "agent" && "font-mono text-xs")}>{message.content}</div>
                      </div>
                    ))}
                    {commitJob && (
                      <div className={cx("rounded-lg border p-3 text-sm", p.panelSoft)}>
                        <div className={cx("mb-1 font-mono text-xs uppercase tracking-[.14em]", p.faint)}>last commit</div>
                        <div className="font-mono text-xs">{commitJob.commit_sha}</div>
                        {commitJob.html_url && <a href={commitJob.html_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[#0d9f7c]">Open on GitHub</a>}
                      </div>
                    )}
                    {agentStatus && (
                      <div className={cx("rounded-lg border p-3 text-sm", p.panelSoft)}>
                        <div className="flex items-center gap-2">
                          <SpinnerGap size={16} className="animate-spin text-[#0d9f7c]" />
                          <span className="font-mono text-xs">{agentStatus}</span>
                        </div>
                        <div className={cx("mt-2 h-1 overflow-hidden rounded-full", p.panel)}>
                          <div className="h-full w-2/3 animate-pulse bg-[#0d9f7c]" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={cx("border-t p-3", p.side)}>
                <PendingChangeReview changes={changes} onApply={applyChange} loading={loading} theme={theme} />
                <PromptBox value={followUp} setValue={setFollowUp} onSubmit={submitFollowUp} disabled={loading} theme={theme} compact />
              </div>
            </section>

            <section className={cx("flex w-[300px] shrink-0 flex-col border-r", p.side)}>
              <div className={cx("flex h-11 items-center gap-4 border-b px-4", p.side, p.muted)}>
                <Folder size={19} />
                <MagnifyingGlass size={19} />
                <GridFour size={19} />
              </div>
              <div className={cx("flex h-10 items-center justify-between border-b px-4", p.side)}>
                <span className={cx("text-xs uppercase tracking-[.08em]", p.muted)}>Project</span>
                <div className={cx("flex gap-2", p.faint)}><Plus size={17} /><DotsThree size={17} /></div>
              </div>
              <FileTree tree={tree} selectedPath={selectedPath} onSelect={(path) => openFile(null, path)} theme={theme} />
            </section>

            <section className="flex min-w-0 flex-1 flex-col">
              <div className={cx("flex h-11 items-center justify-between border-b px-4", p.side)}>
                <div className={cx("flex items-center gap-1 rounded-md border p-1", p.panelSoft)}>
                  {[["preview", Eye], ["editor", Code], ["logs", Terminal], ["diffs", List]].map(([view, Icon]) => (
                    <button key={view} onClick={() => setRightView(view)} className={cx("grid h-8 w-9 place-items-center rounded", rightView === view && p.active)} title={view}>
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={stopRuntime} disabled={!runtime || runtime.status === "stopped"} className={cx("flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40", p.inverseButton)}>
                    <Power size={16} /> Stop
                  </button>
                  <button onClick={saveFile} disabled={!file} className={cx("rounded-md border px-3 py-1.5 text-sm disabled:opacity-40", p.inverseButton)}>Save</button>
                </div>
              </div>

              <div className={cx("min-h-0 flex-1", p.codeBg)}>
                {rightView === "preview" ? (
                  runtime?.preview_url ? (
                    <div className="flex h-full min-h-0 flex-col">
                      <div className={cx("flex h-10 items-center gap-2 border-b px-3 text-xs", p.side)}>
                        <span className={cx("font-mono uppercase tracking-[0.18em]", p.faint)}>
                          {runtime.framework || "preview"}:{runtime.preview_port || "auto"}
                        </span>
                        <input
                          readOnly
                          value={runtime.preview_url}
                          className={cx("min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs outline-none", p.input)}
                          onFocus={(event) => event.currentTarget.select()}
                        />
                        <a href={runtime.preview_url} target="_blank" rel="noreferrer" className={cx("grid h-7 w-8 place-items-center rounded border", p.inverseButton)} title="Open preview in new tab">
                          <ArrowSquareOut size={15} />
                        </a>
                      </div>
                      <iframe title="Live preview" src={runtime.preview_url} className="min-h-0 flex-1 bg-white" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" />
                    </div>
                  ) : runtime && ["preview_ready", "command_succeeded", "ready", "bridge_error"].includes(runtime.status) ? (
                    <div className="flex h-full items-center justify-center p-6">
                      <div className={cx("w-full max-w-xl rounded-lg border p-5", p.panel)}>
                        <div className="mb-2 text-lg font-semibold">Runtime preview is not available yet</div>
                        <div className={cx("text-sm leading-6", p.muted)}>
                          Status: <span className="font-mono">{runtime.status}</span>
                          {runtime.preview_port ? ` on port ${runtime.preview_port}` : ""}.
                        </div>
                        <div className={cx("mt-4 max-h-44 overflow-auto rounded-md p-3 font-mono text-xs", p.codeBg)}>
                          {runtimeLogs.length === 0
                            ? "Run Install, then Run dev. If Daytona returns an auth callback page, regenerate the signed preview URL by running dev again."
                            : runtimeLogs.slice(-8).map((log) => <div key={log.id} className="mb-2"><span className="text-[#0d9f7c]">{log.level}</span> {log.message}</div>)}
                        </div>
                      </div>
                    </div>
                  ) : preview?.html ? (
                    <iframe title="Workspace preview" srcDoc={preview.html} className="h-full w-full bg-white" sandbox="allow-scripts allow-forms" />
                  ) : (
                    <div className={cx("grid h-full place-items-center", p.faint)}>Preview port opens here.</div>
                  )
                ) : rightView === "logs" ? (
                  <div className={cx("h-full overflow-auto p-5 font-mono text-xs", p.muted)}>
                    {runtimeLogs.length === 0 ? "No logs yet." : runtimeLogs.map((log) => <div key={log.id} className="mb-2"><span className="text-[#0d9f7c]">{log.level}</span> {log.message}</div>)}
                  </div>
                ) : rightView === "diffs" ? (
                  <div className="h-full overflow-auto p-5">
                    <DiffList changes={changes} onApply={applyChange} onOpenFile={(path) => openFile(null, path)} theme={theme} />
                    <div className={cx("mt-5 rounded-lg border p-4 text-sm", p.panelSoft, p.muted)}>Knowledge: {knowledge?.memory?.summary || "not indexed"}</div>
                  </div>
                ) : file ? (
                  <Editor
                    height="100%"
                    language={file.language || "plaintext"}
                    value={editorValue}
                    theme={theme === "dark" ? "vs-dark" : "vs-light"}
                    onChange={(value) => setEditorValue(value ?? "")}
                    options={{ minimap: { enabled: true }, fontSize: 14, wordWrap: "on", scrollBeyondLastLine: false }}
                  />
                ) : (
                  <div className={cx("grid h-full place-items-center", p.faint)}>Select a file.</div>
                )}
              </div>
            </section>
          </div>
        </main>
      )}

      <ImportGithubModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        repos={repos}
        onConnect={connectGithub}
        onImport={importRepo}
        theme={theme}
        loading={importLoading}
      />
      <CommitModal
        open={commitOpen}
        onClose={() => setCommitOpen(false)}
        onCommit={commitWorkspace}
        onRevert={revertWorkspace}
        value={commitMessage}
        setValue={setCommitMessage}
        loading={loading}
        theme={theme}
        changedFiles={changedFiles}
        commits={commitHistory}
      />
    </div>
  );
}
