import { io } from "socket.io-client";

// Extract base URL from VITE_BACKEND_URL by removing /api suffix
const getSocketUrl = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl && backendUrl.endsWith('/api')) {
    return backendUrl.slice(0, -4); // Remove '/api' from the end
  }
  return backendUrl || 'http://localhost:5000';
};

const socket = io(getSocketUrl(), {
    autoConnect: false,
    transports: ["websocket", "polling"]
  });

export default socket;
