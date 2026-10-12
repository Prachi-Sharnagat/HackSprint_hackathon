import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token?: string | null): Socket => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  if (!socket) {
    socket = io(backendUrl, {
      path: "/socket.io",
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: token || null,
      },
    });
  } else if (token) {
    socket.auth = { token };
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
