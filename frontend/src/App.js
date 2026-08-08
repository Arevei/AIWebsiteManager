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
import DeveloperPlatform from "./pages/admin/DeveloperPlatform";
import Agent from "./pages/admin/Agent";
import Blogs from "./pages/admin/Blogs";

import SuperAdmin from "./pages/super/SuperAdmin";
import TenantSite from "./pages/site/TenantSite";
import DemoBizSite from "./pages/site/DemoBizSite";
import Home from "./pages/areveipage";

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
        <ThemeProvider>
          <BrowserRouter>
            <Toaster position="top-center" richColors />
            <Routes>
              {/* <Route path="/" element={<Landing />} /> */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/demo/demobiz" element={<DemoBizSite />} />
              <Route path="/s/:slug" element={<TenantSite />} />
              <Route path="/admin" element={<Protected><Dashboard /></Protected>} />
              <Route path="/admin/dev" element={<Protected><DeveloperPlatform /></Protected>} />
              <Route path="/admin/agent" element={<Protected><Agent /></Protected>} />
              <Route path="/admin/blogs" element={<Protected><Blogs /></Protected>} />
              <Route path="/admin/blogs/:blogId" element={<Protected><Blogs /></Protected>} />
              <Route path="/admin/ai" element={<Navigate to="/admin/dev" replace />} />
              <Route path="/admin/talk" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/content" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/design" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/seo" element={<Navigate to="/admin?view=growth" replace />} />
              <Route path="/admin/versions" element={<Navigate to="/admin?view=settings" replace />} />
              <Route path="/admin/team" element={<Navigate to="/admin?view=settings" replace />} />
              <Route path="/admin/billing" element={<Navigate to="/admin?view=settings" replace />} />
              <Route path="/admin/settings" element={<Navigate to="/admin?view=settings" replace />} />

              <Route path="/super" element={<Protected role="super_admin"><SuperAdmin /></Protected>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </div>
  );
}
