# Deployment Guide: MindsetOS Team Report Prototype on Vercel

This guide walks you through deploying the MindsetOS Team Report Prototype on Vercel using Convex HTTP actions.

## Architecture Overview

- **Frontend**: React + Vite (deployed on Vercel)
- **Backend**: Convex (HTTP actions for API endpoints)
- **Database**: Convex (built-in)
- **AI**: OpenAI via Vercel AI SDK

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Convex Account**: Sign up at [convex.dev](https://convex.dev)
3. **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)

## Step 1: Set Up Convex

1. **Install Convex CLI** (if not already installed):
   ```bash
   npm install -g convex
   ```

2. **Initialize Convex** (if not already done):
   ```bash
   npx convex dev
   ```
   This will:
   - Create a Convex project (if needed)
   - Generate deployment URL
   - Deploy your schema and functions

3. **Note your Convex URL**: After running `npx convex dev`, you'll see:
   ```
   Deployment URL: https://your-project.convex.cloud
   ```
   Save this URL - you'll need it for environment variables.

## Step 2: Configure Environment Variables

### In Convex Dashboard:

1. Go to your Convex project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `OPENAI_API_KEY` = `your-openai-api-key`

### In Vercel Dashboard:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add:
   - `VITE_CONVEX_URL` = `https://your-project.convex.cloud` (your Convex deployment URL)

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Option B: Deploy via GitHub Integration

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Import project in Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration
   - Add environment variables (see Step 2)
   - Click **Deploy**

## Step 4: Verify Deployment

1. **Check Convex HTTP endpoints**:
   - Health check: `https://your-project.convex.cloud/api/health`
   - Should return: `{"status":"ok"}`

2. **Check Vercel deployment**:
   - Visit your Vercel deployment URL
   - Test report generation

## Project Structure

```
mindos/
├── convex/
│   ├── http.ts              # HTTP router (routes API endpoints)
│   ├── generateReport.ts    # HTTP actions for report generation
│   ├── reports.ts           # Convex mutations/queries for reports
│   ├── teams.ts            # Convex queries for teams
│   └── schema.ts           # Database schema
├── app/
│   └── page.tsx            # Main dashboard component
├── src/
│   └── lib/
│       └── promptBuilder.ts # Prompt building logic
├── config/
│   └── reportModules.ts    # Report module configuration
├── vercel.json             # Vercel configuration
└── package.json
```

## API Endpoints

All API endpoints are handled by Convex HTTP actions:

- `POST /api/generate-report` - Generate team report using OpenAI
- `GET /api/health` - Health check endpoint

These endpoints are accessible at: `{CONVEX_URL}/api/{endpoint}`

## Environment Variables Reference

### Required in Convex:
- `OPENAI_API_KEY` - Your OpenAI API key

### Required in Vercel (Frontend):
- `VITE_CONVEX_URL` - Your Convex deployment URL (e.g., `https://your-project.convex.cloud`)

## Troubleshooting

### Issue: "VITE_CONVEX_URL is not set"
- **Solution**: Add `VITE_CONVEX_URL` to Vercel environment variables

### Issue: "OPENAI_API_KEY not found"
- **Solution**: Add `OPENAI_API_KEY` to Convex environment variables

### Issue: CORS errors
- **Solution**: CORS is handled in Convex HTTP actions. Ensure your Convex deployment URL is correct.

### Issue: Module order not preserved
- **Solution**: Ensure `config/reportModules.ts` has modules in the desired order

## Local Development

For local development, you can still use the Express server:

```bash
# Terminal 1: Start Convex
npx convex dev

# Terminal 2: Start Express server (optional, for local testing)
npm run dev:server

# Terminal 3: Start Vite dev server
npm run dev:client
```

Or use the combined command:
```bash
npm run dev
```

## Notes

- The Express server (`server/index.ts`) is kept for local development but is **not used in production**
- All API routes are handled by Convex HTTP actions (`convex/generateReport.ts`)
- The frontend automatically uses Convex HTTP endpoints when `VITE_CONVEX_URL` is set
- Convex HTTP actions use the `"use node"` directive to access Node.js APIs (like `fs` for reading `prompt.txt`)

## Updating After Deployment

1. **Update code**: Make changes locally
2. **Deploy Convex changes**: `npx convex deploy`
3. **Deploy Vercel changes**: Push to GitHub (auto-deploys) or run `vercel --prod`

## Support

- Convex Docs: [docs.convex.dev](https://docs.convex.dev)
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Vercel AI SDK: [sdk.vercel.ai](https://sdk.vercel.ai)
