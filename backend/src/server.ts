import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { initSockets } from "./sockets";
import { startOverdueJob } from "./jobs/overdueJob";

import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/projects.routes";
import taskRoutes from "./routes/tasks.routes";
import notificationRoutes from "./routes/notifications.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();
const httpServer = http.createServer(app);

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes.top);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

initSockets(httpServer);
startOverdueJob();

httpServer.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Pronnect dashboard API listening on :${env.port}`);
});

