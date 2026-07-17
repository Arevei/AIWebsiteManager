import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function Team() {
  const [team, setTeam] = useState([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("editor");

  const load = () => api.get("/team").then((r) => setTeam(r.data));
  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/team/invite", { email, permission, role: "team_member" });
      toast.success(`Invited · temp password: ${r.data.temp_password}`);
      setEmail("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invite failed");
    }
  };

  return (
    <AdminShell title="Team" subtitle="Members & permissions">
      <form onSubmit={invite} className="ar-card p-5 mb-6 flex flex-wrap gap-3 items-end" data-testid="invite-form">
        <label className="flex-1 min-w-[200px]">
          <span className="eyebrow block mb-1">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required data-testid="invite-email" className="w-full border-b-2 border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none py-2" />
        </label>
        <label className="min-w-[160px]">
          <span className="eyebrow block mb-1">Permission</span>
          <select value={permission} onChange={(e) => setPermission(e.target.value)} data-testid="invite-permission" className="w-full border border-[color:var(--ar-line)] p-2 font-mono text-sm">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button data-testid="invite-submit" className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black">Invite</button>
      </form>

      <div className="ar-card divide-y divide-[color:var(--ar-line)]">
        {team.map((m) => (
          <div key={m.id} className="p-5 flex items-center justify-between" data-testid="team-row">
            <div>
              <div className="font-display font-bold tracking-tighter">{m.name}</div>
              <div className="font-mono text-xs text-[color:var(--ar-ink-3)]">{m.email}</div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider">
              <span className="border border-[color:var(--ar-line)] px-2 py-1">{m.role}</span>
              {m.permission && <span className="border border-[color:var(--ar-line)] px-2 py-1">{m.permission}</span>}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
