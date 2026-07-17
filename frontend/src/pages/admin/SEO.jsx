import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function SEO() {
  const [seo, setSeo] = useState(null);

  useEffect(() => { api.get("/seo").then((r) => setSeo(r.data)); }, []);

  const save = async () => {
    try { await api.put("/seo", seo); toast.success("SEO updated"); }
    catch { toast.error("Update failed"); }
  };

  if (!seo) return <AdminShell title="SEO / AEO / GEO" subtitle="Loading"><div>Loading…</div></AdminShell>;

  return (
    <AdminShell
      title="SEO / AEO / GEO"
      subtitle="Ranking, schema, citability"
      actions={<button onClick={save} data-testid="seo-save" className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black">Save</button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--ar-line)] border border-[color:var(--ar-line)] mb-6">
        {[
          ["SEO Score", "93", "Indexable + meta complete"],
          ["AEO Coverage", `${seo.aeo_coverage}%`, "FAQ + answer blocks"],
          ["GEO Readiness", `${seo.geo_readiness}%`, "Citable structured content"],
        ].map(([l, v, s]) => (
          <div key={l} className="bg-white p-6" data-testid={`seo-stat-${l.replace(/\s+/g,"-").toLowerCase()}`}>
            <div className="eyebrow mb-2">{l}</div>
            <div className="font-display text-4xl font-black tracking-tighter">{v}</div>
            <div className="text-xs font-mono text-[color:var(--ar-ink-3)] mt-1">{s}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ar-card p-5">
          <div className="eyebrow mb-4">Meta tags</div>
          <label className="block mb-4">
            <span className="eyebrow text-[10px] mb-1 block">Meta title</span>
            <input value={seo.meta_title || ""} onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })} data-testid="meta-title" className="w-full border-b-2 border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none py-2 font-mono text-sm" />
          </label>
          <label className="block mb-4">
            <span className="eyebrow text-[10px] mb-1 block">Meta description</span>
            <textarea rows={3} value={seo.meta_description || ""} onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })} data-testid="meta-description" className="w-full border border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none p-2 font-mono text-sm" />
          </label>
          <label className="block">
            <span className="eyebrow text-[10px] mb-1 block">Keywords (comma-separated)</span>
            <input value={(seo.keywords || []).join(", ")} onChange={(e) => setSeo({ ...seo, keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} data-testid="meta-keywords" className="w-full border-b-2 border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none py-2 font-mono text-sm" />
          </label>
        </div>

        <div className="ar-card p-5">
          <div className="eyebrow mb-4">Schema markup status</div>
          <ul className="space-y-3">
            {Object.entries(seo.schema_status || {}).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between border-b border-[color:var(--ar-line)] pb-2">
                <span className="font-mono text-sm uppercase tracking-wider">{k}</span>
                <span className={`font-mono text-xs px-2 py-1 ${v ? "bg-[color:var(--ar-success)] text-white" : "bg-[color:var(--ar-surface)] text-[color:var(--ar-ink-2)]"}`}>{v ? "OK" : "MISSING"}</span>
              </li>
            ))}
          </ul>

          <div className="eyebrow mt-6 mb-3">AI suggestions</div>
          <ul className="space-y-2 text-sm">
            {(seo.suggestions || []).map((s, i) => (
              <li key={i} className="flex gap-2 text-[color:var(--ar-ink-2)]"><span className="text-[color:var(--ar-ai)]">›</span> {s}</li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
