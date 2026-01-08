import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/auth.routes";

const app = express();

// CORS configuration for cross-domain requests
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://client.devsgk.work", // Production frontend
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

// Resolve auth-ui paths
const authUiDistPath = path.join(__dirname, "../auth-ui/dist");
const authUiIndexPath = path.join(authUiDistPath, "index.html");
const authUiAssetsPath = path.join(authUiDistPath, "assets");

// Check if auth-ui is built
if (!fs.existsSync(authUiIndexPath)) {
  console.error(`❌ auth-ui not found at: ${authUiIndexPath}`);
  console.error(`   Current __dirname: ${__dirname}`);
  console.error(
    `   Please ensure auth-ui is built before starting the server.`
  );
}

// Serve auth-ui static assets (for both root and /oauth/authorize)
if (fs.existsSync(authUiAssetsPath)) {
  app.use("/assets", express.static(authUiAssetsPath));
  app.use("/oauth/authorize/assets", express.static(authUiAssetsPath));
  app.use("/vite.svg", express.static(path.join(authUiDistPath, "vite.svg")));
  app.use(
    "/oauth/authorize/vite.svg",
    express.static(path.join(authUiDistPath, "vite.svg"))
  );
}

// Root endpoint - serve login page
app.get("/", (req, res) => {
  if (!fs.existsSync(authUiIndexPath)) {
    console.error(`auth-ui index.html not found at: ${authUiIndexPath}`);
    return res.status(500).json({
      error: "auth-ui not built",
      message: "Please build auth-ui before deploying",
      path: authUiIndexPath,
      __dirname: __dirname,
    });
  }
  res.sendFile(path.resolve(authUiIndexPath));
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
  if (!fs.existsSync(authUiIndexPath)) {
    console.error(`auth-ui index.html not found at: ${authUiIndexPath}`);
    return res.status(500).json({
      error: "auth-ui not built",
      message: "Please build auth-ui before deploying",
      path: authUiIndexPath,
      __dirname: __dirname,
    });
  }
  res.sendFile(path.resolve(authUiIndexPath));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
