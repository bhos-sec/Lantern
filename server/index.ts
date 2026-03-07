import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { PORT, IS_PROD, SIMULATE_PROD } from "./config.js";
import { initSocketHandlers } from "./socket/index.js";

async function start(): Promise<void> {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Register all Socket.IO domain handlers
  initSocketHandlers(io);

  if (IS_PROD && !SIMULATE_PROD) {
    // Serve the Vite production build
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  } else {
    // In dev (or prod-sim), forward all HTTP requests through Vite for HMR
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
