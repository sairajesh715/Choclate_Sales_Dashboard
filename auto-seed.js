// Automatically seeds the database on first run (if empty).
// Called from server.js before the server starts.

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Split SQL file into individual statements safely
function parseStatements(sql) {
    const statements = [];
    let current = [];

    for (const line of sql.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;  // skip blanks & comments

        current.push(trimmed);

        if (trimmed.endsWith(';')) {
            const stmt = current.join('\n');
            if (stmt.trim()) statements.push(stmt);
            current = [];
        }
    }
    return statements;
}

function getConnCfg() {
    if (process.env.MYSQL_URL) {
        const u = new URL(process.env.MYSQL_URL);
        return {
            host: u.hostname, port: Number(u.port) || 3306,
            user: u.username, password: u.password,
            database: u.pathname.slice(1),
            charset: 'utf8mb4', connectTimeout: 30000
        };
    }
    return {
        host:     process.env.MYSQLHOST     || process.env.DB_HOST || 'localhost',
        port:     Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
        user:     process.env.MYSQLUSER     || process.env.USERNAME || 'root',
        password: process.env.MYSQLPASSWORD || process.env.PASSWORD,
        database: process.env.MYSQLDATABASE || process.env.DATABASENAME,
        charset:  'utf8mb4',
        connectTimeout: 30000
    };
}

async function runSeed() {
    const sqlFile = path.join(__dirname, 'raj_db_export.sql');
    if (!fs.existsSync(sqlFile)) {
        console.warn('⚠️  raj_db_export.sql not found, skipping seed');
        return 0;
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    const statements = parseStatements(sql);
    console.log(`🌱 Seeding: ${statements.length} statements to execute...`);

    const conn = await mysql.createConnection(getConnCfg());
    let ok = 0, failed = 0;

    for (const stmt of statements) {
        try {
            await conn.query(stmt);
            ok++;
        } catch (err) {
            failed++;
            // Only log first few errors to avoid log spam
            if (failed <= 5) console.warn(`  ⚠️  ${err.message.slice(0, 120)}`);
        }
    }

    await conn.end();
    console.log(`   Done: ${ok} ok, ${failed} failed`);
    return ok;
}

async function autoSeed(pool) {
    try {
        // Check if shipments table already has data
        try {
            const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM shipments');
            if (rows[0].cnt > 0) {
                console.log(`✅ Database ready (${rows[0].cnt} shipments)`);
                return;
            }
            console.log('ℹ️  shipments table is empty — seeding...');
        } catch {
            console.log('ℹ️  Tables not found — seeding...');
        }

        await runSeed();

        const [result] = await pool.query('SELECT COUNT(*) as cnt FROM shipments');
        console.log(`✅ Database seeded! (${result[0].cnt} shipments loaded)`);

    } catch (err) {
        console.error('❌ Auto-seed error:', err.message);
    }
}

// Exported separately so the /api/reseed route can call it
autoSeed.runSeed = runSeed;

module.exports = autoSeed;
