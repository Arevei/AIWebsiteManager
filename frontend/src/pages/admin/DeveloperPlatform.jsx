import React, { useCallback, useEffect, useMemo, useState } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from "@assistant-ui/react";
import {
  ArrowUp,
  CaretDown,
  CheckCircle,
  ChatCircle,
  Code,
  DotsThree,
  Eye,
  File,
  FileText,
  Folder,
  FolderOpen,
  Hammer,
  GitCommit,
  GithubLogo,
  GridFour,
  House,
  List,
  MagnifyingGlass,
  Microphone,
  Paperclip,
  PaperPlaneTilt,
  Play,
  Plus,
  RocketLaunch,
  Robot,
  ArrowSquareOut,
  Brain,
  Calendar,
  GearSix,
  SidebarSimple,
  Sparkle,
  SpinnerGap,
  SquaresFour,
  Terminal,
  Trash,
  TrendUp,
  X,
} from "@phosphor-icons/react";
import { API, api, getToken, withPreviewAuth } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../lib/theme";

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: House },
  { to: "/admin/dev", label: "AI Workspace", icon: Sparkle },
  { to: "/admin/agent", label: "Manager", icon: Robot },
  { to: "/admin?view=meetings", label: "Meetings", icon: Calendar },
  { to: "/admin?view=brain", label: "Brain", icon: Brain },
  { to: "/admin?view=growth", label: "Growth", icon: TrendUp },
  { to: "/admin?view=settings", label: "Settings", icon: GearSix },
];
const AREVEI_LOGO = "/arevei-logo-mark.png";
const CODE_MODELS = [
  { id: "codex-mini", label: "Codex Mini · GPT-5.4 Mini" },
  { id: "codex", label: "Codex · GPT-5.5" },
  { id: "coding", label: "Pro Coder · Claude Sonnet 4.5" },
  { id: "cheap", label: "Fast · Gemini 2.5 Flash Lite" },
  { id: "free", label: "Free · GPT-OSS 20B" },
  { id: "nim", label: "NVIDIA NIM · Llama 3.1" },
];

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function _languageFromPath(path = "") {
  const ext = path.split(".").pop()?.toLowerCase();
  return {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    css: "css",
    json: "json",
    md: "markdown",
    html: "html",
    py: "python",
  }[ext] || "plaintext";
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
    app: dark ? "bg-[#030607] text-white" : "bg-[#f7f7f4] text-[#111]",
    side: dark ? "bg-[#050a0a] border-white/[.07]" : "bg-[#fbfbf8] border-[#deded8]",
    panel: dark ? "bg-[#07100f] border-white/[.08]" : "bg-white border-[#deded8]",
    panelSoft: dark ? "bg-white/[.035] border-white/[.08]" : "bg-[#f1f1ec] border-[#d8d8d0]",
    hover: dark ? "hover:bg-white/[.045]" : "hover:bg-[#ecece5]",
    active: dark ? "bg-[#49e8ca12] text-[#49e8ca]" : "bg-[#e7e7df] text-[#111]",
    muted: dark ? "text-white/55" : "text-[#686868]",
    faint: dark ? "text-white/32" : "text-[#898981]",
    input: dark ? "bg-white/[.025] border-white/[.09] text-white placeholder:text-white/28" : "bg-white border-[#d5d5cc] text-[#111] placeholder:text-[#8a8a84]",
    button: dark ? "bg-[#49e8ca] text-[#032c25]" : "bg-black text-white",
    inverseButton: dark ? "border-white/[.09] text-white/62" : "border-[#d7d7cf] text-[#333]",
    codeBg: dark ? "bg-[#030606]" : "bg-[#fcfcf9]",
  };
}

function IconButton({ children, title, onClick, className = "" }) {
  return (
    <button onClick={onClick} title={title} className={cx("grid h-9 w-9 place-items-center rounded-md", className)}>
      {children}
    </button>
  );
}

