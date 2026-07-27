import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import {
  ArrowRight,
  Bell,
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
  ShieldCheck,
  Sparkle,
  SquaresFour,
  TrendUp,
  UsersThree,
} from "@phosphor-icons/react";

const LOGO = "/arevei-logo.png";
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
  return <img src={mark ? MARK : LOGO} alt="Arevei" className={`${mark ? "h-8" : "h-10"} w-auto ${className}`} />;
}

function Avatar({ userName }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#34d9b1] text-sm font-bold text-white shadow-[0_0_28px_rgba(52,217,177,.22)]">VK</span>
      <span className="hidden font-semibold sm:block">{userName}</span>
      <span className="text-white/45">v</span>
    </div>
  );
}

function RobotFace({ large = false }) {
  return (
    <div className={`aw-robot ${large ? "aw-robot-large" : ""}`}>
      <div className="aw-robot-antenna" />
      <div className="aw-robot-ear aw-robot-ear-left" />
      <div className="aw-robot-ear aw-robot-ear-right" />
      <div className="aw-robot-screen">
        <span className="aw-eye" />
        <span className="aw-eye" />
        <span className="aw-smile" />
      </div>
      <img src={MARK} alt="" className="aw-robot-mark" />
    </div>
  );
}

function SetupWelcome({ onFillDemo }) {
  return (
    <Shell>
      <main className="mx-auto flex min-h-screen max-w-[1180px] flex-col items-center justify-center px-6 py-10 text-center">
        <Brand className="aw-reveal mb-8" />
        <div className="aw-reveal aw-delay-1 mb-7 inline-flex items-center gap-2 rounded-xl border border-[#36ebcc55] bg-[#091a17]/80 px-4 py-2 text-base font-semibold text-[#55f5d8] shadow-[0_0_34px_rgba(54,235,204,.18)]">
          <Sparkle size={20} /> Welcome to Arevei
        </div>
        <h1 className="aw-reveal aw-delay-2 max-w-[820px] text-[44px] font-extrabold leading-[1.04] tracking-[-.01em] md:text-[64px]">
          Let's set up your <span className="block text-[#4ce8ca]">AI Website Manager</span>
        </h1>
        <p className="aw-reveal aw-delay-3 mt-6 max-w-[560px] text-[19px] leading-[1.55] text-white/72">
          Arevei helps you build, manage and grow your website on autopilot
        </p>

        <div className="aw-reveal aw-delay-4 mt-10 grid w-full gap-6 text-left md:grid-cols-3">
          {[
            [Sparkle, "AI-Powered Management", "Automate content, updates and optimizations with intelligent AI agents."],
            [ChartLineUp, "Real-Time Insights", "Track performance, traffic and growth with live analytics."],
            [RocketLaunch, "Continuous Growth", "From SEO to speed we constantly improve your website for better results."],
          ].map(([Icon, title, body]) => (
            <div key={title} className="flex gap-5 border-white/10 md:border-r md:pr-8 last:border-r-0">
              <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#10251f] text-[#4ce8ca] shadow-[0_0_30px_rgba(76,232,202,.12)]"><Icon size={27} /></div>
              <div>
                <div className="text-base font-bold">{title}</div>
                <div className="mt-2 text-[15px] leading-6 text-white/72">{body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="aw-reveal aw-delay-5 mt-12 grid w-full max-w-[790px] gap-4 md:grid-cols-[1.12fr_.96fr]">
          <button onClick={onFillDemo} className="aw-primary-choice group flex h-[78px] items-center justify-between rounded-xl bg-[#49e8ca] px-6 text-left text-black shadow-[0_0_60px_rgba(73,232,202,.28)]">
            <span className="flex items-center gap-5">
              <Sparkle size={29} />
              <span>
                <span className="block text-[19px] font-extrabold">Fill Demo Data</span>
                <span className="text-[15px]">Experience Arevei with sample data</span>
              </span>
            </span>
            <ArrowRight size={25} className="transition group-hover:translate-x-1" />
          </button>
          <button onClick={demoNotice} className="aw-glass-card flex h-[78px] items-center gap-5 rounded-xl px-6 text-left text-white/90 hover:border-[#49e8ca99]">
            <FileText size={29} className="text-[#49e8ca]" />
            <span>
              <span className="block text-[19px] font-bold">Start Empty</span>
              <span className="text-[15px] text-white/58">Set up manually from scratch</span>
            </span>
          </button>
        </div>

        <div className="aw-reveal aw-delay-6 mt-8 flex max-w-[560px] items-center justify-center gap-3 text-[15px] leading-6 text-white/58">
          <ShieldCheck size={26} /> Your data is secure with Arevei. You can change or remove demo data anytime.
        </div>
      </main>
    </Shell>
  );
}

function ChooseFlow({ userName, onBuild, onDashboard, building }) {
  return (
    <Shell>
      <main className="min-h-screen px-6 py-6">
        <header className="aw-glass-card mx-auto flex h-[70px] max-w-[1540px] items-center justify-between rounded-xl px-6">
          <Brand />
          <div className="flex items-center gap-5">
            <Bell size={24} className="text-white/70" />
            <Avatar userName={userName} />
          </div>
        </header>
        <section className="mx-auto flex max-w-[1200px] flex-col items-center pt-12 text-center">
          <div className="aw-bot-orbit mb-8">
            <RobotFace large />
          </div>
          <h1 className="aw-reveal text-[38px] font-extrabold leading-[1.18] tracking-[-.01em] md:text-[52px]">
            Hey, I am <span className="text-[#49e8ca]">Arevei,</span><br />
            I am your <span className="text-[#49e8ca]">Pilot</span> for your website growth
          </h1>
          <p className="aw-reveal aw-delay-1 mt-6 max-w-[620px] text-[18px] leading-8 text-white/67">
            I'll help you build, manage, and grow your website on autopilot with the power of AI.
          </p>

          <div className="aw-reveal aw-delay-2 mt-12 grid w-full gap-6 text-left lg:grid-cols-3">
            <button onClick={onBuild} disabled={building} className="aw-flow-card aw-flow-card-active group min-h-[136px] disabled:opacity-70">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#c7ff4a22] text-[#c7ff4a]"><SquaresFour size={28} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[19px] font-bold text-[#c7ff4a]">{building ? "Loading Template" : "Build Website"}</span>
                <span className="mt-2 block text-[15px] leading-6 text-white/68">Create a new website from scratch with Arevei</span>
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c7ff4a] text-black"><ArrowRight size={22} /></span>
            </button>
            <button onClick={demoNotice} className="aw-flow-card group min-h-[136px]">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#10302b] text-[#49e8ca]"><Headset size={28} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[19px] font-bold">Migrate Website with Arevei</span>
                <span className="mt-2 block text-[15px] leading-6 text-white/62">We'll migrate your existing website and optimize it</span>
              </span>
              <ArrowRight size={22} className="text-[#49e8ca]" />
            </button>
            <button onClick={onDashboard} className="aw-flow-card group min-h-[136px]">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/8 text-white"><ArrowRight size={28} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[19px] font-bold">Skip to Dashboard</span>
                <span className="mt-2 block text-[15px] leading-6 text-white/62">Explore your dashboard and features</span>
              </span>
              <ArrowRight size={22} className="text-white/48" />
            </button>
          </div>

          <button onClick={demoNotice} className="mt-8 rounded-full border border-white/10 bg-white/[.035] px-5 py-2 text-white/65 hover:text-white">
            Support Contact
          </button>
          <button onClick={onDashboard} className="mt-16 border-b border-dashed border-white/40 pb-1 text-lg text-white/62 hover:text-white">
            Skip for now, I'll explore on my own
          </button>
        </section>
      </main>
    </Shell>
  );
}

function SiteMock({ compact = false }) {
  return (
    <div className="aw-site-preview overflow-hidden rounded-2xl border border-white/12 bg-[#091018]">
      <div className={`relative ${compact ? "min-h-[246px] p-5" : "min-h-[452px] p-9"} bg-[radial-gradient(circle_at_82%_47%,rgba(72,112,120,.38),transparent_36%),linear-gradient(120deg,#08101b,#121c27)]`}>
        <div className="aw-house" />
        <div className="relative z-10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold text-white"><span className="h-3 w-3 rounded-full bg-[#c7ff4a]" /> DemoBiz</div>
          <div className="hidden gap-7 text-white/75 md:flex"><span>Home</span><span>About</span><span>Services</span><span>Blog</span><span>Contact</span></div>
          <button className="rounded-md bg-[#c7ff4a] px-4 py-2 font-bold text-black">Get In Touch</button>
        </div>
        <div className={`relative z-10 ${compact ? "mt-11 max-w-[260px]" : "mt-20 max-w-[560px]"}`}>
          <div className="mb-5 inline-flex rounded-full border border-[#c7ff4a55] px-3 py-1 text-xs text-[#c7ff4a]">We help brands grow</div>
          <h2 className={`${compact ? "text-[24px]" : "text-[43px]"} font-extrabold leading-tight tracking-[-.02em]`}>We build digital experiences that <span className="text-[#c7ff4a]">drive growth</span></h2>
          {!compact && <p className="mt-5 max-w-md text-sm leading-6 text-white/70">DemoBiz helps businesses grow with stunning websites, smart strategies and measurable results.</p>}
          <div className="mt-7 flex gap-3">
            <button className="rounded-lg bg-[#c7ff4a] px-5 py-3 text-sm font-bold text-black">Our Services</button>
            <button className="rounded-lg border border-white/30 px-5 py-3 text-sm">About Us</button>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-around bg-white px-5 py-6 text-sm font-bold text-[#202529]">
        <span>Trusted by growing brands</span><span>acme</span><span>Cloudify</span><span>Layers</span><span>aven.</span><span>Circooes</span>
      </div>
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
    <Shell>
      <main className="min-h-screen">
        <header className="flex h-[74px] items-center justify-between border-b border-white/10 px-9">
          <Brand />
          <div className="hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-2 text-[#49e8ca]"><Sparkle /> AI Workspace</span>
            <span className="h-6 w-px bg-white/15" />
            <span className="text-white/60">Your AI Website Manager</span>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={demoNotice} className="rounded-xl border border-white/12 px-4 py-2 text-sm text-white/80">Need Help?</button>
            <Bell size={22} className="text-white/70" />
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#34d9b1] text-sm font-bold">VK</span>
          </div>
        </header>
        <section className="mx-auto max-w-[1450px] px-8 py-7">
          <div className="text-center">
            <div className="mb-3 inline-flex rounded-xl border border-[#49e8ca55] bg-[#07211d] px-4 py-2 text-sm text-[#49e8ca] shadow-[0_0_30px_rgba(73,232,202,.12)]">Building Your Website</div>
            <h1 className="text-[43px] font-extrabold tracking-[-.02em]">Let's build your <span className="text-[#49e8ca]">website</span></h1>
            <p className="mt-3 text-lg text-white/65">Using your demo business data, I'll create the first version of your website. You can review everything before it goes live.</p>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.25fr]">
            <div className="aw-glass-card rounded-2xl p-6">
              <div className="mb-7 flex items-center justify-between text-[#49e8ca]">
                <span className="font-semibold">Arevei is working on your website...</span>
                <span className="flex items-center gap-2 text-sm"><span className="aw-live-dot" /> {build.status}</span>
              </div>
              <div className="relative">
                <div className="aw-timeline-line" />
                {steps.map(([title, body], index) => {
                  const complete = index < activeIndex || build.progress >= 100;
                  const active = index === activeIndex && build.progress < 100;
                  return (
                    <div key={title} className={`relative z-10 flex items-center gap-5 rounded-xl p-4 ${active ? "bg-white/[.06]" : ""}`}>
                      <span className={`grid h-11 w-11 place-items-center rounded-full border ${complete || active ? "border-[#49e8ca] bg-[#49e8ca22] text-[#49e8ca]" : "border-white/15 text-white/45"}`}>
                        {complete ? <CheckCircle size={21} weight="fill" /> : active ? <Sparkle size={20} className="animate-spin" /> : index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold">{title}</div>
                        <div className="text-sm text-white/55">{body}</div>
                      </div>
                      <span className={complete ? "text-[#49e8ca]" : active ? "text-[#c7ff4a]" : "text-white/45"}>{complete ? "Completed" : active ? "In Progress" : "Pending"}</span>
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
            <div className="aw-glass-card rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div><div className="font-semibold">Live Preview</div><div className="text-sm text-white/55">This is a live preview of your website being built.</div></div>
                <div className="flex rounded-xl bg-white/7 p-1 text-white/55"><button className="rounded-lg bg-[#12463f] p-3 text-[#49e8ca]"><Monitor /></button><button className="p-3"><SquaresFour /></button></div>
              </div>
              {hasWorkspacePreview ? (
                <iframe
                  title="Workspace preview"
                  src={build.previewUrl}
                  className="h-[452px] w-full rounded-2xl border border-white/12 bg-[#091018]"
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

function DashboardHome({ site, userName, mode, setMode, build }) {
  const navigate = useNavigate();
  const [seo, setSeo] = useState(null);
  const [versions, setVersions] = useState([]);
  const [team, setTeam] = useState([]);
  const [billing, setBilling] = useState(null);
  const [settingsTab, setSettingsTab] = useState("history");
  const [inviteEmail, setInviteEmail] = useState("");
  const sidebar = [
    [House, "Dashboard", () => setMode("dashboard"), "dashboard"],
    [Sparkle, "AI Workspace", () => navigate("/admin/dev"), "workspace"],
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
    if (mode !== "growth" || seo) return;
    api.get("/seo").then((r) => setSeo(r.data)).catch(() => setSeo({}));
  }, [mode, seo]);

  useEffect(() => {
    if (mode !== "settings") return;
    api.get("/versions").then((r) => setVersions(r.data || [])).catch(() => setVersions([]));
    api.get("/team").then((r) => setTeam(r.data || [])).catch(() => setTeam([]));
    api.get("/billing").then((r) => setBilling(r.data)).catch(() => setBilling(null));
  }, [mode]);

  const saveSeo = async () => {
    try {
      await api.put("/seo", seo || {});
      toast.success("Growth settings saved");
    } catch {
      toast.error("Growth save failed");
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
    <Shell>
      <div className="flex min-h-screen">
        <aside className="flex w-[250px] shrink-0 flex-col border-r border-white/10 bg-[#061011]/86 px-5 py-8">
          <Brand />
          <nav className="mt-10 space-y-2">
            {sidebar.map(([Icon, label, action, id]) => (
              <button key={label} onClick={action} className={`aw-side-link ${mode === id ? "aw-side-link-active" : ""}`}>
                <Icon size={25} /> {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 p-5">
            <Headset size={26} className="text-[#49e8ca]" />
            <div className="mt-3 font-semibold text-[#49e8ca]">Need Help?</div>
            <div className="mt-3 text-sm leading-6 text-white/62">Our support team is available 24/7.</div>
            <button onClick={demoNotice} className="mt-5 h-10 w-full rounded-lg border border-[#49e8ca55] text-[#49e8ca] hover:bg-[#49e8ca12]">Contact Support</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-8 py-6">
          <header className="mb-10 flex items-center justify-between">
            <button onClick={demoNotice} className="mx-auto hidden h-12 w-[460px] items-center justify-between rounded-full border border-white/16 px-5 text-white/70 md:flex">
              <span className="flex items-center gap-3"><Sparkle className="text-[#49e8ca]" /> Ask Arevei anything...</span><span>Ctrl K</span>
            </button>
            <div className="ml-auto flex items-center gap-5">
              <Bell size={26} className="text-white/75" />
              <Avatar userName={userName} />
            </div>
          </header>

          {mode === "brain" ? (
            <section className="aw-reveal">
              <h1 className="text-4xl font-bold tracking-[-.02em]">Business Brain</h1>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-white/65">This context is used by Arevei to plan content, roadmap tasks, growth recommendations, and website updates.</p>
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {[
                  ["Business", "DemoBiz helps growing businesses launch modern websites and measurable digital growth systems."],
                  ["Audience", "Founders, operators, and local service businesses who want website growth without managing multiple vendors."],
                  ["Voice", "Clear, premium, direct, helpful, and conversion-focused."],
                  ["Goals", "Increase qualified leads, improve SEO visibility, publish useful content, and keep pages fast."],
                ].map(([title, body]) => (
                  <div key={title} className="aw-glass-card rounded-2xl p-6">
                    <div className="text-sm uppercase tracking-[.16em] text-[#49e8ca]">{title}</div>
                    <div className="mt-3 leading-7 text-white/72">{body}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : mode === "growth" ? (
            <section className="aw-reveal">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-[34px] font-bold tracking-[-.01em]">Growth</h1>
                  <p className="mt-2 max-w-2xl text-[15px] leading-7 text-white/58">SEO, AEO, GEO, schema, and AI citation signals managed from the same dashboard surface.</p>
                </div>
                <button onClick={saveSeo} className="h-10 rounded-xl bg-[#49e8ca] px-5 text-sm font-bold text-black">Save Growth</button>
              </div>
              <div className="mb-5 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
                {[
                  ["SEO Score", "93", "Indexable + meta complete"],
                  ["AEO Coverage", `${seo?.aeo_coverage ?? 88}%`, "FAQ + answer blocks"],
                  ["GEO Readiness", `${seo?.geo_readiness ?? 76}%`, "Citable structured content"],
                ].map(([label, value, note]) => (
                  <div key={label} className="bg-[#071011]/92 p-5">
                    <div className="text-xs uppercase tracking-[.16em] text-white/42">{label}</div>
                    <div className="mt-2 text-[32px] font-bold">{value}</div>
                    <div className="mt-1 text-xs text-white/48">{note}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-5 lg:grid-cols-[1fr_.78fr]">
                <div className="aw-glass-card rounded-2xl p-5">
                  <div className="mb-4 text-sm font-semibold text-[#49e8ca]">Meta Tags</div>
                  <label className="mb-4 block">
                    <span className="mb-2 block text-xs uppercase tracking-[.16em] text-white/42">Meta title</span>
                    <input value={seo?.meta_title || ""} onChange={(e) => setSeo({ ...(seo || {}), meta_title: e.target.value })} className="h-11 w-full rounded-xl border border-white/10 bg-white/[.035] px-3 text-sm outline-none focus:border-[#49e8ca88]" />
                  </label>
                  <label className="mb-4 block">
                    <span className="mb-2 block text-xs uppercase tracking-[.16em] text-white/42">Meta description</span>
                    <textarea rows={4} value={seo?.meta_description || ""} onChange={(e) => setSeo({ ...(seo || {}), meta_description: e.target.value })} className="w-full resize-none rounded-xl border border-white/10 bg-white/[.035] p-3 text-sm leading-6 outline-none focus:border-[#49e8ca88]" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[.16em] text-white/42">Keywords</span>
                    <input value={(seo?.keywords || []).join(", ")} onChange={(e) => setSeo({ ...(seo || {}), keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="h-11 w-full rounded-xl border border-white/10 bg-white/[.035] px-3 text-sm outline-none focus:border-[#49e8ca88]" />
                  </label>
                </div>
                <div className="aw-glass-card rounded-2xl p-5">
                  <div className="mb-4 text-sm font-semibold text-[#49e8ca]">Schema Status</div>
                  <div className="space-y-3">
                    {Object.entries(seo?.schema_status || { organization: true, website: true, faq: false }).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[.025] px-4 py-3 text-sm">
                        <span className="capitalize">{key.replaceAll("_", " ")}</span>
                        <span className={value ? "text-[#49e8ca]" : "text-[#c7ff4a]"}>{value ? "OK" : "Needs update"}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 text-sm font-semibold text-[#49e8ca]">AI Suggestions</div>
                  <div className="mt-3 space-y-3 text-sm text-white/62">
                    {(seo?.suggestions || ["Add FAQ answers to the services page.", "Improve internal links from homepage to service pages."]).map((item, index) => (
                      <div key={index} className="rounded-xl border border-white/8 bg-white/[.025] p-3">{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
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
              <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
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
                <div className="aw-glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-3"><GlobeHemisphereWest className="text-[#49e8ca]" /> Website Status <span className="aw-live-dot" /> <span className="text-[#49e8ca]">Live</span></div>
                  <div className="mt-4 flex items-center gap-5 text-white/60"><span>{site?.slug || "demobiz"}.com</span><a href={liveHref} target="_blank" rel="noreferrer" className="rounded-xl bg-white/8 px-4 py-2 text-white hover:bg-white/12">View Website</a></div>
                </div>
              </div>

              <div className="mb-6 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-5">
                {stats.map(([Icon, label, value, change]) => (
                  <div key={label} className="bg-[#071011]/92 p-6">
                    <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#49e8ca22] text-[#49e8ca]"><Icon size={25} /></span><span className="text-sm text-white/65">{label}</span></div>
                    <div className="mt-4 text-3xl font-bold">{value}</div>
                    <div className="mt-2 text-sm text-[#49e8ca]">up {change}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.4fr_.85fr_.95fr]">
                <div className="aw-glass-card rounded-2xl p-6">
                  <h2 className="mb-5 text-xl font-bold">Website Overview</h2>
                  <div className="grid gap-5 md:grid-cols-[1fr_.72fr]">
                    {hasWorkspacePreview ? (
                      <iframe
                        title="Workspace preview"
                        src={build.previewUrl}
                        className="h-[246px] w-full rounded-2xl border border-white/12 bg-[#091018]"
                      />
                    ) : (
                      <SiteMock compact />
                    )}
                    <div>
                      <div className="text-xl font-bold">{site?.slug || "demobiz"}.com <span className="rounded-full bg-[#49e8ca22] px-3 py-1 text-sm text-[#49e8ca]">Live</span></div>
                      <div className="mt-3 text-sm text-white/55">Last updated: 2 mins ago</div>
                      <div className="mt-8 space-y-4 text-sm text-white/72">
                        <div className="flex justify-between"><span>Pages</span><span>12</span></div>
                        <div className="flex justify-between"><span>Blog Posts</span><span>5</span></div>
                        <div className="flex justify-between"><span>Last Backup</span><span>Today, 3:00 AM</span></div>
                        <div className="flex justify-between"><span>Next AI Update</span><span>Today, 11:00 AM</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Link to="/admin/dev" className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[#32d6af] font-bold text-black shadow-[0_0_38px_rgba(50,214,175,.16)]"><Sparkle /> Edit with AI</Link>
                    <a href={liveHref} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-3 rounded-xl border border-white/14 hover:border-white/35">View Website</a>
                  </div>
                </div>

                <div className="aw-glass-card rounded-2xl p-6">
                  <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">AI Autopilot</h2><span className="rounded-full bg-[#49e8ca22] px-3 py-1 text-sm text-[#49e8ca]">Active</span></div>
                  <div className="aw-bot-orbit aw-bot-orbit-small mx-auto"><RobotFace /></div>
                  <div className="mt-6 text-center text-sm">All systems running smoothly</div>
                  <div className="mt-6 space-y-3 text-sm">{["Monitoring performance", "Optimizing SEO", "Updating content", "Improving user experience"].map((item) => <div key={item} className="flex items-center gap-3"><CheckCircle className="text-[#49e8ca]" weight="fill" /> {item}</div>)}</div>
                  <Link to="/admin/agent" className="mt-6 flex h-11 items-center justify-center rounded-xl border border-white/14 hover:border-[#49e8ca88]">View Autopilot Logs</Link>
                </div>

                <div className="aw-glass-card rounded-2xl p-6">
                  <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">Recent Activity</h2><button onClick={demoNotice} className="text-[#49e8ca]">View All</button></div>
                  {["Blog post published", "Meta description updated", "New lead captured", "Website backed up"].map((item, index) => (
                    <div key={item} className="flex items-start gap-4 border-b border-white/8 py-4 last:border-b-0">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 text-[#49e8ca]"><FileText /></span>
                      <div className="flex-1"><div>{item}</div><div className="mt-1 text-sm text-white/50">{index === 0 ? "How AI Can Grow Your Business" : index === 1 ? "/services" : index === 2 ? "info@demobiz.com" : "May 12, 2024 - 3:00 AM"}</div></div>
                      <span className="text-sm text-white/45">{[2, 5, 8, 10][index]}h ago</span>
                    </div>
                  ))}
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
