import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat";
import { projectsRouter } from "./routes/projects";
import { projectChatRouter } from "./routes/projectChat";
import { documentsRouter } from "./routes/documents";
import { tabularRouter } from "./routes/tabular";
import { workflowsRouter } from "./routes/workflows";
import { userRouter } from "./routes/user";
import { downloadsRouter } from "./routes/downloads";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));

app.use("/chat", chatRouter);
app.use("/projects", projectsRouter);
app.use("/projects/:projectId/chat", projectChatRouter);
app.use("/single-documents", documentsRouter);
app.use("/tabular-review", tabularRouter);
app.use("/workflows", workflowsRouter);
app.use("/user", userRouter);
app.use("/users", userRouter);
app.use("/download", downloadsRouter);

app.get("/health", async (_req, res) => {
  const RAG_URL = process.env.RAG_SERVICE_URL ?? "http://localhost:8001";
  let ragStatus: "ok" | "unreachable" | "loading" = "unreachable";
  let ragChunks: number | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const r = await fetch(`${RAG_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (r.status === 503) {
      ragStatus = "loading";
    } else if (r.ok) {
      const body = await r.json() as { status?: string; chunks_indexed?: number };
      ragStatus = "ok";
      ragChunks = body.chunks_indexed ?? null;
    }
  } catch {
    ragStatus = "unreachable";
  }
  res.json({
    status: ragStatus === "ok" ? "ok" : "degraded",
    backend: "ok",
    rag_service: ragStatus,
    rag_service_chunks: ragChunks,
  });
});

app.listen(PORT, () => {
  console.log(`Mike backend running on port ${PORT}`);
});
