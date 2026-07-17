import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { useVoice } from "../../lib/useVoice";
import { toast } from "sonner";
import { Microphone, Stop, SpeakerHigh, SpeakerSlash, CheckCircle, XCircle } from "@phosphor-icons/react";

export default function Talk() {
  const [site, setSite] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [transcript, setTranscript] = useState("");

  const handleTranscript = (text) => { setTranscript(text); ask(text); };
  const voice = useVoice({ onTranscript: handleTranscript });

  useEffect(() => { api.get("/site").then((r) => setSite(r.data)); }, []);
  // greet once
  useEffect(() => {
    if (site && messages.length === 0 && voice.supported && autoSpeak) {
      const g = "Hi, I'm your AI website manager. Tap the mic and tell me what to change.";
      setMessages([{ role: "ai", text: g }]);
      voice.speak(g);
    }
    // eslint-disable-next-line
  }, [site]);

  const ask = async (text) => {
    if (!site || !text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const r = await api.post("/ai/chat", { site_id: site.id, message: text });
      const reply = r.data.assistant_message || "Done.";
      setMessages((m) => [...m, { role: "ai", text: reply }]);
      if (autoSpeak) voice.speak(reply);
      if (r.data.proposed_changes?.length > 0) {
        setPending({ log_id: r.data.log_id, changes: r.data.proposed_changes, preview: r.data.preview_site });
      }
    } catch (e) {
      toast.error("AI request failed");
    } finally { setLoading(false); setTranscript(""); }
  };

  const apply = async (accept) => {
    if (!pending) return;
    await api.post("/ai/apply", { log_id: pending.log_id, accept });
    toast.success(accept ? "Published" : "Rejected");
    if (accept) {
      const msg = "Published. What else?";
      setMessages((m) => [...m, { role: "ai", text: msg }]);
      if (autoSpeak) voice.speak(msg);
    }
    setPending(null);
  };

  return (
    <AdminShell
      title="Talk to your AI Manager"
      subtitle="Web Speech API · Voice in + voice out"
      actions={
        <button onClick={() => setAutoSpeak((v) => !v)} data-testid="autospeak-toggle" className="border border-[color:var(--ar-line)] px-3 py-2 font-mono text-xs uppercase tracking-wider inline-flex items-center gap-1">
          {autoSpeak ? <SpeakerHigh size={14} /> : <SpeakerSlash size={14} />} {autoSpeak ? "Voice on" : "Voice off"}
        </button>
      }
    >
      {!voice.supported && (
        <div className="ar-card p-4 mb-6 bg-[color:var(--ar-surface)]">
          <div className="eyebrow text-[color:var(--ar-ai)] mb-1">Browser not supported</div>
          Your browser doesn't support Web Speech API. Use Chrome, Edge, or Safari for voice. Text chat still works in <a href="/admin/ai" className="underline">AI Studio</a>.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Big mic */}
        <div className="ar-card p-8 flex flex-col items-center justify-center text-center min-h-[420px]" data-testid="voice-panel">
          <button
            disabled={!voice.supported || loading}
            onClick={voice.listening ? voice.stopListening : voice.startListening}
            data-testid="mic-button"
            className={`w-40 h-40 rounded-full flex items-center justify-center transition-all ${voice.listening ? "bg-[color:var(--ar-ai)] animate-pulse" : "bg-[color:var(--ar-ink)] hover:bg-black"} disabled:opacity-40`}
          >
            {voice.listening ? <Stop size={56} weight="fill" color="white" /> : <Microphone size={56} weight="fill" color="white" />}
          </button>
          <div className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--ar-ink-3)]">
            {voice.listening ? "Listening…" : loading ? "Thinking…" : voice.speaking ? "Speaking…" : "Tap to speak"}
          </div>
          {transcript && <div className="mt-3 text-sm text-[color:var(--ar-ink-2)] italic">"{transcript}"</div>}
          {voice.speaking && (
            <button onClick={voice.stopSpeaking} data-testid="stop-speaking" className="mt-4 font-mono text-xs uppercase border border-[color:var(--ar-line)] px-3 py-1">Stop speaking</button>
          )}
        </div>

        {/* Transcript */}
        <div className="ar-card lg:col-span-2 flex flex-col min-h-[420px]" data-testid="talk-transcript">
          <div className="border-b border-[color:var(--ar-line)] px-5 py-3 eyebrow">Conversation</div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[color:var(--ar-surface)]">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[80%] bg-white border border-[color:var(--ar-line)] p-3 text-sm" data-testid="msg-user">{m.text}</div>
              ) : (
                <div key={i} className="max-w-[90%] font-mono text-sm p-3" data-testid="msg-ai">{m.text}</div>
              )
            )}
          </div>
          {pending && (
            <div className="border-t border-[color:var(--ar-line)] p-4 bg-white flex items-center justify-between gap-2">
              <div className="text-sm font-mono text-[color:var(--ar-ink-2)]">{pending.changes.length} change(s) proposed</div>
              <div className="flex gap-2">
                <button onClick={() => apply(false)} data-testid="voice-reject" className="border border-[color:var(--ar-line)] px-3 py-1.5 font-mono text-xs uppercase inline-flex items-center gap-1"><XCircle size={12} /> Reject</button>
                <button onClick={() => apply(true)} data-testid="voice-accept" className="bg-[color:var(--ar-ink)] text-white px-3 py-1.5 font-mono text-xs uppercase inline-flex items-center gap-1"><CheckCircle size={12} weight="fill" /> Publish</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
