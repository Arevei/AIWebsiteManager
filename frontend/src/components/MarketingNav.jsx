import React from "react";
import { Link } from "react-router-dom";

export default function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[color:var(--ar-line)] px-6 py-4" data-testid="marketing-nav">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-2xl font-black tracking-tighter" data-testid="brand-home">
          AREVEI<span className="text-[color:var(--ar-ai)]">.</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--ar-ink-2)]">
          <a href="#how" data-testid="nav-how">How it works</a>
          <a href="#features" data-testid="nav-features">Features</a>
          <a href="#pricing" data-testid="nav-pricing">Pricing</a>
          <Link to="/login" data-testid="nav-login">Sign in</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/signup"
            data-testid="nav-get-started"
            className="bg-[color:var(--ar-ink)] text-white px-4 py-2 font-mono text-xs uppercase tracking-wider hover:bg-black"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
