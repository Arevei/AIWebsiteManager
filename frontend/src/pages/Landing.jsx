import React from "react";
import { Link } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import { useTheme } from "../lib/theme";
import { ArrowUpRight, Lightning, Robot, MagnifyingGlass, Cube, Sparkle, Check } from "@phosphor-icons/react";

const HERO_DAY = "https://static.prod-images.emergentagent.com/jobs/18e6be65-15c9-4c67-9c3f-b12fcb1e88e2/images/0e73ff25006aef0d3e5985fabd68a281dbb3cedc1ac2ec9db26accbc882ecfce.png";
const HERO_NIGHT = "https://static.prod-images.emergentagent.com/jobs/18e6be65-15c9-4c67-9c3f-b12fcb1e88e2/images/e4bec56c60d032f5469b5c9477cd63db68dacc105ba7dfea00544935abe16cfe.png";

const PARTNER_LOGOS = ["NORTHWIND", "OAKWELL", "FERRA", "MIRRORLAB", "DAYBREAK", "CIRRUS", "PYRA", "RIVET"];

const STEPS = [
  { n: "01", title: "Tell the AI what you want", body: "Type plain English: 'Change the hero to deep teal' or 'Write a launch announcement.'" },
  { n: "02", title: "AI proposes safe changes", body: "Claude Sonnet 4.6 calls structured tools — never raw HTML. Theme tokens, content blocks, SEO meta." },
  { n: "03", title: "Preview side by side", body: "See before / after instantly. Accept, reject, or iterate." },
  { n: "04", title: "Publish — or roll back", body: "Every change is versioned. One click to revert anything." },
];

const FEATURES = [
  { icon: Robot, eyebrow: "Copywriter", title: "AI content writing", body: "Long-form blog posts, landing copy, FAQs — written in your brand voice and ready to publish." },
  { icon: Cube, eyebrow: "Designer", title: "Design that stays on-brand", body: "AI edits design tokens — colors, type, layout variants. It can't break your theme." },
  { icon: MagnifyingGlass, eyebrow: "SEO Agency", title: "SEO + AEO + GEO baked in", body: "Schema, sitemaps, meta tags, FAQ blocks, citable structured content — generated and monitored." },
  { icon: Lightning, eyebrow: "CMS", title: "One CMS, every tenant", body: "Single multi-tenant codebase. Your data, your theme, all rendered from a shared engine." },
];

