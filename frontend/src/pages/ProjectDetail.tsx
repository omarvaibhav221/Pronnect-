import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { Project } from "../types";
import TaskList from "../components/TaskList";
import ActivityFeed from "../components/ActivityFeed";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/projects/${id}`).then((res) => setProject(res.data)).catch((err) => {
      setError(err?.response?.data?.error?.message ?? "You don't have access to this project");
    });
  }, [id]);

  if (error) return <div className="pad">{error}</div>;
  if (!project) return null;

  return (
    <div className="dash-layout">
      <div className="dash-main">
        <h1>{project.name}</h1>
        <p className="muted">{project.client?.name} \u00b7 PM: {project.pm?.name}</p>
        <TaskList projectId={project.id} />
      </div>
      <ActivityFeed projectId={project.id} />
    </div>
  );
}
