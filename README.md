# 📈 TraderMind — Lucid PropFirm Trading Journal

Advanced trading journal built with **Next.js 14 + MongoDB Atlas** for serious prop firm traders.

---

## 🚀 Features

- **Dashboard** — Real-time P&L, equity curve, win/loss chart, recent trades
- **Trade Logger** — Full trade entry with emotion, mistakes, reasoning, journal
- **Journal** — Filterable trade log with expand-on-click detail view
- **Analytics** — Equity curve, strategy breakdown, day-of-week analysis, radar scorecard
- **Monthly P&L** — Month-wise bar charts + detailed breakdown
- **Mistakes Tracker** — Daily discipline tracking saved to MongoDB
- **Rules** — Pre/during/post-trade rules + emergency protocols
- **Mindset** — Daily affirmations + crisis protocols

---

## 🛠️ Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local
MONGODB_URI=mongodb+srv://vijjudata:vijju5592@cluster0.vqv6fct.mongodb.net/tradermind?retryWrites=true&w=majority&appName=Cluster0

# 3. Run dev server
npm run dev

# 4. Open browser
http://localhost:3000
```

---

## ☁️ Deploy on Vercel (FREE)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "TraderMind initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tradermind.git
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"New Project"** → Import your GitHub repo
3. In **Environment Variables**, add:
   ```
   MONGODB_URI = mongodb+srv://vijjudata:vijju5592@cluster0.vqv6fct.mongodb.net/tradermind?retryWrites=true&w=majority&appName=Cluster0
   ```
4. Click **Deploy** → Done! 🎉

Your live URL will be: `https://tradermind.vercel.app` (or similar)

---

## 📁 Project Structure

```
tradermind/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── DashboardClient.tsx   # Dashboard charts & stats
│   ├── layout.tsx            # Root layout with sidebar
│   ├── globals.css           # Global styles
│   ├── trade/new/page.tsx    # New trade form
│   ├── journal/page.tsx      # Trade journal
│   ├── analytics/page.tsx    # Deep analytics
│   ├── monthly/page.tsx      # Monthly P&L
│   ├── mistakes/page.tsx     # Daily mistakes tracker
│   ├── rules/page.tsx        # Trading rules
│   ├── mindset/page.tsx      # Affirmations & mindset
│   └── api/
│       ├── trades/route.ts          # GET all, POST trade
│       ├── trades/[id]/route.ts     # DELETE, PATCH trade
│       ├── mistakes/route.ts        # Daily mistakes
│       └── analytics/route.ts       # All trades for analytics
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   └── PageHeader.tsx    # Page header
│   └── ui/
│       └── index.tsx         # Card, Button, Badge, StatCard etc.
├── lib/
│   ├── db.ts                 # MongoDB + Mongoose models
│   ├── types.ts              # TypeScript types + constants
│   └── utils.ts             # Helper functions
├── .env.local                # MongoDB URI (do NOT commit)
└── vercel.json               # Vercel config
```

---

## 🗃️ MongoDB Collections

- **trades** — All trade entries
- **dailymistakes** — Daily mistake tracking by date

---

## ⚙️ Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 14 | Framework (App Router) |
| TypeScript | Type safety |
| Mongoose | MongoDB ODM |
| MongoDB Atlas | Cloud database |
| Tailwind CSS | Styling |
| Recharts | Charts |
| Lucide React | Icons |
| React Hot Toast | Notifications |
| Vercel | Deployment |
