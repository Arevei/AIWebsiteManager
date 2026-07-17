import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";

export default function Billing() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/billing").then((r) => setData(r.data)); }, []);

  if (!data) return <AdminShell title="Billing" subtitle="Plan & invoices"><div>Loading…</div></AdminShell>;
  const { tenant, records } = data;

  return (
    <AdminShell title="Billing" subtitle="Plan & invoices">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="ar-card p-6 lg:col-span-2">
          <div className="eyebrow mb-2">Current plan</div>
          <div className="font-display text-4xl font-black tracking-tighter">
            {tenant?.plan_tier === "managed" ? "Managed" : "Self-serve"}
          </div>
          <div className="font-mono text-xs text-[color:var(--ar-ink-3)] uppercase mt-1">status: {tenant?.billing_status}</div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><div className="eyebrow text-[10px] mb-1">Setup fee</div>{tenant?.setup_fee_paid ? "Paid" : "Pending"}</div>
            <div><div className="eyebrow text-[10px] mb-1">Monthly</div>${tenant?.monthly_revenue || 0}</div>
            <div><div className="eyebrow text-[10px] mb-1">AI tokens used</div>{tenant?.ai_tokens_used?.toLocaleString() || 0}</div>
          </div>
          <div className="mt-6">
            <button data-testid="upgrade-btn" className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black">
              Upgrade to Managed
            </button>
            <span className="ml-3 text-xs font-mono text-[color:var(--ar-ink-3)]">Stripe integration coming soon</span>
          </div>
        </div>
        <div className="ar-card p-6">
          <div className="eyebrow mb-3">Fair-use cap</div>
          <div className="font-display text-3xl font-black tracking-tighter">{tenant?.ai_tokens_used?.toLocaleString() || 0}<span className="text-base text-[color:var(--ar-ink-3)] font-mono"> / 500,000</span></div>
          <div className="h-2 bg-[color:var(--ar-surface)] mt-3">
            <div className="h-2 bg-[color:var(--ar-ink)]" style={{ width: `${Math.min(100, (tenant?.ai_tokens_used || 0) / 5000)}%` }} />
          </div>
        </div>
      </div>

      <div className="ar-card">
        <div className="px-5 py-3 border-b border-[color:var(--ar-line)] eyebrow">Invoice history</div>
        <table className="w-full" data-testid="billing-table">
          <thead className="font-mono text-xs uppercase text-[color:var(--ar-ink-3)]">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-right p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-[color:var(--ar-ink-3)] font-mono text-sm">No invoices yet.</td></tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="border-t border-[color:var(--ar-line)]">
                <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-3 font-mono text-xs uppercase">{r.type}</td>
                <td className="p-3 text-sm">{r.description}</td>
                <td className="p-3 text-right font-mono">${r.amount}</td>
                <td className="p-3 text-right font-mono text-xs uppercase">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
