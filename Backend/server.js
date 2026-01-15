import http from "http";
import app from "./app.js";
import { initSocket } from "./sockets/socket.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

await connectDB();

const server = http.createServer(app);

// Attach socket to same server
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
