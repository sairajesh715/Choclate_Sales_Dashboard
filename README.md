# 🍫 Chocolate Sales Dashboard

A premium full-stack analytics dashboard with AI chatbot for chocolate sales data.

## Features
- 8 interactive Chart.js visualizations (line, doughnut, polar area, bar, bubble)
- 6 KPI cards with animated counters — click any card to drill down
- **Click-to-drill-down** on every chart element → detailed data table
- **Export to CSV** from any drill-down table with one click
- NLP chatbot (ChocBot) — 30+ query patterns, answers natural language questions
- 2-color design system (Cyan + Purple) with glass-card UI

## Tech Stack
- **Backend**: Node.js + Express.js
- **Database**: MySQL (mysql2)
- **Frontend**: Vanilla JS + Chart.js 4.4.1
- **Styling**: Custom CSS with CSS variables

## Setup (Local)

1. **Clone the repo**
   ```bash
   git clone https://github.com/sairajesh715/Choclate_Sales_Dashboard.git
   cd Choclate_Sales_Dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MySQL credentials
   ```

4. **Run the server**
   ```bash
   npm start
   ```

5. **Open** http://localhost:3000

## Share via Public URL (Quick Demo)

Use **ngrok** to share your local server with anyone:
```bash
# Install ngrok from https://ngrok.com/download, then:
ngrok http 3000
```
This gives you a public `https://xxxx.ngrok.io` URL you can share directly.

## Deploy to Railway (Permanent Link)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Add a **MySQL** service in Railway and import your data
4. Set environment variables: `USERNAME`, `PASSWORD`, `DATABASENAME`, `PORT`
5. Railway auto-deploys and gives you a permanent public URL

## Environment Variables

| Variable | Description |
|----------|-------------|
| `USERNAME` | MySQL username |
| `PASSWORD` | MySQL password |
| `DATABASENAME` | Database name |
| `PORT` | Server port (default: 3000) |
