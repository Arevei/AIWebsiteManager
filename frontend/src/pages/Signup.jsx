import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ThemeToggle } from "../lib/theme";
import { toast } from "sonner";
import { Check } from "@phosphor-icons/react";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form);
      toast.success("Account created — welcome!");
      nav("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[color:var(--ar-bg)] text-[color:var(--ar-ink)] p-4 gap-4">
      <div className="hidden md:flex md:w-1/2 rounded-[28px] relative overflow-hidden bg-[color:var(--ar-surface)] border border-[color:var(--ar-line)] p-12 flex-col justify-between">
        <div className="blob blob-teal w-[380px] h-[380px] -top-28 -left-28" />
        <div className="blob blob-lime w-[300px] h-[300px] -bottom-24 -right-20" />
        <Link to="/" className="relative font-display text-3xl font-extrabold tracking-tighter">
          AREVEI<span className="text-[color:var(--ar-accent)]">.</span>
        </Link>
        <div className="relative">
          <span className="eyebrow-pill mb-6">What you get</span>
          <ul className="space-y-4 text-[color:var(--ar-ink-2)] mt-6 text-[15px]">
            {["Pre-built, token-driven website template", "AI Studio with Claude Sonnet 4.6", "SEO/AEO/GEO dashboard", "Versioning & one-click rollback"].map((li) => (
              <li key={li} className="flex items-start gap-2.5">
                <Check size={17} weight="bold" className="text-[color:var(--ar-ai)] mt-0.5 shrink-0" /> {li}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative font-mono text-xs text-[color:var(--ar-ink-3)]">14-day trial · no card needed</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="signup-form">
          <div className="eyebrow mb-2 text-[color:var(--ar-ai)]">Get started</div>
          <h1 className="font-display text-4xl font-extrabold tracking-tighter mb-8">Create your site</h1>

          {[
            ["name", "Your name", "text"],
            ["email", "Work email", "email"],
            ["company", "Company / site name", "text"],
            ["password", "Password", "password"],
          ].map(([k, label, type]) => (
            <label key={k} className="block mb-5">
              <span className="eyebrow block mb-2">{label}</span>
              <input type={type} value={form[k]} onChange={set(k)} required={k !== "company"} data-testid={`signup-${k}`} className="input" />
            </label>
          ))}

          <button type="submit" disabled={loading} data-testid="signup-submit" className="btn-primary w-full py-3.5 text-sm disabled:opacity-60 mt-2">
            {loading ? "Creating…" : "Create account"}
          </button>

          <div className="mt-6 text-sm text-[color:var(--ar-ink-2)]">
            Already have one? <Link to="/login" className="text-[color:var(--ar-ai)] font-medium hover:underline" data-testid="goto-login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