export default function Landing() {
  const { theme } = useTheme();
  return (
    <div className="min-h-screen bg-[color:var(--ar-bg)] text-[color:var(--ar-ink)]">
      <MarketingNav />

      {/* HERO — framed nature card */}
      <section className="px-4 pt-4 pb-16">
        <div
          className="relative max-w-[1400px] mx-auto rounded-[28px] overflow-hidden flex items-center justify-center min-h-[calc(100svh-8rem)] md:min-h-[86vh]"
          style={{ backgroundImage: `url(${theme === "dark" ? HERO_NIGHT : HERO_DAY})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 hero-overlay" />
          <div className="relative z-10 text-center px-6 py-20 max-w-4xl mx-auto ar-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 mb-8" data-testid="hero-eyebrow">
              <Sparkle size={12} weight="fill" className="text-[color:var(--ar-accent)]" />
              AI Native Website &amp; CMS for Founders
            </div>
            <h1 className="display-hero text-white text-[clamp(2.8rem,9vw,5.1rem)]">
              Save time. Scale fast.<br />
              Stop hiring <span className="text-[color:var(--ar-accent)]">four agencies</span>.
            </h1>
            <p className="mt-7 text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              AREVEI replaces your developer, designer, copywriter and SEO agency with one AI engine —
              shared across every client site, never breaking your theme.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 items-center justify-center">
              <Link to="/signup" data-testid="hero-cta-primary" className="btn-accent px-7 py-3.5 text-sm">
                Get your AI website manager <ArrowUpRight size={16} weight="bold" />
              </Link>
              <a href="/#how" data-testid="hero-cta-secondary" className="btn-ghost-light px-7 py-3.5 text-sm">
                See how it works
              </a>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/60 font-medium">
              <span className="inline-flex items-center gap-1.5"><Check size={13} weight="bold" className="text-[color:var(--ar-accent)]" /> 14-day trial</span>
              <span className="inline-flex items-center gap-1.5"><Check size={13} weight="bold" className="text-[color:var(--ar-accent)]" /> No card needed</span>
              <span className="inline-flex items-center gap-1.5"><Check size={13} weight="bold" className="text-[color:var(--ar-accent)]" /> One-click rollback</span>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="py-6 overflow-hidden border-y border-[color:var(--ar-line)]">
        <div className="ar-marquee flex gap-16 whitespace-nowrap font-display font-extrabold tracking-tighter text-xl text-[color:var(--ar-ink-3)]">
          {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((p, i) => (
            <span key={i}>{p}</span>
          ))}
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="px-4 py-20 relative overflow-hidden">
        <div className="blob blob-teal w-[420px] h-[420px] -top-32 -right-24" />
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-12 gap-10 items-start relative">
          <div className="md:col-span-5">
            <span className="eyebrow-pill mb-5">Before AREVEI</span>
            <h2 className="font-display text-4xl md:text-[56px] leading-[1.02] tracking-tighter mt-5">
              Four vendors. Four invoices. Zero leverage.
            </h2>
          </div>
          <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["Developer", "Slow. Expensive. Backlog of one."],
              ["Designer", "Beautiful mocks. Months to ship."],
              ["Copywriter", "Brand voice drifts every quarter."],
              ["SEO agency", "Audits in PDFs. Recommendations never shipped."],
            ].map(([t, b]) => (
              <div key={t} className="ar-card p-6">
                <div className="eyebrow mb-2 text-[color:var(--ar-ai)]">{t}</div>
                <div className="text-[color:var(--ar-ink-2)] text-[15px]">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-4 pb-20">
        <div className="max-w-[1400px] mx-auto rounded-[28px] bg-[color:var(--ar-surface)] border border-[color:var(--ar-line)] px-6 md:px-14 py-16 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-40" />
          <div className="relative">
            <span className="eyebrow-pill mb-5">How it works</span>
            <h2 className="font-display text-4xl md:text-[56px] leading-[1.02] tracking-tighter max-w-3xl mt-5 mb-14">
              One prompt → safe, structured change → ship.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {STEPS.map((s) => (
                <div key={s.n} className="ar-card p-7" data-testid={`step-${s.n}`}>
                  <div className="font-mono text-xs text-[color:var(--ar-ai)] mb-6">{s.n}</div>
                  <div className="font-display font-bold text-xl mb-3">{s.title}</div>
                  <div className="text-sm text-[color:var(--ar-ink-2)] leading-relaxed">{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-4 pb-20 relative overflow-hidden">
        <div className="blob blob-lime w-[380px] h-[380px] top-24 -left-28" />
        <div className="max-w-[1400px] mx-auto relative">
          <div className="grid md:grid-cols-12 gap-8 items-end mb-14">
            <div className="md:col-span-7">
              <span className="eyebrow-pill mb-5">What's inside</span>
              <h2 className="font-display text-4xl md:text-[56px] leading-[1.02] tracking-tighter mt-5">
                Four roles. One AI. Shared codebase.
              </h2>
            </div>
            <div className="md:col-span-5 text-[color:var(--ar-ink-2)] text-base md:text-lg leading-relaxed">
              Every client site renders from the same engine. AI never writes raw code — it calls
              structured tools that update your theme tokens and content JSON.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="ar-card p-8 md:p-9" data-testid={`feature-${f.title.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-6 bg-[color:var(--ar-soft-teal-bg)] border border-[color:var(--ar-soft-teal-border)]">
                  <f.icon size={22} weight="duotone" className="text-[color:var(--ar-ai)]" />
                </div>
                <div className="eyebrow mb-2">{f.eyebrow}</div>
                <div className="font-display font-bold text-2xl mb-3 tracking-tighter">{f.title}</div>
                <div className="text-[color:var(--ar-ink-2)] text-[15px]">{f.body}</div>
              </div>
            ))}
          </div>

          {/* AI Studio live mock */}
          <div className="mt-5 ar-card-soft p-7 md:p-9 grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-5">
              <div className="eyebrow mb-3 text-[color:var(--ar-ai)]">AI Studio · live</div>
              <div className="font-display font-bold text-2xl md:text-3xl tracking-tighter mb-3">Talk to your website like a teammate.</div>
              <p className="text-[color:var(--ar-ink-2)] text-[15px]">Every request becomes a structured, reversible tool call — previewed before it ships.</p>
            </div>
            <div className="md:col-span-7 rounded-2xl border border-[color:var(--ar-line)] panel p-6">
              <div className="font-mono text-sm space-y-3">
                <div><span className="text-[color:var(--ar-ink-3)]">› </span>change hero color to deep teal</div>
                <div className="pl-3 border-l-2 border-[color:var(--ar-accent)] text-[color:var(--ar-ink-2)]">
                  update_theme_color(primary, #0F6E56)<span className="ar-cursor" />
                </div>
                <div><span className="text-[color:var(--ar-ink-3)]">› </span>draft a launch post</div>
                <div className="pl-3 border-l-2 border-[color:var(--ar-accent)] text-[color:var(--ar-ink-2)]">
                  generate_blog_post(...) <Sparkle weight="fill" className="inline ml-1 text-[color:var(--ar-ai)]" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-xs font-mono">
                {[["SEO", "93"], ["AEO", "81"], ["GEO", "76"]].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-[color:var(--ar-line)] p-3 bg-[color:var(--ar-surface)]">
                    <div className="text-[color:var(--ar-ink-3)]">{l}</div>
                    <div className="font-bold text-[color:var(--ar-ai)]">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-4 pb-20">
        <div className="max-w-[1400px] mx-auto rounded-[28px] bg-[color:var(--ar-surface)] border border-[color:var(--ar-line)] px-6 md:px-14 py-16 md:py-20 relative overflow-hidden">
          <div className="blob blob-teal w-[360px] h-[360px] -bottom-28 -right-20" />
          <div className="relative">
            <span className="eyebrow-pill mb-5">Pricing</span>
            <h2 className="font-display text-4xl md:text-[56px] leading-[1.02] tracking-tighter mt-5 mb-14 max-w-3xl">
              Self-serve, or fully managed by the AREVEI team.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl">
              <div className="ar-card p-8 md:p-10" data-testid="pricing-self-serve">
                <div className="eyebrow text-[color:var(--ar-ai)]">Pure SaaS · Self-serve</div>
                <div className="font-display text-5xl font-extrabold tracking-tighter mt-5">$499<span className="text-sm text-[color:var(--ar-ink-3)] font-mono font-normal"> setup</span></div>
                <div className="font-display text-2xl tracking-tighter font-bold mt-2">$99 <span className="text-sm font-mono font-normal text-[color:var(--ar-ink-3)]">/month</span></div>
                <ul className="mt-8 space-y-3 text-[color:var(--ar-ink-2)] text-[15px]">
                  {["AI content + design + SEO", "One website template, fully token-driven", "Versioning & rollback", "Fair-use AI cap: 500k tokens / mo"].map((li) => (
                    <li key={li} className="flex items-start gap-2"><Check size={16} weight="bold" className="text-[color:var(--ar-ai)] mt-0.5 shrink-0" /> {li}</li>
                  ))}
                </ul>
                <Link to="/signup" data-testid="pricing-self-serve-cta" className="btn-primary mt-9 px-6 py-3 text-[13px]">Start trial</Link>
              </div>
              <div className="rounded-[22px] p-8 md:p-10 relative overflow-hidden text-white border" style={{ background: "var(--ar-hero-dark)", borderColor: "rgba(0,230,196,0.25)" }} data-testid="pricing-managed">
                <span className="absolute top-5 right-5 rounded-full bg-[color:var(--ar-accent)] text-[color:var(--ar-on-accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider">Managed</span>
                <div className="eyebrow text-[color:var(--ar-accent)]">Done-for-you</div>
                <div className="font-display text-5xl font-extrabold tracking-tighter mt-5">$1,999<span className="text-sm text-white/40 font-mono font-normal"> setup</span></div>
                <div className="font-display text-2xl tracking-tighter font-bold mt-2">$499 <span className="text-sm font-mono font-normal text-white/40">/month</span></div>
                <ul className="mt-8 space-y-3 text-white/75 text-[15px]">
                  {["Everything in self-serve", "Dedicated AREVEI account manager", "Monthly SEO + content roadmap", "Unlimited AI usage (fair use)", "Custom code mode (gated)"].map((li) => (
                    <li key={li} className="flex items-start gap-2"><Check size={16} weight="bold" className="text-[color:var(--ar-accent)] mt-0.5 shrink-0" /> {li}</li>
                  ))}
                </ul>
                <a href="mailto:sales@arevei.com" data-testid="pricing-managed-cta" className="btn-accent mt-9 px-6 py-3 text-[13px]">Talk to sales</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-16">
        <div className="max-w-[1400px] mx-auto rounded-[28px] relative overflow-hidden text-center px-6 py-24 md:py-32" style={{ background: "var(--ar-hero-dark)" }}>
          <div className="blob blob-teal w-[500px] h-[500px] -top-40 left-1/2 -translate-x-1/2 opacity-90" />
          <div className="relative">
            <h2 className="display-hero text-white text-4xl md:text-6xl">
              Your AI website manager<br />is ready when you are.
            </h2>
            <Link to="/signup" data-testid="footer-cta" className="btn-accent mt-10 px-8 py-4 text-sm">
              Get started <ArrowUpRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-8">
        <div className="max-w-[1400px] mx-auto rounded-[24px] border border-[color:var(--ar-line)] bg-[color:var(--ar-surface)] px-8 py-6 flex flex-wrap justify-between gap-4 text-xs text-[color:var(--ar-ink-3)] font-medium">
          <span className="font-display font-extrabold text-base text-[color:var(--ar-ink)] tracking-tighter">AREVEI<span className="text-[color:var(--ar-accent)]">.</span></span>
          <span>© AREVEI 2026 · Built for founders</span>
          <span>hello@arevei.com</span>
        </div>
      </footer>
    </div>
  );
}
