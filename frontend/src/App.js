import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Dashboard from "./pages/admin/Dashboard";
import Agent from "./pages/admin/Agent";
import AIStudio from "./pages/admin/AIStudio";
import Talk from "./pages/admin/Talk";
import ContentEditor from "./pages/admin/ContentEditor";
import DesignSettings from "./pages/admin/DesignSettings";
import SEO from "./pages/admin/SEO";
import Versions from "./pages/admin/Versions";
import Team from "./pages/admin/Team";
import Billing from "./pages/admin/Billing";

import SuperAdmin from "./pages/super/SuperAdmin";
import TenantSite from "./pages/site/TenantSite";

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 font-mono">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "super_admin" ? "/super" : "/admin"} replace />;
  return children;
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" richColors />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/s/:slug" element={<TenantSite />} />

            <Route path="/admin" element={<Protected><Dashboard /></Protected>} />
            <Route path="/admin/agent" element={<Protected><Agent /></Protected>} />
            <Route path="/admin/ai" element={<Protected><AIStudio /></Protected>} />
            <Route path="/admin/talk" element={<Protected><Talk /></Protected>} />
            <Route path="/admin/content" element={<Protected><ContentEditor /></Protected>} />
            <Route path="/admin/design" element={<Protected><DesignSettings /></Protected>} />
            <Route path="/admin/seo" element={<Protected><SEO /></Protected>} />
            <Route path="/admin/versions" element={<Protected><Versions /></Protected>} />
            <Route path="/admin/team" element={<Protected><Team /></Protected>} />
            <Route path="/admin/billing" element={<Protected><Billing /></Protected>} />

            <Route path="/super" element={<Protected role="super_admin"><SuperAdmin /></Protected>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
