import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { ClockCounterClockwise, CreditCard, UsersThree } from "@phosphor-icons/react";

export default function Settings() {
  const [tab, setTab] = useState("history");
  const [versions, setVersions] = useState([]);
  const [team, setTeam] = useState([]);
  const [billing, setBilling] = useState(null);
  const [email, setEmail] = useState("");

  const load = () => {
    api.get("/versions").then((r) => setVersions(r.data || [])).catch(() => setVersions([]));
    api.get("/team").then((r) => setTeam(r.data || [])).catch(() => setTeam([]));
    api.get("/billing").then((r) => setBilling(r.data)).catch(() => setBilling(null));
  };

  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!email.trim()) return;
    try {
      await api.post("/team/invite", { email, role: "team_member", permission: "editor" });
      toast.success("Invite created");
      setEmail("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invite failed");
    }
  };

  const tabs = [
    { id: "history", label: "History", icon: ClockCounterClockwise },
    { id: "team", label: "Team", icon: UsersThree },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  return (
    <AdminShell title="Settings" subtitle="History, team, and billing">
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${tab === id ? "border-[color:var(--ar-accent)] bg-[color:var(--ar-soft-teal-bg)] text-[color:var(--ar-ai)]" : "border-[color:var(--ar-line)] text-[color:var(--ar-ink-2)]"}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <div className="ar-card p-5">
          <h2 className="mb-4 text-xl font-bold">Version History</h2>
          <div className="divide-y divide-[color:var(--ar-line)]">
            {versions.length === 0 ? <div className="py-8 text-sm text-[color:var(--ar-ink-2)]">No versions yet.</div> : versions.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="font-semibold">{item.summary}</div>
                  <div className="font-mono text-xs text-[color:var(--ar-ink-3)]">{item.created_at}</div>
                </div>
                <button onClick={() => api.post(`/versions/${item.id}/restore`).then(() => toast.success("Version restored"))} className="rounded-md border border-[color:var(--ar-line)] px-3 py-1.5 text-xs">Restore</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "team" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="ar-card p-5">
            <h2 className="mb-4 text-xl font-bold">Team Members</h2>
            <div className="divide-y divide-[color:var(--ar-line)]">
              {team.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold">{member.name || member.email}</div>
                    <div className="text-sm text-[color:var(--ar-ink-2)]">{member.email}</div>
                  </div>
                  <span className="font-mono text-xs uppercase text-[color:var(--ar-ink-3)]">{member.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ar-card p-5">
            <h2 className="mb-4 text-xl font-bold">Invite</h2>
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="input" placeholder="teammate@example.com" />
            <button onClick={invite} className="btn-primary mt-3 h-10 w-full">Create Invite</button>
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Plan", billing?.tenant?.plan_tier || "Self-serve"],
            ["Billing status", billing?.tenant?.billing_status || "Active"],
            ["Monthly", `$${billing?.tenant?.monthly_revenue || 0}`],
          ].map(([label, value]) => (
            <div key={label} className="ar-card p-5">
              <div className="eyebrow mb-2">{label}</div>
              <div className="text-3xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
