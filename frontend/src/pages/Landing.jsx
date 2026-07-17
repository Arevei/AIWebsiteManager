import React from "react";
import { Link } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import { ArrowUpRight, Lightning, Robot, MagnifyingGlass, Cube, Sparkle } from "@phosphor-icons/react";

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
  return (
    <div className="min-h-screen bg-white text-[color:var(--ar-ink)]">
      <MarketingNav />

      {/* HERO */}
      <section className="px-6 md:px-12 pt-20 pb-28 border-b border-[color:var(--ar-line)] relative overflow-hidden">
        <div className="max-w-7xl mx-auto tetris items-end">
          <div className="md:col-span-8 ar-fade-up">
            <div className="eyebrow mb-6" data-testid="hero-eyebrow">AI Native Website & CMS for Founders</div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-[88px] leading-[0.95] font-black tracking-tighter">
              Save time. <span className="text-[color:var(--ar-ink-3)]">Scale fast.</span><br />
              Stop hiring four <span className="border-b-[6px] border-[color:var(--ar-ai)]">agencies</span>.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-[color:var(--ar-ink-2)] max-w-2xl leading-relaxed">
              AREVEI replaces your developer, designer, copywriter and SEO agency with one AI engine —
              shared across every client site, never breaking your theme.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 items-center">
              <Link
                to="/signup"
                data-testid="hero-cta-primary"
                className="bg-[color:var(--ar-ink)] text-white px-7 py-4 font-mono text-sm uppercase tracking-wider hover:bg-black inline-flex items-center gap-2"
              >
                Get your AI website manager <ArrowUpRight size={16} weight="bold" />
              </Link>
              <a
                href="#how"
                data-testid="hero-cta-secondary"
                className="border border-[color:var(--ar-ink)] px-7 py-4 font-mono text-sm uppercase tracking-wider hover:bg-[color:var(--ar-surface)]"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="md:col-span-4 ar-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="ar-card-soft p-6">
              <div className="eyebrow mb-3">AI Studio · live</div>
              <div className="font-mono text-sm space-y-3">
                <div><span className="text-[color:var(--ar-ink-2)]">› </span>change hero color to deep teal</div>
                <div className="pl-3 border-l-2 border-[color:var(--ar-ai)] text-[color:var(--ar-ink-2)]">
                  update_theme_color(primary, #0E4F4F)<span className="ar-cursor" />
                </div>
                <div><span className="text-[color:var(--ar-ink-2)]">› </span>draft a launch post</div>
                <div className="pl-3 border-l-2 border-[color:var(--ar-ai)] text-[color:var(--ar-ink-2)]">
                  generate_blog_post(...) <Sparkle weight="fill" className="inline ml-1" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="border border-[color:var(--ar-line)] p-2"><div className="text-[color:var(--ar-ink-3)]">SEO</div><div className="font-bold">93</div></div>
                <div className="border border-[color:var(--ar-line)] p-2"><div className="text-[color:var(--ar-ink-3)]">AEO</div><div className="font-bold">81</div></div>
                <div className="border border-[color:var(--ar-line)] p-2"><div className="text-[color:var(--ar-ink-3)]">GEO</div><div className="font-bold">76</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-b border-[color:var(--ar-line)] py-8 overflow-hidden bg-white">
        <div className="ar-marquee flex gap-16 whitespace-nowrap font-display font-black tracking-tighter text-2xl text-[color:var(--ar-ink-3)]">
          {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((p, i) => (
            <span key={i}>{p}</span>
          ))}
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="px-6 md:px-12 py-24 border-b border-[color:var(--ar-line)]">
        <div className="max-w-7xl mx-auto tetris">
          <div className="md:col-span-5">
            <div className="eyebrow mb-4">Before AREVEI</div>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tighter">
              Four vendors. Four invoices. <br />Zero leverage.
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
                <div className="eyebrow mb-2">{t}</div>
                <div className="text-[color:var(--ar-ink-2)]">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-6 md:px-12 py-24 border-b border-[color:var(--ar-line)] bg-[color:var(--ar-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="eyebrow mb-4">How it works</div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tighter max-w-3xl mb-16">
            One prompt → safe, structured change → ship.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[color:var(--ar-line)] border border-[color:var(--ar-line)]">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-white p-8" data-testid={`step-${s.n}`}>
                <div className="font-mono text-xs text-[color:var(--ar-ai)] mb-6">{s.n}</div>
                <div className="font-display font-bold text-xl mb-3">{s.title}</div>
                <div className="text-sm text-[color:var(--ar-ink-2)] leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 md:px-12 py-24 border-b border-[color:var(--ar-line)]">
        <div className="max-w-7xl mx-auto">
          <div className="tetris items-end mb-16">
            <div className="md:col-span-7">
              <div className="eyebrow mb-4">What's inside</div>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tighter">
                Four roles. One AI. <br />Shared codebase.
              </h2>
            </div>
            <div className="md:col-span-5 text-[color:var(--ar-ink-2)] text-lg">
              Every client site renders from the same engine. AI never writes raw code — it calls
              structured tools that update your theme tokens and content JSON.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="ar-card p-8 md:p-10" data-testid={`feature-${f.title.replace(/\s+/g,"-").toLowerCase()}`}>
                <f.icon size={32} weight="duotone" className="mb-6 text-[color:var(--ar-ai)]" />
                <div className="eyebrow mb-2">{f.eyebrow}</div>
                <div className="font-display font-bold text-2xl mb-3 tracking-tighter">{f.title}</div>
                <div className="text-[color:var(--ar-ink-2)]">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 md:px-12 py-24 border-b border-[color:var(--ar-line)] bg-[color:var(--ar-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="eyebrow mb-4">Pricing</div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tighter mb-16 max-w-3xl">
            Self-serve, or fully managed by the AREVEI team.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="ar-card p-10" data-testid="pricing-self-serve">
              <div className="eyebrow text-[color:var(--ar-accent)]">Pure SaaS · Self-serve</div>
              <div className="font-display text-5xl font-black tracking-tighter mt-4">$499<span className="text-base text-[color:var(--ar-ink-3)] font-mono"> setup</span></div>
              <div className="font-display text-2xl tracking-tighter font-bold mt-2">$99 <span className="text-sm font-mono text-[color:var(--ar-ink-3)]">/month</span></div>
              <ul className="mt-8 space-y-3 text-[color:var(--ar-ink-2)]">
                <li>✓ AI content + design + SEO</li>
                <li>✓ One website template, fully token-driven</li>
                <li>✓ Versioning & rollback</li>
                <li>✓ Fair-use AI cap: 500k tokens / mo</li>
              </ul>
              <Link to="/signup" data-testid="pricing-self-serve-cta" className="mt-8 inline-block bg-[color:var(--ar-ink)] text-white px-6 py-3 font-mono text-xs uppercase tracking-wider">Start trial</Link>
            </div>
            <div className="ar-card p-10 border-2 border-[color:var(--ar-ink)] relative" data-testid="pricing-managed">
              <span className="absolute top-0 right-0 bg-[color:var(--ar-ai)] text-white px-3 py-1 font-mono text-xs">MANAGED</span>
              <div className="eyebrow">Done-for-you</div>
              <div className="font-display text-5xl font-black tracking-tighter mt-4">$1,999<span className="text-base text-[color:var(--ar-ink-3)] font-mono"> setup</span></div>
              <div className="font-display text-2xl tracking-tighter font-bold mt-2">$499 <span className="text-sm font-mono text-[color:var(--ar-ink-3)]">/month</span></div>
              <ul className="mt-8 space-y-3 text-[color:var(--ar-ink-2)]">
                <li>✓ Everything in self-serve</li>
                <li>✓ Dedicated AREVEI account manager</li>
                <li>✓ Monthly SEO + content roadmap</li>
                <li>✓ Unlimited AI usage (fair use)</li>
                <li>✓ Custom code mode (gated)</li>
              </ul>
              <a href="mailto:sales@arevei.com" data-testid="pricing-managed-cta" className="mt-8 inline-block border border-[color:var(--ar-ink)] px-6 py-3 font-mono text-xs uppercase tracking-wider hover:bg-white">Talk to sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-32">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-6xl font-black tracking-tighter">
            Your AI website manager <br />is ready when you are.
          </h2>
          <Link
            to="/signup"
            data-testid="footer-cta"
            className="mt-10 inline-flex items-center gap-2 bg-[color:var(--ar-ink)] text-white px-8 py-4 font-mono text-sm uppercase tracking-wider hover:bg-black"
          >
            Get started <ArrowUpRight size={16} weight="bold" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[color:var(--ar-line)] px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-4 font-mono text-xs text-[color:var(--ar-ink-3)] uppercase tracking-wider">
          <span>© AREVEI 2026 · Built for founders</span>
          <span>hello@arevei.com</span>
        </div>
      </footer>
    </div>
  );
}
