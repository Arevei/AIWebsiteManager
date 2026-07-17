import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { X, CheckCircle, Circle, Sparkle, ArrowRight } from "@phosphor-icons/react";

const SESSION_KEY = "arevei_welcome_dismissed";

export default function WelcomeAgent() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    api.get("/agent/welcome").then((r) => setData(r.data)).catch(() => {});
    if (sessionStorage.getItem(SESSION_KEY)) setOpen(false);
  }, []);

  const dismiss = () => {
    setOpen(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  };

  if (!data || !open) return null;
  const allDone = data.done_count === data.total;

  return (
    <div className="ar-card border-2 border-[color:var(--ar-ink)] mb-6 relative" data-testid="welcome-agent">
      <button onClick={dismiss} data-testid="welcome-dismiss" className="absolute top-3 right-3 text-[color:var(--ar-ink-3)] hover:text-[color:var(--ar-ink)]">
        <X size={18} />
      </button>
      <div className="p-6 md:p-7">
        <div className="flex items-center gap-2 mb-2">
          <Sparkle size={14} weight="fill" className="text-[color:var(--ar-ai)]" />
          <span className="eyebrow">AI Website Manager</span>
        </div>
        <div className="font-display text-2xl md:text-3xl font-black tracking-tighter mb-2" data-testid="welcome-headline">
          {data.headline}
        </div>
        <div className="text-[color:var(--ar-ink-2)] mb-5">{data.body}</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
          {data.checklist.map((c) => (
            <Link
              to={c.cta}
              key={c.id}
              data-testid={`welcome-step-${c.id}`}
              className={`flex items-center gap-3 p-3 border ${c.done ? "border-[color:var(--ar-line)] bg-[color:var(--ar-surface)] text-[color:var(--ar-ink-2)]" : "border-[color:var(--ar-ink)] hover:bg-[color:var(--ar-surface)]"}`}
            >
              {c.done
                ? <CheckCircle size={18} weight="fill" className="text-[color:var(--ar-success)] flex-shrink-0" />
                : <Circle size={18} className="text-[color:var(--ar-ink)] flex-shrink-0" />}
              <span className={`flex-1 text-sm ${c.done ? "line-through" : ""}`}>{c.label}</span>
              {!c.done && <ArrowRight size={14} />}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
          <div className="border border-[color:var(--ar-line)] p-2"><div className="text-[color:var(--ar-ink-3)] uppercase">Tasks done</div><div className="text-base font-bold">{data.stats.tasks_done}</div></div>
          <div className="border border-[color:var(--ar-line)] p-2"><div className="text-[color:var(--ar-ink-3)] uppercase">Pending</div><div className="text-base font-bold">{data.stats.tasks_pending}</div></div>
          <div className="border border-[color:var(--ar-line)] p-2"><div className="text-[color:var(--ar-ink-3)] uppercase">Awaiting approval</div><div className="text-base font-bold">{data.stats.actions_pending}</div></div>
          <div className="border border-[color:var(--ar-line)] p-2"><div className="text-[color:var(--ar-ink-3)] uppercase">Integrations</div><div className="text-base font-bold">{data.stats.connected_integrations}/6</div></div>
        </div>

        {!allDone && (
          <div className="mt-5">
            <Link to="/admin/agent" data-testid="welcome-cta" className="inline-flex items-center gap-2 bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black">
              Continue setup <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
