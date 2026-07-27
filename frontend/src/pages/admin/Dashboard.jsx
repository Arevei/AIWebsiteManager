import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import {
  ArrowRight,
  Brain,
  Calendar,
  ChartLineUp,
  CheckCircle,
  Clock,
  FileText,
  GearSix,
  GlobeHemisphereWest,
  Headset,
  House,
  LinkSimple,
  Monitor,
  PaperPlaneTilt,
  RocketLaunch,
  Robot,
  ShieldCheck,
  Sparkle,
  SquaresFour,
  TrendUp,
  UsersThree,
  X,
} from "@phosphor-icons/react";

const LOGO = "/arevei-logo-mark.png";
const MARK = "/arevei-logo-mark.png";
const CONTACT_EMAIL = "vinay@arevei.com";

function demoNotice() {
  window.alert(`This is demo website content. Kindly contact with Arevei Team for website manager.\n\n${CONTACT_EMAIL}`);
}

function Shell({ children, className = "" }) {
  return (
    <div className={`aw-shell min-h-screen overflow-hidden bg-[#030607] text-white ${className}`}>
      <div className="aw-bg-grid" />
      <div className="aw-glow aw-glow-a" />
      <div className="aw-glow aw-glow-b" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Brand({ mark = false, className = "" }) {
  return <img src={mark ? MARK : LOGO} alt="Arevei" className={`${mark ? "h-8" : "h-10"} w-auto max-w-full shrink-0 object-contain object-left ${className}`} />;
}

function Avatar({ userName, compact = false }) {
  return (
    <div className={`flex items-center ${compact ? "gap-2.5" : "gap-3"}`}>
      <span className={`grid place-items-center rounded-full bg-[#34d9b1] font-bold text-white ${compact ? "h-8 w-8 text-[11px]" : "h-11 w-11 text-sm shadow-[0_0_28px_rgba(52,217,177,.22)]"}`}>VK</span>
      <span className={`hidden font-semibold sm:block ${compact ? "text-sm" : ""}`}>{userName}</span>
      <span className="text-xs text-white/35">v</span>
    </div>
  );
}

function RobotFace({ large = false, clean = false }) {
  return (
    <div className={`aw-robot ${large ? "aw-robot-large" : ""} ${clean ? "aw-robot-clean" : ""}`}>
      <div className="aw-robot-antenna" />
      <div className="aw-robot-ear aw-robot-ear-left" />
      <div className="aw-robot-ear aw-robot-ear-right" />
      <div className="aw-robot-screen">
        <span className="aw-eye" />
        <span className="aw-eye" />
        <span className="aw-smile" />
      </div>
      {!clean && <img src={MARK} alt="" className="aw-robot-mark" />}
    </div>
  );
}

function SetupWelcome({ onFillDemo }) {
  return (
    <Shell className="aw-setup-shell">
      <main className="mx-auto flex min-h-screen max-w-[920px] flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-20">
        <Brand className="aw-reveal !h-8" />
        <div className="aw-reveal aw-delay-1 mt-7 inline-flex items-center gap-2 rounded-full border border-[#49e8ca2e] bg-[#49e8ca0a] px-3 py-1.5 text-xs font-medium text-[#67e7d1]">
          <Sparkle size={14} weight="fill" /> Welcome to Arevei
        </div>
        <h1 className="aw-reveal aw-delay-2 mt-5 max-w-[650px] font-display text-[34px] font-bold leading-[1.08] tracking-[-.035em] sm:text-[40px] md:text-[46px]">
          Let's set up your <span className="block text-[#4ce8ca]">AI Website Manager</span>
        </h1>
        <p className="aw-reveal aw-delay-3 mt-4 max-w-[480px] text-[15px] leading-6 text-white/55">
          Arevei helps you build, manage and grow your website on autopilot
        </p>

        <div className="aw-reveal aw-delay-4 mt-12 grid w-full gap-0 text-left md:grid-cols-3">
          {[
            [Sparkle, "AI-Powered Management", "Automate content, updates and optimizations with intelligent AI agents."],
            [ChartLineUp, "Real-Time Insights", "Track performance, traffic and growth with live analytics."],
            [RocketLaunch, "Continuous Growth", "From SEO to speed we constantly improve your website for better results."],
          ].map(([Icon, title, body]) => (
            <div key={title} className="flex gap-3.5 border-b border-white/[.07] py-5 first:pt-0 last:border-b-0 last:pb-0 md:border-b-0 md:border-r md:px-6 md:py-0 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#49e8ca1f] bg-[#49e8ca0a] text-[#4ce8ca]"><Icon size={18} /></div>
              <div>
                <div className="text-[13px] font-semibold text-white/90">{title}</div>
                <div className="mt-1.5 text-[13px] leading-5 text-white/48">{body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="aw-reveal aw-delay-5 mt-11 grid w-full max-w-[680px] gap-3 sm:grid-cols-[1.08fr_.92fr]">
          <button onClick={onFillDemo} className="aw-primary-choice group flex min-h-[62px] items-center justify-between rounded-xl bg-[#49e8ca] px-4.5 py-3 text-left text-[#032c25] shadow-[0_10px_35px_rgba(73,232,202,.14)]">
            <span className="flex items-center gap-3.5">
              <Sparkle size={20} weight="fill" />
              <span>
                <span className="block text-sm font-semibold">Fill Demo Data</span>
                <span className="mt-0.5 block text-xs text-[#063e34]/75">Experience Arevei with sample data</span>
              </span>
            </span>
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <button onClick={demoNotice} className="flex min-h-[62px] items-center gap-3.5 rounded-xl border border-white/[.09] bg-white/[.025] px-4.5 py-3 text-left text-white/85 transition-colors hover:border-white/[.16] hover:bg-white/[.04]">
            <FileText size={20} className="text-[#49e8ca]" />
            <span>
              <span className="block text-sm font-medium">Start Empty</span>
              <span className="mt-0.5 block text-xs text-white/42">Set up manually from scratch</span>
            </span>
          </button>
        </div>

        <div className="aw-reveal aw-delay-6 mt-6 flex max-w-[500px] items-center justify-center gap-2 text-xs leading-5 text-white/38">
          <ShieldCheck size={16} className="shrink-0" /> Your data is secure with Arevei. You can change or remove demo data anytime.
        </div>
      </main>
    </Shell>
  );
}

function ChooseFlow({ userName, onBuild, onDashboard, building }) {
  return (
    <Shell className="aw-flow-shell">
      <main className="min-h-screen px-4 py-4 sm:px-6">
        <header className="mx-auto flex h-14 max-w-[1080px] items-center justify-between border-b border-white/[.07] px-1">
          <Brand className="!h-7" />
          <div className="flex items-center gap-4">
            <Avatar userName={userName} compact />
          </div>
        </header>
        <section className="mx-auto flex max-w-[900px] flex-col items-center pb-10 pt-12 text-center sm:pt-16">
          <div className="aw-bot-orbit aw-bot-orbit-compact">
            <RobotFace />
          </div>
          <h1 className="aw-reveal mt-7 max-w-[650px] font-display text-[30px] font-bold leading-[1.12] tracking-[-.035em] sm:text-[36px]">
            Hey, I am <span className="text-[#49e8ca]">Arevei,</span><br />
            I am your <span className="text-[#49e8ca]">Pilot</span> for your website growth
          </h1>
          <p className="aw-reveal aw-delay-1 mt-4 max-w-[490px] text-sm leading-6 text-white/48">
            I'll help you build, manage, and grow your website on autopilot with the power of AI.
          </p>

          <div className="aw-reveal aw-delay-2 mt-10 grid w-full gap-3 text-left md:grid-cols-3">
            <button onClick={onBuild} disabled={building} className="aw-flow-card aw-flow-card-active group disabled:opacity-70">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#49e8ca12] text-[#49e8ca]"><SquaresFour size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#49e8ca]">{building ? "Loading Template" : "Build Website"}</span>
                <span className="mt-1 block text-xs leading-[1.15rem] text-white/45">Create a new website from scratch with Arevei</span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-[#49e8ca] transition-transform group-hover:translate-x-0.5" />
            </button>
            <button onClick={demoNotice} className="aw-flow-card group">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#49e8ca0c] text-[#49e8ca]"><Headset size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white/85">Migrate Website with Arevei</span>
                <span className="mt-1 block text-xs leading-[1.15rem] text-white/42">We'll migrate your existing website and optimize it</span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button onClick={onDashboard} className="aw-flow-card group">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[.04] text-white/60"><ArrowRight size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white/85">Skip to Dashboard</span>
                <span className="mt-1 block text-xs leading-[1.15rem] text-white/42">Explore your dashboard and features</span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <button onClick={demoNotice} className="mt-6 rounded-full border border-white/[.08] px-4 py-1.5 text-xs text-white/42 transition-colors hover:border-white/15 hover:text-white/70">
            Support Contact
          </button>
          <button onClick={onDashboard} className="mt-8 border-b border-dashed border-white/20 pb-0.5 text-xs text-white/38 transition-colors hover:text-white/70">
            Skip for now, I'll explore on my own
          </button>
        </section>
      </main>
    </Shell>
  );
}

function SiteMock({ compact = false }) {
  return (
    <div className="aw-site-preview overflow-hidden rounded-xl border border-white/[.08] bg-[#091018]">
      <div className={`relative ${compact ? "min-h-[180px] p-3.5" : "min-h-[300px] p-5"} bg-[radial-gradient(circle_at_82%_47%,rgba(72,112,120,.28),transparent_36%),linear-gradient(120deg,#08101b,#121c27)]`}>
        <div className="aw-house" />
        <div className="relative z-10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-white"><span className="h-3 w-3 rounded-full bg-[#c7ff4a]" /> DemoBiz</div>
          <div className={`${compact ? "hidden" : "hidden gap-7 text-white/75 md:flex"}`}><span>Home</span><span>About</span><span>Services</span><span>Blog</span><span>Contact</span></div>
          <button className="rounded-md bg-[#c7ff4a] px-4 py-2 font-bold text-black">Get In Touch</button>
        </div>
        <div className={`relative z-10 ${compact ? "mt-11 max-w-[260px]" : "mt-12 max-w-[500px]"}`}>
          <div className="mb-5 inline-flex rounded-full border border-[#c7ff4a55] px-3 py-1 text-xs text-[#c7ff4a]">We help brands grow</div>
          <h2 className={`${compact ? "text-[24px]" : "text-[34px]"} font-extrabold leading-tight tracking-[-.02em]`}>We build digital experiences that <span className="text-[#c7ff4a]">drive growth</span></h2>
          {!compact && <p className="mt-3 max-w-md text-xs leading-5 text-white/60">DemoBiz helps businesses grow with stunning websites, smart strategies and measurable results.</p>}
          <div className={`${compact ? "mt-7" : "mt-5"} flex gap-3`}>
            <button className="rounded-lg bg-[#c7ff4a] px-4 py-2.5 text-xs font-bold text-black">Our Services</button>
            <button className="rounded-lg border border-white/30 px-4 py-2.5 text-xs">About Us</button>
          </div>
        </div>
      </div>
      {!compact && (
        <div className="relative z-10 flex items-center justify-around bg-white px-5 py-4 text-xs font-bold text-[#202529]">
          <span>Trusted by growing brands</span><span>acme</span><span>Cloudify</span><span>Layers</span><span>aven.</span><span>Circooes</span>
        </div>
      )}
    </div>
  );
}

function BuildProgress({ build, siteSlug, onDashboard }) {
  const previewHref = build.previewUrl || (siteSlug ? `/s/${siteSlug}` : "/admin/dev");
  const hasWorkspacePreview = Boolean(build.previewUrl);
  const steps = [
    ["Understanding Your Business", "Analyzing your business details and goals"],
    ["Planning Your Website", "Creating sitemap and strategy"],
    ["Creating Pages", "Building essential pages for your website"],
    ["Writing Content", "Crafting engaging content for each page"],
    ["SEO Setup", "Optimizing for search engines"],
    ["Final Review", "Reviewing everything before handover"],
  ];
  const activeIndex = Math.min(steps.length - 1, Math.floor((build.progress / 100) * steps.length));

  return (
    <Shell className="aw-build-shell">
      <main className="min-h-screen">
        <header className="flex h-[58px] items-center justify-between border-b border-white/[.07] px-5 sm:px-7">
          <Brand className="!h-7" />
          <div className="hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-2 text-sm text-[#49e8ca]"><Sparkle size={16} /> AI Workspace</span>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-sm text-white/45">Your AI Website Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={demoNotice} className="rounded-lg border border-white/[.09] px-3 py-1.5 text-xs text-white/60">Need Help?</button>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#34d9b1] text-[11px] font-bold">VK</span>
          </div>
        </header>
        <section className="mx-auto max-w-[1120px] px-5 py-10 sm:px-7">
          <div className="text-center">
            <div className="mb-4 inline-flex rounded-full border border-[#49e8ca30] bg-[#49e8ca08] px-3 py-1.5 text-xs text-[#49e8ca]">Building Your Website</div>
            <h1 className="font-display text-[32px] font-bold tracking-[-.035em] sm:text-[36px]">Let's build your <span className="text-[#49e8ca]">website</span></h1>
            <p className="mx-auto mt-3 max-w-[700px] text-sm leading-6 text-white/48">Using your demo business data, I'll create the first version of your website. You can review everything before it goes live.</p>
          </div>
          <div className="mt-9 grid items-start gap-4 lg:grid-cols-[.82fr_1.18fr]">
            <div className="aw-glass-card rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between text-sm text-[#49e8ca]">
                <span className="font-semibold">Arevei is working on your website...</span>
                <span className="flex items-center gap-2 text-sm"><span className="aw-live-dot" /> {build.status}</span>
              </div>
              <div className="relative">
                <div className="aw-timeline-line" />
                {steps.map(([title, body], index) => {
                  const complete = index < activeIndex || build.progress >= 100;
                  const active = index === activeIndex && build.progress < 100;
                  return (
                    <div key={title} className={`relative z-10 flex items-center gap-3 rounded-lg px-3 py-2.5 ${active ? "bg-white/[.045]" : ""}`}>
                      <span className={`relative z-20 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs ${complete ? "border-[#49e8ca] bg-[#09201c] text-[#49e8ca]" : active ? "border-[#49e8ca] bg-[#0c2520] text-[#49e8ca]" : "border-white/10 bg-[#071011] text-white/35"}`}>
                        {complete ? <CheckCircle size={16} weight="fill" /> : active ? <Sparkle size={15} className="animate-spin" /> : index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{title}</div>
                        <div className="mt-0.5 text-xs text-white/42">{body}</div>
                      </div>
                      <span className={`text-xs ${complete ? "text-[#49e8ca]" : active ? "text-[#c7ff4a]" : "text-white/32"}`}>{complete ? "Completed" : active ? "In Progress" : "Pending"}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 flex rounded-2xl border border-white/10 bg-white/[.035] p-3">
                <input className="min-w-0 flex-1 bg-transparent px-4 outline-none placeholder:text-white/38" placeholder="Ask Arevei anything..." />
                <button onClick={demoNotice} className="grid h-11 w-11 place-items-center rounded-full bg-white/15"><PaperPlaneTilt /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {["Change tone to professional", "Add more about services", "Make it more modern"].map((item) => (
                  <button key={item} onClick={demoNotice} className="rounded-lg border border-white/10 px-3 py-2 text-white/70 hover:text-white">{item}</button>
                ))}
              </div>
            </div>
            <div className="aw-glass-card rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div><div className="font-semibold">Live Preview</div><div className="text-sm text-white/55">This is a live preview of your website being built.</div></div>
                <div className="flex rounded-xl bg-white/7 p-1 text-white/55"><button className="rounded-lg bg-[#12463f] p-3 text-[#49e8ca]"><Monitor /></button><button className="p-3"><SquaresFour /></button></div>
              </div>
              {hasWorkspacePreview ? (
                <iframe
                  title="Workspace preview"
                  src={build.previewUrl}
                  className="h-[320px] w-full rounded-xl border border-white/[.08] bg-[#091018]"
                />
              ) : (
                <SiteMock />
              )}
              <div className="mt-6 rounded-2xl border border-white/10 p-5">
                <div className="flex items-center justify-between text-sm text-white/65"><span>Overall Progress</span><span>Est. time remaining {build.progress >= 100 ? "Ready" : "2 - 3 mins"}</span></div>
                <div className="mt-2 flex items-center gap-5"><span className="text-3xl font-bold text-[#c7ff4a]">{build.progress}%</span><div className="h-2 flex-1 rounded-full bg-white/8"><div className="aw-progress-fill h-full rounded-full bg-[#49e8ca]" style={{ width: `${build.progress}%` }} /></div></div>
                {build.workspaceId && <div className="mt-3 text-xs text-white/45">Workspace ready: {build.workspaceId}</div>}
              </div>
            </div>
          </div>
          <div className="mt-7 flex justify-center gap-4">
            <a href={previewHref} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-3 rounded-full bg-[#c7ff4a] px-9 font-bold text-black shadow-[0_0_40px_rgba(199,255,74,.18)]">Review Website <ArrowRight size={20} /></a>
            <button onClick={onDashboard} className="inline-flex h-12 items-center gap-3 rounded-full border border-white/16 px-9 font-bold hover:border-white/35"><SquaresFour /> Go to Dashboard</button>
          </div>
          <div className="mt-3 text-center text-sm text-white/45">You can review and edit everything before publishing.</div>
        </section>
      </main>
    </Shell>
  );
}

const GROWTH_OPPORTUNITIES = [
  {
    id: "seo-links",
    category: "SEO",
    state: "AI Can Handle",
    title: "Strengthen internal linking across key pages",
    description: "6 pages have opportunities for stronger contextual internal links.",
    ai: "Identify relevant pages, improve anchor text and implement links.",
    user: "Nothing — review the plan or let AI run it.",
    impact: "Stronger topical authority and clearer paths for visitors and crawlers.",
    cta: "Review Plan",
    secondary: "Run Automatically",
  },
  {
    id: "seo-authority",
    category: "SEO",
    state: "External Action",
    title: "Build authority for high-value search topics",
    description: "On-page coverage is strong, but important topics have limited external authority.",
    ai: "Prepare suggested outreach targets and identify pages worth promoting.",
    user: "External backlink and outreach activity.",
    impact: "Higher trust and ranking potential for high-value search topics.",
    cta: "View Recommendations",
  },
  {
    id: "aeo-structure",
    category: "AEO",
    state: "AI Can Handle",
    title: "Improve answer structure on product pages",
    description: "Key product information can be structured more clearly for answer engines.",
    ai: "Improve headings, concise answer blocks, FAQs and supporting structured data.",
    user: "Nothing — review the proposed changes.",
    impact: "More extractable answers and stronger answer-engine visibility.",
    cta: "Review Changes",
  },
  {
    id: "aeo-answers",
    category: "AEO",
    state: "Needs Input",
    title: "Answer common founder questions",
    description: "4 high-value buyer questions need first-hand product answers.",
    ai: "Prepare the questions and recommended response format.",
    user: "Product knowledge and founder perspective.",
    impact: "More credible answers for buyers and AI answer engines.",
    cta: "Add Answers",
  },
  {
    id: "geo-authority",
    category: "GEO",
    state: "External Action",
    title: "Increase third-party brand authority",
    description: "AREVEI has limited independent references supporting its presence in AI-generated answers.",
    ai: "Prepare authority-building recommendations and priority targets.",
    user: "External profiles, mentions, partnerships or outreach.",
    impact: "Stronger independent entity evidence for AI discovery.",
    cta: "View Plan",
  },
  {
    id: "geo-consistency",
    category: "GEO",
    state: "AI Can Handle",
    title: "Improve product entity consistency",
    description: "Product positioning varies slightly across important website pages.",
    ai: "Align product description, terminology and entity signals across the website.",
    user: "Nothing — review the update before it runs.",
    impact: "A clearer, more consistent entity footprint for generative search.",
    cta: "Review Update",
  },
  {
    id: "content-hours",
    category: "Content",
    state: "Needs Input",
    title: "How AI Website Management Saves Founders 10+ Hours Every Week",
    description: "A high-intent educational opportunity for founders researching website automation.",
    ai: "Prepare research, target queries, keywords, outline and internal linking strategy.",
    user: "A real founder example or experience.",
    impact: "First-hand content with strong search and conversion potential.",
    cta: "Add Input",
    secondary: "View Draft",
  },
  {
    id: "content-case-study",
    category: "Content",
    state: "Needs Input",
    title: "How AREVEI Uses an AI Website Manager to Manage Its Own Website",
    description: "Turn first-hand product experience into an authoritative case study.",
    ai: "Prepare the structure, SEO strategy and recommended narrative.",
    user: "Results, screenshots, metrics or founder commentary.",
    impact: "Original proof that supports buyers, search engines and AI discovery.",
    cta: "Add Details",
  },
];

const INITIAL_GROWTH_ACTIVITY = [
  ["SEO", "Improved internal linking across 6 pages", "Completed", "Today"],
  ["AEO", "Improved FAQ answer structure", "Completed", "Today"],
  ["GEO", "Aligned product positioning across 3 pages", "Completed", "Yesterday"],
  ["SEO", "Updated homepage search metadata", "Completed", "Yesterday"],
  ["Content", "Prepared new blog draft", "Waiting for Input", "Today"],
];

function GrowthChip({ children, tone = "neutral" }) {
  const tones = {
    mint: "border-[#49e8ca2e] bg-[#49e8ca0a] text-[#49e8ca]",
    attention: "border-white/[.1] bg-white/[.04] text-white/62",
    neutral: "border-white/[.08] bg-white/[.025] text-white/48",
  };
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${tones[tone]}`}>{children}</span>;
}

function GrowthCommandCenter() {
  const [tab, setTab] = useState("Overview");
  const [category, setCategory] = useState("All");
  const [execution, setExecution] = useState("All");
  const [selected, setSelected] = useState(null);
  const [inputTarget, setInputTarget] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [statuses, setStatuses] = useState({});
  const [activity, setActivity] = useState(INITIAL_GROWTH_ACTIVITY);

  const filtered = GROWTH_OPPORTUNITIES.filter(
    (item) => (category === "All" || item.category === category) && (execution === "All" || item.state === execution)
  );
  const statusTone = (value) => value === "AI Can Handle" || value === "Completed" || value === "Working" ? "mint" : "attention";

  const runAutomatically = (item) => {
    setSelected(null);
    setStatuses((current) => ({ ...current, [item.id]: "Working" }));
    window.setTimeout(() => {
      setStatuses((current) => ({ ...current, [item.id]: "Completed" }));
      setActivity((current) => [
        [item.category, item.title, "Completed", "Just now"],
        ...current.filter((entry) => entry[1] !== item.title),
      ]);
    }, 1600);
  };

  const submitInput = (event) => {
    event.preventDefault();
    if (!inputValue.trim()) return;
    const item = inputTarget;
    setStatuses((current) => ({ ...current, [item.id]: "Input Received" }));
    setActivity((current) => [[item.category, item.title, "Working", "Just now"], ...current]);
    setInputTarget(null);
    setInputValue("");
  };

  const openOpportunity = (item, action) => {
    if (item.state === "Needs Input" && /Add|Provide/.test(action || item.cta)) {
      setInputTarget(item);
      return;
    }
    setSelected(item);
  };

  const attentionItems = [
    GROWTH_OPPORTUNITIES.find((item) => item.id === "aeo-answers"),
    GROWTH_OPPORTUNITIES.find((item) => item.id === "geo-authority"),
    {
      ...GROWTH_OPPORTUNITIES.find((item) => item.id === "content-hours"),
      title: "Founder insight needed for upcoming article",
      description: '"What Founders Should Automate on Their Website in 2026"',
      cta: "Add Insight",
    },
  ];

  return (
    <section className="aw-reveal aw-growth-command">
      <div>
        <h1>Growth</h1>
        <p>Monitor and improve your website across search, AI discovery, and content.</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-white/[.08] bg-white/[.018]">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["SEO", "93", "Strong"],
            ["AEO", "75%", "Good"],
            ["GEO", "40%", "Needs Attention"],
            ["Content", "8", "Opportunities"],
          ].map(([label, value, note], index) => (
            <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${index ? "border-t border-white/[.06] sm:border-l sm:border-t-0" : ""} ${index === 2 ? "lg:border-t-0" : ""}`}>
              <div><div className="text-[10px] uppercase tracking-[.16em] text-white/34">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/42"><span className={`h-1.5 w-1.5 rounded-full ${note === "Needs Attention" ? "bg-white/35" : "bg-[#49e8ca]"}`} />{note}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[.06] px-4 py-2 text-[10px] text-white/28">Last analysed 12 min ago</div>
      </div>

      <div className="mt-5 flex gap-1 border-b border-white/[.07]">
        {["Overview", "Opportunities", "Activity"].map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`relative px-3 py-2.5 text-xs transition-colors ${tab === item ? "text-[#49e8ca]" : "text-white/42 hover:text-white/65"}`}>
            {item}{tab === item && <span className="absolute inset-x-2 bottom-0 h-px bg-[#49e8ca]" />}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div>
            <div className="mb-3 text-xs font-semibold text-white/72">Needs Your Attention</div>
            <div className="overflow-hidden rounded-xl border border-white/[.08]">
              {attentionItems.map((item, index) => (
                <div key={item.id} className={`p-4 ${index ? "border-t border-white/[.07]" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2"><GrowthChip tone="mint">{item.category}</GrowthChip><GrowthChip tone="attention">{item.state}</GrowthChip>{statuses[item.id] && <GrowthChip tone="mint">{statuses[item.id]}</GrowthChip>}</div>
                  <div className="mt-2.5 text-sm font-semibold">{item.title}</div>
                  <p className="mt-1 text-xs leading-5 text-white/45">{item.description}</p>
                  <div className="mt-3 grid gap-2 text-[11px] text-white/45 sm:grid-cols-2">
                    <div><span className="text-white/28">AI prepared:</span> {item.ai}</div>
                    <div><span className="text-white/28">Need from you:</span> {item.user}</div>
                  </div>
                  <button onClick={() => openOpportunity(item, item.cta)} className="mt-3 rounded-lg border border-[#49e8ca35] px-3 py-1.5 text-xs text-[#49e8ca] hover:bg-[#49e8ca08]">{item.cta}</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 text-xs font-semibold text-white/72">AI Working For You</div>
            <div className="rounded-xl border border-white/[.08] p-2">
              {[
                ["Improving internal links across 6 pages", "Working"],
                ["Optimising FAQ structure for AEO", "Queued"],
                ["Reviewing product pages for GEO consistency", "Ready for Review"],
              ].map(([title, state]) => (
                <div key={title} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/[.025]">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${state === "Working" ? "bg-[#49e8ca] soft-pulse" : "bg-white/20"}`} />
                  <div className="min-w-0 flex-1 text-xs leading-5 text-white/68">{title}</div>
                  <GrowthChip tone={state === "Working" ? "mint" : "neutral"}>{state}</GrowthChip>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Opportunities" && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {["All", "SEO", "AEO", "GEO", "Content"].map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-3 py-1.5 text-[11px] ${category === item ? "border-[#49e8ca55] bg-[#49e8ca0a] text-[#49e8ca]" : "border-white/[.08] text-white/42"}`}>{item}</button>)}
            <span className="mx-1 hidden h-4 w-px bg-white/[.08] sm:block" />
            {["All", "Needs Input", "AI Can Handle", "External Action"].map((item) => <button key={item} onClick={() => setExecution(item)} className={`rounded-full border px-3 py-1.5 text-[11px] ${execution === item ? "border-white/20 bg-white/[.05] text-white/72" : "border-white/[.08] text-white/38"}`}>{item === "All" ? "Any status" : item}</button>)}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/[.08] bg-white/[.015] p-4">
                <div className="flex items-center gap-2"><GrowthChip tone="mint">{item.category}</GrowthChip><GrowthChip tone={statusTone(statuses[item.id] || item.state)}>{statuses[item.id] || item.state}</GrowthChip></div>
                <div className="mt-3 text-sm font-semibold">{item.title}</div>
                <p className="mt-1.5 text-xs leading-5 text-white/43">{item.description}</p>
                <div className="mt-3 text-[11px] leading-5 text-white/44"><span className="text-white/25">{item.state === "AI Can Handle" ? "AI will:" : "AI prepared:"}</span> {item.ai}</div>
                {item.state !== "AI Can Handle" && <div className="mt-1 text-[11px] leading-5 text-white/44"><span className="text-white/25">{item.state === "External Action" ? "Required:" : "Need from you:"}</span> {item.user}</div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => openOpportunity(item, item.cta)} className="rounded-lg bg-[#49e8ca] px-3 py-1.5 text-xs font-medium text-[#032c25]">{item.cta}</button>
                  {item.secondary && <button onClick={() => item.secondary === "Run Automatically" ? runAutomatically(item) : setSelected(item)} className="rounded-lg border border-white/[.1] px-3 py-1.5 text-xs text-white/58">{item.secondary}</button>}
                  {!item.secondary && item.state === "AI Can Handle" && <button onClick={() => runAutomatically(item)} className="rounded-lg border border-white/[.1] px-3 py-1.5 text-xs text-white/58">Run Automatically</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Activity" && (
        <div className="mt-5 overflow-hidden rounded-xl border border-white/[.08]">
          {activity.map(([cat, action, state, time], index) => (
            <div key={`${action}-${index}`} className={`grid items-center gap-3 px-4 py-3.5 sm:grid-cols-[70px_1fr_130px_80px] ${index ? "border-t border-white/[.06]" : ""}`}>
              <GrowthChip tone="mint">{cat}</GrowthChip><div className="text-xs text-white/70">{action}</div><GrowthChip tone={statusTone(state)}>{state}</GrowthChip><div className="text-[11px] text-white/30 sm:text-right">{time}</div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <div className="w-full max-w-[520px] rounded-2xl border border-white/[.1] bg-[#07100f] p-5 shadow-[0_30px_90px_rgba(0,0,0,.5)]">
            <div className="flex items-start justify-between gap-4"><div><div className="flex gap-2"><GrowthChip tone="mint">{selected.category}</GrowthChip><GrowthChip tone={statusTone(selected.state)}>{selected.state}</GrowthChip></div><h2 className="mt-3 text-lg font-semibold">{selected.title}</h2></div><button onClick={() => setSelected(null)} className="text-white/35"><X size={18} /></button></div>
            <div className="mt-5 space-y-3 text-xs leading-5">
              {[["Why this matters", selected.description], ["What AI detected", selected.description], ["What AI can handle", selected.ai], ["What you need to provide", selected.user], ["Expected impact", selected.impact]].map(([label, value]) => <div key={label}><div className="text-[10px] uppercase tracking-[.14em] text-white/28">{label}</div><div className="mt-1 text-white/62">{value}</div></div>)}
            </div>
            {selected.state === "External Action" && <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-xs leading-6 text-white/55"><div className="mb-1 font-medium text-white/72">Recommended actions</div>• Create or update relevant product profiles<br />• Pursue relevant industry mentions<br />• Build quality backlinks to priority pages<br />• Collect credible customer references</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="rounded-lg border border-white/[.09] px-3 py-2 text-xs text-white/48">Close</button>
              {selected.state === "AI Can Handle" && <button onClick={() => runAutomatically(selected)} className="rounded-lg bg-[#49e8ca] px-3 py-2 text-xs font-medium text-[#032c25]">Run Automatically</button>}
              {selected.state === "Needs Input" && <button onClick={() => { setInputTarget(selected); setSelected(null); }} className="rounded-lg bg-[#49e8ca] px-3 py-2 text-xs font-medium text-[#032c25]">Provide Input</button>}
            </div>
          </div>
        </div>
      )}

      {inputTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={submitInput} className="w-full max-w-[500px] rounded-2xl border border-white/[.1] bg-[#07100f] p-5">
            <div className="flex items-start justify-between"><div><GrowthChip tone="mint">{inputTarget.category}</GrowthChip><h2 className="mt-3 text-lg font-semibold">{inputTarget.title}</h2></div><button type="button" onClick={() => setInputTarget(null)} className="text-white/35"><X size={18} /></button></div>
            <p className="mt-3 text-xs leading-5 text-white/43">Share the information only you know. AREVEI will handle the research, optimisation, writing and implementation.</p>
            <textarea autoFocus rows={6} value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder="Add your perspective, examples, results or product knowledge…" className="mt-4 w-full resize-none rounded-xl border border-white/[.09] bg-white/[.025] p-3 text-sm leading-6 outline-none placeholder:text-white/25 focus:border-[#49e8ca55]" />
            <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-white/[.1] px-3 py-2 text-xs text-white/38"><span>Optional supporting asset</span><span className="text-[#49e8ca]">Choose file</span><input type="file" className="hidden" /></label>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setInputTarget(null)} className="rounded-lg border border-white/[.09] px-3 py-2 text-xs text-white/48">Cancel</button><button type="submit" disabled={!inputValue.trim()} className="rounded-lg bg-[#49e8ca] px-3 py-2 text-xs font-medium text-[#032c25] disabled:opacity-35">Submit to AI</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

function DashboardHome({ site, userName, mode, setMode, build }) {
  const navigate = useNavigate();
  const [autopilotEnabled, setAutopilotEnabled] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([
    {
      role: "assistant",
      content: "Ask me about your website repository, workspace knowledge, business data, or Brain. Website changes are disabled here.",
    },
  ]);
  const [brainData, setBrainData] = useState({});
  const [versions, setVersions] = useState([]);
  const [team, setTeam] = useState([]);
  const [billing, setBilling] = useState(null);
  const [settingsTab, setSettingsTab] = useState("history");
  const [inviteEmail, setInviteEmail] = useState("");
  const sidebar = [
    [House, "Dashboard", () => setMode("dashboard"), "dashboard"],
    [Sparkle, "AI Workspace", () => navigate("/admin/dev"), "workspace"],
    [Robot, "Manager", () => navigate("/admin/agent"), "manager"],
    [Calendar, "Meetings", () => setMode("meetings"), "meetings"],
    [Brain, "Brain", () => setMode("brain"), "brain"],
    [TrendUp, "Growth", () => setMode("growth"), "growth"],
    [GearSix, "Settings", () => setMode("settings"), "settings"],
  ];
  const stats = [
    [UsersThree, "Visitors (7d)", "12.4K", "18.6%"],
    [Monitor, "Page Views (7d)", "28.7K", "21.3%"],
    [RocketLaunch, "Conversions (7d)", "320", "24.7%"],
    [ChartLineUp, "Conversion Rate (7d)", "2.58%", "15.9%"],
    [Clock, "Avg. Session Duration (7d)", "2m 46s", "9.4%"],
  ];
  const liveHref = build.previewUrl || (site?.slug ? `/s/${site.slug}` : "/admin/dev");
  const hasWorkspacePreview = Boolean(build.previewUrl);
  const panelMap = {
    meetings: {
      title: "Meetings",
      body: "Upcoming website growth calls, publishing reviews, and team check-ins.",
      items: [
        ["Today, 4:30 PM", "Website launch review", "Review first DemoBiz pages and publish checklist."],
        ["Tomorrow, 11:00 AM", "SEO planning", "Confirm service keywords and internal linking targets."],
        ["Friday, 3:00 PM", "Growth report", "Share weekly traffic, conversion, and content progress."],
      ],
    },
  };
  const activePanel = panelMap[mode];

  useEffect(() => {
    if (mode !== "settings") return;
    api.get("/versions").then((r) => setVersions(r.data || [])).catch(() => setVersions([]));
    api.get("/team").then((r) => setTeam(r.data || [])).catch(() => setTeam([]));
    api.get("/billing").then((r) => setBilling(r.data)).catch(() => setBilling(null));
  }, [mode]);

  useEffect(() => {
    const openAssistant = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setAssistantOpen(true);
      }
      if (event.key === "Escape") setAssistantOpen(false);
    };
    window.addEventListener("keydown", openAssistant);
    return () => window.removeEventListener("keydown", openAssistant);
  }, []);

  useEffect(() => {
    if (mode !== "brain") return;
    api.get("/brain").then((response) => setBrainData(response.data || {})).catch(() => {});
  }, [mode]);

  const sendAssistantMessage = async (event) => {
    event?.preventDefault();
    const message = assistantInput.trim();
    if (!message || assistantLoading) return;
    const nextMessages = [...assistantMessages, { role: "user", content: message }];
    setAssistantMessages(nextMessages);
    setAssistantInput("");
    setAssistantLoading(true);
    try {
      const response = await api.post("/dashboard-assistant/chat", {
        message,
        history: assistantMessages,
      });
      setAssistantMessages([
        ...nextMessages,
        { role: "assistant", content: response.data.answer },
      ]);
      if (response.data.brain_updated && response.data.brain) {
        setBrainData(response.data.brain);
        toast.success("Business Brain updated");
      }
    } catch (error) {
      setAssistantMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: error.response?.data?.detail || "I couldn't reach the assistant. Please try again.",
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const inviteTeam = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await api.post("/team/invite", { email: inviteEmail, role: "team_member", permission: "editor" });
      toast.success("Invite created");
      setInviteEmail("");
      const r = await api.get("/team");
      setTeam(r.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invite failed");
    }
  };

  return (
    <Shell className="aw-dashboard-shell">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 hidden h-screen w-[220px] flex-col overflow-hidden border-r border-white/[.07] bg-[#030908] px-4 py-5 lg:flex">
          <Brand className="!h-7" />
          <nav className="mt-8 space-y-1">
            {sidebar.map(([Icon, label, action, id]) => (
              <button key={label} onClick={action} className={`aw-side-link ${mode === id ? "aw-side-link-active" : ""}`}>
                <Icon size={19} /> {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-white/[.08] p-3.5">
            <Headset size={19} className="text-[#49e8ca]" />
            <div className="mt-2 text-sm font-medium text-[#49e8ca]">Need Help?</div>
            <div className="mt-2 text-xs leading-5 text-white/45">Our support team is available 24/7.</div>
            <button onClick={demoNotice} className="mt-4 h-9 w-full rounded-lg border border-[#49e8ca35] text-xs text-[#49e8ca] hover:bg-[#49e8ca08]">Contact Support</button>
          </div>
        </aside>
        <main className="aw-dashboard-main min-w-0 flex-1 px-5 py-3.5 sm:px-7">
          <header className="mb-7 flex h-9 items-center justify-between">
            <button onClick={() => setAssistantOpen(true)} className="mx-auto hidden h-9 w-[360px] items-center justify-between rounded-full border border-white/[.09] px-3.5 text-xs text-white/45 md:flex">
              <span className="flex items-center gap-2"><Sparkle size={16} className="text-[#49e8ca]" /> Ask Arevei anything...</span><span>Ctrl K</span>
            </button>
            <div className="ml-auto flex items-center gap-4">
              <Avatar userName={userName} compact />
            </div>
          </header>

          {mode === "brain" ? (
            <section className="aw-reveal">
              <h1 className="text-4xl font-bold tracking-[-.02em]">Business Brain</h1>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-white/65">This context is used by Arevei to plan content, roadmap tasks, growth recommendations, and website updates.</p>
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {[
                  ["Business", brainData.business_description || "DemoBiz helps growing businesses launch modern websites and measurable digital growth systems."],
                  ["Audience", brainData.target_audience || "Founders, operators, and local service businesses who want website growth without managing multiple vendors."],
                  ["Voice", brainData.brand_voice || "Clear, premium, direct, helpful, and conversion-focused."],
                  ["Goals", brainData.goals || "Increase qualified leads, improve SEO visibility, publish useful content, and keep pages fast."],
                ].map(([title, body]) => (
                  <div key={title} className="aw-glass-card rounded-2xl p-6">
                    <div className="text-sm uppercase tracking-[.16em] text-[#49e8ca]">{title}</div>
                    <div className="mt-3 leading-7 text-white/72">{body}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : mode === "growth" ? (
            <GrowthCommandCenter />
          ) : mode === "settings" ? (
            <section className="aw-reveal">
              <div className="mb-6">
                <h1 className="text-[34px] font-bold tracking-[-.01em]">Settings</h1>
                <p className="mt-2 text-[15px] leading-7 text-white/58">History, team, and billing in one place without leaving the dashboard.</p>
              </div>
              <div className="mb-5 flex flex-wrap gap-2">
                {["history", "team", "billing"].map((item) => (
                  <button key={item} onClick={() => setSettingsTab(item)} className={`h-10 rounded-xl border px-4 text-sm capitalize ${settingsTab === item ? "border-[#49e8ca88] bg-[#49e8ca1a] text-[#49e8ca]" : "border-white/10 text-white/62"}`}>{item}</button>
                ))}
              </div>
              {settingsTab === "history" && (
                <div className="aw-glass-card rounded-2xl p-5">
                  <div className="mb-4 text-sm font-semibold text-[#49e8ca]">Version History</div>
                  {(versions.length ? versions : [{ id: "current", summary: "Current workspace state", created_at: "Ready" }]).map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-white/8 py-3 last:border-b-0">
                      <div><div className="font-semibold">{item.summary}</div><div className="text-xs text-white/45">{item.created_at}</div></div>
                      {item.id !== "current" && <button onClick={() => api.post(`/versions/${item.id}/restore`).then(() => toast.success("Version restored"))} className="rounded-lg border border-white/12 px-3 py-1.5 text-xs">Restore</button>}
                    </div>
                  ))}
                </div>
              )}
              {settingsTab === "team" && (
                <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                  <div className="aw-glass-card rounded-2xl p-5">
                    <div className="mb-4 text-sm font-semibold text-[#49e8ca]">Team Members</div>
                    {team.map((member) => (
                      <div key={member.id || member.email} className="flex items-center justify-between border-b border-white/8 py-3 last:border-b-0">
                        <div><div className="font-semibold">{member.name || member.email}</div><div className="text-xs text-white/45">{member.email}</div></div>
                        <span className="text-xs uppercase tracking-[.12em] text-white/45">{member.role}</span>
                      </div>
                    ))}
                  </div>
                  <div className="aw-glass-card rounded-2xl p-5">
                    <div className="mb-4 text-sm font-semibold text-[#49e8ca]">Invite</div>
                    <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@example.com" className="h-11 w-full rounded-xl border border-white/10 bg-white/[.035] px-3 text-sm outline-none focus:border-[#49e8ca88]" />
                    <button onClick={inviteTeam} className="mt-3 h-10 w-full rounded-xl bg-[#49e8ca] text-sm font-bold text-black">Create Invite</button>
                  </div>
                </div>
              )}
              {settingsTab === "billing" && (
                <div className="grid gap-5 md:grid-cols-3">
                  {[
                    ["Plan", billing?.tenant?.plan_tier || "Self-serve"],
                    ["Billing status", billing?.tenant?.billing_status || "Active"],
                    ["Monthly", `$${billing?.tenant?.monthly_revenue || 0}`],
                  ].map(([label, value]) => (
                    <div key={label} className="aw-glass-card rounded-2xl p-5">
                      <div className="text-xs uppercase tracking-[.16em] text-white/42">{label}</div>
                      <div className="mt-3 text-[30px] font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : activePanel ? (
            <section className="aw-reveal">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-bold tracking-[-.02em]">{activePanel.title}</h1>
                  <p className="mt-3 max-w-2xl text-lg leading-8 text-white/65">{activePanel.body}</p>
                </div>
                <button onClick={demoNotice} className="rounded-xl border border-[#49e8ca55] px-5 py-3 text-[#49e8ca] hover:bg-[#49e8ca12]">
                  Contact Arevei Team
                </button>
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                {activePanel.items.map(([eyebrow, title, body]) => (
                  <div key={title} className="aw-glass-card rounded-2xl p-6">
                    <div className="text-sm uppercase tracking-[.16em] text-[#49e8ca]">{eyebrow}</div>
                    <div className="mt-5 text-2xl font-bold">{title}</div>
                    <p className="mt-3 text-sm leading-6 text-white/58">{body}</p>
                    <button onClick={demoNotice} className="mt-7 inline-flex h-10 items-center gap-2 rounded-lg border border-white/12 px-4 text-sm hover:border-[#49e8ca88]">
                      Open detail <ArrowRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="aw-glass-card mt-6 rounded-2xl p-6">
                <div className="flex items-center gap-3 text-[#49e8ca]"><Sparkle /> Arevei recommendation</div>
                <p className="mt-3 max-w-3xl leading-7 text-white/64">
                  Keep this workflow connected to the AI Workspace so page edits, growth tasks, and reports are grounded in the current website files.
                </p>
              </div>
            </section>
          ) : (
            <div className="aw-reveal">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
                <div>
                  <h1 className="text-4xl font-bold tracking-[-.02em]">Good morning, {userName}!</h1>
                  <p className="mt-4 max-w-xl text-xl leading-8 text-white/65">Arevei is managing your website on autopilot to help you grow effortlessly.</p>
                </div>
                <div className="aw-glass-card flex min-w-[310px] items-center gap-3 rounded-xl p-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#49e8ca0a] text-[#49e8ca]"><GlobeHemisphereWest size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-white/72">Website <span className="inline-flex items-center gap-1.5 text-[#49e8ca]"><span className="h-1.5 w-1.5 rounded-full bg-[#49e8ca]" /> Live</span></div>
                    <div className="mt-1 truncate text-xs text-white/38">{site?.slug || "demobiz"}.com</div>
                  </div>
                  <a href={liveHref} target="_blank" rel="noreferrer" className="rounded-lg border border-white/[.08] px-3 py-2 text-xs text-white/65 transition-colors hover:border-white/15 hover:text-white">View site</a>
                </div>
              </div>

              <div className="mb-4 grid gap-px overflow-hidden rounded-xl border border-white/[.08] bg-white/[.08] lg:grid-cols-5">
                {stats.map(([Icon, label, value, change]) => (
                  <div key={label} className="bg-[#071011]/92 p-4">
                    <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#49e8ca12] text-[#49e8ca]"><Icon size={18} /></span><span className="text-xs text-white/48">{label}</span></div>
                    <div className="mt-2.5 text-[21px] font-semibold">{value}</div>
                    <div className="mt-1 text-xs text-[#49e8ca]">up {change}</div>
                  </div>
                ))}
              </div>

              <div className="grid items-stretch gap-3.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,.72fr)]">
                <div className="aw-glass-card flex min-w-0 flex-col rounded-2xl p-6">
                  <h2 className="mb-4 text-lg font-semibold">Website Overview</h2>
                  <div className="grid min-w-0 flex-1 gap-5 sm:grid-cols-[minmax(0,1.15fr)_minmax(190px,.85fr)]">
                    {hasWorkspacePreview ? (
                      <iframe
                        title="Workspace preview"
                        src={build.previewUrl}
                        className="h-[180px] w-full rounded-xl border border-white/[.08] bg-[#091018]"
                      />
                    ) : (
                      <SiteMock compact />
                    )}
                    <div className="min-w-0">
                      <div className="break-words text-lg font-semibold leading-6">{site?.slug || "demobiz"}.com <span className="ml-1 inline-flex rounded-full bg-[#49e8ca12] px-2 py-0.5 align-middle text-xs font-medium text-[#49e8ca]">Live</span></div>
                      <div className="mt-3 text-sm text-white/55">Last updated: 2 mins ago</div>
                      <div className="mt-6 space-y-3 text-sm text-white/62">
                        <div className="flex justify-between"><span>Pages</span><span>12</span></div>
                        <div className="flex justify-between"><span>Blog Posts</span><span>5</span></div>
                        <div className="flex justify-between"><span>Last Backup</span><span>Today, 3:00 AM</span></div>
                        <div className="flex justify-between"><span>Next AI Update</span><span>Today, 11:00 AM</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Link to="/admin/dev" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#32d6af] text-sm font-semibold text-black shadow-[0_0_28px_rgba(50,214,175,.12)]"><Sparkle size={17} /> Edit with AI</Link>
                    <a href={liveHref} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 text-sm hover:border-white/25">View Website</a>
                  </div>
                </div>

                <div className="aw-glass-card flex min-w-0 flex-col rounded-2xl p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">AI Autopilot</h2>
                      <div className="mt-0.5 text-[11px] text-white/35">{autopilotEnabled ? "Running automatically" : "Paused"}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autopilotEnabled}
                      aria-label="Toggle AI Autopilot"
                      onClick={() => setAutopilotEnabled((enabled) => !enabled)}
                      className={`relative h-6 w-11 rounded-full border transition-colors ${autopilotEnabled ? "border-[#49e8ca55] bg-[#49e8ca28]" : "border-white/10 bg-white/[.05]"}`}
                    >
                      <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${autopilotEnabled ? "left-[22px] bg-[#49e8ca]" : "left-1 bg-white/45"}`} />
                    </button>
                  </div>
                  <div className="aw-bot-orbit aw-bot-orbit-small mx-auto"><RobotFace clean /></div>
                  <div className="mt-4 text-center text-xs text-white/65">{autopilotEnabled ? "All systems running smoothly" : "Autopilot is currently paused"}</div>
                  <div className={`mt-4 space-y-2 text-xs transition-opacity ${autopilotEnabled ? "text-white/72" : "text-white/30 opacity-60"}`}>{["Monitoring performance", "Optimizing SEO", "Updating content", "Improving user experience"].map((item) => <div key={item} className="flex items-center gap-2"><CheckCircle size={14} className="shrink-0 text-[#49e8ca]" weight="fill" /> {item}</div>)}</div>
                  <Link to="/admin/agent" className="mt-auto flex h-10 items-center justify-center rounded-lg border border-white/10 pt-0 text-sm hover:border-[#49e8ca88]">View Autopilot Logs</Link>
                </div>

                <div className="aw-glass-card min-w-0 rounded-2xl p-6 lg:col-span-2">
                  <div className="mb-3.5 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent Activity</h2><button onClick={demoNotice} className="text-xs text-[#49e8ca]">View All</button></div>
                  <div className="grid gap-px overflow-hidden rounded-xl border border-white/[.07] bg-white/[.07] sm:grid-cols-2 xl:grid-cols-4">
                    {["Blog post published", "Meta description updated", "New lead captured", "Website backed up"].map((item, index) => (
                      <div key={item} className="flex min-w-0 items-start gap-3 bg-[#071011] p-4">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#49e8ca0a] text-[#49e8ca]"><FileText size={15} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{item}</div>
                          <div className="mt-1 truncate text-xs text-white/38">{index === 0 ? "How AI Can Grow Your Business" : index === 1 ? "/services" : index === 2 ? "info@demobiz.com" : "May 12, 2024 - 3:00 AM"}</div>
                          <div className="mt-2 text-[11px] text-white/28">{[2, 5, 8, 10][index]}h ago</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-6">
                <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">What Arevei Recommends</h2><button onClick={demoNotice} className="text-white/70">View All</button></div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {[
                    [TrendUp, "Improve page speed for /services", "This page is loading slower than recommended.", "Fix with AI"],
                    [FileText, "Publish 2 more blog posts this week", "Target keywords: AI website, website growth", "Create with AI"],
                    [LinkSimple, "Add internal links to boost SEO", "3 pages have opportunity for internal linking", "Optimize with AI"],
                  ].map(([Icon, title, body, cta]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-5">
                      <Icon size={34} className="text-[#49e8ca]" />
                      <div className="mt-4 font-semibold">{title}</div>
                      <div className="mt-2 text-sm leading-6 text-white/55">{body}</div>
                      <button onClick={demoNotice} className="mt-4 rounded-lg border border-[#49e8ca55] px-4 py-2 text-sm text-[#49e8ca] hover:bg-[#49e8ca12]">{cta}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {assistantOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setAssistantOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Ask Arevei" className="flex h-[min(620px,78vh)] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-white/[.1] bg-[#07100f] shadow-[0_30px_100px_rgba(0,0,0,.55)]">
            <header className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold"><Sparkle size={16} className="text-[#49e8ca]" /> Ask Arevei</div>
                <div className="mt-1 text-[11px] text-white/35">Repository and database context · Website changes disabled</div>
              </div>
              <button onClick={() => setAssistantOpen(false)} aria-label="Close assistant" className="grid h-8 w-8 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/[.05] hover:text-white"><X size={17} /></button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {assistantMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-[#49e8ca] text-[#032c25]" : "border border-white/[.07] bg-white/[.035] text-white/72"}`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {assistantLoading && <div className="text-xs text-white/35">Arevei is reviewing your workspace…</div>}
            </div>
            <form onSubmit={sendAssistantMessage} className="border-t border-white/[.07] p-4">
              <div className="flex items-end gap-2 rounded-xl border border-white/[.09] bg-black/20 p-2 focus-within:border-[#49e8ca55]">
                <textarea
                  autoFocus
                  rows={2}
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) sendAssistantMessage(event);
                  }}
                  placeholder="Ask about your repo, data, or update Brain information…"
                  className="min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/28"
                />
                <button type="submit" disabled={!assistantInput.trim() || assistantLoading} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#49e8ca] text-[#032c25] disabled:opacity-35"><PaperPlaneTilt size={16} weight="fill" /></button>
              </div>
              <div className="mt-2 text-center text-[10px] text-white/25">⌘K on Mac · Ctrl+K on Windows · Shift+Enter for a new line</div>
            </form>
          </section>
        </div>
      )}
    </Shell>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [site, setSite] = useState(null);
  const [mode, setMode] = useState(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    return ["growth", "settings", "brain", "meetings"].includes(view) ? view : "dashboard";
  });
  const [stage, setStage] = useState(() => localStorage.getItem("arevei-demo-stage") || "setup");
  const [building, setBuilding] = useState(false);
  const [build, setBuild] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("arevei-demo-build") || "{}");
    } catch {
      return {};
    }
  });
  const userName = useMemo(() => user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Vinay", [user]);

  useEffect(() => {
    api.get("/site").then((r) => setSite(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const view = new URLSearchParams(location.search).get("view");
    if (["growth", "settings", "brain", "meetings"].includes(view)) setMode(view);
    else if (!view) setMode("dashboard");
  }, [location.search]);

  useEffect(() => {
    if (stage !== "build" || (build.progress || 0) >= 46) return;
    const timer = window.setInterval(() => {
      setBuild((current) => {
        const next = { ...current, progress: Math.min(46, (current.progress || 8) + 3), status: current.status || "Working..." };
        localStorage.setItem("arevei-demo-build", JSON.stringify(next));
        return next;
      });
    }, 420);
    return () => window.clearInterval(timer);
  }, [build.progress, stage]);

  const setStagePersisted = (next) => {
    localStorage.setItem("arevei-demo-stage", next);
    setStage(next);
  };

  const updateBuild = (patch) => {
    setBuild((current) => {
      const next = { ...current, ...patch };
      localStorage.setItem("arevei-demo-build", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    api.get("/workspaces/current").then((res) => {
      if (cancelled) return;
      const workspace = res.data?.workspace;
      const runtime = res.data?.runtime;
      if (workspace?.id && runtime?.preview_url) {
        updateBuild({ workspaceId: workspace.id, previewUrl: runtime.preview_url, progress: 100, status: "Ready to review" });
      } else if (workspace?.id) {
        updateBuild({ workspaceId: workspace.id });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
    // updateBuild intentionally writes local persisted preview state for the active workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startBuild = async () => {
    setBuilding(true);
    setStagePersisted("build");
    updateBuild({ progress: 8, status: "Preparing template...", workspaceId: null, previewUrl: null });
    try {
      const project = await api.post("/projects/start", {
        name: "DemoBiz Website",
        prompt: "Build a polished DemoBiz growth website using the Arevei fixed starter template with home, services, blog, contact, SEO-ready content, and modern dark preview styling.",
      });
      const workspaceId = project.data?.id || project.data?.workspace?.id;
      updateBuild({ progress: 58, status: "Workspace created", workspaceId });
      if (workspaceId) {
        try {
          const runtimeStart = await api.post(`/workspaces/${workspaceId}/runtime/start`, {});
          updateBuild({ progress: 72, status: "Runtime ready", previewUrl: runtimeStart.data?.preview_url || null });
          const preview = await api.post(`/workspaces/${workspaceId}/runtime/ensure-preview`);
          updateBuild({ progress: 100, status: "Ready to review", previewUrl: preview.data?.runtime?.preview_url || preview.data?.preview_url || null });
        } catch {
          updateBuild({ progress: 84, status: "Workspace ready" });
        }
      }
      toast.success("Demo website template loaded into AI Workspace");
    } catch (err) {
      updateBuild({ progress: 46, status: "Demo preview ready" });
      toast.error(err.response?.data?.detail || "Showing demo preview while workspace setup continues.");
    } finally {
      setBuilding(false);
    }
  };

  if (stage === "setup") return <SetupWelcome onFillDemo={() => setStagePersisted("choose")} />;
  if (stage === "choose") return <ChooseFlow userName={userName} onBuild={startBuild} onDashboard={() => setStagePersisted("dashboard")} building={building} />;
  if (stage === "build") return <BuildProgress build={build} siteSlug={site?.slug} onDashboard={() => setStagePersisted("dashboard")} />;
  return <DashboardHome site={site} userName={userName} mode={mode} setMode={setMode} build={build} />;
}
