"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const app = (0, express_1.default)();
// CORS configuration for cross-domain requests
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
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
// Serve auth-ui static assets (for both root and /oauth/authorize)
app.use("/assets", express_1.default.static(path_1.default.join(__dirname, "../auth-ui/dist/assets")));
app.use("/oauth/authorize/assets", express_1.default.static(path_1.default.join(__dirname, "../auth-ui/dist/assets")));
app.use("/vite.svg", express_1.default.static(path_1.default.join(__dirname, "../auth-ui/dist/vite.svg")));
app.use("/oauth/authorize/vite.svg", express_1.default.static(path_1.default.join(__dirname, "../auth-ui/dist/vite.svg")));
// Root endpoint - serve login page
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../auth-ui/dist/index.html"));
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
    res.sendFile(path_1.default.join(__dirname, "../auth-ui/dist/index.html"));
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});
exports.default = app;
//# sourceMappingURL=app.js.map