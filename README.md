# ResumeIQ — Netlify Deployment Guide

## Project structure

```
resumeiq-netlify/
├── index.html                  ← Frontend (the UI)
├── netlify.toml                ← Netlify build config
├── netlify/
│   └── functions/
│       └── analyze.js          ← Serverless function (API key lives here, server-side only)
└── README.md
```

---

## How security works

```
Browser                    Netlify Function               Anthropic
   │                             │                             │
   │  POST /analyze?token=XXX    │                             │
   │ ──────────────────────────► │  validates token            │
   │                             │  adds API key from env var  │
   │                             │ ───────────────────────────►│
   │                             │ ◄───────────────────────────│
   │ ◄────────────────────────── │                             │
   │   (result JSON, no key)     │
```

- The Anthropic API key is stored as a **Netlify environment variable** — it never appears in any file
- The access token is also a **Netlify environment variable** — not in the code
- Only visitors with the correct `?token=` in their URL can use the tool

---

## Step 1 — Push to GitHub

1. Create a new repo at https://github.com/new (name it `resumeiq` or similar)
2. Upload all three files maintaining the folder structure:
   - `index.html` → root
   - `netlify.toml` → root
   - `netlify/functions/analyze.js` → in the `netlify/functions/` folder

Or via terminal:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/resumeiq.git
git push -u origin main
```

---

## Step 2 — Deploy on Netlify

1. Go to https://app.netlify.com → **Add new site** → **Import from GitHub**
2. Select your repo
3. Build settings are auto-detected from `netlify.toml` — leave them as-is
4. Click **Deploy site**

---

## Step 3 — Set environment variables (IMPORTANT)

In Netlify dashboard → **Site settings** → **Environment variables** → **Add variable**:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-your-actual-key` |
| `ACCESS_TOKEN` | `choose-any-secret-word` (e.g. `hrview2025`) |

After adding variables → go to **Deploys** → **Trigger deploy** → **Deploy site** (so the new env vars take effect).

---

## Step 4 — Your shareable link

Your site URL will be something like: `https://resumeiq-yourname.netlify.app`

The link you put in your resume:
```
https://resumeiq-yourname.netlify.app/?token=hrview2025
```

Replace `hrview2025` with whatever you set as `ACCESS_TOKEN`.

**Without the token:** visitors see a "🔒 Access Restricted" page  
**With the token:** the full tool is unlocked

---

## Optional: Custom domain

In Netlify → **Domain settings** → **Add custom domain**  
e.g. `resumeiq.yourname.dev` (free `.netlify.app` subdomain also works fine for a resume)

---

## Changing the token later

Just update the `ACCESS_TOKEN` environment variable in Netlify and redeploy.
Update the link in your resume accordingly.
