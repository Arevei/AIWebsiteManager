import React, { useEffect, useRef, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { PaperPlaneRight, CheckCircle, XCircle, Sparkle, Microphone, Stop } from "@phosphor-icons/react";
import { useVoice } from "../../lib/useVoice";

const SUGGESTIONS = [
  "Change the hero color to deep teal",
  "Rewrite the headline to be more bold and direct",
  "Add a blog post titled 'Why founders ship faster with AREVEI'",
  "Improve our meta description for SEO",
];

function DiffList({ changes }) {
  if (!changes?.length) return <div className="text-sm font-mono text-[color:var(--ar-ink-3)]">No structural changes.</div>;
  return (
    <ul className="space-y-2 font-mono text-xs">
      {changes.map((c, i) => (
        <li key={i} className="border border-[color:var(--ar-line)] p-3 bg-white">
          <div className="text-[color:var(--ar-ink-3)] uppercase tracking-wider">{c.path}</div>
          <div className="mt-1 break-all"><span className="text-[color:var(--ar-ink-3)]">old:</span> {JSON.stringify(c.old)}</div>
          <div className="break-all"><span className="text-[color:var(--ar-ai)]">new:</span> {JSON.stringify(c.new)}</div>
        </li>
      ))}
    </ul>
  );
}

export default function AIStudio() {
  const [site, setSite] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(null); // {log_id, changes, preview}
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const voice = useVoice({ onTranscript: (t) => send(t) });

  useEffect(() => { api.get("/site").then((r) => setSite(r.data)); }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, pending]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || !site) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const r = await api.post("/ai/chat", { site_id: site.id, message: msg });
      setMessages((m) => [...m, { role: "ai", text: r.data.assistant_message }]);
      if (r.data.proposed_changes?.length > 0) {
        setPending({
          log_id: r.data.log_id,
          changes: r.data.proposed_changes,
          preview: r.data.preview_site,
        });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "AI request failed");
      setMessages((m) => [...m, { role: "ai", text: "Sorry — something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  const apply = async (accept) => {
    if (!pending) return;
    try {
      await api.post("/ai/apply", { log_id: pending.log_id, accept });
      toast.success(accept ? "Changes published" : "Changes rejected");
      if (accept && pending.preview) setSite(pending.preview);
      setPending(null);
    } catch (e) {
      toast.error("Failed to apply");
    }
  };

  return (
    <AdminShell
      title="AI Studio"
      subtitle="Claude Sonnet 4.6 · Structured tools"
      actions={null}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-260px)] min-h-[520px]">
        {/* Chat panel */}
        <div className="ar-card flex flex-col" data-testid="ai-chat">
          <div className="border-b border-[color:var(--ar-line)] px-5 py-3 flex items-center justify-between">
            <div className="eyebrow">Conversation</div>
            <div className="font-mono text-xs text-[color:var(--ar-ink-3)] flex items-center gap-1"><Sparkle size={12} weight="fill" className="text-[color:var(--ar-ai)]" /> claude-sonnet-4-6</div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[color:var(--ar-surface)]">
            {messages.length === 0 && (
              <div>
                <div className="eyebrow mb-3">Try one of these</div>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      data-testid={`suggestion-${s.slice(0,12).replace(/\s/g,"-").toLowerCase()}`}
                      className="text-left border border-[color:var(--ar-line)] bg-white p-3 font-mono text-xs hover:border-[color:var(--ar-ink)]"
                    >
                      › {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] bg-white border border-[color:var(--ar-line)] p-3 text-sm" data-testid="msg-user">{m.text}</div>
              ) : (
                <div key={i} className="max-w-[90%] font-mono text-sm text-[color:var(--ar-ink-2)] p-3" data-testid="msg-ai">{m.text}</div>
              )
            )}
            {loading && (
              <div className="font-mono text-sm text-[color:var(--ar-ink-2)] p-3">thinking<span className="ar-cursor" /></div>
            )}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="border-t border-[color:var(--ar-line)] p-4 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell AREVEI what to change…"
              data-testid="ai-input"
              className="flex-1 border-2 border-[color:var(--ar-ink)] px-3 py-2 font-mono text-sm focus:outline-none"
            />
            {voice.supported && (
              <button
                type="button"
                onClick={voice.listening ? voice.stopListening : voice.startListening}
                data-testid="ai-mic"
                title={voice.listening ? "Stop" : "Speak"}
                className={`px-3 py-2 ${voice.listening ? "bg-[color:var(--ar-ai)] animate-pulse" : "border-2 border-[color:var(--ar-ink)] hover:bg-[color:var(--ar-surface)]"}`}
              >
                {voice.listening ? <Stop size={16} color="white" weight="fill" /> : <Microphone size={16} />}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              data-testid="ai-send"
              className="bg-[color:var(--ar-accent)] hover:bg-[color:var(--ar-accent-hover)] text-white px-4 py-2 disabled:opacity-60"
            >
              <PaperPlaneRight size={16} />
            </button>
          </form>
        </div>

        {/* Preview / diff panel */}
        <div className="ar-card flex flex-col" data-testid="ai-preview-panel">
          <div className="border-b border-[color:var(--ar-line)] px-5 py-3 flex items-center justify-between">
            <div className="eyebrow">Proposed changes</div>
            {pending && (
              <div className="flex gap-2">
                <button onClick={() => apply(false)} data-testid="ai-reject" className="border border-[color:var(--ar-line)] px-3 py-1.5 font-mono text-xs uppercase inline-flex items-center gap-1 hover:bg-[color:var(--ar-surface)]"><XCircle size={14} /> Reject</button>
                <button onClick={() => apply(true)} data-testid="ai-accept" className="bg-[color:var(--ar-ink)] text-white px-3 py-1.5 font-mono text-xs uppercase inline-flex items-center gap-1 hover:bg-black"><CheckCircle size={14} weight="fill" /> Accept & publish</button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {!pending ? (
              <div className="h-full flex flex-col items-center justify-center text-[color:var(--ar-ink-3)] font-mono text-sm text-center">
                <Sparkle size={32} weight="duotone" className="mb-3" />
                Changes proposed by the AI will appear here for your review.
              </div>
            ) : (
              <div className="space-y-6">
                <DiffList changes={pending.changes} />
                <div>
                  <div className="eyebrow mb-2">Preview snapshot</div>
                  <div className="ar-card-soft p-4 max-h-72 overflow-y-auto">
                    <pre className="font-mono text-[11px] text-[color:var(--ar-ink-2)] whitespace-pre-wrap">
{JSON.stringify(pending.preview?.theme_config, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
