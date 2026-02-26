// Automatically seeds the database on first run (if empty).
// Called from server.js before the server starts.

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function autoSeed(pool) {
    try {
        // Check if data already exists
        const [tables] = await pool.query(`
            SELECT COUNT(*) as cnt FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shipments'
        `);

        if (tables[0].cnt > 0) {
            const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM shipments');
            if (rows[0].cnt > 0) {
                console.log(`✅ Database ready (${rows[0].cnt} shipments)`);
                return;
            }
        }

        // Database is empty — seed it from the SQL file
        const sqlFile = path.join(__dirname, 'raj_db_export.sql');
        if (!fs.existsSync(sqlFile)) {
            console.warn('⚠️  raj_db_export.sql not found, skipping auto-seed');
            return;
        }

        console.log('🌱 First run detected — seeding database...');

        // Create a separate one-time connection with multipleStatements enabled
        const cfg = {
            host:     process.env.MYSQLHOST     || process.env.DB_HOST || 'localhost',
            port:     process.env.MYSQLPORT     || process.env.DB_PORT || 3306,
            user:     process.env.MYSQLUSER     || process.env.USERNAME || 'root',
            password: process.env.MYSQLPASSWORD || process.env.PASSWORD,
            database: process.env.MYSQLDATABASE || process.env.DATABASENAME,
            multipleStatements: true,
            charset: 'utf8mb4'
        };

        const conn = await mysql.createConnection(cfg);
        const sql = fs.readFileSync(sqlFile, 'utf8');
        await conn.query(sql);
        await conn.end();

        const [result] = await pool.query('SELECT COUNT(*) as cnt FROM shipments');
        console.log(`✅ Database seeded! (${result[0].cnt} shipments loaded)`);

    } catch (err) {
        console.error('❌ Auto-seed error:', err.message);
        // Don't crash the server — it might still work if tables exist
    }
}

module.exports = autoSeed;
