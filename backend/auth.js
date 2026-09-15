 const express = require("express");
const bcrypt = require("bcrypt");

const router = express.Router();

module.exports = (db) => {

    // =========================================================
    // REGISTER
    // POST /api/auth/register
    // =========================================================

    router.post("/register", async (req, res) => {
        try {
            const {
                username,
                email,
                password,
                first_name,
                last_name
            } = req.body;

            // Check required fields
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Username, email, and password are required."
                });
            }

            // Clean input
            const cleanUsername = username.trim();
            const cleanEmail = email.trim().toLowerCase();

            // Basic validation
            if (cleanUsername.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be at least 3 characters long."
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters long."
                });
            }

            // Check email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(cleanEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid email address."
                });
            }

            // Check whether username already exists
            const [usernameUsers] = await db.execute(
                `
                SELECT id
                FROM users
                WHERE username = ?
                LIMIT 1
                `,
                [cleanUsername]
            );

            if (usernameUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "That username is already taken."
                });
            }

            // Check whether email already exists
            const [emailUsers] = await db.execute(
                `
                SELECT id
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [cleanEmail]
            );

            if (emailUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "That email address is already registered."
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);

            // Create the user
            const [result] = await db.execute(
                `
                INSERT INTO users
                (
                    username,
                    email,
                    password_hash,
                    role,
                    first_name,
                    last_name
                )
                VALUES (?, ?, ?, 'user', ?, ?)
                `,
                [
                    cleanUsername,
                    cleanEmail,
                    passwordHash,
                    first_name ? first_name.trim() : null,
                    last_name ? last_name.trim() : null
                ]
            );

            // Return successful response
            return res.status(201).json({
                success: true,
                message: "Account created successfully.",
                user: {
                    id: result.insertId,
                    username: cleanUsername,
                    email: cleanEmail,
                    role: "user",
                    first_name: first_name ? first_name.trim() : null,
                    last_name: last_name ? last_name.trim() : null
                }
            });

        } catch (error) {
            console.error("Registration error:", error);

            // Handle MySQL duplicate entry
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message: "Username or email already exists."
                });
            }

            return res.status(500).json({
                success: false,
                message: "Server error while creating account."
            });
        }
    });


    // =========================================================
    // LOGIN
    // POST /api/auth/login
    // =========================================================

    router.post("/login", async (req, res) => {
        try {
            const {
                username,
                password
            } = req.body;

            // Check required fields
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Username and password are required."
                });
            }

            const cleanUsername = username.trim();

            // Find user
            const [users] = await db.execute(
                `
                SELECT
                    id,
                    username,
                    email,
                    password_hash,
                    role,
                    first_name,
                    last_name,
                    total_points,
                    overall_rank
                FROM users
                WHERE username = ?
                LIMIT 1
                `,
                [cleanUsername]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password."
                });
            }

            const user = users[0];

            // Compare password with stored hash
            const passwordMatches = await bcrypt.compare(
                password,
                user.password_hash
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password."
                });
            }

            // Successful login
            return res.status(200).json({
                success: true,
                message: "Login successful.",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    total_points: user.total_points,
                    overall_rank: user.overall_rank
                }
            });

        } catch (error) {
            console.error("Login error:", error);

            return res.status(500).json({
                success: false,
                message: "Server error while logging in."
            });
        }
    });


    // =========================================================
    // GET CURRENT USER
    // GET /api/auth/user/:id
    // =========================================================

    router.get("/user/:id", async (req, res) => {
        try {
            const userId = Number(req.params.id);

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            const [users] = await db.execute(
                `
                SELECT
                    id,
                    username,
                    email,
                    role,
                    first_name,
                    last_name,
                    total_points,
                    overall_rank,
                    created_at
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            return res.status(200).json({
                success: true,
                user: users[0]
            });

        } catch (error) {
            console.error("Get user error:", error);

            return res.status(500).json({
                success: false,
                message: "Server error while retrieving user."
            });
        }
    });


    return router;
};