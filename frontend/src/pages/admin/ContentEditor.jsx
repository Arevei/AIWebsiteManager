import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { toast } from "sonner";

export default function ContentEditor() {
  const [site, setSite] = useState(null);
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/site").then((r) => setSite(r.data)); }, []);

  const updateField = (sIdx, path, value) => {
    setSite((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const sec = next.pages[active].sections[sIdx];
      const parts = path.split(".");
      let cur = sec.content;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        cur = /^\d+$/.test(p) ? cur[parseInt(p)] : cur[p];
      }
      const last = parts[parts.length - 1];
      if (/^\d+$/.test(last)) cur[parseInt(last)] = value; else cur[last] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/site", { pages: site.pages });
      toast.success("Saved");
    } catch (e) { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  if (!site) return <AdminShell title="Content" subtitle="Pages & sections"><div>Loading…</div></AdminShell>;

  const page = site.pages[active];

  return (
    <AdminShell
      title="Content"
      subtitle="Pages & sections"
      actions={
        <button onClick={save} disabled={saving} data-testid="content-save" className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      <div className="flex gap-2 flex-wrap mb-6 border-b border-[color:var(--ar-line)] pb-3">
        {site.pages.map((p, i) => (
          <button
            key={p.slug}
            onClick={() => setActive(i)}
            data-testid={`page-tab-${p.slug}`}
            className={`px-3 py-2 font-mono text-xs uppercase tracking-wider border ${i === active ? "border-[color:var(--ar-ink)] bg-[color:var(--ar-ink)] text-white" : "border-[color:var(--ar-line)] hover:bg-[color:var(--ar-surface)]"}`}
          >
            /{p.slug}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {page.sections.map((sec, idx) => (
          <div key={sec.id} className="ar-card p-5" data-testid={`section-${sec.id}`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="eyebrow">Section</div>
                <div className="font-display text-xl font-bold tracking-tighter">{sec.id}</div>
              </div>
              <div className="font-mono text-xs text-[color:var(--ar-ink-3)] uppercase">type: {sec.type}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(sec.content).map(([k, v]) => {
                if (typeof v === "string") {
                  const isLong = v.length > 80 || k.includes("body") || k.includes("sub");
                  return (
                    <label key={k} className={isLong ? "md:col-span-2 block" : "block"}>
                      <span className="eyebrow block mb-1">{k}</span>
                      {isLong ? (
                        <textarea
                          rows={3}
                          value={v}
                          onChange={(e) => updateField(idx, k, e.target.value)}
                          data-testid={`field-${sec.id}-${k}`}
                          className="w-full border border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none p-2 font-mono text-sm"
                        />
                      ) : (
                        <input
                          value={v}
                          onChange={(e) => updateField(idx, k, e.target.value)}
                          data-testid={`field-${sec.id}-${k}`}
                          className="w-full border-b-2 border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none py-2 font-mono text-sm"
                        />
                      )}
                    </label>
                  );
                }
                if (Array.isArray(v)) {
                  return (
                    <div key={k} className="md:col-span-2">
                      <div className="eyebrow mb-2">{k} ({v.length})</div>
                      <div className="space-y-2">
                        {v.map((item, i) => (
                          <div key={i} className="ar-card-soft p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(item).map(([ik, iv]) => (
                              <input
                                key={ik}
                                value={iv}
                                onChange={(e) => updateField(idx, `${k}.${i}.${ik}`, e.target.value)}
                                placeholder={ik}
                                className="border-b border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none py-1 font-mono text-xs bg-transparent"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
