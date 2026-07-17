import React, { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { CheckCircle, XCircle, Plug, PlayCircle, Sparkle, FileText, Bell } from "@phosphor-icons/react";

const TABS = [
  { id: "roadmap", label: "Roadmap" },
  { id: "goals", label: "Goals & Tasks" },
  { id: "execution", label: "Daily Cycle" },
  { id: "integrations", label: "Integrations" },
  { id: "reports", label: "Reports" },
  { id: "notifications", label: "Activity" },
];

const REQUIRED_INTEGRATIONS = {
  gsc: "Google Search Console", ga4: "Google Analytics 4",
  bing: "Bing Webmaster", schema: "Schema Validator",
  geo: "AI Citation Tracking", slack: "Slack",
};

export default function Agent() {
  const [tab, setTab] = useState("roadmap");
  const [settings, setSettings] = useState({ auto_publish_low_risk: false, discovery_done: false });
  const [roadmap, setRoadmap] = useState({ active: null, draft: null });
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [actions, setActions] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [discovery, setDiscovery] = useState({
    business_description: "", target_audience: "", goals: "",
    competitors: "", brand_voice: "", strategy_doc: "",
  });
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    const [s, rm, g, t, a, i, rp, n] = await Promise.all([
      api.get("/agent/settings"), api.get("/agent/roadmap"),
      api.get("/agent/goals"), api.get("/agent/tasks"),
      api.get("/agent/actions"), api.get("/agent/integrations"),
      api.get("/agent/reports"), api.get("/agent/notifications"),
    ]);
    setSettings(s.data); setRoadmap(rm.data); setGoals(g.data);
    setTasks(t.data); setActions(a.data); setIntegrations(i.data);
    setReports(rp.data); setNotifs(n.data);
  };
  useEffect(() => { loadAll(); }, []);

  const runDiscovery = async () => {
    setLoading(true);
    try { await api.post("/agent/discovery", discovery); toast.success("Roadmap drafted"); loadAll(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };
  const activate = async (rid) => {
    await api.post(`/agent/roadmap/${rid}/activate`);
    toast.success("Roadmap activated");
    loadAll();
    // Ask if the founder wants the agent to draft the first blog
    setTimeout(() => {
      if (window.confirm("Roadmap saved. Want me to draft your first blog post based on this strategy? You'll review and approve it before it publishes.")) {
        proposeBlog();
      }
    }, 300);
  };
  const proposeBlog = async () => {
    setLoading(true);
    try {
      await api.post("/agent/blog/propose", {});
      toast.success("Blog drafted — see 'Daily Cycle' tab to review");
      setTab("execution");
      loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to draft blog"); }
    finally { setLoading(false); }
  };
  const genGoals = async () => { setLoading(true); try { await api.post("/agent/goals/generate"); toast.success("Goals generated"); loadAll(); } catch { toast.error("Failed"); } finally { setLoading(false); } };
  const genTasks = async (gid) => { setLoading(true); try { await api.post(`/agent/goals/${gid}/tasks/generate`); toast.success("Tasks generated"); loadAll(); } catch { toast.error("Failed"); } finally { setLoading(false); } };
  const runCycle = async () => { setLoading(true); try { const r = await api.post("/agent/cycle/run"); toast.success(`Executed ${r.data.executed} tasks`); loadAll(); } catch { toast.error("Cycle failed"); } finally { setLoading(false); } };
  const applyAction = async (aid, accept) => { await api.post(`/agent/actions/${aid}/apply`, { accept }); toast.success(accept ? "Published" : "Rejected"); loadAll(); };
  const toggleInt = async (i) => { if (i.status === "connected") { await api.post(`/agent/integrations/${i.type}/disconnect`); } else { await api.post(`/agent/integrations/${i.type}/connect`); } loadAll(); };
  const genReport = async () => { setLoading(true); try { await api.post("/agent/reports/generate"); toast.success("Report generated"); loadAll(); } catch { toast.error("Failed"); } finally { setLoading(false); } };
  const toggleAutoPub = async () => { const v = !settings.auto_publish_low_risk; await api.patch("/agent/settings", { auto_publish_low_risk: v }); setSettings({ ...settings, auto_publish_low_risk: v }); };
  const resetAgent = async () => {
    if (!window.confirm("Wipe all roadmaps, goals, tasks, actions and reports for this tenant? Your website content stays intact.")) return;
    await api.post("/agent/reset");
    toast.success("Agent state cleared");
    loadAll();
  };

  const tasksByGoal = tasks.reduce((acc, t) => { (acc[t.goal_id] = acc[t.goal_id] || []).push(t); return acc; }, {});
  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  return (
    <AdminShell
      title="AI Website Manager"
      subtitle="Strategy · Goals · Execution · Reports"
      actions={
        <div className="flex items-center gap-3">
          <button onClick={resetAgent} data-testid="reset-agent" className="border border-[color:var(--ar-line)] px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-[color:var(--ar-surface)]">Reset agent</button>
          <label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={settings.auto_publish_low_risk} onChange={toggleAutoPub} data-testid="toggle-autopub" />
            Auto-publish low-risk
          </label>
        </div>
      }
    >
      <div className="flex flex-wrap gap-1 border-b border-[color:var(--ar-line)] mb-6">
        {TABS.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} data-testid={`tab-${tb.id}`}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 ${tab === tb.id ? "border-[color:var(--ar-ink)] text-[color:var(--ar-ink)]" : "border-transparent text-[color:var(--ar-ink-2)]"}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ROADMAP */}
      {tab === "roadmap" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ar-card p-5" data-testid="discovery-panel">
            <div className="eyebrow mb-3">Discovery</div>
            <h3 className="font-display text-2xl font-bold tracking-tighter mb-4">Tell the agent about your business</h3>
            {["business_description", "target_audience", "goals", "competitors", "brand_voice"].map((f) => (
              <label key={f} className="block mb-3">
                <span className="eyebrow text-[10px] block mb-1">{f.replace(/_/g, " ")}</span>
                <textarea rows={2} value={discovery[f]} onChange={(e) => setDiscovery({ ...discovery, [f]: e.target.value })} data-testid={`disc-${f}`} className="w-full border border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none p-2 font-mono text-xs" />
              </label>
            ))}
            <label className="block mb-3">
              <span className="eyebrow text-[10px] block mb-1">Or paste your own strategy doc (optional)</span>
              <textarea rows={3} value={discovery.strategy_doc} onChange={(e) => setDiscovery({ ...discovery, strategy_doc: e.target.value })} data-testid="disc-doc" className="w-full border border-[color:var(--ar-line)] focus:border-[color:var(--ar-ink)] focus:outline-none p-2 font-mono text-xs" />
            </label>
            <button onClick={runDiscovery} disabled={loading} data-testid="run-discovery" className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black disabled:opacity-60">
              {loading ? "Drafting…" : "Generate Roadmap"}
            </button>
          </div>

          <div className="ar-card p-5">
            <div className="eyebrow mb-3">Current roadmap</div>
            {!roadmap.active && !roadmap.draft && (
              <div className="font-mono text-sm text-[color:var(--ar-ink-3)] py-6">No roadmap yet. Run discovery →</div>
            )}
            {(roadmap.active || roadmap.draft) && (
              <div>
                {(() => {
                  const r = roadmap.active || roadmap.draft;
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-display text-2xl font-bold tracking-tighter">12-month roadmap</div>
                          <div className="font-mono text-xs uppercase text-[color:var(--ar-ink-3)]">{r.source} · {r.status}</div>
                        </div>
                        {r.status === "draft" && (
                          <button onClick={() => activate(r.id)} data-testid="activate-roadmap" className="bg-[color:var(--ar-ink)] text-white px-3 py-2 font-mono text-xs uppercase tracking-wider">Activate</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(r.content?.quarters || []).map((q, i) => (
                          <div key={i} className="ar-card-soft p-4">
                            <div className="font-mono text-xs uppercase text-[color:var(--ar-ai)]">{q.quarter}</div>
                            <div className="font-display text-lg font-bold tracking-tighter">{q.theme}</div>
                            <ul className="mt-2 space-y-1 text-sm text-[color:var(--ar-ink-2)]">
                              {(q.milestones || []).map((m, j) => <li key={j}>› {m}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GOALS & TASKS */}
      {tab === "goals" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="eyebrow">Active goals · this month</div>
            <button onClick={genGoals} disabled={loading} data-testid="gen-goals" className="bg-[color:var(--ar-ink)] text-white px-3 py-2 font-mono text-xs uppercase tracking-wider disabled:opacity-60"><Sparkle size={12} className="inline mr-1" /> Generate this month's goals</button>
          </div>
          {goals.length === 0 ? <div className="ar-card p-6 text-center font-mono text-sm text-[color:var(--ar-ink-3)]">No goals yet. Activate a roadmap, then generate.</div> :
            <div className="space-y-4">
              {goals.map((g) => (
                <div key={g.id} className="ar-card p-5" data-testid={`goal-${g.id}`}>
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--ar-ai)]">{g.month} · {g.category}</div>
                      <div className="font-display text-xl font-bold tracking-tighter">{g.goal_text}</div>
                      <div className="text-sm text-[color:var(--ar-ink-2)] mt-1">{g.why}</div>
                    </div>
                    <button onClick={() => genTasks(g.id)} data-testid={`gen-tasks-${g.id}`} className="border border-[color:var(--ar-ink)] px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:bg-[color:var(--ar-surface)] whitespace-nowrap">Break into tasks</button>
                  </div>
                  {(tasksByGoal[g.id] || []).length > 0 && (
                    <ul className="mt-3 divide-y divide-[color:var(--ar-line)] border-t border-[color:var(--ar-line)]">
                      {tasksByGoal[g.id].map((t) => (
                        <li key={t.id} className="py-2 flex items-center justify-between text-sm" data-testid={`task-${t.id}`}>
                          <span>› {t.description}</span>
                          <span className="font-mono text-[10px] uppercase text-[color:var(--ar-ink-3)]">{t.priority} · {t.effort} · {t.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* EXECUTION */}
      {tab === "execution" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="eyebrow">Daily cycle</div>
            <button onClick={runCycle} disabled={loading} data-testid="run-cycle" className="bg-[color:var(--ar-ai)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-red-600 disabled:opacity-60"><PlayCircle size={14} weight="fill" className="inline mr-1" /> Run cycle now</button>
          </div>
          {actions.length === 0 ? <div className="ar-card p-6 text-center font-mono text-sm text-[color:var(--ar-ink-3)]">Nothing executed yet. Generate tasks then run the cycle.</div> :
            <div className="space-y-3">
              {actions.map((a) => (
                <div key={a.id} className="ar-card p-4" data-testid={`action-${a.id}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] uppercase text-[color:var(--ar-ink-3)]">{a.status} · {a.tool_used || "manual"} · {(a.diff?.changes || []).length} changes</div>
                      <div className="text-sm">{a.input}</div>
                      <div className="font-mono text-xs text-[color:var(--ar-ink-2)] mt-1">{a.output}</div>
                    </div>
                    {a.status === "proposed" && (
                      <div className="flex gap-2">
                        <button onClick={() => applyAction(a.id, false)} data-testid={`reject-${a.id}`} className="border border-[color:var(--ar-line)] px-2 py-1 font-mono text-[10px] uppercase"><XCircle size={12} className="inline" /> Reject</button>
                        <button onClick={() => applyAction(a.id, true)} data-testid={`publish-${a.id}`} className="bg-[color:var(--ar-ink)] text-white px-2 py-1 font-mono text-[10px] uppercase"><CheckCircle size={12} className="inline" /> Publish</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* INTEGRATIONS */}
      {tab === "integrations" && (
        <div>
          <div className="ar-card p-4 mb-4 flex items-center justify-between" data-testid="integrations-status">
            <div>
              <div className="eyebrow">Connections</div>
              <div className="font-display text-3xl font-black tracking-tighter">{connectedCount} <span className="text-[color:var(--ar-ink-3)] text-base font-mono">/ {Object.keys(REQUIRED_INTEGRATIONS).length} connected</span></div>
            </div>
            <Plug size={32} className="text-[color:var(--ar-ink-3)]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrations.map((i) => (
              <div key={i.type} className="ar-card p-4 flex items-center justify-between" data-testid={`int-${i.type}`}>
                <div>
                  <div className="font-display font-bold tracking-tighter">{REQUIRED_INTEGRATIONS[i.type] || i.type}</div>
                  <div className="font-mono text-[10px] uppercase text-[color:var(--ar-ink-3)]">{i.status}</div>
                </div>
                <button onClick={() => toggleInt(i)} data-testid={`int-toggle-${i.type}`} className={`px-3 py-2 font-mono text-xs uppercase tracking-wider ${i.status === "connected" ? "border border-[color:var(--ar-line)]" : "bg-[color:var(--ar-ink)] text-white"}`}>
                  {i.status === "connected" ? "Disconnect" : "Connect"}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 font-mono text-xs text-[color:var(--ar-ink-3)]">⚠️ Connections are MOCKED — real OAuth flow plugs in when you provide credentials.</div>
        </div>
      )}

      {/* REPORTS */}
      {tab === "reports" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="eyebrow">Monthly reports</div>
            <button onClick={genReport} disabled={loading} data-testid="gen-report" className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider disabled:opacity-60"><FileText size={14} className="inline mr-1" /> Generate this month's report</button>
          </div>
          {reports.length === 0 ? <div className="ar-card p-6 text-center font-mono text-sm text-[color:var(--ar-ink-3)]">No reports yet.</div> :
            <div className="space-y-4">
              {reports.map((r) => (
                <div key={r.id} className="ar-card p-5" data-testid={`report-${r.id}`}>
                  <div className="font-mono text-xs uppercase text-[color:var(--ar-ink-3)]">{r.month}</div>
                  <div className="font-display text-xl font-bold tracking-tighter mb-2">{r.content?.summary}</div>
                  {r.content?.metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-3">
                      {Object.entries(r.content.metrics).map(([k, v]) => (
                        <div key={k} className="ar-card-soft p-2"><div className="eyebrow text-[10px]">{k}</div><div className="font-display font-bold">{String(v)}</div></div>
                      ))}
                    </div>
                  )}
                  {r.content?.wins?.length > 0 && (
                    <>
                      <div className="eyebrow mt-3 mb-1">Wins</div>
                      <ul className="text-sm space-y-1">{r.content.wins.map((w, i) => <li key={i}>✓ {w}</li>)}</ul>
                    </>
                  )}
                  {r.content?.recommendations?.length > 0 && (
                    <>
                      <div className="eyebrow mt-3 mb-1">Next month</div>
                      <ul className="text-sm space-y-1 text-[color:var(--ar-ink-2)]">{r.content.recommendations.map((w, i) => <li key={i}>→ {w}</li>)}</ul>
                    </>
                  )}
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div>
          <div className="eyebrow mb-3 flex items-center gap-2"><Bell size={14} /> Agent activity</div>
          {notifs.length === 0 ? <div className="ar-card p-6 text-center font-mono text-sm text-[color:var(--ar-ink-3)]">No activity yet.</div> :
            <div className="ar-card divide-y divide-[color:var(--ar-line)]">
              {notifs.map((n) => (
                <div key={n.id} className="p-4 flex items-start justify-between" data-testid={`notif-${n.id}`}>
                  <div>
                    <div className="font-mono text-[10px] uppercase text-[color:var(--ar-ink-3)]">{n.type} · {new Date(n.sent_at).toLocaleString()}</div>
                    <div>{n.message}</div>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-[color:var(--ar-ai)] mt-2" />}
                </div>
              ))}
            </div>
          }
        </div>
      )}
    </AdminShell>
  );
}
