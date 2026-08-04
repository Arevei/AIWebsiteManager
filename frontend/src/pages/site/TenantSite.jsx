import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";

function Section({ section, theme }) {
  const c = section.content || {};
  const bg = theme.colors.background;
  const text = theme.colors.text;
  const muted = theme.colors.muted;
  const accent = theme.colors.accent;
  const headingFont = theme.typography.heading_font;
  const bodyFont = theme.typography.body_font;
  const btnRadius = theme.layout.button_style === "pill" ? 999 : theme.layout.button_style === "rounded" ? 8 : 0;

  const btn = (label, primary = true) => (
    <button style={{
      background: primary ? theme.colors.primary : "transparent",
      color: primary ? "#ffffff" : theme.colors.primary,
      border: `2px solid ${theme.colors.primary}`,
      padding: "12px 28px", borderRadius: btnRadius,
      fontFamily: bodyFont, fontWeight: 500,
    }}>{label}</button>
  );

  switch (section.type) {
    case "hero":
      return (
        <section style={{ background: bg, color: text, padding: "96px 24px", borderBottom: `1px solid ${theme.colors.surface}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {c.eyebrow && <div style={{ fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: "0.2em", fontSize: 12, color: accent, marginBottom: 20 }}>{c.eyebrow}</div>}
            <h1 style={{ fontFamily: headingFont, fontWeight: 900, fontSize: "clamp(40px, 7vw, 80px)", letterSpacing: "-0.04em", lineHeight: 0.98, margin: 0, maxWidth: 900 }}>{c.headline}</h1>
            {c.subheadline && <p style={{ fontFamily: bodyFont, color: muted, fontSize: 20, marginTop: 24, maxWidth: 680 }}>{c.subheadline}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              {c.primary_cta && btn(c.primary_cta, true)}
              {c.secondary_cta && btn(c.secondary_cta, false)}
            </div>
          </div>
        </section>
      );
    case "features":
      return (
        <section style={{ background: theme.colors.surface, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontFamily: headingFont, fontWeight: 800, fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.03em", margin: 0 }}>{c.title}</h2>
            <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
              {(c.items || []).map((it, i) => (
                <div key={i} style={{ background: bg, padding: 24, border: `1px solid ${theme.colors.surface === bg ? "#eee" : theme.colors.surface}` }}>
                  <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 22, marginBottom: 8 }}>{it.title}</div>
                  <div style={{ fontFamily: bodyFont, color: muted }}>{it.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "testimonials":
      return (
        <section style={{ background: bg, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontFamily: headingFont, fontWeight: 800, fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.03em" }}>{c.title}</h2>
            <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
              {(c.items || []).map((it, i) => (
                <div key={i} style={{ padding: 24, borderLeft: `3px solid ${accent}` }}>
                  <div style={{ fontFamily: headingFont, fontSize: 22, lineHeight: 1.3 }}>"{it.quote}"</div>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, marginTop: 12, color: muted }}>{it.author} · {it.role}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "faq":
      return (
        <section style={{ background: theme.colors.surface, padding: "96px 24px" }} itemScope itemType="https://schema.org/FAQPage">
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ fontFamily: headingFont, fontWeight: 800, fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.03em" }}>{c.title}</h2>
            <div style={{ marginTop: 32 }}>
              {(c.items || []).map((it, i) => (
                <details key={i} style={{ borderTop: `1px solid ${bg === "#FFFFFF" ? "#e5e5e5" : "#333"}`, padding: "16px 0" }} itemScope itemType="https://schema.org/Question" itemProp="mainEntity">
                  <summary style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 18, cursor: "pointer", listStyle: "none" }} itemProp="name">{it.q}</summary>
                  <div style={{ fontFamily: bodyFont, color: muted, marginTop: 12 }} itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                    <span itemProp="text">{it.a}</span>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      );
    case "cta":
      return (
        <section style={{ background: theme.colors.primary, color: "#fff", padding: "96px 24px", textAlign: "center" }}>
          <h2 style={{ fontFamily: headingFont, fontWeight: 900, fontSize: "clamp(32px, 5vw, 64px)", letterSpacing: "-0.04em" }}>{c.headline}</h2>
          {c.subheadline && <p style={{ fontFamily: bodyFont, opacity: 0.7, marginTop: 12 }}>{c.subheadline}</p>}
          {c.primary_cta && (
            <button style={{ marginTop: 24, background: "#fff", color: theme.colors.primary, padding: "14px 36px", border: "none", borderRadius: btnRadius, fontFamily: bodyFont, fontWeight: 600 }}>{c.primary_cta}</button>
          )}
        </section>
      );
    case "pricing":
      return (
        <section style={{ background: theme.colors.surface, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontFamily: headingFont, fontWeight: 800, fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.03em" }}>{c.title || "Pricing"}</h2>
            <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {(c.tiers || []).map((p, i) => (
                <div key={i} style={{ background: bg, padding: 32, border: p.highlight ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.surface === bg ? "#eee" : theme.colors.surface}` }}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: accent }}>{p.name}</div>
                  <div style={{ fontFamily: headingFont, fontWeight: 900, fontSize: 44, letterSpacing: "-0.04em", marginTop: 8 }}>{p.price}<span style={{ fontSize: 14, color: muted, fontFamily: "JetBrains Mono" }}> {p.period || ""}</span></div>
                  <ul style={{ marginTop: 20, fontFamily: bodyFont, color: muted, listStyle: "none", padding: 0 }}>
                    {(p.features || []).map((f, j) => <li key={j} style={{ padding: "6px 0", borderTop: `1px solid ${theme.colors.surface === bg ? "#eee" : theme.colors.surface}` }}>✓ {f}</li>)}
                  </ul>
                  <div style={{ marginTop: 24 }}>{btn(p.cta || "Choose", p.highlight)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "contact":
      return (
        <section style={{ background: bg, padding: "96px 24px", borderTop: `1px solid ${theme.colors.surface}` }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
            <div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: accent }}>{c.eyebrow || "Contact"}</div>
              <h2 style={{ fontFamily: headingFont, fontWeight: 800, fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em", marginTop: 8 }}>{c.title || "Get in touch"}</h2>
              <p style={{ fontFamily: bodyFont, color: muted, marginTop: 12 }}>{c.body}</p>
              {c.email && <div style={{ marginTop: 16, fontFamily: "JetBrains Mono", fontSize: 13 }}>{c.email}</div>}
              {c.phone && <div style={{ fontFamily: "JetBrains Mono", fontSize: 13 }}>{c.phone}</div>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); alert("Thanks! We'll be in touch."); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input required placeholder="Name" style={{ borderBottom: `2px solid ${muted}`, padding: "10px 0", background: "transparent", fontFamily: bodyFont, border: "none", borderBottom: `2px solid ${muted}` }} />
              <input required type="email" placeholder="Email" style={{ borderBottom: `2px solid ${muted}`, padding: "10px 0", background: "transparent", fontFamily: bodyFont, border: "none", borderBottom: `2px solid ${muted}` }} />
              <textarea required rows={4} placeholder="How can we help?" style={{ border: `1px solid ${muted}`, padding: 10, background: "transparent", fontFamily: bodyFont }} />
              <div>{btn(c.cta || "Send", true)}</div>
            </form>
          </div>
        </section>
      );
    case "blog_list":
      return (
        <section style={{ background: bg, padding: "96px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h2 style={{ fontFamily: headingFont, fontWeight: 800, fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: "-0.03em" }}>{c.title || "Latest writing"}</h2>
            <div style={{ marginTop: 32 }}>
              {(c.items || []).map((it, i) => (
                <div key={i} style={{ padding: "20px 0", borderTop: `1px solid ${muted}40`, display: "grid", gridTemplateColumns: "120px 1fr", gap: 24 }}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: muted }}>{it.date}</div>
                  <div>
                    <div style={{ fontFamily: headingFont, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>{it.title}</div>
                    <div style={{ fontFamily: bodyFont, color: muted, marginTop: 6 }}>{it.excerpt}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "article":
      return (
        <article style={{ background: bg, padding: "96px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", color: text }}>
            {c.image && <img src={c.image} alt={c.title || "Blog featured"} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 18, marginBottom: 32, border: `1px solid ${muted}30` }} />}
            <h1 style={{ fontFamily: headingFont, fontWeight: 900, fontSize: "clamp(32px, 5vw, 56px)", letterSpacing: "-0.03em" }}>{c.title}</h1>
            <div style={{ fontFamily: bodyFont, fontSize: 18, marginTop: 24, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{c.body}</div>
          </div>
        </article>
      );
    default:
      return null;
  }
}

export default function TenantSite() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [activeSlug, setActiveSlug] = useState(params.get("page") || "home");

  useEffect(() => {
    api.get(`/site/public/${slug}`).then((r) => {
      setData(r.data);
      document.title = r.data.site?.seo?.meta_title || r.data.tenant?.name || "Site";
    }).catch(() => setData({ error: true }));
  }, [slug]);

  if (!data) return <div style={{ padding: 80, fontFamily: "JetBrains Mono" }}>Loading…</div>;
  if (data.error) return <div style={{ padding: 80 }}>Site not found.</div>;
  const { site, tenant } = data;
  // Defensive defaults so a partial theme_config can never crash the page
  const theme = {
    colors: {
      primary: "#0A0A0A", accent: "#0055FF", background: "#FFFFFF",
      surface: "#F4F4F5", text: "#0A0A0A", muted: "#525252",
      ...((site && site.theme_config && site.theme_config.colors) || {}),
    },
    typography: {
      heading_font: "Cabinet Grotesk", body_font: "Satoshi", scale: "lg",
      ...((site && site.theme_config && site.theme_config.typography) || {}),
    },
    layout: {
      hero_variant: "split", button_style: "sharp",
      ...((site && site.theme_config && site.theme_config.layout) || {}),
    },
  };
  const pages = (site && site.pages) || [];
  const page = pages.find((p) => p.slug === activeSlug) || pages[0];

  return (
    <div style={{ background: theme.colors.background, color: theme.colors.text, minHeight: "100vh" }} data-testid="tenant-site">
      <header style={{ borderBottom: `1px solid ${theme.colors.surface}`, padding: "16px 24px", position: "sticky", top: 0, background: theme.colors.background, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: theme.typography.heading_font, fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em" }}>{tenant?.name}</div>
          <nav style={{ display: "flex", gap: 18, fontFamily: "JetBrains Mono", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em" }}>
            {pages.map((p) => (
              <button key={p.slug} onClick={() => setActiveSlug(p.slug)} data-testid={`tenant-nav-${p.slug}`} style={{ background: "none", border: "none", color: activeSlug === p.slug ? theme.colors.accent : theme.colors.muted, cursor: "pointer" }}>{p.title || p.slug}</button>
            ))}
            <Link to="/" style={{ color: theme.colors.muted }}>← AREVEI</Link>
          </nav>
        </div>
      </header>

      {(page?.sections || []).map((sec) => <Section key={sec.id} section={sec} theme={theme} />)}

      <footer style={{ borderTop: `1px solid ${theme.colors.surface}`, padding: "32px 24px", textAlign: "center", fontFamily: "JetBrains Mono", fontSize: 12, color: theme.colors.muted }}>
        Built with <Link to="/" style={{ color: theme.colors.accent }}>AREVEI</Link>
      </footer>
    </div>
  );
}
