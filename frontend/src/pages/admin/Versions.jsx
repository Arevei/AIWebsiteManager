import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { ArrowCounterClockwise } from "@phosphor-icons/react";

export default function Versions() {
  const [versions, setVersions] = useState([]);
  const load = () => api.get("/versions").then((r) => setVersions(r.data));
  useEffect(() => { load(); }, []);

  const restore = async (id) => {
    try { await api.post(`/versions/${id}/restore`); toast.success("Restored"); load(); }
    catch { toast.error("Restore failed"); }
  };

  return (
    <AdminShell title="Version history" subtitle="Every change · One-click rollback">
      {versions.length === 0 ? (
        <div className="ar-card p-10 text-center text-[color:var(--ar-ink-2)] font-mono text-sm">
          No versions yet. Make a change and a snapshot will appear here.
        </div>
      ) : (
        <div className="ar-card divide-y divide-[color:var(--ar-line)]">
          {versions.map((v) => (
            <div key={v.id} className="p-5 flex items-start justify-between gap-4" data-testid="version-row">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-[color:var(--ar-ink-3)] uppercase">{new Date(v.created_at).toLocaleString()}</div>
                <div className="font-display text-lg font-bold tracking-tighter">{v.summary}</div>
              </div>
              <button onClick={() => restore(v.id)} data-testid={`restore-${v.id}`} className="border border-[color:var(--ar-ink)] px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-[color:var(--ar-surface)] inline-flex items-center gap-1">
                <ArrowCounterClockwise size={14} /> Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
