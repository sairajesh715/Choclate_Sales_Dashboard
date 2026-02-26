// Run this ONCE on your local PC to export your database
// Command: node export-db.js
// It creates: raj_db_export.sql  (this file is committed to GitHub and
// used to auto-seed the Railway database on first deploy)

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

    let sql = `-- Chocolate Sales Dashboard - Full Database Export
-- Generated: ${new Date().toISOString()}
-- This file is used to auto-seed the database on first deployment.
SET FOREIGN_KEY_CHECKS=0;
SET NAMES utf8mb4;

`;

    // Export in FK-safe order: referenced tables first, shipments last
    const tables = ['geo', 'people', 'products', 'shipments'];

    for (const table of tables) {
        console.log(`  Exporting: ${table}...`);

        // Get CREATE TABLE statement from MySQL
        const [createRows] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
        const createSql = createRows[0]['Create Table']
            .replace(/AUTO_INCREMENT=\d+/g, '')  // strip auto-increment counts
            .replace(/ ENGINE=\S+/, ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

        sql += `-- ===== ${table} =====\n`;
        sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        sql += createSql + ';\n\n';

        // Get and export all rows
        const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
        if (rows.length === 0) { sql += '\n'; continue; }

        const cols = Object.keys(rows[0]);
        const colList = cols.map(c => `\`${c}\``).join(', ');

        // Insert in chunks of 200 rows for reliability
        const chunkSize = 200;
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
                return `  (${vals.join(', ')})`;
            });
            sql += `INSERT INTO \`${table}\` (${colList}) VALUES\n${valuesList.join(',\n')};\n`;
        }
        sql += '\n';
    }

    sql += 'SET FOREIGN_KEY_CHECKS=1;\n';
    fs.writeFileSync('raj_db_export.sql', sql, 'utf8');

    const stats = fs.statSync('raj_db_export.sql');
    const kb = (stats.size / 1024).toFixed(0);
    console.log(`\n✅ Done! raj_db_export.sql (${kb} KB) is ready.`);
    console.log('   This file will auto-seed the Railway database on first deploy.\n');
    await pool.end();
}

exportDB().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