function PromptBox({
  value,
  setValue,
  onSubmit,
  disabled,
  theme,
  compact,
  mode,
  setMode,
  openImport,
  model,
  setModel,
  effort,
  setEffort,
  planMode,
  setPlanMode,
  attachments = [],
  onAttach,
  onRemoveAttachment,
}) {
  const p = palette(theme);
  return (
    <form onSubmit={onSubmit} className={cx("min-w-0 rounded-xl border shadow-[0_16px_45px_rgba(0,0,0,.14)]", p.input, compact ? "p-2" : "p-4")}>
      {!compact && (
        <div className={cx("mb-3 grid w-full max-w-[460px] grid-cols-2 rounded-lg border p-1", p.panelSoft)}>
          <button type="button" onClick={() => setMode("chat")} className={cx("rounded-md px-3 py-2 text-left", mode === "chat" ? p.button : p.muted)}>
            <span className="block text-xs font-semibold">Normal Chat</span><span className="mt-0.5 block text-[9px] opacity-65">Analysis and planning</span>
          </button>
          <button type="button" onClick={() => setMode("project")} className={cx("rounded-md px-3 py-2 text-left", mode === "project" ? p.button : p.muted)}>
            <span className="block text-xs font-semibold">Project Build</span><span className="mt-0.5 block text-[9px] opacity-65">Website implementation</span>
          </button>
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={compact ? "Ask a follow-up..." : mode === "chat" ? "Ask anything..." : "Ask AREVEI to build or edit a project..."}
        className={cx("w-full min-w-0 resize-none bg-transparent text-[15px] leading-6 outline-none", compact ? "min-h-[44px]" : "min-h-[88px]")}
      />
      {attachments.length > 0 && (
        <div className="mb-3 flex max-w-full flex-wrap gap-2 overflow-hidden">
          {attachments.map((item) => (
            <span key={item.id} className={cx("inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs", p.panelSoft)}>
              <FileText size={14} />
              <span className="max-w-[160px] truncate">{item.name}</span>
              <button type="button" onClick={() => onRemoveAttachment?.(item.id)} className={cx("grid h-4 w-4 place-items-center rounded", p.hover)} title="Remove attachment">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className={cx("flex min-w-0 flex-wrap items-center gap-2", p.muted)}>
          <label title="Attach images or documents" className={cx("grid h-9 w-9 cursor-pointer place-items-center rounded-md", p.hover)}>
            <input type="file" multiple className="hidden" onChange={(event) => onAttach?.(event.target.files, event)} accept="image/*,.txt,.md,.json,.csv,.html,.css,.js,.jsx,.ts,.tsx,.pdf,.doc,.docx" />
            <Paperclip size={20} />
          </label>
          <label className={cx("flex h-9 items-center gap-2 rounded-md px-2 text-sm", p.hover)} title="Coding model">
            <SquaresFour size={18} />
            <select value={model} onChange={(event) => setModel?.(event.target.value)} className="max-w-[150px] bg-transparent text-sm outline-none">
              {CODE_MODELS.map((item) => <option key={item.id} value={item.id} className="bg-[#07100f] text-white">{item.label}</option>)}
            </select>
          </label>
          <label className={cx("flex h-9 items-center gap-2 rounded-md px-2 text-sm", p.hover)} title="Reasoning effort">
            <Sparkle size={16} />
            <select value={effort} onChange={(event) => setEffort?.(event.target.value)} className="bg-transparent text-sm outline-none">
              {["low", "medium", "high"].map((item) => <option key={item} value={item} className="bg-[#07100f] text-white">{item}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setPlanMode?.(!planMode)} className={cx("flex h-9 items-center gap-2 rounded-md border px-2 text-sm", planMode ? "border-[#49e8ca55] text-[#49e8ca]" : p.inverseButton)}>
            <List size={16} /> Plan
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

function MarkdownText({ text = "", theme }) {
  const p = palette(theme);
  const lines = String(text || "").split("\n");
  return (
    <div className="min-w-0 space-y-2 overflow-hidden break-words text-[14px] leading-6">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />;
        if (trimmed.startsWith("```")) return null;
        if (trimmed.startsWith("#")) return <div key={index} className="mt-3 text-base font-semibold">{trimmed.replace(/^#+\s*/, "")}</div>;
        if (/^[-*]\s+/.test(trimmed)) return <div key={index} className="pl-3 before:mr-2 before:content-['-']">{trimmed.replace(/^[-*]\s+/, "")}</div>;
        if (/^`[^`]+`$/.test(trimmed)) return <code key={index} className={cx("block max-w-full overflow-x-auto rounded-md border p-2 font-mono text-xs", p.codeBg)}>{trimmed.slice(1, -1)}</code>;
        return <p key={index} className="min-w-0 break-words">{trimmed}</p>;
      })}
    </div>
  );
}

function extractMessageText(message) {
  return (message?.content || [])
    .map((part) => {
      if (part?.type === "text") return part.text || "";
      if (part?.text) return part.text;
      return "";
    })
    .join("\n")
    .trim();
}

function AssistantMessageBubble({ role, theme }) {
  const p = palette(theme);
  return (
    <MessagePrimitive.Root className={cx("aui-message", role === "user" ? "aui-message-user" : "aui-message-assistant")}>
      <div className={cx("aui-message-label", p.faint)}>{role === "user" ? "You" : "Codex"}</div>
      <div className={cx("aui-message-bubble", role === "user" ? "aui-message-bubble-user" : "aui-message-bubble-assistant")}>
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantCodexComposer({ disabled }) {
  return (
    <ComposerPrimitive.Root className="aui-composer">
      <ComposerPrimitive.Input
        disabled={disabled}
        placeholder={disabled ? "Codex runtime is not ready" : "Message Codex..."}
        submitMode="enter"
        className="aui-composer-input"
      />
      <ComposerPrimitive.Send disabled={disabled} className="aui-composer-send">
        <PaperPlaneTilt size={17} />
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

function AssistantCodexChat({
  workspaceId,
  selectedModel,
  selectedEffort,
  disabled,
  agentStatus,
  setAgentStatus,
  onResult,
  theme,
}) {
  const p = palette(theme);
  const modelAdapter = useMemo(() => ({
    async *run({ messages, abortSignal }) {
      if (!workspaceId) {
        yield { content: [{ type: "text", text: "Open or create a workspace before messaging Codex." }] };
        return;
      }
      const userText = extractMessageText(messages[messages.length - 1]);
      if (!userText) {
        yield { content: [{ type: "text", text: "Send a message for Codex to work on." }] };
        return;
      }
      setAgentStatus("Connecting to Codex...");
      const response = await fetch(`${API}/workspaces/${workspaceId}/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          message: userText,
          model: selectedModel,
          effort: selectedEffort,
          plan_mode: false,
          attachments: [],
        }),
        signal: abortSignal,
      });
      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || `Codex stream failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      let finalResult = null;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const rawLine of lines) {
            if (!rawLine.trim()) continue;
            const item = JSON.parse(rawLine);
            if (item.type === "delta" && item.text) {
              text += item.text;
              setAgentStatus("Codex is responding...");
              yield { content: [{ type: "text", text }] };
            } else if (item.type === "event" && item.event?.message) {
              setAgentStatus(item.event.message);
            } else if (item.type === "result") {
              finalResult = item.result;
              text = item.result?.assistant_message || text;
              yield { content: [{ type: "text", text: text || "Codex completed." }] };
            } else if (item.type === "error") {
              throw new Error(item.detail || "Codex stream failed");
            }
          }
        }
        if (buffer.trim()) {
          const item = JSON.parse(buffer);
          if (item.type === "result") {
            finalResult = item.result;
            text = item.result?.assistant_message || text;
          }
        }
        if (!text) text = finalResult?.assistant_message || "Codex completed.";
        yield { content: [{ type: "text", text }] };
        await onResult?.(finalResult);
      } finally {
        setAgentStatus("");
      }
    },
  }), [workspaceId, selectedModel, selectedEffort, setAgentStatus, onResult]);
  const runtime = useLocalRuntime(modelAdapter);

  return (
    <div className={cx("aui-codex-chat h-full min-h-[520px] overflow-hidden rounded-lg border", p.panel)}>
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root className="aui-thread">
          <div className="aui-thread-header">
            <div>
              <div className="aui-thread-title">Codex</div>
              <div className="aui-thread-subtitle">{agentStatus || "assistant-ui runtime"}</div>
            </div>
          </div>
          <ThreadPrimitive.Viewport className="aui-thread-viewport" autoScroll>
            <AuiIf condition={(state) => state.thread.isEmpty}>
              <div className="aui-thread-empty">Ask Codex to change, fix, build, or explain this workspace.</div>
            </AuiIf>
            <ThreadPrimitive.Messages>
              {({ message }) => <AssistantMessageBubble role={message.role} theme={theme} />}
            </ThreadPrimitive.Messages>
            <ThreadPrimitive.ViewportFooter className="aui-thread-footer">
              <AssistantCodexComposer disabled={disabled} />
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
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
      const isLast = index === parts.length - 1;
      const isFile = isLast && item.type !== "tree" && item.type !== "folder";
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
      if (isLast && item.type !== "tree" && item.type !== "folder") {
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

function FileTree({ tree, selectedPath, onSelect, theme, query, onContextMenu, changedFiles = [] }) {
  const p = palette(theme);
  const nodes = useMemo(() => buildFileTree(tree), [tree]);
  const changedByPath = useMemo(() => new Map((changedFiles || []).map((item) => [item.path, item.status || "M"])), [changedFiles]);
  const [expanded, setExpanded] = useState({ src: true, app: true, components: true, public: true });
  const rows = useMemo(() => {
    const all = visibleFileRows(nodes, expanded);
    const value = (query || "").trim().toLowerCase();
    if (!value) return all;
    return all.filter((node) => node.path.toLowerCase().includes(value));
  }, [nodes, expanded, query]);
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
            onContextMenu={(event) => {
              event.preventDefault();
              onContextMenu?.(event, node);
            }}
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
            {!isFolder && changedByPath.has(node.path) && <span className="shrink-0 font-mono text-[10px] text-[#0d9f7c]">{changedByPath.get(node.path) || "M"}</span>}
            {!isFolder && node.loaded && <span className={cx("shrink-0 text-[10px]", p.faint)}>loaded</span>}
          </button>
        );
      })}
    </div>
  );
}

function DiffList({ changes, onOpenFile, onOpenDiff, theme }) {
  const p = palette(theme);
  if (!changes?.length) return <div className={cx("text-sm", p.faint)}>Applied changes and git diffs appear here.</div>;
  const grouped = changes.flatMap((change) => (change.changes || []).map((file) => ({ ...file, change })));
  return (
    <div className="space-y-3">
      {changes.map((change) => (
        <div key={change.id} className={cx("rounded-lg border p-3", p.panel)}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className={cx("text-xs uppercase tracking-[.15em]", p.faint)}>{change.status}</div>
              <div className="mt-1 text-sm">{change.assistant_message}</div>
            </div>
            <div className={cx("shrink-0 rounded border px-2 py-1 font-mono text-[10px]", p.inverseButton)}>
              {change.files_changed?.length || change.changes?.length || 0} files
            </div>
          </div>
          {change.changes?.map((file) => (
            <div key={file.path} className={cx("mt-2 rounded-md p-2", p.codeBg)}>
              <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                <button onClick={() => onOpenFile?.(file.path)} className="min-w-0 truncate font-mono text-xs text-[#0d9f7c] hover:underline">{file.path}</button>
                <button onClick={() => onOpenDiff?.(file.path)} className={cx("shrink-0 rounded border px-2 py-1 text-[10px]", p.inverseButton)}>Review</button>
              </div>
              <pre className={cx("max-h-32 max-w-full overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]", p.muted)}>
                {file.patch?.split("\n").slice(0, 40).join("\n")}
              </pre>
            </div>
          ))}
        </div>
      ))}
      {grouped.length > 0 && <div className={cx("rounded-lg border p-3 text-xs", p.panelSoft)}>{grouped.length} file diff(s) available for side-by-side review.</div>}
    </div>
  );
}

export default function DeveloperPlatform() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("arevei_sidebar_open") !== "false");
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
  const [fileSearch, setFileSearch] = useState("");
  const [fileSearchOpen, setFileSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [treeMenu, setTreeMenu] = useState(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [file, setFile] = useState(null);
  const [editorValue, setEditorValue] = useState("");
  const [openFiles, setOpenFiles] = useState([]);
  const [fileDrafts, setFileDrafts] = useState({});
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
  const [vercelOpen, setVercelOpen] = useState(false);
  const [commitHistory, setCommitHistory] = useState([]);
  const [changedFiles, setChangedFiles] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");
  const [agentEvents, setAgentEvents] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [pendingApproval, setPendingApproval] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [selectedEffort, setSelectedEffort] = useState("medium");
  const [planMode, setPlanMode] = useState(false);
  const [activePlan, setActivePlan] = useState("");
  const [diffReview, setDiffReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("codex-mini");
  const p = palette(theme);

  const currentTitle = useMemo(
    () => workspaceTitle({ workspace, project, chat }),
    [workspace, project, chat]
  );
  const recentItems = useMemo(
    () => [...generalChats.map((item) => ({ ...item, listKind: "chat" })), ...recentWorkspaces.map((item) => ({ ...item, listKind: "project" }))]
      .filter((item) => workspaceTitle(item).toLowerCase().includes(searchQuery.toLowerCase()) || item.title?.toLowerCase().includes(searchQuery.toLowerCase())),
    [generalChats, recentWorkspaces, searchQuery]
  );
  const workspaceUsage = Math.min(100, Math.round((recentWorkspaces.length / 20) * 100));
  const agentUsage = Math.min(100, Math.round((messages.filter((item) => item.role === "agent").length / 50) * 100));
  const visiblePreviewUrl = withPreviewAuth(runtime?.preview_url || "");
  const codexReady = true; // Cloud AI agent (OpenRouter router) runs server-side; no Daytona/Codex needed for edits.
  const runtimeLabel = runtime?.provider ? `${runtime.provider} ${runtime.status || "runtime"}` : "Cloud AI agent ready";

  useEffect(() => {
    localStorage.setItem("arevei_sidebar_open", String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    loadStartData();
    handleGithubReturn();
    handleVercelReturn();
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
        refreshWorkspace(currentRes.data.workspace.id);
      }
    } catch (e) { }
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
    setOpenFiles([]);
    setFileDrafts({});
    setMessages([]);
    setChanges([]);
    setPreview(null);
    setRuntime(null);
    setRuntimeLogs([]);
    setKnowledge(null);
    setCommitJob(null);
    setCommitHistory([]);
    setChangedFiles([]);
    setAgentEvents([]);
    setStreamingText("");
    setPendingApproval(null);
    setAttachments([]);
    setActivePlan("");
    setDiffReview(null);
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

  const uploadAttachments = async (fileList) => {
    if (!workspace?.id || !fileList?.length) {
      toast.error("Open a workspace before attaching files");
      return;
    }
    const uploaded = [];
    for (const file of Array.from(fileList)) {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/workspaces/${workspace.id}/attachments`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      uploaded.push(res.data);
    }
    setAttachments((items) => [...items, ...uploaded]);
  };

  const removeAttachment = (id) => {
    setAttachments((items) => items.filter((item) => item.id !== id));
  };

  const findDiffForPath = (path) => {
    for (const change of changes || []) {
      const fileChange = (change.changes || []).find((item) => item.path === path);
      if (fileChange) return fileChange;
    }
    return null;
  };

  const openDiffReview = async (path) => {
    const diff = findDiffForPath(path);
    if (diff) {
      setDiffReview(diff);
      setSelectedPath(path);
      setRightView("editor");
      return;
    }
    await openFile(null, path, true);
  };

  const decideApproval = async (approval, decision) => {
    if (!workspace?.id || !approval?.id) return;
    setLoading(true);
    try {
      await api.post(`/workspaces/${workspace.id}/approvals/${approval.id}`, { decision });
      if (decision === "allow") {
        const res = await api.post(`/workspaces/${workspace.id}/runtime/commands`, {
          command: approval.command,
          approval_id: approval.id,
        });
        await refreshWorkspace(workspace.id);
        setRightView(res.data?.status === "preview_ready" ? "preview" : "logs");
      }
      setPendingApproval(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const applyAgentResponse = async (data, workspaceId) => {
    setAgentEvents(data?.events || []);
    const changed = data?.files_changed || data?.changes || [];
    const firstPath = changed.find((item) => item?.path)?.path;
    if (firstPath) {
      await openFile(workspaceId, firstPath, true);
      setRightView("editor");
    }
  };

  const streamWorkspaceAgent = async (workspaceId, message) => {
    const localId = Date.now();
    setStreamingText("");
    setActivePlan("");
    setPendingApproval(null);
    setMessages((items) => [
      ...items,
      {
        id: `local-user-${localId}`,
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      },
    ]);
    const response = await fetch(`${API}/workspaces/${workspaceId}/ai/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({
        message,
        model: selectedModel,
        effort: selectedEffort,
        plan_mode: planMode,
        attachments: attachments.map((item) => item.id),
      }),
    });
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      let detail = text;
      try {
        detail = JSON.parse(text)?.detail || text;
      } catch {
        // Keep the raw response text when it is not JSON.
      }
      throw new Error(detail || `AI stream failed (${response.status})`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = null;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const rawLine of lines) {
        if (!rawLine.trim()) continue;
        const item = JSON.parse(rawLine);
        if (item.type === "event" && item.event) {
          setAgentEvents((events) => [...events, item.event]);
          if (item.event.type === "plan_created" && item.event.plan_markdown) setActivePlan(item.event.plan_markdown);
          if (item.event.type === "command_approval_required" && item.event.approval) setPendingApproval(item.event.approval);
          const livePaths = item.event.paths?.length ? item.event.paths : item.event.path ? [item.event.path] : [];
          if (livePaths.length) {
            setChangedFiles((files) => {
              const byPath = new Map(files.map((file) => [file.path, file]));
              livePaths.forEach((path) => byPath.set(path, { path, status: item.event.status === "failed" ? "!" : "M" }));
              return Array.from(byPath.values());
            });
          }
          if (item.event.path) setAgentStatus(item.event.message);
          else if (item.event.message) setAgentStatus(item.event.message);
        } else if (item.type === "plan" && item.markdown) {
          setActivePlan(item.markdown);
        } else if (item.type === "delta" && item.text) {
          setStreamingText((text) => `${text}${item.text}`);
          setAgentStatus("Codex is writing...");
        } else if (item.type === "result") {
          result = item.result;
          if (result?.assistant_message) {
            setStreamingText(result.assistant_message);
          }
        } else if (item.type === "error") {
          if (item.detail) {
            setAgentEvents((events) => [...events, { type: "error", message: item.detail, timestamp: new Date().toISOString() }]);
            setAgentStatus(item.detail);
          }
          throw new Error(item.detail || "AI stream failed");
        }
      }
    }
    if (buffer.trim()) {
      const item = JSON.parse(buffer);
      if (item.type === "result") result = item.result;
    }
    return result || { changes: [], events: [] };
  };

  const createProject = async (message) => {
    setAgentStatus("Creating workspace and starting runtime...");
    const res = await api.post("/projects/start", { prompt: message, name: shortName(message) });
    setWorkspace(res.data);
    setProject(res.data.project || null);
    setChat(res.data.chat || null);
    setScreen("workspace");
    await autoSetupWorkspace(res.data);
    setAgentStatus("Reading files and applying first code edits...");
    setAgentEvents([]);
    const agentRes = await streamWorkspaceAgent(res.data.id, message);
    await applyAgentResponse(agentRes, res.data.id);
    await refreshWorkspace(res.data.id);
    await loadRecentWorkspaces();
    setStreamingText("");
    setAttachments([]);
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
      toast.error(err.message || err.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const submitFollowUpText = async (rawMessage) => {
    const message = (rawMessage || "").trim();
    if (!message) return;
    setLoading(true);
    try {
      if (screen === "workspace" && workspace) {
        setAgentStatus("Reading workspace context and applying edits...");
        setAgentEvents([]);
        const res = await streamWorkspaceAgent(workspace.id, message);
        await applyAgentResponse(res, workspace.id);
        await refreshWorkspace(workspace.id);
        await loadRecentWorkspaces();
        setStreamingText("");
        setAttachments([]);
        toast.success(res.changes?.length ? "AI edited workspace files" : "AI responded");
      } else {
        await sendNormalChat(message);
      }
    } catch (err) {
      toast.error(err.message || err.response?.data?.detail || "Request failed");
    } finally {
      setAgentStatus("");
      setLoading(false);
    }
  };

  const submitFollowUp = async (e) => {
    e.preventDefault();
    await submitFollowUpText(followUp);
    setFollowUp("");
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
      if (selectedPath) {
        setFileDrafts((drafts) => ({ ...drafts, [selectedPath]: editorValue }));
      }
      const res = await api.get(`/workspaces/${id}/files/${encodePath(path)}`);
      setDiffReview(null);
      setSelectedPath(path);
      setFile(res.data);
      setEditorValue(fileDrafts[path] ?? res.data.content ?? "");
      setOpenFiles((items) => {
        const existing = items.find((item) => item.path === path);
        if (existing) return items.map((item) => item.path === path ? { ...item, language: res.data.language, content: res.data.content || "" } : item);
        return [...items, { path, language: res.data.language, content: res.data.content || "" }];
      });
      if (switchView) setRightView("editor");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not open file");
    }
  };

  const closeOpenFile = (path) => {
    setOpenFiles((items) => items.filter((item) => item.path !== path));
    setFileDrafts((drafts) => {
      const next = { ...drafts };
      delete next[path];
      return next;
    });
    if (selectedPath !== path) return;
    const nextFile = openFiles.find((item) => item.path !== path);
    if (nextFile) {
      openFile(null, nextFile.path, true);
    } else {
      setSelectedPath("");
      setFile(null);
      setEditorValue("");
    }
  };

  const createWorkspacePath = async (type, basePath = "") => {
    if (!workspace) return;
    const label = type === "folder" ? "folder path" : "file path";
    const suggested = basePath ? `${basePath}/` : "";
    const path = window.prompt(`New ${label}`, suggested);
    if (!path?.trim()) return;
    try {
      const res = await api.post(`/workspaces/${workspace.id}/files`, {
        path: path.trim(),
        type,
        content: type === "file" ? "" : undefined,
      });
      await refreshWorkspace(workspace.id);
      if (type === "file") await openFile(workspace.id, res.data.path, true);
      toast.success(type === "folder" ? "Folder created" : "File created");
    } catch (err) {
      toast.error(err.response?.data?.detail || `Could not create ${type}`);
    }
  };

  const renameWorkspacePath = async (path) => {
    if (!workspace || !path) return;
    const nextPath = window.prompt("Rename or move path", path);
    if (!nextPath?.trim() || nextPath.trim() === path) return;
    try {
      const res = await api.patch(`/workspaces/${workspace.id}/files/${encodePath(path)}`, { new_path: nextPath.trim() });
      setOpenFiles((items) => items.map((item) => item.path === path ? { ...item, path: res.data.path } : item));
      setFileDrafts((drafts) => {
        const next = { ...drafts };
        if (Object.prototype.hasOwnProperty.call(next, path)) {
          next[res.data.path] = next[path];
          delete next[path];
        }
        return next;
      });
      if (selectedPath === path) setSelectedPath(res.data.path);
      await refreshWorkspace(workspace.id);
      toast.success("Renamed");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Rename failed");
    }
  };

  const deleteWorkspacePath = async (path) => {
    if (!workspace || !path) return;
    if (!window.confirm(`Delete ${path}?`)) return;
    try {
      await api.delete(`/workspaces/${workspace.id}/files/${encodePath(path)}`);
      const removedPrefix = `${path}/`;
      setOpenFiles((items) => items.filter((item) => item.path !== path && !item.path.startsWith(removedPrefix)));
      if (selectedPath === path || selectedPath.startsWith(removedPrefix)) {
        setSelectedPath("");
        setFile(null);
        setEditorValue("");
      }
      await refreshWorkspace(workspace.id);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  const searchWorkspaceFiles = async (value = fileSearch) => {
    if (!workspace) return;
    const query = value.trim();
    setFileSearch(value);
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/workspaces/${workspace.id}/search`, { params: { q: query } });
      setSearchResults(res.data.results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const saveFile = async () => {
    if (!workspace || !selectedPath) return;
    try {
      const res = await api.put(`/workspaces/${workspace.id}/files/${encodePath(selectedPath)}`, { content: editorValue });
      setFile(res.data);
      setOpenFiles((items) => items.map((item) => item.path === selectedPath ? { ...item, content: editorValue } : item));
      setFileDrafts((drafts) => ({ ...drafts, [selectedPath]: editorValue }));
      await refreshWorkspace(workspace.id);
      toast.success("Saved");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setAgentStatus("");
    }
  };

  const runBuildCheck = async (reason = "latest change") => {
    if (!workspace || !runtime?.build_command) return null;
    setAgentStatus(`Checking build with ${runtime.build_command}...`);
    const res = await api.post(`/workspaces/${workspace.id}/runtime/commands`, { command: runtime.build_command });
    if (res.data?.status === "command_failed") {
      setAgentStatus("Build failed. Asking agent to apply a focused repair...");
      await api.post(`/workspaces/${workspace.id}/ai/chat`, {
        message: `The build failed after ${reason}. Read the project files and prepare a focused fix. Build command: ${runtime.build_command}\n\nBuild output:\n${res.data.output || ""}`,
        model: selectedModel,
      });
      toast.error("Build failed. AI repair edits were applied for review in git diff.");
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
      if (res.data?.status === "approval_required") {
        setPendingApproval(res.data.approval);
        setAgentEvents((events) => [...events, res.data.event].filter(Boolean));
        setAgentStatus("Waiting for terminal approval.");
        return;
      }
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveFile();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id, selectedPath, editorValue]);

  const handleVercelReturn = () => {
    const params = new URLSearchParams(window.location.search);
    const vercelStatus = params.get("vercel");
    if (!vercelStatus) return;
    if (vercelStatus === "connected") {
      toast.success("Vercel connected");
    } else {
      toast.error("Vercel connection failed");
    }
    params.delete("vercel");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  const ensurePreview = useCallback(async () => {
    if (!workspace?.id || previewLoading) return;
    setPreviewLoading(true);
    setAgentStatus("Starting preview workspace...");
    try {
      if (!runtime) {
        const config = workspace.runtime_config || {};
        await api.post(`/workspaces/${workspace.id}/runtime/start`, {
          install_command: config.install_command,
          dev_command: config.dev_command,
          build_command: config.build_command,
          test_command: config.test_command,
          lint_command: config.lint_command,
        });
      }
      setAgentStatus(`Opening preview with ${runtime?.dev_command || workspace.runtime_config?.dev_command || "npm run dev"}...`);
      const res = await api.post(`/workspaces/${workspace.id}/runtime/ensure-preview`);
      setRuntime(res.data.runtime || null);
      setRuntimeLogs(res.data.logs || []);
      if (res.data.status !== "preview_ready") {
        await refreshWorkspace(workspace.id);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not start preview");
      await refreshWorkspace(workspace.id);
    } finally {
      setAgentStatus("");
      setPreviewLoading(false);
    }
  // refreshWorkspace intentionally stays outside the dependency list because it
  // is recreated on each render and would retrigger preview warm-up loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewLoading, runtime, workspace]);

  useEffect(() => {
    if (screen !== "workspace" || rightView !== "preview" || !workspace?.id) return;
    if (runtime?.preview_url || previewLoading) return;
    ensurePreview();
  }, [ensurePreview, previewLoading, rightView, runtime?.preview_url, screen, workspace?.id]);

  // Keep the Daytona sandbox awake while the workspace UI is open so previews
  // do not fall asleep mid-session. Cheap ping (no command execution).
  useEffect(() => {
    if (screen !== "workspace" || !workspace?.id) return undefined;
    const id = setInterval(() => {
      api.post(`/workspaces/${workspace.id}/runtime/keepalive`).catch(() => {});
    }, 45000);
    return () => clearInterval(id);
  }, [screen, workspace?.id]);


  const handleSetRightView = (view) => {
    setRightView(view);
    if (view === "preview") {
      ensurePreview();
    }
  };

  const connectVercel = async () => {
    try {
      const returnTo = `${window.location.origin}${window.location.pathname}`;
      const res = await api.get(`/vercel/install/start?return_to=${encodeURIComponent(returnTo)}`);
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not start Vercel connection");
    }
  };

  const triggerDeploy = async () => {
    if (!workspace) return;
    try {
      await api.post(`/workspaces/${workspace.id}/deploy`, { provider: "vercel" });
      toast.success("Deployment triggered successfully");
      setVercelOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to trigger deployment");
    }
  };

  const commitWorkspace = async () => {
    if (!workspace) return;
    setLoading(true);
    setAgentStatus("Committing workspace changes and pushing to GitHub...");
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

  const sideWidth = sidebarOpen ? "w-[260px]" : "w-0";

  return (
    <div className={cx("fixed inset-0 flex overflow-hidden", p.app)}>
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-white/[.07] bg-[#030908] px-4 py-5 lg:flex">
        <img src={AREVEI_LOGO} alt="Arevei" className="h-7 w-auto max-w-full shrink-0 self-start object-contain object-left" />
        <nav className="mt-8 space-y-1">
          {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={cx("flex h-[38px] items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors", to === "/admin/dev" ? "bg-[#49e8ca12] text-[#49e8ca]" : "text-white/70 hover:bg-white/[.045] hover:text-white")}>
              <Icon size={19} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-white/[.08] p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#49e8ca] text-[11px] font-bold text-[#032c25]">{(user?.name || user?.email || "A").slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{user?.name || "Account"}</div><div className="mt-0.5 truncate text-[10px] text-white/32">{user?.email}</div></div>
            <button onClick={logout} title="Sign out" className="text-[10px] text-white/30 hover:text-white/60">Exit</button>
          </div>
        </div>
      </aside>

      <aside className={cx("relative hidden shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 md:flex", sideWidth, p.side)}>
        {sidebarOpen && (
          <>
            <div className="flex h-14 items-center justify-between px-4">
              <div><div className="text-sm font-semibold">AI Workspace</div><div className={cx("mt-0.5 text-[10px]", p.faint)}>Conversation history</div></div>
              <IconButton title="Collapse history" onClick={() => setSidebarOpen(false)} className={cx(p.muted, p.hover)}><SidebarSimple size={18} /></IconButton>
            </div>
            <div className="px-3">
              <button onClick={newChat} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#49e8ca] text-xs font-semibold text-[#032c25]"><Plus size={16} /> New Chat</button>
              <div className={cx("mt-3 flex h-8 items-center gap-2 rounded-lg border px-2.5", p.input)}><MagnifyingGlass size={14} className={p.faint} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search conversations" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></div>
            </div>
            <div className="mt-6 flex min-h-0 flex-1 flex-col px-2">
              <div className={cx("mb-2 px-2 text-[10px] font-medium uppercase tracking-[.14em]", p.faint)}>Recent</div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {recentLoading && <div className={cx("flex items-center gap-2 px-3 py-2 text-xs", p.faint)}><SpinnerGap className="animate-spin" /> Loading…</div>}
                {recentItems.map((item) => (
                  <button key={`${item.listKind}-${item.id}`} onClick={() => (item.listKind === "chat" ? openGeneralChat(item) : openWorkspace(item))} className={cx("group flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs", p.muted, p.hover)}>
                    {item.listKind === "chat" ? <ChatCircle size={15} className="shrink-0" /> : <Code size={15} className="shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{item.listKind === "chat" ? item.title : workspaceTitle(item)}</span>
                    <span role="button" tabIndex={0} onClick={(event) => deleteRecentItem(event, item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") deleteRecentItem(event, item); }} title="Delete" className={cx("hidden h-6 w-6 shrink-0 place-items-center rounded group-hover:grid", p.hover)}><Trash size={13} /></span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-white/[.06] px-4 py-3">
              <div className={cx("flex justify-between text-[10px]", p.faint)}><span>Workspace usage</span><span>{recentWorkspaces.length}/20</span></div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full bg-[#49e8ca]" style={{ width: `${workspaceUsage}%` }} /></div>
              <div className={cx("mt-3 flex justify-between text-[10px]", p.faint)}><span>Agent usage</span><span>{agentUsage}%</span></div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full bg-white/20" style={{ width: `${agentUsage}%` }} /></div>
            </div>
          </>
        )}
      </aside>

      {screen === "home" ? (
        <main className="relative flex flex-1 flex-col">
          <header className={cx("flex h-14 shrink-0 items-center justify-between border-b px-5", p.side)}>
            <div className="flex min-w-0 items-center gap-3">
              {!sidebarOpen && <IconButton title="Open history" onClick={() => setSidebarOpen(true)} className={cx(p.muted, p.hover)}><SidebarSimple size={18} /></IconButton>}
              <div><div className="text-sm font-semibold">AI Workspace</div><div className={cx("mt-0.5 hidden text-[10px] sm:block", p.faint)}>Build, manage and improve your website with AREVEI.</div></div>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="hidden rounded-full border border-white/[.07] px-2.5 py-1 text-white/38 sm:inline-flex">Website · {workspace?.repo_full_name || "Ready"}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#49e8ca20] bg-[#49e8ca08] px-2.5 py-1 text-[#49e8ca]"><span className="h-1.5 w-1.5 rounded-full bg-[#49e8ca]" /> AI Ready</span>
            </div>
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
                <div className="mb-7 text-center">
                  <h1 className="text-[30px] font-semibold tracking-[-.035em]">What should we work on?</h1>
                  <p className={cx("mt-2 text-sm", p.muted)}>Ask AREVEI to build, fix, update or improve your website.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {["Update homepage", "Fix an issue", "Improve SEO", "Build a new section"].map((item) => (
                      <button key={item} onClick={() => { setPrompt(item); if (item === "Update homepage" || item === "Build a new section") setHomeMode("project"); }} className={cx("rounded-full border px-3 py-1.5 text-[11px]", p.inverseButton, p.hover)}>{item}</button>
                    ))}
                  </div>
                </div>
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
                model={selectedModel}
                setModel={setSelectedModel}
                effort={selectedEffort}
                setEffort={setSelectedEffort}
                planMode={planMode}
                setPlanMode={setPlanMode}
                attachments={attachments}
                onAttach={uploadAttachments}
                onRemoveAttachment={removeAttachment}
              />
            </div>
          </div>
        </main>
      ) : (
        <main className="flex min-w-0 flex-1 flex-col">
          <header className={cx("flex h-12 shrink-0 items-center justify-between border-b px-4", p.side)}>
            <div className="flex min-w-0 items-center gap-3">
              {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className={p.faint}><SidebarSimple size={19} /></button>}
              <button onClick={newChat} className={p.faint}><House size={18} /></button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">AI Workspace · {shortName(currentTitle, 42)}</span>
                  <CaretDown size={14} className={p.faint} />
                </div>
                <div className={cx("mt-0.5 font-mono text-[9px] uppercase tracking-[.12em]", p.faint)}>{workspace?.repo_full_name || "Project workspace"} - {workspace?.branch || "main"} - {runtimeLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setVercelOpen(true)} disabled={!workspace} className={cx("flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:opacity-40", p.inverseButton)}>
                <RocketLaunch size={15} /> Deploy
              </button>
              <button onClick={() => setCommitOpen(true)} disabled={loading || !workspace} className={cx("flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium disabled:opacity-40", p.inverseButton)}>
                <GitCommit size={15} /> Commit
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <section className={cx("flex w-[390px] min-w-0 shrink-0 flex-col overflow-hidden border-r", p.side)}>
              <div className="shrink-0 px-3 pt-3">
                <div className={cx("mb-3 rounded-lg border p-3 text-xs", codexReady ? "border-[#0d9f7c55] bg-[#0d9f7c0d] text-[#0d9f7c]" : p.panelSoft)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono uppercase tracking-[.14em]">runtime</span>
                    <span className="truncate">{runtimeLabel}</span>
                  </div>
                  {!codexReady && (
                    <div className={cx("mt-2 leading-5", p.muted)}>
                      Project edits require Daytona plus the Codex SDK agent. Static fallback edits are disabled.
                    </div>
                  )}
                </div>
                <div className={cx("mb-3 grid grid-cols-3 gap-2 text-xs", p.muted)}>
                  <label className={cx("col-span-2 flex h-9 items-center gap-2 rounded-md border px-2", p.input)}>
                    <SquaresFour size={15} />
                    <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none">
                      {CODE_MODELS.map((item) => <option key={item.id} value={item.id} className="bg-[#07100f] text-white">{item.label}</option>)}
                    </select>
                  </label>
                  <label className={cx("flex h-9 items-center gap-2 rounded-md border px-2", p.input)}>
                    <Sparkle size={14} />
                    <select value={selectedEffort} onChange={(event) => setSelectedEffort(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none">
                      {["low", "medium", "high"].map((item) => <option key={item} value={item} className="bg-[#07100f] text-white">{item}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <div className="min-h-0 flex-1 px-3 pb-3">
                <AssistantCodexChat
                  workspaceId={workspace?.id}
                  selectedModel={selectedModel}
                  selectedEffort={selectedEffort}
                  disabled={!codexReady}
                  agentStatus={agentStatus}
                  setAgentStatus={setAgentStatus}
                  onResult={async () => {
                    if (workspace?.id) {
                      await refreshWorkspace(workspace.id);
                      await loadRecentWorkspaces();
                    }
                  }}
                  theme={theme}
                />
                {commitJob && (
                  <div className={cx("mt-3 rounded-lg border p-3 text-sm", p.panelSoft)}>
                    <div className={cx("mb-1 font-mono text-xs uppercase tracking-[.14em]", p.faint)}>last commit</div>
                    <div className="font-mono text-xs">{commitJob.commit_sha}</div>
                    {commitJob.html_url && <a href={commitJob.html_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[#0d9f7c]">Open on GitHub</a>}
                  </div>
                )}
              </div>
            </section>

            <section className={cx("flex w-[300px] shrink-0 flex-col border-r", p.side)}>
              <div className={cx("flex h-11 items-center gap-4 border-b px-4", p.side, p.muted)}>
                <button title="Explorer" onClick={() => setFileSearchOpen(false)} className={cx("grid h-8 w-8 place-items-center rounded", !fileSearchOpen && p.active)}><Folder size={19} /></button>
                <button title="Search files" onClick={() => setFileSearchOpen((value) => !value)} className={cx("grid h-8 w-8 place-items-center rounded", fileSearchOpen && p.active)}><MagnifyingGlass size={19} /></button>
                <button title="New file" onClick={() => createWorkspacePath("file")} className={cx("grid h-8 w-8 place-items-center rounded", p.hover)}><File size={17} /></button>
                <button title="New folder" onClick={() => createWorkspacePath("folder")} className={cx("grid h-8 w-8 place-items-center rounded", p.hover)}><FolderOpen size={17} /></button>
              </div>
              <div className={cx("flex h-10 items-center justify-between border-b px-4", p.side)}>
                <span className={cx("text-xs uppercase tracking-[.08em]", p.muted)}>Project</span>
                <div className={cx("flex gap-1", p.faint)}>
                  <button title="New file" onClick={() => createWorkspacePath("file")} className={cx("grid h-7 w-7 place-items-center rounded", p.hover)}><Plus size={17} /></button>
                  <button title="More" onClick={(event) => setTreeMenu({ x: event.clientX, y: event.clientY, node: { path: "", type: "folder" } })} className={cx("grid h-7 w-7 place-items-center rounded", p.hover)}><DotsThree size={17} /></button>
                </div>
              </div>
              {fileSearchOpen && (
                <div className={cx("border-b p-3", p.side)}>
                  <div className={cx("flex h-9 items-center gap-2 rounded-md border px-2", p.input)}>
                    <MagnifyingGlass size={16} className={p.faint} />
                    <input
                      value={fileSearch}
                      onChange={(event) => searchWorkspaceFiles(event.target.value)}
                      placeholder="Search files and code"
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-44 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button key={`${result.path}-${result.line || 0}-${index}`} onClick={() => openFile(null, result.path)} className={cx("block w-full rounded px-2 py-1.5 text-left", p.hover)}>
                          <div className="truncate font-mono text-[11px] text-[#0d9f7c]">{result.path}{result.line ? `:${result.line}` : ""}</div>
                          <div className={cx("truncate text-[11px]", p.faint)}>{result.preview}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <FileTree
                tree={tree}
                selectedPath={selectedPath}
                onSelect={(path) => openFile(null, path)}
                theme={theme}
                query={fileSearchOpen ? fileSearch : ""}
                onContextMenu={(event, node) => setTreeMenu({ x: event.clientX, y: event.clientY, node })}
                changedFiles={changedFiles}
              />
              {treeMenu && (
                <div className={cx("fixed z-[80] w-44 rounded-lg border p-1 shadow-2xl", p.panel)} style={{ left: treeMenu.x, top: treeMenu.y }} onMouseLeave={() => setTreeMenu(null)}>
                  <button onClick={() => { createWorkspacePath("file", treeMenu.node.type === "folder" ? treeMenu.node.path : treeMenu.node.path.split("/").slice(0, -1).join("/")); setTreeMenu(null); }} className={cx("flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs", p.hover)}><File size={15} /> New file</button>
                  <button onClick={() => { createWorkspacePath("folder", treeMenu.node.type === "folder" ? treeMenu.node.path : treeMenu.node.path.split("/").slice(0, -1).join("/")); setTreeMenu(null); }} className={cx("flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs", p.hover)}><Folder size={15} /> New folder</button>
                  {treeMenu.node.path && <button onClick={() => { renameWorkspacePath(treeMenu.node.path); setTreeMenu(null); }} className={cx("flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs", p.hover)}><Code size={15} /> Rename</button>}
                  {treeMenu.node.path && <button onClick={() => { deleteWorkspacePath(treeMenu.node.path); setTreeMenu(null); }} className={cx("flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs text-red-300", p.hover)}><Trash size={15} /> Delete</button>}
                </div>
              )}
            </section>

            <section className="flex min-w-0 flex-1 flex-col">
              <div className={cx("flex h-11 items-center justify-between border-b px-4", p.side)}>
                <div className={cx("flex items-center gap-1 rounded-md border p-1", p.panelSoft)}>
                  {[["preview", Eye], ["editor", Code], ["logs", Terminal], ["diffs", List]].map(([view, Icon]) => (
                    <button key={view} onClick={() => handleSetRightView(view)} className={cx("grid h-8 w-9 place-items-center rounded", rightView === view && p.active)} title={view}>
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
                <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                  <button title="Install dependencies" onClick={() => runCommand(runtime?.install_command || "npm install")} className={cx("flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs", p.inverseButton)}>
                    <Terminal size={15} /> Install
                  </button>
                  <button title="Start dev server" onClick={() => runCommand(runtime?.dev_command || "npm run dev")} className={cx("flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs", p.inverseButton)}>
                    <Play size={15} /> Dev
                  </button>
                  <button title="Run tests" onClick={() => runCommand(runtime?.test_command || "npm test -- --watch=false")} className={cx("flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs", p.inverseButton)}>
                    <CheckCircle size={15} /> Test
                  </button>
                  <button title="Build project" onClick={() => runCommand(runtime?.build_command || "npm run build")} className={cx("flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs", p.inverseButton)}>
                    <Hammer size={15} /> Build
                  </button>
                </div>
              </div>

              <div className={cx("min-h-0 flex-1", p.codeBg)}>
                {rightView === "preview" ? (
                  previewLoading ? (
                    <div className="flex h-full items-center justify-center p-6">
                      <div className={cx("w-full max-w-md rounded-lg border p-5 text-center", p.panel)}>
                        <SpinnerGap size={28} className="mx-auto mb-3 animate-spin text-[#0d9f7c]" />
                        <div className="text-base font-semibold">Starting live preview</div>
                        <div className={cx("mt-2 text-sm leading-6", p.muted)}>
                          Waking the sandbox and launching the dev server. The preview will open here automatically.
                        </div>
                      </div>
                    </div>
                  ) : runtime?.preview_url ? (
                    <div className="flex h-full min-h-0 flex-col">
                      <div className={cx("flex h-10 items-center gap-2 border-b px-3 text-xs", p.side)}>
                        <span className={cx("font-mono uppercase tracking-[0.18em]", p.faint)}>
                          {runtime.framework || "preview"}:{runtime.preview_port || "auto"}
                        </span>
                        <input
                          readOnly
                          value={visiblePreviewUrl}
                          className={cx("min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs outline-none", p.input)}
                          onFocus={(event) => event.currentTarget.select()}
                        />
                        <a href={visiblePreviewUrl} target="_blank" rel="noreferrer" className={cx("grid h-7 w-8 place-items-center rounded border", p.inverseButton)} title="Open preview in new tab">
                          <ArrowSquareOut size={15} />
                        </a>
                      </div>
                      <iframe title="Live preview" src={visiblePreviewUrl} className="min-h-0 flex-1 bg-white" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" />
                    </div>
                  ) : runtime && ["preview_ready", "command_succeeded", "ready", "bridge_error"].includes(runtime.status) ? (
                    <div className="flex h-full items-center justify-center p-6">
                      <div className={cx("w-full max-w-md rounded-lg border p-5 text-center", p.panel)}>
                        <SpinnerGap size={28} className="mx-auto mb-3 animate-spin text-[#0d9f7c]" />
                        <div className="mb-2 text-lg font-semibold">Preparing live preview</div>
                        <div className={cx("text-sm leading-6", p.muted)}>
                          Arevei is waking the sandbox, installing dependencies when needed, and starting the dev server.
                        </div>
                        <button onClick={ensurePreview} className={cx("mt-5 rounded-md px-4 py-2 text-sm font-semibold", p.button)}>
                          Retry preview
                        </button>
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
                  <div className="h-full overflow-auto overflow-x-hidden p-5 [scrollbar-width:thin]">
                    <DiffList changes={changes} onOpenFile={(path) => openFile(null, path)} onOpenDiff={openDiffReview} theme={theme} />
                    <div className={cx("mt-5 rounded-lg border p-4 text-sm", p.panelSoft, p.muted)}>Knowledge: {knowledge?.memory?.summary || "not indexed"}</div>
                  </div>
                ) : diffReview ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className={cx("flex h-9 shrink-0 items-center justify-between border-b px-3", p.side)}>
                      <div className="min-w-0 truncate font-mono text-xs text-[#0d9f7c]">{diffReview.path}</div>
                      <button onClick={() => setDiffReview(null)} className={cx("grid h-7 w-7 place-items-center rounded", p.hover)} title="Close diff"><X size={14} /></button>
                    </div>
                    <DiffEditor
                      height="100%"
                      language={_languageFromPath(diffReview.path)}
                      original={diffReview.old || ""}
                      modified={diffReview.new || ""}
                      theme={theme === "dark" ? "vs-dark" : "vs-light"}
                      options={{ renderSideBySide: true, readOnly: true, minimap: { enabled: false }, wordWrap: "on", scrollBeyondLastLine: false }}
                    />
                  </div>
                ) : file ? (
                  <div className="flex h-full min-h-0 flex-col">
                    <div className={cx("flex h-9 shrink-0 items-end overflow-x-auto border-b px-1", p.side)}>
                      {openFiles.map((item) => {
                        const dirty = (fileDrafts[item.path] ?? item.content) !== item.content;
                        const active = selectedPath === item.path;
                        return (
                          <button
                            key={item.path}
                            onClick={() => openFile(null, item.path, true)}
                            className={cx(
                              "group flex h-8 max-w-[220px] shrink-0 items-center gap-2 border-r px-3 text-left font-mono text-[12px]",
                              active ? p.active : `${p.muted} ${p.hover}`,
                              p.dark ? "border-[#202020]" : "border-[#deded8]"
                            )}
                            title={item.path}
                          >
                            <span className="truncate">{item.path.split("/").pop()}</span>
                            {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d9f7c]" />}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                closeOpenFile(item.path);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  closeOpenFile(item.path);
                                }
                              }}
                              className={cx("grid h-4 w-4 shrink-0 place-items-center rounded opacity-60 hover:opacity-100", p.hover)}
                              title="Close file"
                            >
                              <X size={11} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <Editor
                      height="100%"
                      language={file.language || "plaintext"}
                      value={editorValue}
                      theme={theme === "dark" ? "vs-dark" : "vs-light"}
                      onChange={(value) => {
                        const next = value ?? "";
                        setEditorValue(next);
                        setFileDrafts((drafts) => ({ ...drafts, [selectedPath]: next }));
                      }}
                      options={{ minimap: { enabled: true }, fontSize: 14, wordWrap: "on", scrollBeyondLastLine: false }}
                    />
                  </div>
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
      {vercelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setVercelOpen(false)}>
          <div className={cx("w-full max-w-md rounded-lg border p-6 shadow-xl", p.panel)} onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className={cx("font-mono text-xs uppercase tracking-[.16em]", p.faint)}>Deployment</div>
                <h2 className="mt-1 text-lg font-semibold">Deploy to Vercel</h2>
              </div>
              <button onClick={() => setVercelOpen(false)} className={cx("rounded p-1", p.hover)}><X size={16} /></button>
            </div>
            <p className={cx("mb-6 text-sm", p.muted)}>
              Connect your personal Vercel account to authorize automated deployments directly from this workspace, or trigger an immediate manual deploy.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={connectVercel} className={cx("flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold transition disabled:opacity-60", p.button)}>
                <RocketLaunch size={16} />
                Connect Vercel Account
              </button>
              <button onClick={triggerDeploy} className={cx("flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition", p.inverseButton)}>
                Trigger Manual Deploy
              </button>
              <button onClick={() => setVercelOpen(false)} className={cx("flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition", p.inverseButton)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
