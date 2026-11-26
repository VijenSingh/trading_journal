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
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tradermind?retryWrites=true&w=majority
# Optional locally (leave both unset to skip login); REQUIRED in production —
# without them the deployed app refuses every request instead of running open.
AUTH_PASSWORD=<login password>
AUTH_SECRET=<long random string>

# 3. Run dev server
npm run dev

# 4. Open browser
http://localhost:3000
```

---

## 🧪 Tests

```bash
npm run typecheck   # TypeScript
npm test            # unit tests (calculations, rules, CSV, validation) — no database needed
npm run build && npm run test:e2e   # end-to-end: the built app against a throwaway in-memory MongoDB
```

- End-to-end tests start their own MongoDB in memory and set every secret explicitly. Before
  writing anything they check the app really uses that test database and no Blob store; if a
  value from `.env.local` ever won, the run stops untouched ("SAFETY STOP").
- `tests/e2e/blob.test.ts` talks to a real Vercel Blob store, so it is skipped unless you run it
  with `E2E_BLOB=1` and `BLOB_READ_WRITE_TOKEN` set. It only writes under a fresh
  `e2e-test-<time>/` folder and deletes it at the end.
- GitHub Actions runs type-check, unit tests, build and e2e on every push and pull request to `main`.
- Windows: if the test MongoDB fails to start with a large exit code, install the
  [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist).

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
   MONGODB_URI   = <your Atlas connection string>
   AUTH_PASSWORD = <login password>
   AUTH_SECRET   = <long random string>
   ```
   Never commit real values — keep them only in `.env.local` and Vercel's Environment Variables.
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
