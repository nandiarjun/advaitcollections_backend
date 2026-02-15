const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const saleRoutes = require("./routes/saleRoutes");
const settingRoutes = require("./routes/settingRoutes");

const app = express();

/* ==========================
   CONNECT DATABASE
========================== */
connectDB();

/* ==========================
   CREATE UPLOADS DIRECTORY
========================== */
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Uploads directory created');
}

/* ==========================
   MIDDLEWARE
========================== */

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(uploadDir));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

/* ==========================
   ROUTES
========================== */

// Health Check Route
app.get("/", (req, res) => {
    res.json({
        status: "Server Running 🚀",
        project: "Advait Collections Backend",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        apiEndpoints: {
            auth: "/api/auth",
            products: "/api/products",
            sales: "/api/sales",
            settings: "/api/settings"
        }
    });
});

// API Status Check
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "API is running",
        timestamp: new Date().toISOString(),
        database: process.env.MONGO_URI ? "Connected" : "Not Configured"
    });
});

// Auth Routes (Admin Login Only)
app.use("/api/auth", authRoutes);

// Product Routes
app.use("/api/products", productRoutes);

// Sales Routes
app.use("/api/sales", saleRoutes);

// Settings Routes - FIXED: This was missing in your code
app.use("/api/settings", settingRoutes);

/* ==========================
   404 HANDLER
========================== */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route Not Found",
        path: req.path,
        method: req.method
    });
});

/* ==========================
   GLOBAL ERROR HANDLER
========================== */
app.use((err, req, res, next) => {
    console.error("Error Stack:", err.stack);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: "Invalid ID format"
        });
    }

    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: "Duplicate key error",
            field: Object.keys(err.keyPattern)[0]
        });
    }

    // Handle multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: "File too large. Maximum size is 50MB."
        });
    }

    if (err.message === 'Only image files are allowed') {
        return res.status(400).json({
            success: false,
            message: "Only image files are allowed (JPEG, PNG, GIF, etc.)"
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

/* ==========================
   UNHANDLED REJECTIONS
========================== */
process.on('unhandledRejection', (err) => {
    console.log('❌ UNHANDLED REJECTION! Shutting down...');
    console.log(err.name, err.message);
    if (process.env.NODE_ENV === 'development') {
        console.log(err.stack);
    }
});

/* ==========================
   UNCAUGHT EXCEPTIONS
========================== */
process.on('uncaughtException', (err) => {
    console.log('❌ UNCAUGHT EXCEPTION! Shutting down...');
    console.log(err.name, err.message);
    if (process.env.NODE_ENV === 'development') {
        console.log(err.stack);
    }
    process.exit(1);
});

/* ==========================
   START SERVER
========================== */
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`\n🚀 Advait Collections Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: http://localhost:${PORT}`);
    console.log(`📚 Available Endpoints:`);
    console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
    console.log(`   - Products: http://localhost:${PORT}/api/products`);
    console.log(`   - Sales: http://localhost:${PORT}/api/sales`);
    console.log(`   - Settings: http://localhost:${PORT}/api/settings`);
    console.log(`📁 Uploads directory: ${uploadDir}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💤 Process terminated!');
    });
});

module.exports = app;