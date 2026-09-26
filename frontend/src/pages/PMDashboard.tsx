import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Project, Task } from "../types";
import ActivityFeed from "../components/ActivityFeed";

interface PMSummary {
  projects: Project[];
  tasksByPriority: Record<string, number>;
  dueThisWeek: Task[];
}

export default function PMDashboard() {
  const [data, setData] = useState<PMSummary | null>(null);

  useEffect(() => {
    api.get("/api/dashboard/pm").then((res) => setData(res.data));
  }, []);

  if (!data) return null;

  return (
    <div className="dash-layout">
      <div className="dash-main">
        <h1>Your projects</h1>
        <div className="stat-row">
          {Object.entries(data.tasksByPriority).map(([k, v]) => (
            <div key={k} className="stat-card">
              <div className="stat-value">{v}</div>
              <div className="stat-label">{k}</div>
            </div>
          ))}
        </div>

        <div className="project-grid">
          {data.projects.map((p) => (
            <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
              <div className="project-card-title">{p.name}</div>
              <div className="muted small">{p._count?.tasks ?? 0} tasks</div>
            </Link>
          ))}
        </div>

        <h2>Due this week</h2>
        <div className="task-table">
          {data.dueThisWeek.map((t) => (
            <div key={t.id} className="task-row">
              <div className="task-main">
                <div className="task-title">{t.title}</div>
                <div className="muted small">{t.assignedTo?.name ?? "Unassigned"} \u00b7 due {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "\u2014"}</div>
              </div>
              <span className={"priority-pill priority-" + t.priority.toLowerCase()}>{t.priority}</span>
            </div>
          ))}
          {data.dueThisWeek.length === 0 && <div className="muted small pad">Nothing due this week.</div>}
        </div>
      </div>
      <ActivityFeed />
    </div>
  );
}
