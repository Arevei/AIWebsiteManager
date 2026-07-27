import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ThemeToggle } from "../lib/theme";

const TOP_NAV = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/dev", label: "Workspace" },
  { to: "/admin/agent", label: "Agent" },
  { to: "/admin/ai", label: "AI Studio" },
  { to: "/admin/talk", label: "Talk" },
  { to: "/admin/content", label: "Content" },
  { to: "/admin/design", label: "Design" },
  { to: "/admin/seo", label: "SEO / AEO" },
  { to: "/admin/versions", label: "History" },
  { to: "/admin/team", label: "Team" },
  { to: "/admin/billing", label: "Billing" },
];

export default function AdminShell({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-[color:var(--ar-bg)] text-[color:var(--ar-ink)] flex flex-col" data-testid="admin-shell">
      <header className="glass-nav px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6 min-w-0">
          <Link to="/admin" className="font-display text-xl font-extrabold tracking-tighter shrink-0" data-testid="brand-link">
            AREVEI<span className="text-[color:var(--ar-accent)]">.</span>
          </Link>
          <nav className="flex max-w-[calc(100vw-220px)] items-center gap-1 overflow-x-auto text-[12px] font-medium">
            {TOP_NAV.map((n) => {
              const active = loc.pathname === n.to || (n.to !== "/admin" && loc.pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  data-testid={`nav-${n.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  className={`px-2.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${active ? "bg-[color:var(--ar-ink)] text-[color:var(--ar-bg)]" : "text-[color:var(--ar-ink-2)] hover:text-[color:var(--ar-ink)] hover:bg-[color:var(--ar-surface)]"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm shrink-0">
          <span className="hidden sm:inline text-[color:var(--ar-ink-3)] font-mono text-xs" data-testid="user-email">{user?.email}</span>
          <ThemeToggle />
          <button onClick={logout} data-testid="logout-btn" className="btn-outline px-4 py-1.5 text-[13px]">
            Sign out
          </button>
        </div>
      </header>

      <div className="px-6 py-8 border-b border-[color:var(--ar-line)] bg-[color:var(--ar-surface)] relative overflow-hidden">
        <div className="blob blob-teal w-[280px] h-[280px] -top-32 right-10" />
        <div className="flex items-start justify-between gap-6 flex-wrap relative">
          <div>
            <div className="eyebrow mb-2 text-[color:var(--ar-ai)]">{subtitle}</div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tighter" data-testid="page-title">{title}</h1>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </div>

      <main className="flex-1 px-6 py-8">{children}</main>

      <footer className="border-t border-[color:var(--ar-line)] px-6 py-4 text-xs font-mono text-[color:var(--ar-ink-3)] flex justify-between">
        <span>AREVEI / Single codebase / Multi-tenant</span>
        <span>v0.1</span>
      </footer>
    </div>
  );
}
