import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { toast } from "sonner";

const HEADING_FONTS = ["Cabinet Grotesk", "Satoshi", "JetBrains Mono", "Georgia"];
const BODY_FONTS = ["Satoshi", "Cabinet Grotesk", "Georgia"];
const SCALES = ["sm", "md", "lg"];
const HERO_VARIANTS = ["split", "centered", "minimal"];
const BUTTON_STYLES = ["sharp", "pill", "rounded"];

export default function DesignSettings() {
  const [site, setSite] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/site").then((r) => setSite(r.data)); }, []);

  const setColor = (key, value) => setSite((s) => ({
    ...s, theme_config: { ...s.theme_config, colors: { ...s.theme_config.colors, [key]: value } }
  }));
  const setTypo = (key, value) => setSite((s) => ({
    ...s, theme_config: { ...s.theme_config, typography: { ...s.theme_config.typography, [key]: value } }
  }));
  const setLayout = (key, value) => setSite((s) => ({
    ...s, theme_config: { ...s.theme_config, layout: { ...s.theme_config.layout, [key]: value } }
  }));

  const save = async () => {
    setSaving(true);
    try { await api.put("/site", { theme_config: site.theme_config }); toast.success("Theme saved"); }
    catch { toast.error("Save failed"); } finally { setSaving(false); }
  };

  if (!site) return <AdminShell title="Design" subtitle="Theme & tokens"><div>Loading…</div></AdminShell>;
  const t = site.theme_config;

  return (
    <AdminShell
      title="Design"
      subtitle="Theme tokens & layout"
      actions={
        <button onClick={save} disabled={saving} data-testid="design-save" className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="ar-card p-5">
          <div className="eyebrow mb-4">Colors</div>
          <div className="space-y-3">
            {Object.entries(t.colors).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <input type="color" value={v} onChange={(e) => setColor(k, e.target.value)} data-testid={`color-${k}`} className="w-10 h-10 border border-[color:var(--ar-line)]" />
                <div className="flex-1">
                  <div className="eyebrow text-[10px]">{k}</div>
                  <input value={v} onChange={(e) => setColor(k, e.target.value)} className="w-full font-mono text-sm border-b border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none py-1" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ar-card p-5">
          <div className="eyebrow mb-4">Typography</div>
          <label className="block mb-4">
            <span className="eyebrow text-[10px] block mb-1">Heading font</span>
            <select value={t.typography.heading_font} onChange={(e) => setTypo("heading_font", e.target.value)} data-testid="typo-heading" className="w-full border border-[color:var(--ar-line)] p-2 font-mono text-sm">
              {HEADING_FONTS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="block mb-4">
            <span className="eyebrow text-[10px] block mb-1">Body font</span>
            <select value={t.typography.body_font} onChange={(e) => setTypo("body_font", e.target.value)} data-testid="typo-body" className="w-full border border-[color:var(--ar-line)] p-2 font-mono text-sm">
              {BODY_FONTS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow text-[10px] block mb-1">Scale</span>
            <select value={t.typography.scale} onChange={(e) => setTypo("scale", e.target.value)} data-testid="typo-scale" className="w-full border border-[color:var(--ar-line)] p-2 font-mono text-sm">
              {SCALES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="ar-card p-5">
          <div className="eyebrow mb-4">Layout</div>
          <label className="block mb-4">
            <span className="eyebrow text-[10px] block mb-1">Hero variant</span>
            <select value={t.layout.hero_variant} onChange={(e) => setLayout("hero_variant", e.target.value)} data-testid="layout-hero" className="w-full border border-[color:var(--ar-line)] p-2 font-mono text-sm">
              {HERO_VARIANTS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow text-[10px] block mb-1">Button style</span>
            <select value={t.layout.button_style} onChange={(e) => setLayout("button_style", e.target.value)} data-testid="layout-button" className="w-full border border-[color:var(--ar-line)] p-2 font-mono text-sm">
              {BUTTON_STYLES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <div className="mt-6 ar-card-soft p-4">
            <div className="eyebrow text-[10px] mb-3">Preview</div>
            <div style={{ background: t.colors.background, color: t.colors.text, padding: 16 }}>
              <div style={{ fontFamily: t.typography.heading_font, fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em" }}>
                Headline preview
              </div>
              <div style={{ fontFamily: t.typography.body_font, color: t.colors.muted, marginTop: 8 }}>
                Body text preview.
              </div>
              <button style={{
                background: t.colors.primary, color: "white", padding: "8px 16px", marginTop: 12,
                borderRadius: t.layout.button_style === "pill" ? 999 : t.layout.button_style === "rounded" ? 8 : 0,
              }}>Call to action</button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
