# Deployment Guide

This guide provides steps to deploy your Shopify app to a hosting provider (e.g., Fly.io, Render, Heroku).

## 1. Prerequisites

- A hosting provider account.
- A production database (PostgreSQL recommended).
- `shopify.app.production.toml` configured with your production URLs.

## 2. Environment Variables

Set the following environment variables in your hosting provider's dashboard:

| Variable | Description |
| :--- | :--- |
| `SHOPIFY_API_KEY` | Client ID from `shopify app env show` |
| `SHOPIFY_API_SECRET` | Client Secret from `shopify app env show` |
| `SCOPES` | `write_products,read_products,write_discounts,read_discounts` |
| `SHOPIFY_APP_URL` | Your production app URL (e.g., `https://myapp.fly.dev`) |
| `DATABASE_URL` | Connection string for your production PostgreSQL database |
| `NODE_ENV` | Set to `production` |
| `PORT` | Set to `3000` (or whatever port your provider expects) |

## 3. Deployment Steps

### Step 1: Push Code
Push your code to your git repository connected to your hosting provider.

### Step 2: Build Command
Your hosting provider should automatically run the instructions in your `Dockerfile`. 
If you need to specify a build command manually:
```bash
npm run build
```

### Step 3: Database Migration
**IMPORTANT:** After deployment, or as part of the release phase, you MUST run migrations to set up your production database tables.
```bash
npm run setup
```
*Note: `npm run setup` runs `prisma generate && prisma migrate deploy`.*

### Step 4: Update Shopify Configuration
Once deployed, update Shopify's records with your new URLs:

```bash
# Verify the production config has the correct URLs
cat shopify.app.production.toml

# Push config to Shopify
path/to/cli/shopify app deploy --config=shopify.app.production.toml
```

## 4. Render.com Deployment (Free Tier)

### Step 1: Create a Database
1. Go to your Render Dashboard and click **New +** -> **PostgreSQL**.
2. Give it a name (e.g., `shopify-app-db`).
3. Select **Free** instance type.
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL**.

### Step 2: Create Web Service
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository (`krishna-brainbox/test`).
3. Name your service (e.g., `shopify-app-test`).
4. **Instance Type**: Select **Free**.
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm run docker-start`
7. Click **Advanced** and add **Environment Variables**:

| Key | Value |
| :--- | :--- |
| `SHOPIFY_API_KEY` | (From your Shopify Partner Dashboard) |
| `SHOPIFY_API_SECRET` | (From your Shopify Partner Dashboard) |
| `SCOPES` | `write_products,read_products,write_discounts,read_discounts` |
| `DATABASE_URL` | (Paste the **Internal Database URL** from Step 1) |
| `SHOPIFY_APP_URL` | (Leave empty for now, you will get this after deployment) |
| `NODE_VERSION` | `20` |

8. Click **Create Web Service**.

### Step 3: Final Configuration
1. Wait for the deployment to finish (it might fail correctly because URL is missing).
2. Copy the URL Render assigned to your app (e.g., `https://shopify-app-test.onrender.com`).
3. Go to **Environment Variables** in Render and update `SHOPIFY_APP_URL` with this new URL.
4. **Redeploy** (Manual Deploy -> Clear build cache & deploy).
5. Update your `shopify.app.production.toml` locally with this URL and run `shopify app deploy`.
