import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTheme, ThemeToggle } from "../lib/theme";
import { toast } from "sonner";

const HERO_DAY = "https://static.prod-images.emergentagent.com/jobs/18e6be65-15c9-4c67-9c3f-b12fcb1e88e2/images/0e73ff25006aef0d3e5985fabd68a281dbb3cedc1ac2ec9db26accbc882ecfce.png";
const HERO_NIGHT = "https://static.prod-images.emergentagent.com/jobs/18e6be65-15c9-4c67-9c3f-b12fcb1e88e2/images/e4bec56c60d032f5469b5c9477cd63db68dacc105ba7dfea00544935abe16cfe.png";

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const nav = useNavigate();
  const [email, setEmail] = useState("founder@demo.com");
  const [password, setPassword] = useState("Demo@1234");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      nav(u.role === "super_admin" ? "/super" : "/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[color:var(--ar-bg)] text-[color:var(--ar-ink)] p-4 gap-4">
      <div
        className="hidden md:flex md:w-1/2 rounded-[28px] overflow-hidden relative text-white p-12 flex-col justify-between"
        style={{ backgroundImage: `url(${theme === "dark" ? HERO_NIGHT : HERO_DAY})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 hero-overlay" />
        <Link to="/" className="relative font-display text-3xl font-extrabold tracking-tighter" data-testid="brand-link">
          AREVEI<span className="text-[color:var(--ar-accent)]">.</span>
        </Link>
        <div className="relative">
          <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 mb-6">AI Native CMS</div>
          <div className="display-hero text-4xl lg:text-5xl">
            Save time.<br />
            <span className="text-[color:var(--ar-accent)]">Scale fast.</span><br />
            Ship anything.
          </div>
        </div>
        <div className="relative font-mono text-xs text-white/60">Try demo: founder@demo.com / Demo@1234</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="blob blob-teal w-[320px] h-[320px] -top-24 -right-24" />
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <form onSubmit={submit} className="w-full max-w-sm relative" data-testid="login-form">
          <div className="eyebrow mb-2 text-[color:var(--ar-ai)]">Welcome back</div>
          <h1 className="font-display text-4xl font-extrabold tracking-tighter mb-8">Sign in to AREVEI</h1>

          <label className="block mb-5">
            <span className="eyebrow block mb-2">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email" className="input" />
          </label>
          <label className="block mb-8">
            <span className="eyebrow block mb-2">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password" className="input" />
          </label>

          <button type="submit" disabled={loading} data-testid="login-submit" className="btn-primary w-full py-3.5 text-sm disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-6 text-sm text-[color:var(--ar-ink-2)]">
            New here? <Link to="/signup" className="text-[color:var(--ar-ai)] font-medium hover:underline" data-testid="goto-signup">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
