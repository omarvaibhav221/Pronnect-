import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { Task, TaskStatus } from "../types";
import ActivityFeed from "../components/ActivityFeed";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export default function DeveloperDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);

  async function load() {
    const res = await api.get("/api/dashboard/developer");
    setTasks(res.data.tasks);
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(taskId: string, status: TaskStatus) {
    await api.patch(`/api/tasks/${taskId}/status`, { status });
    load();
  }

  return (
    <div className="dash-layout">
      <div className="dash-main">
        <h1>Your tasks</h1>
        <p className="muted">Sorted by priority, then due date. Only tasks assigned to you appear here.</p>
        <div className="task-table">
          {tasks.map((t) => (
            <div key={t.id} className={"task-row" + (t.isOverdue ? " overdue" : "")}>
              <div className="task-main">
                <div className="task-title">{t.title}</div>
                <div className="muted small">
                  {t.project?.name}
                  {t.dueDate ? " \u00b7 due " + new Date(t.dueDate).toLocaleDateString() : ""}
                  {t.isOverdue ? " \u00b7 OVERDUE" : ""}
                </div>
              </div>
              <span className={"priority-pill priority-" + t.priority.toLowerCase()}>{t.priority}</span>
              <select value={t.status} onChange={(e) => changeStatus(t.id, e.target.value as TaskStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
          ))}
          {tasks.length === 0 && <div className="muted small pad">No open tasks assigned to you.</div>}
        </div>
      </div>
      <ActivityFeed />
    </div>
  );
}
