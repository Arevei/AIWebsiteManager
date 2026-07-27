import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../lib/api";
import {
  ArrowRight,
  Bell,
  Brain,
  CheckCircle,
  FileText,
  GearSix,
  GitBranch,
  Lightning,
  ListChecks,
  PlayCircle,
  Plug,
  RocketLaunch,
  Sparkle,
  XCircle,
} from "@phosphor-icons/react";

const LOGO = "/arevei-logo.png";

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
    setLoading(true);
    try {
      await api.post("/agent/blog/propose", {});
      toast.success("Blog draft ready for review");
      setTab("execution");
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to draft blog");
    } finally {
      setLoading(false);
    }
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
      <div className="relative z-10">
        <header className="flex h-[76px] items-center justify-between border-b border-white/10 px-8">
          <Link to="/admin"><img src={LOGO} alt="Arevei" className="h-10 w-auto" /></Link>
          <div className="hidden items-center gap-5 md:flex">
            <span className="flex items-center gap-2 text-[#49e8ca]"><Sparkle /> AI Website Manager</span>
            <span className="h-6 w-px bg-white/15" />
            <span className="text-white/60">Preparing roadmap using AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={resetAgent} className="rounded-xl border border-white/12 px-4 py-2 text-sm text-white/72 hover:border-white/30">Reset</button>
            <button onClick={toggleAutoPub} className={`rounded-xl border px-4 py-2 text-sm ${settings.auto_publish_low_risk ? "border-[#49e8ca88] text-[#49e8ca]" : "border-white/12 text-white/72"}`}>
              Auto publish {settings.auto_publish_low_risk ? "on" : "off"}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1450px] px-8 py-8">
          <section className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <div className="aw-glass-card rounded-3xl p-8">
              <div className="mb-4 inline-flex rounded-xl border border-[#49e8ca55] bg-[#07211d] px-4 py-2 text-sm text-[#49e8ca]">AI Roadmap Engine</div>
              <h1 className="text-[46px] font-extrabold leading-tight tracking-[-.02em]">
                Preparing roadmap for your <span className="text-[#49e8ca]">AI Website Manager</span>
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/62">
                Arevei turns business context into goals, daily tasks, content actions, reports, and growth recommendations.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={runDiscovery} disabled={loading} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#49e8ca] px-6 font-bold text-black disabled:opacity-60">
                  <Sparkle /> {loading ? "Drafting..." : "Generate Roadmap"}
                </button>
                <button onClick={proposeBlog} disabled={loading} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/14 px-6 font-bold text-white hover:border-[#49e8ca88]">
                  <FileText /> Draft Blog
                </button>
              </div>
            </div>
            <div className="aw-glass-card rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm uppercase tracking-[.16em] text-white/42">Autopilot Status</div>
                  <div className="mt-2 text-2xl font-bold">{activeRoadmap ? "Roadmap online" : "Waiting for discovery"}</div>
                </div>
                <span className="aw-live-dot" />
              </div>
              <div className="mt-7 grid gap-3">
                {["Business context", "Growth strategy", "Monthly goals", "Execution queue"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-white/[.035] px-4 py-3 text-sm">
                    <CheckCircle className={index < 2 || activeRoadmap ? "text-[#49e8ca]" : "text-white/28"} weight="fill" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mb-7 flex flex-wrap gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm ${tab === id ? "border-[#49e8ca88] bg-[#49e8ca12] text-[#49e8ca]" : "border-white/10 text-white/60 hover:text-white"}`}
              >
                <Icon size={17} /> {label}
              </button>
            ))}
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
                    <div><div className="text-xs uppercase tracking-[.16em] text-white/42">{action.status} - {action.tool_used || "manual"}</div><div className="mt-2">{action.input}</div><div className="mt-2 text-sm text-white/55">{action.output}</div></div>
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
        </main>
      </div>
    </div>
  );
}
