import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { Link } from "react-router-dom";
import { Robot, ChartLine, Eye, Lightning } from "@phosphor-icons/react";
import WelcomeAgent from "../../components/WelcomeAgent";

export default function Dashboard() {
  const [site, setSite] = useState(null);
  const [logs, setLogs] = useState([]);
  const [billing, setBilling] = useState(null);

  useEffect(() => {
    api.get("/site").then(async (r) => {
      try {
        const s = await api.get("/seo");
        setSite({ ...r.data, seo_score: s.data.seo_score, aeo_coverage: s.data.aeo_coverage, geo_readiness: s.data.geo_readiness });
      } catch { setSite(r.data); }
    });
    api.get("/ai/logs").then((r) => setLogs(r.data));
    api.get("/billing").then((r) => setBilling(r.data));
  }, []);

  const stats = [
    { label: "SEO score", value: site?.seo_score ?? "—", sub: `Computed · ${site?.pages?.length || 0} page(s)` },
    { label: "AEO coverage", value: `${site?.aeo_coverage ?? site?.seo?.aeo_coverage ?? "—"}%`, sub: "FAQ + schema" },
    { label: "GEO readiness", value: `${site?.geo_readiness ?? site?.seo?.geo_readiness ?? "—"}%`, sub: "Citable content" },
    { label: "AI cost (mo)", value: `$${(billing?.tenant?.ai_cost_usd ?? 0).toFixed(4)}`, sub: `${billing?.tenant?.ai_tokens_used?.toLocaleString() || 0} tokens` },
  ];

  return (
    <AdminShell
      title="Site overview"
      subtitle={site ? `Site · ${site.slug}` : "Loading…"}
      actions={
        <>
          {site && (
            <a
              href={`/s/${site.slug}`}
              target="_blank"
              rel="noreferrer"
              data-testid="view-live-site"
              className="border border-[color:var(--ar-ink)] px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-[color:var(--ar-surface)] inline-flex items-center gap-2"
            >
              <Eye size={14} /> View live site
            </a>
          )}
          <Link
            to="/admin/ai"
            data-testid="open-ai-studio"
            className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black inline-flex items-center gap-2"
          >
            <Robot size={14} /> AI Studio
          </Link>
        </>
      }
    >
      <WelcomeAgent />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--ar-line)] border border-[color:var(--ar-line)] mb-8" data-testid="dashboard-stats">        {stats.map((s) => (
          <div key={s.label} className="bg-white p-6">
            <div className="eyebrow mb-3">{s.label}</div>
            <div className="font-display text-4xl font-black tracking-tighter">{s.value}</div>
            <div className="text-xs text-[color:var(--ar-ink-3)] mt-1 font-mono">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 ar-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="eyebrow">Recent AI actions</div>
              <h3 className="font-display text-2xl font-bold tracking-tighter mt-1">What the AI did</h3>
            </div>
            <ChartLine size={20} className="text-[color:var(--ar-ink-3)]" />
          </div>
          {logs.length === 0 ? (
            <div className="text-sm text-[color:var(--ar-ink-2)] py-8 text-center font-mono">
              No AI actions yet — head to <Link to="/admin/ai" className="underline">AI Studio</Link>.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--ar-line)]">
              {logs.slice(0, 6).map((l) => (
                <li key={l.id} className="py-3 flex items-start justify-between gap-4" data-testid="log-row">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-[color:var(--ar-ink-3)] uppercase">{l.action_type} · {l.status}</div>
                    <div className="text-sm truncate">{l.prompt}</div>
                  </div>
                  <div className="font-mono text-xs text-[color:var(--ar-ink-3)] whitespace-nowrap">{l.tokens_used} tok</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ar-card p-6">
          <div className="eyebrow mb-3">Plan</div>
          <div className="font-display text-2xl font-bold tracking-tighter">
            {billing?.tenant?.plan_tier === "managed" ? "Managed" : "Self-serve"}
          </div>
          <div className="font-mono text-xs text-[color:var(--ar-ink-3)] mt-1 uppercase">{billing?.tenant?.billing_status}</div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[color:var(--ar-ink-2)]">Setup fee</span><span>{billing?.tenant?.setup_fee_paid ? "Paid" : "Pending"}</span></div>
            <div className="flex justify-between"><span className="text-[color:var(--ar-ink-2)]">Monthly</span><span>${billing?.tenant?.monthly_revenue || 0}</span></div>
            <div className="flex justify-between"><span className="text-[color:var(--ar-ink-2)]">AI cost (mo)</span><span>${(billing?.tenant?.ai_cost_usd || 0).toFixed(4)}</span></div>
          </div>
          <Link to="/admin/billing" className="mt-6 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider border border-[color:var(--ar-ink)] px-3 py-2">
            <Lightning size={12} /> Manage
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
