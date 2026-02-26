# How to Get a Shareable Link (Railway.app)

Follow these steps **once** and you'll have a permanent link like:
`https://choclate-sales-dashboard.up.railway.app`

---

## STEP 1 — Export your local database (do this on your PC)

Open a terminal in this folder and run:
```
node export-db.js
```
This creates a file called **`raj_db_export.sql`** in the same folder.

---

## STEP 2 — Deploy the app on Railway

1. Go to **https://railway.app** → click **"Login"** → choose **"Login with GitHub"**
2. Click **"New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select **`Choclate_Sales_Dashboard`** from the list
5. Railway will automatically detect it as a Node.js app and start deploying

---

## STEP 3 — Add a MySQL database on Railway

1. Inside your Railway project, click the **"+ New"** button (top right)
2. Click **"Database"**
3. Click **"Add MySQL"**
4. Wait about 30 seconds for it to be ready (you'll see a green checkmark)

---

## STEP 4 — Import your data into Railway MySQL

1. Click on the **MySQL** service (the purple database icon)
2. Click the **"Data"** tab at the top
3. Click **"Import"** (or look for a query/import option)
4. Upload the **`raj_db_export.sql`** file you created in Step 1
5. Wait for it to finish — you'll see all your tables appear

> **Alternative:** Click "Connect" tab → copy the MySQL connection details →
> open **MySQL Workbench** on your PC → connect to Railway MySQL →
> go to Server → Data Import → import `raj_db_export.sql`

---

## STEP 5 — Set Environment Variables

1. Click on your **Node.js app** service in Railway (the one with your code)
2. Click the **"Variables"** tab
3. Click **"+ New Variable"** and add each one:

   | Variable Name | Where to find the value |
   |---------------|------------------------|
   | `USERNAME`    | MySQL service → Connect tab → Username |
   | `PASSWORD`    | MySQL service → Connect tab → Password |
   | `DATABASENAME`| MySQL service → Connect tab → Database name |

4. Railway will automatically redeploy after you save variables

---

## STEP 6 — Get your shareable link!

1. Click on your **Node.js app** service
2. Click the **"Settings"** tab
3. Under **"Domains"**, click **"Generate Domain"**
4. You'll get a link like: `https://choclate-sales-dashboard.up.railway.app`

**Copy that link and share it on WhatsApp, email, anywhere!** 🎉

---

## Troubleshooting

- **App crashes on Railway?** → Check Variables tab — make sure USERNAME, PASSWORD, DATABASENAME are all set correctly
- **Database shows no data?** → Redo Step 4 — make sure the SQL file was fully imported
- **Port issues?** → Railway automatically sets the PORT variable, so no action needed

---

## Total Cost
Railway free tier gives you $5 credit/month which is enough for this dashboard.
No credit card required to start.
