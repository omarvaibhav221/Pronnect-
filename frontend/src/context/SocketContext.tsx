import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getAccessToken, API_URL } from "../api/client";

interface SocketState {
  socket: Socket | null;
  onlineCount: number;
}

const SocketContext = createContext<SocketState>({ socket: null, onlineCount: 0 });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    const token = getAccessToken();
    const s = io(API_URL, { auth: { token }, withCredentials: true });
    s.on("presence:count", (p: { onlineCount: number }) => setOnlineCount(p.onlineCount));
    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return <SocketContext.Provider value={{ socket, onlineCount }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
