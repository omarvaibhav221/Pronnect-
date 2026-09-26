import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Task, TaskStatus } from "../types";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function TaskList({ projectId, canEditStatus = true }: { projectId?: string; canEditStatus?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);

  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const dueAfter = params.get("dueAfter") ?? "";
  const dueBefore = params.get("dueBefore") ?? "";

  async function load() {
    const query: Record<string, string> = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (dueAfter) query.dueAfter = new Date(dueAfter).toISOString();
    if (dueBefore) query.dueBefore = new Date(dueBefore).toISOString();
    if (projectId) query.projectId = projectId;
    const res = await api.get("/api/tasks", { params: query });
    setTasks(res.data.items);
    setTotal(res.data.total);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, dueAfter, dueBefore, projectId]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  async function changeStatus(taskId: string, newStatus: TaskStatus) {
    await api.patch(`/api/tasks/${taskId}/status`, { status: newStatus });
    load();
  }

  return (
    <div>
      <div className="filters">
        <select value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select value={priority} onChange={(e) => updateParam("priority", e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="date-filter">From <input type="date" value={dueAfter} onChange={(e) => updateParam("dueAfter", e.target.value)} /></label>
        <label className="date-filter">To <input type="date" value={dueBefore} onChange={(e) => updateParam("dueBefore", e.target.value)} /></label>
        <span className="muted small">{total} task{total === 1 ? "" : "s"}</span>
      </div>

      <div className="task-table">
        {tasks.map((t) => (
          <div key={t.id} className={"task-row" + (t.isOverdue ? " overdue" : "")}>
            <div className="task-main">
              <div className="task-title">{t.title}</div>
              <div className="muted small">
                {t.project?.name ? t.project.name + " \u00b7 " : ""}
                {t.assignedTo?.name ?? "Unassigned"}
                {t.dueDate ? " \u00b7 due " + new Date(t.dueDate).toLocaleDateString() : ""}
                {t.isOverdue ? " \u00b7 OVERDUE" : ""}
              </div>
            </div>
            <span className={"priority-pill priority-" + t.priority.toLowerCase()}>{t.priority}</span>
            {canEditStatus ? (
              <select value={t.status} onChange={(e) => changeStatus(t.id, e.target.value as TaskStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            ) : (
              <span className="status-pill">{t.status.replace("_", " ")}</span>
            )}
          </div>
        ))}
        {tasks.length === 0 && <div className="muted small pad">No tasks match these filters.</div>}
      </div>
    </div>
  );
}
