require('dotenv').config({ override: true });
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const NLPEngine = require('./nlp-engine');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const nlpEngine = new NLPEngine();

// MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: process.env.USERNAME || 'root',
    password: process.env.PASSWORD,
    database: process.env.DATABASENAME,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
});

// ============== DASHBOARD API ENDPOINTS ==============

// KPI Cards
app.get('/api/kpis', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT
        SUM(Amount) as totalSales,
        SUM(Boxes) as totalBoxes,
        ROUND(AVG(Amount), 2) as avgSale,
        COUNT(DISTINCT Product) as productCount,
        COUNT(DISTINCT \`Sales Person\`) as personCount,
        COUNT(*) as shipmentCount,
        MIN(Date) as startDate,
        MAX(Date) as endDate
      FROM shipments
    `);
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sales by Region
app.get('/api/sales-by-region', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT g.Region as region, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes
      FROM shipments s JOIN geo g ON s.Geo = g.GeoID
      GROUP BY g.Region ORDER BY totalSales DESC
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sales by Category
app.get('/api/sales-by-category', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT p.Category as category, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes
      FROM shipments s JOIN products p ON s.Product = p.\`Product ID\`
      GROUP BY p.Category ORDER BY totalSales DESC
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Monthly Sales Trend
app.get('/api/monthly-trend', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT DATE_FORMAT(Date, '%Y-%m') as month, SUM(Amount) as totalSales,
             SUM(Boxes) as totalBoxes, COUNT(*) as shipmentCount,
             ROUND(AVG(Amount), 2) as avgSale
      FROM shipments GROUP BY DATE_FORMAT(Date, '%Y-%m')
      ORDER BY month
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Top 10 Sales Persons
app.get('/api/top-salespersons', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT p.\`Sales Person\` as name, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes
      FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
      GROUP BY p.\`Sales Person\`
      ORDER BY totalSales DESC LIMIT 10
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Top 10 Products
app.get('/api/top-products', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT p.Product as product, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes
      FROM shipments s JOIN products p ON s.Product = p.\`Product ID\`
      GROUP BY p.Product
      ORDER BY totalSales DESC LIMIT 10
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Team Performance
app.get('/api/team-performance', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT p.Team as team, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes,
             COUNT(DISTINCT p.\`SP ID\`) as members
      FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
      WHERE p.Team IS NOT NULL AND p.Team != ''
      GROUP BY p.Team ORDER BY totalSales DESC
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sales by Country
app.get('/api/geo-breakdown', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT g.Geo as country, g.Region as region, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes
      FROM shipments s JOIN geo g ON s.Geo = g.GeoID
      GROUP BY g.Geo, g.Region ORDER BY totalSales DESC
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Product Profitability Analysis
app.get('/api/product-profitability', async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT pr.Product as product, pr.Category as category,
             pr.\`Cost per Box\` as costPerBox,
             SUM(s.Boxes) as totalBoxes, SUM(s.Amount) as totalRevenue,
             ROUND(SUM(s.Amount) / SUM(s.Boxes), 2) as revenuePerBox
      FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
      GROUP BY pr.Product, pr.Category, pr.\`Cost per Box\`
      ORDER BY totalRevenue DESC
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// All salespersons (for KPI card drill-down)
app.get('/api/all-salespersons', async (req, res) => {
    try {
        const [rows] = await pool.query(`
          SELECT p.\`Sales Person\` as salesperson, p.Team as team, p.Location as location,
                 SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes, COUNT(*) as shipments
          FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
          GROUP BY p.\`Sales Person\`, p.Team, p.Location
          ORDER BY totalSales DESC
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============== DRILL-DOWN API ENDPOINTS ==============

// Drill: Top products for a specific month
app.get('/api/drill/month', async (req, res) => {
    try {
        const { month } = req.query;
        const [rows] = await pool.query(`
          SELECT pr.Product as product, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes, COUNT(*) as shipments
          FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
          WHERE DATE_FORMAT(s.Date, '%Y-%m') = ?
          GROUP BY pr.Product ORDER BY totalSales DESC
        `, [month]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Drill: Monthly breakdown for a specific salesperson
app.get('/api/drill/salesperson', async (req, res) => {
    try {
        const { name } = req.query;
        const [rows] = await pool.query(`
          SELECT DATE_FORMAT(s.Date, '%Y-%m') as month, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes, COUNT(*) as shipments
          FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
          WHERE p.\`Sales Person\` = ?
          GROUP BY DATE_FORMAT(s.Date, '%Y-%m') ORDER BY month
        `, [name]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Drill: Salesperson breakdown for a specific product
app.get('/api/drill/product', async (req, res) => {
    try {
        const { product } = req.query;
        const [rows] = await pool.query(`
          SELECT p.\`Sales Person\` as salesperson, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes, COUNT(*) as shipments
          FROM shipments s
          JOIN products pr ON s.Product = pr.\`Product ID\`
          JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
          WHERE pr.Product = ?
          GROUP BY p.\`Sales Person\` ORDER BY totalSales DESC
        `, [product]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Drill: Members & stats for a specific team
app.get('/api/drill/team', async (req, res) => {
    try {
        const { team } = req.query;
        const [rows] = await pool.query(`
          SELECT p.\`Sales Person\` as salesperson, p.Location as location,
                 SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes, COUNT(*) as shipments
          FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
          WHERE p.Team = ?
          GROUP BY p.\`Sales Person\`, p.Location ORDER BY totalSales DESC
        `, [team]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Drill: Top salespersons in a specific country
app.get('/api/drill/country', async (req, res) => {
    try {
        const { country } = req.query;
        const [rows] = await pool.query(`
          SELECT p.\`Sales Person\` as salesperson, SUM(s.Amount) as totalSales, SUM(s.Boxes) as totalBoxes, COUNT(*) as shipments
          FROM shipments s
          JOIN geo g ON s.Geo = g.GeoID
          JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
          WHERE g.Geo = ?
          GROUP BY p.\`Sales Person\` ORDER BY totalSales DESC
        `, [country]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============== CHATBOT API ENDPOINT ==============

app.post('/api/chat', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question || question.trim().length === 0) {
            return res.json({
                answer: "Please ask me a question about the chocolate sales data!",
                suggestions: nlpEngine.getSuggestedQuestions()
            });
        }

        const queryInfo = nlpEngine.processQuestion(question);

        if (!queryInfo) {
            return res.json({
                answer: "I'm not sure I understand that question. Here are some things you can ask me:",
                suggestions: nlpEngine.getSuggestedQuestions(),
                type: 'suggestions'
            });
        }

        const [rows] = await pool.query(queryInfo.sql, queryInfo.params);

        if (!rows || rows.length === 0) {
            return res.json({
                answer: `No data found for: "${queryInfo.description}"`,
                suggestions: nlpEngine.getSuggestedQuestions().slice(0, 5),
                type: 'empty'
            });
        }

        // Format response based on type
        let response = { description: queryInfo.description, type: queryInfo.format };

        switch (queryInfo.format) {
            case 'single':
                const val = rows[0][queryInfo.valueKey];
                response.answer = `${queryInfo.description}: ${queryInfo.prefix}${Number(val).toLocaleString()}${queryInfo.suffix}`;
                response.type = 'text';
                break;

            case 'single_row':
                response.answer = queryInfo.description;
                response.data = rows;
                response.columns = queryInfo.columns;
                response.type = 'table';
                break;

            case 'table':
                response.answer = queryInfo.description;
                response.data = rows;
                response.columns = queryInfo.columns;
                break;

            case 'summary':
                const s = rows[0];
                response.answer = `📊 **Dashboard Summary**\n\n` +
                    `💰 Total Sales: $${Number(s.total_sales).toLocaleString()}\n` +
                    `📦 Total Boxes: ${Number(s.total_boxes).toLocaleString()}\n` +
                    `🚚 Total Shipments: ${Number(s.total_shipments).toLocaleString()}\n` +
                    `🍫 Products: ${s.total_products}\n` +
                    `👥 Sales Persons: ${s.total_people}\n` +
                    `🌍 Countries: ${s.total_countries}\n` +
                    `📅 Period: ${s.start_date} to ${s.end_date}`;
                response.type = 'text';
                break;
        }

        response.suggestions = nlpEngine.getSuggestedQuestions()
            .filter(() => Math.random() > 0.5)
            .slice(0, 3);

        res.json(response);
    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({
            answer: "Sorry, I encountered an error processing your question. Please try again.",
            error: err.message
        });
    }
});

// Serve the app
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🍫 Chocolate Sales Dashboard running at http://localhost:${PORT}`);
});
