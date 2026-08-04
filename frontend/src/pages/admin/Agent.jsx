import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import {
  ArrowRight,
  Bell,
  Brain,
  Calendar,
  CheckCircle,
  FileText,
  GearSix,
  GitBranch,
  Headset,
  House,
  Lightning,
  ListChecks,
  PlayCircle,
  Plug,
  RocketLaunch,
  Robot,
  Sparkle,
  TrendUp,
  XCircle,
} from "@phosphor-icons/react";

const LOGO = "/arevei-logo-mark.png";
const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: House },
  { to: "/admin/dev", label: "AI Workspace", icon: Sparkle },
  { to: "/admin/agent", label: "Manager", icon: Robot },
  { to: "/admin/blogs", label: "Blogs", icon: FileText },
  { to: "/admin?view=meetings", label: "Meetings", icon: Calendar },
  { to: "/admin?view=brain", label: "Brain", icon: Brain },
  { to: "/admin?view=growth", label: "Growth", icon: TrendUp },
  { to: "/admin?view=settings", label: "Settings", icon: GearSix },
];

const TABS = [
  { id: "roadmap", label: "Roadmap", icon: GitBranch },
  { id: "goals", label: "Goals", icon: ListChecks },
  { id: "execution", label: "Daily Cycle", icon: PlayCircle },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "notifications", label: "Activity", icon: Bell },
];

const REQUIRED_INTEGRATIONS = {
  gsc: "Google Search Console",
  ga4: "Google Analytics 4",
  bing: "Bing Webmaster",
  schema: "Schema Validator",
  geo: "AI Citation Tracking",
  slack: "Slack",
};

function Field({ label, value, onChange, rows = 2 }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[.16em] text-white/42">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/[.035] p-3 text-sm leading-6 text-white outline-none transition focus:border-[#49e8ca88]"
      />
    </label>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="aw-glass-card grid min-h-[260px] place-items-center rounded-2xl p-8 text-center">
      <div>
        <div className="aw-bot-orbit aw-bot-orbit-small mx-auto mb-6">
          <div className="grid h-20 w-24 place-items-center rounded-[24px] border-[8px] border-[#49e8ca88] bg-[#081014] text-[#49e8ca]">
            <Sparkle size={30} />
          </div>
        </div>
        <div className="text-xl font-bold">{title}</div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/58">{body}</p>
      </div>
    </div>
  );
}

