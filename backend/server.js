 const express = require("express");
const cors = require("cors");
const path = require("path");
const dns = require("dns");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const mysql = require("mysql2/promise");
const authRoutes = require("./auth");

const app = express();

// Use Render/cloud hosting port when available.
// Keep port 5000 for local development.
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --------------------------------------------------
// AIVEN DNS DIAGNOSTIC
// --------------------------------------------------
const dbHost = process.env.DB_HOST;

console.log("Database host configured as:", dbHost);

if (dbHost) {
    dns.lookup(dbHost, (error, address, family) => {
        if (error) {
            console.error("AIVEN DNS TEST FAILED:", error);
        } else {
            console.log(
                "AIVEN DNS TEST SUCCESS:",
                address,
                "IPv" + family
            );
        }
    });
} else {
    console.error("AIVEN DNS TEST FAILED: DB_HOST is missing.");
}

// --------------------------------------------------
// MySQL connection pool
// --------------------------------------------------
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --------------------------------------------------
// Test database connection
// --------------------------------------------------
async function testDatabaseConnection() {
    try {
        const connection = await db.getConnection();

        console.log("MySQL database connected successfully.");

        connection.release();
    } catch (error) {
        console.error("MySQL connection failed:", error);
    }
}

// --------------------------------------------------
// Test route
// --------------------------------------------------
app.get("/", (req, res) => {
    res.json({
        message: "KPL Fantasy Backend is running!",
        status: "success"
    });
});

// --------------------------------------------------
// Authentication routes
// --------------------------------------------------
app.use("/api/auth", authRoutes(db));

// --------------------------------------------------
// Start server
// --------------------------------------------------
app.listen(PORT, "0.0.0.0", async () => {
    console.log(`KPL Fantasy backend running on port ${PORT}`);

    await testDatabaseConnection();
});