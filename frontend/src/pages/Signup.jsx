import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

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
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-1/2 bg-[color:var(--ar-surface)] p-12 flex-col justify-between">
        <Link to="/" className="font-display text-3xl font-black tracking-tighter">
          AREVEI<span className="text-[color:var(--ar-ai)]">.</span>
        </Link>
        <div>
          <div className="eyebrow mb-4">What you get</div>
          <ul className="space-y-3 text-[color:var(--ar-ink-2)]">
            <li>✓ Pre-built, token-driven website template</li>
            <li>✓ AI Studio with Claude Sonnet 4.6</li>
            <li>✓ SEO/AEO/GEO dashboard</li>
            <li>✓ Versioning & one-click rollback</li>
          </ul>
        </div>
        <div className="font-mono text-xs text-[color:var(--ar-ink-3)]">14-day trial · no card needed</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="signup-form">
          <div className="eyebrow mb-2">Get started</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mb-8">Create your site</h1>

          {[
            ["name", "Your name", "text"],
            ["email", "Work email", "email"],
            ["company", "Company / site name", "text"],
            ["password", "Password", "password"],
          ].map(([k, label, type]) => (
            <label key={k} className="block mb-5">
              <span className="eyebrow block mb-2">{label}</span>
              <input
                type={type}
                value={form[k]}
                onChange={set(k)}
                required={k !== "company"}
                data-testid={`signup-${k}`}
                className="w-full border-b-2 border-[color:var(--ar-line)] bg-transparent focus:border-[color:var(--ar-ink)] focus:outline-none py-2"
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={loading}
            data-testid="signup-submit"
            className="w-full bg-[color:var(--ar-ink)] text-white py-3 font-mono text-xs uppercase tracking-wider hover:bg-black disabled:opacity-60 mt-2"
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <div className="mt-6 text-sm text-[color:var(--ar-ink-2)]">
            Already have one? <Link to="/login" className="underline" data-testid="goto-login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
