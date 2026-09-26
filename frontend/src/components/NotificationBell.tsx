import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { AppNotification } from "../types";

export default function NotificationBell() {
  const { socket } = useSocket();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/api/notifications").then((res) => {
      setItems(res.data.notifications);
      setUnread(res.data.unreadCount);
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    function onNew(payload: { notification: AppNotification; unreadCount: number }) {
      setItems((prev) => [payload.notification, ...prev].slice(0, 50));
      setUnread(payload.unreadCount);
    }
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket]);

  async function markRead(id: string) {
    await api.patch(`/api/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
  }

  async function markAllRead() {
    await api.patch("/api/notifications/read-all");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  return (
    <div className="bell-wrap">
      <button className="bell-btn" onClick={() => setOpen((o) => !o)}>
        \ud83d\udd14
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>
      {open && (
        <div className="bell-dropdown">
          <div className="bell-dropdown-head">
            <span>Notifications</span>
            <button className="link-btn" onClick={markAllRead}>Mark all read</button>
          </div>
          {items.length === 0 && <div className="muted small pad">No notifications yet.</div>}
          {items.map((n) => (
            <div key={n.id} className={"notif-item" + (n.read ? "" : " unread")} onClick={() => !n.read && markRead(n.id)}>
              <div>{n.message}</div>
              <div className="muted small">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
