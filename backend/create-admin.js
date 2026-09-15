 const path = require("path");
const readline = require("readline");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

// Load .env from the project root:
// C:\Users\Uncolonized\Documents\KPL-FANTASY\.env
require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function createAdmin() {
    let db;

    try {
        console.log("Creating KPL Fantasy admin account...\n");

        const username = await ask("Admin username: ");
        const email = await ask("Admin email: ");
        const password = await ask("Admin password: ");

        if (!username || !email || !password) {
            throw new Error("Username, email, and password are required.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        db = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || "kpl_fantasy"
        });

        await db.execute(
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
            VALUES (?, ?, ?, 'admin', 'KPL', 'Admin')
            `,
            [username, email, passwordHash]
        );

        console.log("\nAdmin account created successfully.");
        console.log(`Username: ${username}`);
        console.log("Role: admin");
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            console.error(
                "\nThat username or email already exists. Please use a different one."
            );
        } else {
            console.error("\nFailed to create admin:", error.message);
        }
    } finally {
        if (db) {
            await db.end();
        }

        rl.close();
    }
}

createAdmin();