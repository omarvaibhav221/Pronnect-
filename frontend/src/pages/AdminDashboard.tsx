import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Project } from "../types";
import ActivityFeed from "../components/ActivityFeed";

interface Summary {
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  overdueCount: number;
  onlineNow: number;
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.get("/api/dashboard/admin").then((res) => setSummary(res.data));
    api.get("/api/projects").then((res) => setProjects(res.data));
  }, []);

  return (
    <div className="dash-layout">
      <div className="dash-main">
        <h1>Admin overview</h1>
        {summary && (
          <div className="stat-row">
            <Stat label="Projects" value={summary.totalProjects} />
            <Stat label="Tasks" value={summary.totalTasks} />
            <Stat label="Overdue" value={summary.overdueCount} tone="warn" />
            <Stat label="Online now" value={summary.onlineNow} tone="live" />
          </div>
        )}

        <h2>All projects</h2>
        <div className="project-grid">
          {projects.map((p) => (
            <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
              <div className="project-card-title">{p.name}</div>
              <div className="muted small">{p.client?.name} \u00b7 PM: {p.pm?.name}</div>
              <div className="muted small">{p._count?.tasks ?? 0} tasks</div>
            </Link>
          ))}
        </div>
      </div>
      <ActivityFeed />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "live" }) {
  return (
    <div className={"stat-card" + (tone ? " tone-" + tone : "")}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
