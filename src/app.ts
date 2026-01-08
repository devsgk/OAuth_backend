import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth.routes";

const app = express();

// CORS configuration for cross-domain requests
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve auth-ui static assets (for both root and /oauth/authorize)
app.use(
  "/assets",
  express.static(path.join(__dirname, "../auth-ui/dist/assets"))
);
app.use(
  "/oauth/authorize/assets",
  express.static(path.join(__dirname, "../auth-ui/dist/assets"))
);
app.use(
  "/vite.svg",
  express.static(path.join(__dirname, "../auth-ui/dist/vite.svg"))
);
app.use(
  "/oauth/authorize/vite.svg",
  express.static(path.join(__dirname, "../auth-ui/dist/vite.svg"))
);

// Root endpoint - serve login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../auth-ui/dist/index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OAuth routes (API endpoints)
app.use("/oauth", authRoutes);

// Serve auth-ui index.html for /oauth/authorize (with query params)
// This must come after the API routes
app.get("/oauth/authorize", (req, res) => {
  res.sendFile(path.join(__dirname, "../auth-ui/dist/index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
