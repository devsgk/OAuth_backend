"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const app = (0, express_1.default)();
// CORS configuration for cross-domain requests
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://client.devsgk.work", // Production frontend
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Resolve auth-ui paths - try multiple possible locations
// Render: Root Directory is "backend", so paths are relative to backend folder
const possiblePaths = [
    path_1.default.join(__dirname, "../auth-ui/dist"), // Relative to dist folder
    path_1.default.join(process.cwd(), "auth-ui/dist"), // Relative to current working directory
    path_1.default.join(process.cwd(), "../auth-ui/dist"), // One level up
];
let authUiDistPath = null;
let authUiIndexPath = null;
let authUiAssetsPath = null;
// Find the correct path
for (const possiblePath of possiblePaths) {
    const indexPath = path_1.default.join(possiblePath, "index.html");
    if (fs_1.default.existsSync(indexPath)) {
        authUiDistPath = possiblePath;
        authUiIndexPath = indexPath;
        authUiAssetsPath = path_1.default.join(possiblePath, "assets");
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
if (authUiAssetsPath && fs_1.default.existsSync(authUiAssetsPath)) {
    app.use("/assets", express_1.default.static(authUiAssetsPath));
    app.use("/oauth/authorize/assets", express_1.default.static(authUiAssetsPath));
    app.use("/vite.svg", express_1.default.static(path_1.default.join(authUiDistPath, "vite.svg")));
    app.use("/oauth/authorize/vite.svg", express_1.default.static(path_1.default.join(authUiDistPath, "vite.svg")));
}
// Root endpoint - serve login page
app.get("/", (req, res) => {
    if (!authUiIndexPath || !fs_1.default.existsSync(authUiIndexPath)) {
        return res.status(500).json({
            error: "auth-ui not built",
            message: "Please build auth-ui before deploying",
            triedPaths: possiblePaths,
            __dirname: __dirname,
            cwd: process.cwd(),
        });
    }
    res.sendFile(path_1.default.resolve(authUiIndexPath));
});
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// OAuth routes (API endpoints)
app.use("/oauth", auth_routes_1.default);
// Serve auth-ui index.html for /oauth/authorize (with query params)
// This must come after the API routes
app.get("/oauth/authorize", (req, res) => {
    if (!authUiIndexPath || !fs_1.default.existsSync(authUiIndexPath)) {
        return res.status(500).json({
            error: "auth-ui not built",
            message: "Please build auth-ui before deploying",
            triedPaths: possiblePaths,
            __dirname: __dirname,
            cwd: process.cwd(),
        });
    }
    res.sendFile(path_1.default.resolve(authUiIndexPath));
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});
exports.default = app;
//# sourceMappingURL=app.js.map