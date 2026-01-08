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
  "https://auth.devsgk.work", // Auth server (for auth-ui)
].filter(Boolean);

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Allow same-origin requests (auth-ui served from same domain)
    const requestUrl = new URL(origin);
    const serverUrl = process.env.AUTH_SERVER_URL || `https://auth.devsgk.work`;
    try {
      const serverUrlObj = new URL(serverUrl);
      if (requestUrl.hostname === serverUrlObj.hostname) {
        return callback(null, true);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    // Check allowed origins list
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

// Resolve auth-ui paths - try multiple possible locations
// Render: Root Directory is "backend", so paths are relative to backend folder
const possiblePaths = [
  path.join(__dirname, "../auth-ui/dist"), // Relative to dist folder
  path.join(process.cwd(), "auth-ui/dist"), // Relative to current working directory
  path.join(process.cwd(), "../auth-ui/dist"), // One level up
];

let authUiDistPath: string | null = null;
let authUiIndexPath: string | null = null;
let authUiAssetsPath: string | null = null;

// Find the correct path
for (const possiblePath of possiblePaths) {
  const indexPath = path.join(possiblePath, "index.html");
  if (fs.existsSync(indexPath)) {
    authUiDistPath = possiblePath;
    authUiIndexPath = indexPath;
    authUiAssetsPath = path.join(possiblePath, "assets");
    console.log(`✅ Found auth-ui at: ${authUiDistPath}`);
    break;
  }
}

if (!authUiDistPath) {
  console.error(`❌ auth-ui not found. Tried paths:`);
  possiblePaths.forEach((p) => console.error(`   - ${p}`));
  console.error(`   Current __dirname: ${__dirname}`);
  console.error(`   Current process.cwd(): ${process.cwd()}`);
}

// Serve auth-ui static assets (for both root and /oauth/authorize)
if (authUiAssetsPath && fs.existsSync(authUiAssetsPath)) {
  app.use("/assets", express.static(authUiAssetsPath));
  app.use("/oauth/authorize/assets", express.static(authUiAssetsPath));
  app.use("/vite.svg", express.static(path.join(authUiDistPath!, "vite.svg")));
  app.use(
    "/oauth/authorize/vite.svg",
    express.static(path.join(authUiDistPath!, "vite.svg"))
  );
}

// Root endpoint - serve login page
app.get("/", (req, res) => {
  if (!authUiIndexPath || !fs.existsSync(authUiIndexPath)) {
    return res.status(500).json({
      error: "auth-ui not built",
      message: "Please build auth-ui before deploying",
      triedPaths: possiblePaths,
      __dirname: __dirname,
      cwd: process.cwd(),
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
  if (!authUiIndexPath || !fs.existsSync(authUiIndexPath)) {
    return res.status(500).json({
      error: "auth-ui not built",
      message: "Please build auth-ui before deploying",
      triedPaths: possiblePaths,
      __dirname: __dirname,
      cwd: process.cwd(),
    });
  }
  res.sendFile(path.resolve(authUiIndexPath));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