export default function Agent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("roadmap");
  const [settings, setSettings] = useState({ auto_publish_low_risk: false });
  const [roadmap, setRoadmap] = useState({ active: null, draft: null });
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [actions, setActions] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [discovery, setDiscovery] = useState({
    business_description: "DemoBiz helps growing businesses launch modern websites and measurable digital growth systems.",
    target_audience: "Founders, local service businesses, and operators who want growth without managing multiple vendors.",
    goals: "Increase qualified leads, improve SEO visibility, publish useful content, and improve website speed.",
    competitors: "Local agencies, website builders, and SEO consultants.",
    brand_voice: "Clear, premium, direct, helpful, and conversion-focused.",
    strategy_doc: "",
  });
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    const [s, rm, g, t, a, i, rp, n] = await Promise.all([
      api.get("/agent/settings"),
      api.get("/agent/roadmap"),
      api.get("/agent/goals"),
      api.get("/agent/tasks"),
      api.get("/agent/actions"),
      api.get("/agent/integrations"),
      api.get("/agent/reports"),
      api.get("/agent/notifications"),
    ]);
    setSettings(s.data);
    setRoadmap(rm.data);
    setGoals(g.data);
    setTasks(t.data);
    setActions(a.data);
    setIntegrations(i.data);
    setReports(rp.data);
    setNotifs(n.data);
  };

  useEffect(() => { loadAll(); }, []);

  const runDiscovery = async () => {
    setLoading(true);
    try {
      await api.post("/agent/discovery", discovery);
      toast.success("Roadmap drafted");
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to draft roadmap");
    } finally {
      setLoading(false);
    }
  };

  const activate = async (rid) => {
    await api.post(`/agent/roadmap/${rid}/activate`);
    toast.success("Roadmap activated");
    loadAll();
  };

  const proposeBlog = async () => {
    navigate("/admin/blogs?new=1");
  };

  const genGoals = async () => {
    setLoading(true);
    try {
      await api.post("/agent/goals/generate");
      toast.success("Goals generated");
      loadAll();
    } catch {
      toast.error("Failed to generate goals");
    } finally {
      setLoading(false);
    }
  };

  const genTasks = async (gid) => {
    setLoading(true);
    try {
      await api.post(`/agent/goals/${gid}/tasks/generate`);
      toast.success("Tasks generated");
      loadAll();
    } catch {
      toast.error("Failed to generate tasks");
    } finally {
      setLoading(false);
    }
  };

  const runCycle = async () => {
    setLoading(true);
    try {
      const res = await api.post("/agent/cycle/run");
      toast.success(`Executed ${res.data.executed} tasks`);
      loadAll();
    } catch {
      toast.error("Cycle failed");
    } finally {
      setLoading(false);
    }
  };

  const applyAction = async (aid, accept) => {
    await api.post(`/agent/actions/${aid}/apply`, { accept });
    toast.success(accept ? "Published" : "Rejected");
    loadAll();
  };

  const toggleInt = async (item) => {
    if (item.status === "connected") await api.post(`/agent/integrations/${item.type}/disconnect`);
    else await api.post(`/agent/integrations/${item.type}/connect`);
    loadAll();
  };

  const genReport = async () => {
    setLoading(true);
    try {
      await api.post("/agent/reports/generate");
      toast.success("Report generated");
      loadAll();
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoPub = async () => {
    const next = !settings.auto_publish_low_risk;
    await api.patch("/agent/settings", { auto_publish_low_risk: next });
    setSettings({ ...settings, auto_publish_low_risk: next });
  };

  const resetAgent = async () => {
    if (!window.confirm("Clear roadmaps, goals, tasks, actions and reports for this tenant? Your website content stays intact.")) return;
    await api.post("/agent/reset");
    toast.success("Agent state cleared");
    loadAll();
  };

  const tasksByGoal = tasks.reduce((acc, item) => {
    (acc[item.goal_id] = acc[item.goal_id] || []).push(item);
    return acc;
  }, {});
  const connectedCount = integrations.filter((item) => item.status === "connected").length;
  const activeRoadmap = roadmap.active || roadmap.draft;

  return (
    <div className="aw-shell min-h-screen bg-[#030607] text-white">
      <div className="aw-bg-grid" />
      <div className="aw-glow aw-glow-a" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 hidden h-screen w-[220px] flex-col overflow-hidden border-r border-white/[.07] bg-[#030908] px-4 py-5 lg:flex">
          <Link to="/admin" className="inline-flex shrink-0">
            <img src={LOGO} alt="Arevei" className="h-7 w-auto max-w-full object-contain object-left" />
          </Link>
          <nav className="mt-8 space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={`aw-side-link ${to === "/admin/agent" ? "aw-side-link-active" : ""}`}>
                <Icon size={19} /> {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-white/[.08] p-3.5">
            <Headset size={19} className="text-[#49e8ca]" />
            <div className="mt-2 text-sm font-medium text-[#49e8ca]">Need Help?</div>
            <div className="mt-2 text-xs leading-5 text-white/45">Our support team is available 24/7.</div>
            <a href="mailto:vinay@arevei.com" className="mt-4 flex h-9 w-full items-center justify-center rounded-lg border border-[#49e8ca35] text-xs text-[#49e8ca] hover:bg-[#49e8ca08]">Contact Support</a>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-3.5 sm:px-7 lg:ml-[220px]">
          <header className="mb-7 flex h-9 items-center justify-between">
            <div className="mx-auto hidden h-9 w-[360px] items-center justify-between rounded-full border border-white/[.09] px-3.5 text-xs text-white/45 md:flex">
              <span className="flex items-center gap-2"><Sparkle size={16} className="text-[#49e8ca]" /> Ask Arevei anything...</span>
              <span>Ctrl K</span>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#49e8ca] text-[11px] font-bold text-[#032c25]">
                {(user?.name || user?.email || "A").slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden text-sm font-semibold sm:block">{user?.name || "Demo"}</span>
            </div>
          </header>

          <div className="mx-auto max-w-[1120px]">
          <section className="mb-5 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <div className="aw-glass-card rounded-2xl p-5 sm:p-6">
              <div className="mb-3 inline-flex rounded-lg border border-[#49e8ca40] bg-[#07211d] px-3 py-1.5 text-xs text-[#49e8ca]">AI Roadmap Engine</div>
              <h1 className="max-w-[620px] text-[30px] font-bold leading-[1.12] tracking-[-.025em] sm:text-[34px]">
                Your AI website <span className="text-[#49e8ca]">Manager</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
                Arevei turns business context into goals, daily tasks, content actions, reports, and growth recommendations.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={runDiscovery} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#49e8ca] px-4 text-sm font-semibold text-[#032c25] disabled:opacity-60">
                  <Sparkle size={16} /> {loading ? "Drafting..." : "Generate Roadmap"}
                </button>
                <button onClick={proposeBlog} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-medium text-white/72 hover:border-[#49e8ca66]">
                  <FileText size={16} /> Draft Blog
                </button>
              </div>
            </div>
            <div className="aw-glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[.16em] text-white/42">Autopilot Status</div>
                  <div className="mt-1.5 text-lg font-semibold">{activeRoadmap ? "Roadmap online" : "Waiting for discovery"}</div>
                </div>
                <span className="aw-live-dot" />
              </div>
              <div className="mt-4 grid gap-2">
                {["Business context", "Growth strategy", "Monthly goals", "Execution queue"].map((item, index) => (
                  <div key={item} className="flex items-center gap-2.5 rounded-lg border border-white/[.04] bg-white/[.025] px-3 py-2.5 text-xs">
                    <CheckCircle size={14} className={index < 2 || activeRoadmap ? "text-[#49e8ca]" : "text-white/28"} weight="fill" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs ${tab === id ? "border-[#49e8ca70] bg-[#49e8ca10] text-[#49e8ca]" : "border-white/[.08] text-white/55 hover:text-white"}`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
            </div>
            <div className="hidden shrink-0 items-center gap-2 xl:flex">
              <button onClick={resetAgent} className="h-9 rounded-lg border border-white/[.09] px-3 text-xs text-white/55 hover:text-white">Reset</button>
              <button onClick={toggleAutoPub} className={`h-9 rounded-lg border px-3 text-xs ${settings.auto_publish_low_risk ? "border-[#49e8ca66] bg-[#49e8ca0c] text-[#49e8ca]" : "border-white/[.09] text-white/55"}`}>
                Auto publish {settings.auto_publish_low_risk ? "on" : "off"}
              </button>
            </div>
          </div>

          {tab === "roadmap" && (
            <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              <div className="aw-glass-card rounded-2xl p-6">
                <h2 className="text-xl font-bold">Business Discovery</h2>
                <div className="mt-5 space-y-4">
                  <Field label="Business description" value={discovery.business_description} onChange={(value) => setDiscovery({ ...discovery, business_description: value })} />
                  <Field label="Target audience" value={discovery.target_audience} onChange={(value) => setDiscovery({ ...discovery, target_audience: value })} />
                  <Field label="Goals" value={discovery.goals} onChange={(value) => setDiscovery({ ...discovery, goals: value })} />
                  <Field label="Competitors" value={discovery.competitors} onChange={(value) => setDiscovery({ ...discovery, competitors: value })} />
                  <Field label="Brand voice" value={discovery.brand_voice} onChange={(value) => setDiscovery({ ...discovery, brand_voice: value })} />
                </div>
              </div>
              <div className="aw-glass-card rounded-2xl p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Roadmap Preview</h2>
                  {activeRoadmap?.status === "draft" && <button onClick={() => activate(activeRoadmap.id)} className="rounded-xl bg-[#49e8ca] px-4 py-2 text-sm font-bold text-black">Activate</button>}
                </div>
                {!activeRoadmap ? (
                  <EmptyState title="No roadmap yet" body="Generate a roadmap from discovery context to prepare the AI Website Manager." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {(activeRoadmap.content?.quarters || []).map((quarter, index) => (
                      <div key={index} className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
                        <div className="text-xs uppercase tracking-[.16em] text-[#49e8ca]">{quarter.quarter}</div>
                        <div className="mt-2 text-lg font-bold">{quarter.theme}</div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-white/62">
                          {(quarter.milestones || []).map((item) => <li key={item}>- {item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "goals" && (
            <div>
              <div className="mb-4 flex justify-end"><button onClick={genGoals} disabled={loading} className="rounded-xl bg-[#49e8ca] px-4 py-2 font-bold text-black disabled:opacity-60">Generate Goals</button></div>
              {goals.length === 0 ? <EmptyState title="No goals yet" body="Activate a roadmap, then generate monthly goals and execution tasks." /> : (
                <div className="grid gap-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="aw-glass-card rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div><div className="text-xs uppercase tracking-[.16em] text-[#49e8ca]">{goal.month} - {goal.category}</div><div className="mt-2 text-xl font-bold">{goal.goal_text}</div><div className="mt-2 text-sm text-white/55">{goal.why}</div></div>
                        <button onClick={() => genTasks(goal.id)} className="rounded-xl border border-white/12 px-4 py-2 text-sm hover:border-[#49e8ca88]">Break into tasks</button>
                      </div>
                      {(tasksByGoal[goal.id] || []).length > 0 && <div className="mt-4 grid gap-2">{tasksByGoal[goal.id].map((task) => <div key={task.id} className="flex items-center justify-between rounded-xl bg-white/[.035] px-4 py-3 text-sm"><span>{task.description}</span><span className="text-xs uppercase text-white/42">{task.priority} - {task.status}</span></div>)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "execution" && (
            <div>
              <div className="mb-4 flex justify-end"><button onClick={runCycle} disabled={loading} className="rounded-xl bg-[#49e8ca] px-4 py-2 font-bold text-black disabled:opacity-60"><Lightning className="mr-2 inline" />Run Cycle</button></div>
              {actions.length === 0 ? <EmptyState title="Execution queue is empty" body="Generate tasks, then run the daily cycle to create reviewable actions." /> : actions.map((action) => (
                <div key={action.id} className="aw-glass-card mb-3 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[.16em] text-white/42">{action.status} - {action.agent_type || "website"} / {action.workflow_type || action.tool_used || "manual"}</div>
                      <div className="mt-2 font-semibold">{action.deliverable?.title || action.input}</div>
                      <div className="mt-2 text-sm text-white/55">{action.output}</div>
                      {action.deliverable?.meta_description && <div className="mt-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3 text-sm leading-6 text-white/62">{action.deliverable.meta_description}</div>}
                      {action.deliverable?.keywords?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {action.deliverable.keywords.slice(0, 6).map((keyword) => <span key={keyword} className="rounded-lg border border-[#49e8ca30] px-2 py-1 text-[11px] text-[#49e8ca]">{keyword}</span>)}
                        </div>
                      )}
                      {action.deliverable?.review_notes?.length > 0 && <div className="mt-3 text-xs leading-5 text-white/42">Review: {action.deliverable.review_notes[0]}</div>}
                    </div>
                    {action.status === "proposed" && <div className="flex gap-2"><button onClick={() => applyAction(action.id, false)} className="rounded-lg border border-white/12 px-3 py-2 text-sm"><XCircle className="inline" /> Reject</button><button onClick={() => applyAction(action.id, true)} className="rounded-lg bg-[#49e8ca] px-3 py-2 text-sm font-bold text-black"><CheckCircle className="inline" /> Publish</button></div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "integrations" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="aw-glass-card rounded-2xl p-6 md:col-span-2"><div className="text-3xl font-bold">{connectedCount} / {Object.keys(REQUIRED_INTEGRATIONS).length}</div><div className="mt-1 text-white/55">Connected growth integrations</div></div>
              {integrations.map((item) => (
                <div key={item.type} className="aw-glass-card flex items-center justify-between rounded-2xl p-5">
                  <div><div className="font-bold">{REQUIRED_INTEGRATIONS[item.type] || item.type}</div><div className="text-sm uppercase text-white/42">{item.status}</div></div>
                  <button onClick={() => toggleInt(item)} className="rounded-xl border border-white/12 px-4 py-2 text-sm hover:border-[#49e8ca88]">{item.status === "connected" ? "Disconnect" : "Connect"}</button>
                </div>
              ))}
            </div>
          )}

          {tab === "reports" && (
            <div>
              <div className="mb-4 flex justify-end"><button onClick={genReport} disabled={loading} className="rounded-xl bg-[#49e8ca] px-4 py-2 font-bold text-black disabled:opacity-60">Generate Report</button></div>
              {reports.length === 0 ? <EmptyState title="No reports yet" body="Generate the monthly report once goals and actions are available." /> : reports.map((report) => (
                <div key={report.id} className="aw-glass-card mb-4 rounded-2xl p-6"><div className="text-xs uppercase tracking-[.16em] text-white/42">{report.month}</div><div className="mt-2 text-xl font-bold">{report.content?.summary}</div></div>
              ))}
            </div>
          )}

          {tab === "notifications" && (
            <div className="aw-glass-card divide-y divide-white/10 rounded-2xl">
              {notifs.length === 0 ? <div className="p-8 text-center text-white/55">No activity yet.</div> : notifs.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-5"><div><div className="text-xs uppercase tracking-[.16em] text-white/42">{item.type}</div><div className="mt-1">{item.message}</div></div>{!item.read && <span className="aw-live-dot" />}</div>
              ))}
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
