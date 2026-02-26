// Run this ONCE on your local PC to export your database
// Command: node export-db.js
// It creates: raj_db_export.sql  (upload this to Railway)

require('dotenv').config({ override: true });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function exportDB() {
    console.log('🔄 Connecting to local MySQL...');
    const pool = mysql.createPool({
        host: 'localhost',
        user: process.env.USERNAME || 'root',
        password: process.env.PASSWORD,
        database: process.env.DATABASENAME,
    });

    let sql = `-- Chocolate Sales Dashboard Database Export
-- Generated: ${new Date().toISOString()}
SET FOREIGN_KEY_CHECKS=0;
SET NAMES utf8mb4;
\n`;

    // Export in correct order (geo/people/products first, then shipments)
    const tables = ['geo', 'people', 'products', 'shipments'];

    for (const table of tables) {
        console.log(`  Exporting table: ${table}...`);
        const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
        if (rows.length === 0) continue;

        const cols = Object.keys(rows[0]);
        const colList = cols.map(c => `\`${c}\``).join(', ');

        sql += `-- ----- Table: ${table} (${rows.length} rows) -----\n`;

        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const valuesList = chunk.map(row => {
                const vals = cols.map(c => {
                    const v = row[c];
                    if (v === null || v === undefined) return 'NULL';
                    if (typeof v === 'number') return v;
                    if (v instanceof Date) return `'${v.toISOString().slice(0, 10)}'`;
                    return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
                });
                return `(${vals.join(', ')})`;
            });
            sql += `INSERT INTO \`${table}\` (${colList}) VALUES\n${valuesList.join(',\n')};\n`;
        }
        sql += '\n';
    }

    sql += 'SET FOREIGN_KEY_CHECKS=1;\n';
    fs.writeFileSync('raj_db_export.sql', sql, 'utf8');

    const lines = sql.split('\n').length;
    console.log(`\n✅ Done! Created: raj_db_export.sql (${lines} lines)`);
    console.log('   Next step: Follow DEPLOY.md to upload this to Railway.\n');
    await pool.end();
}

exportDB().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
