import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { ActivityEvent } from "../types";

export default function ActivityFeed({ projectId }: { projectId?: string }) {
  const { socket } = useSocket();
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  // On mount and on every reconnect, pull the last 20 events from the
  // database so a user who was offline (or just opened this view) is
  // caught up, rather than starting from an empty in-memory list.
  useEffect(() => {
    if (!socket) return;

    function catchup() {
      socket!.emit("activity:catchup", { projectId }, (fetched: ActivityEvent[]) => {
        setEvents(fetched);
      });
    }

    if (projectId) {
      socket.emit("project:watch", projectId);
    }
    catchup();
    socket.on("connect", catchup);

    function onNew(evt: ActivityEvent) {
      if (projectId && evt.projectId !== projectId) return;
      setEvents((prev) => (prev.some((e) => e.id === evt.id) ? prev : [evt, ...prev].slice(0, 40)));
    }
    socket.on("activity:new", onNew);

    return () => {
      socket.off("connect", catchup);
      socket.off("activity:new", onNew);
      if (projectId) socket.emit("project:unwatch", projectId);
    };
  }, [socket, projectId]);

  return (
    <div className="activity-feed">
      <div className="activity-feed-head">
        <span className="live-dot" /> Live activity
      </div>
      {events.length === 0 && <div className="muted small pad">No activity yet.</div>}
      {events.map((e) => (
        <div key={e.id} className="activity-item">
          <div>{e.message}</div>
          <div className="muted small">{timeAgo(e.createdAt)}</div>
        </div>
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}
