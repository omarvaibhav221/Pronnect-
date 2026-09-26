import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import NotificationBell from "./NotificationBell";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { onlineCount } = useSocket();

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">Pronnect</Link>
        <div className="topbar-right">
          {user?.role === "ADMIN" && <span className="pill">{onlineCount} online now</span>}
          <span className="pill muted-pill">{user?.name} \u00b7 {user?.role}</span>
          <NotificationBell />
          <button className="ghost-btn" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
