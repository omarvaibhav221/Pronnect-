import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import PMDashboard from "./pages/PMDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import ProjectDetail from "./pages/ProjectDetail";
import Shell from "./components/Shell";

function RoleHome() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "PM") return <PMDashboard />;
  return <DeveloperDashboard />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="center-screen">Loading\u2026</div>;
  if (!user) return <Login />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<RoleHome />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
