import React from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../lib/theme";

export default function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 glass-nav px-6 py-3.5" data-testid="marketing-nav">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-2xl font-extrabold tracking-tighter" data-testid="brand-home">
          AREVEI<span className="text-[color:var(--ar-accent)]">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[color:var(--ar-ink-2)]">
          <Link href="#how" data-testid="nav-how" className="hover:text-[color:var(--ar-ink)] transition-colors">How it works</Link>
          <Link href="#features" data-testid="nav-features" className="hover:text-[color:var(--ar-ink)] transition-colors">Features</Link>
          <Link href="#pricing" data-testid="nav-pricing" className="hover:text-[color:var(--ar-ink)] transition-colors">Pricing</Link>
          <Link to="/login" data-testid="nav-login" className="hover:text-[color:var(--ar-ink)] transition-colors">Sign in</Link>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/signup" data-testid="nav-get-started" className="btn-primary px-5 py-2.5 text-[13px]">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
