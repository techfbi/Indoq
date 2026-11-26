import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import workspaceRoutes from "./routes/workspaces.js";
import { getRedis } from "./config/redis.js";
import documentRoutes from "./routes/documents.js";
import { startIngestionWorker } from "./jobs/ingestion.worker.js";
import queryRoutes from "./routes/query.js";
import { workspaceConversationRouter, conversationRouter } from "./routes/conversations.js";

const app = express();

// Security headers
app.use(helmet());

/*
  CORS policy allows the configured CLIENT_URL in all environments,
  and additionally allows any localhost port during local development
  when Next.js selects a fallback port such as 3001 or 3002.
*/
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === env.CLIENT_URL) {
        callback(null, true);
        return;
      }

      if (
        env.NODE_ENV === "development" &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Conversation-Id"],
  })
);

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Compression
app.use(compression()); // reduces response size for workspace and document lists

// HTTP logging (skip in test)
if (env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// Health check no auth required
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces/:workspaceId/documents", documentRoutes);
app.use("/api/workspaces/:workspaceId/query", queryRoutes);
app.use("/api/workspaces/:workspaceId/conversations", workspaceConversationRouter);
app.use("/api/conversations", conversationRouter);

// 404 handler, must come after all routes
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

// Global error handler, must be last, must have 4 params
app.use(errorHandler);

// Connect Redis on startup then start listening
const start = async () => {
  getRedis(); // establish connection early so first request isn't slow
  startIngestionWorker(); // start the ingestion worker to process document ingestion jobs

  app.listen(env.PORT, () => {
    console.log(`Within API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start();
