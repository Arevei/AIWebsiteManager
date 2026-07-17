import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
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
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-1/2 bg-[color:var(--ar-ink)] text-white p-12 flex-col justify-between">
        <Link to="/" className="font-display text-3xl font-black tracking-tighter" data-testid="brand-link">
          AREVEI<span className="text-[color:var(--ar-ai)]">.</span>
        </Link>
        <div>
          <div className="eyebrow text-white/60 mb-4">AI Native CMS</div>
          <div className="font-display text-4xl lg:text-5xl font-black tracking-tighter leading-[1.05]">
            Save time. <br />
            <span className="text-white/40">Scale fast.</span><br />
            Ship anything.
          </div>
        </div>
        <div className="font-mono text-xs text-white/50">Try demo: founder@demo.com / Demo@1234</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form">
          <div className="eyebrow mb-2">Welcome back</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mb-8">Sign in to AREVEI</h1>

          <label className="block mb-5">
            <span className="eyebrow block mb-2">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email"
              className="w-full border-b-2 border-[color:var(--ar-line)] bg-transparent focus:border-[color:var(--ar-ink)] focus:outline-none py-2"
            />
          </label>
          <label className="block mb-8">
            <span className="eyebrow block mb-2">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="login-password"
              className="w-full border-b-2 border-[color:var(--ar-line)] bg-transparent focus:border-[color:var(--ar-ink)] focus:outline-none py-2"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-[color:var(--ar-ink)] text-white py-3 font-mono text-xs uppercase tracking-wider hover:bg-black disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-6 text-sm text-[color:var(--ar-ink-2)]">
            New here? <Link to="/signup" className="underline" data-testid="goto-signup">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
