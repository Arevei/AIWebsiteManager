import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function SuperAdmin() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = () => api.get("/admin/overview").then((r) => setData(r.data));
  useEffect(() => { load(); }, []);

  const openDetail = async (t) => {
    setSelected(t.id);
    const r = await api.get(`/admin/tenants/${t.id}`);
    setDetail(r.data);
  };

  const toggleStatus = async (t, status) => {
    try {
      await api.patch(`/admin/tenants/${t.id}`, { billing_status: status });
      toast.success(`${t.name} → ${status}`);
      load();
      if (selected === t.id) openDetail(t);
    } catch { toast.error("Update failed"); }
  };

  if (!data) return <div className="p-8 font-mono">Loading…</div>;

  const stats = [
    { l: "Total clients", v: data.total_clients },
    { l: "MRR", v: `$${data.mrr.toLocaleString()}` },
    { l: "Active", v: data.active },
    { l: "Trial", v: data.trial },
    { l: "AI tokens", v: data.ai_tokens.toLocaleString() },
    { l: "AI cost", v: `$${data.ai_cost_usd.toFixed(4)}` },
  ];

  return (
    <div className="min-h-screen bg-white text-[color:var(--ar-ink)]" data-testid="super-admin">
      <header className="border-b border-[color:var(--ar-line)] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-2xl font-black tracking-tighter">AREVEI<span className="text-[color:var(--ar-ai)]">.</span></Link>
          <span className="font-mono text-xs uppercase tracking-[0.2em] bg-[color:var(--ar-ink)] text-white px-3 py-1">Super Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[color:var(--ar-ink-2)]">{user?.email}</span>
          <button onClick={logout} data-testid="super-logout" className="border border-[color:var(--ar-line)] font-mono text-xs uppercase tracking-wider px-3 py-2 hover:bg-[color:var(--ar-surface)]">Sign out</button>
        </div>
      </header>

      <div className="px-6 py-8 border-b border-[color:var(--ar-line)] bg-[color:var(--ar-surface)]">
        <div className="eyebrow mb-2">Control tower</div>
        <h1 className="font-display text-4xl font-black tracking-tighter">All tenants</h1>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-[color:var(--ar-line)] border border-[color:var(--ar-line)] mb-8">
          {stats.map((s) => (
            <div key={s.l} className="bg-white p-5" data-testid={`super-stat-${s.l.replace(/\s+/g,"-").toLowerCase()}`}>
              <div className="eyebrow mb-2">{s.l}</div>
              <div className="font-display text-2xl font-black tracking-tighter">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 ar-card overflow-hidden">
            <div className="px-5 py-3 border-b border-[color:var(--ar-line)] eyebrow">Tenants</div>
            <table className="w-full">
              <thead className="font-mono text-xs uppercase text-[color:var(--ar-ink-3)]">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Plan</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">MRR</th>
                  <th className="text-right p-3">AI cost</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.tenants.map((t) => (
                  <tr key={t.id} className={`border-t border-[color:var(--ar-line)] cursor-pointer ${selected === t.id ? "bg-[color:var(--ar-surface)]" : ""}`} onClick={() => openDetail(t)} data-testid={`tenant-${t.id}`}>
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 font-mono text-xs uppercase">{t.plan_tier}</td>
                    <td className="p-3 font-mono text-xs uppercase">{t.billing_status}</td>
                    <td className="p-3 text-right font-mono">${t.monthly_revenue || 0}</td>
                    <td className="p-3 text-right font-mono">${(t.ai_cost_usd || 0).toFixed(4)}</td>
                    <td className="p-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); toggleStatus(t, t.billing_status === "suspended" ? "active" : "suspended"); }} className="border border-[color:var(--ar-line)] font-mono text-[10px] uppercase px-2 py-1 hover:bg-white">
                        {t.billing_status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-2 ar-card p-5" data-testid="tenant-detail">
            {!detail ? (
              <div className="text-sm text-[color:var(--ar-ink-3)] font-mono text-center py-10">
                Select a tenant to inspect.
              </div>
            ) : (
              <div>
                <div className="eyebrow mb-1">Tenant</div>
                <div className="font-display text-2xl font-bold tracking-tighter">{detail.tenant.name}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><div className="eyebrow text-[10px] mb-1">Plan</div>{detail.tenant.plan_tier}</div>
                  <div><div className="eyebrow text-[10px] mb-1">Status</div>{detail.tenant.billing_status}</div>
                  <div><div className="eyebrow text-[10px] mb-1">Setup fee</div>{detail.tenant.setup_fee_paid ? "Paid" : "Unpaid"}</div>
                  <div><div className="eyebrow text-[10px] mb-1">MRR</div>${detail.tenant.monthly_revenue || 0}</div>
                </div>

                <div className="mt-6">
                  <div className="eyebrow mb-2">Users ({detail.users.length})</div>
                  <ul className="text-sm space-y-1">
                    {detail.users.map((u) => <li key={u.id} className="font-mono text-xs flex justify-between"><span>{u.email}</span><span className="text-[color:var(--ar-ink-3)]">{u.role}</span></li>)}
                  </ul>
                </div>

                <div className="mt-6">
                  <div className="eyebrow mb-2">Recent AI actions</div>
                  <ul className="text-xs space-y-2">
                    {detail.ai_logs.slice(0, 5).map((l) => (
                      <li key={l.id} className="border-l-2 border-[color:var(--ar-ai)] pl-2">
                        <div className="font-mono text-[10px] text-[color:var(--ar-ink-3)] uppercase">{l.status} · {l.tokens_used} tok</div>
                        <div className="truncate">{l.prompt}</div>
                      </li>
                    ))}
                    {detail.ai_logs.length === 0 && <li className="text-[color:var(--ar-ink-3)] font-mono">none</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
