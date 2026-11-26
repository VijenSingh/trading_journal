import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global._mongoose ?? (global._mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn("⚠️  MONGODB_URI not set in .env.local");
    return null;
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    }).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error("MongoDB connection failed:", err);
    throw err;
  }
  return cached.conn;
}

// ─── Trade Schema ────────────────────────────────────────────────────────────
const TradeSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    time: { type: String, default: "" },      // entry time HH:MM
    exitTime: { type: String, default: "" },  // exit time HH:MM; "" = not recorded
    pair: { type: String, required: true },
    type: { type: String, enum: ["BUY", "SELL"], required: true },
    lot: { type: Number, default: 0 },
    entry: { type: Number, default: 0 },
    sl: { type: Number, default: 0 },
    target: { type: Number, default: 0 },
    exit: { type: Number, default: 0 },
    pnl: { type: Number, required: true },         // NET P&L per account (after fees) — what every stat uses
    grossPnl: { type: Number, default: null },     // before fees; null on trades saved before fees existed
    fees: { type: Number, default: 0, min: 0 },    // commission etc. per account
    riskAmount: { type: Number, default: 0, min: 0 }, // $ lost if SL hit, per account; 0 = not known
    pips: { type: Number, default: 0 },
    rr: { type: Number, default: 0 },
    strategy: { type: String, default: "" },
    session: { type: String, default: "" },
    mistakes: { type: [Number], default: [] },
    noMistakesFlag: { type: Boolean, default: false },
    emotion: { type: String, default: "" },
    reasoning: { type: String, default: "" },
    lesson: { type: String, default: "" },
    rulesFollowed: { type: String, default: "" },
    tags: { type: [String], default: [] },
    screenshot: { type: String, default: "" },     // legacy/fallback: base64 data URL kept in the DB
    screenshotPath: { type: String, default: "" }, // Vercel Blob pathname when the image lives in Blob
    propFirm: { type: String, default: "" },
    // Accounts this trade ran on (trade copier). pnl is per account, so each one gets it.
    accounts: { type: [String], default: [] },
  },
  { timestamps: true }
);
TradeSchema.index({ date: -1, time: -1 });
TradeSchema.index({ accounts: 1 });
TradeSchema.index({ pair: 1 });
TradeSchema.index({ propFirm: 1 });

// ─── PropFirm Schema ─────────────────────────────────────────────────────────
const PropFirmSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

// ─── DailyMistake Schema ─────────────────────────────────────────────────────
const DailyMistakeSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  avoided: { type: [Number], default: [] },
});

// ─── Goal Schema ─────────────────────────────────────────────────────────────
const GoalSchema = new mongoose.Schema({
  periodType: { type: String, enum: ["month", "week"], required: true },
  periodKey: { type: String, required: true }, // "2026-09" for month, "2026-W36" for week
  propFirm: { type: String, default: "" },
  targetPnl: { type: Number, default: 0 },
  maxLossLimit: { type: Number, default: 0 },
});
GoalSchema.index({ periodType: 1, periodKey: 1, propFirm: 1 }, { unique: true });

// ─── Balance Transaction Schema (deposits / withdrawals) ───────────────────
const TransactionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    type: { type: String, enum: ["deposit", "withdrawal"], required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: "" },
    propFirm: { type: String, default: "" },
  },
  { timestamps: true }
);

// ─── Prop firm account (one evaluation / funded account at a firm) ──────────
export const ACCOUNT_STATUSES = ["evaluation", "funded", "passed", "failed", "closed"] as const;
const AccountSchema = new mongoose.Schema(
  {
    propFirm: { type: String, required: true },
    name: { type: String, required: true },          // e.g. "50K #1"
    size: { type: Number, required: true, min: 0 },  // starting balance in USD
    startDate: { type: String, required: true },     // YYYY-MM-DD
    status: { type: String, enum: ACCOUNT_STATUSES, default: "evaluation" },
    statusHistory: {
      type: [{ status: { type: String, enum: ACCOUNT_STATUSES }, date: String, _id: false }],
      default: [],
    },
    notes: { type: String, default: "" },
    commissionPerContract: { type: Number, default: 0, min: 0 }, // round-trip, USD
    // Prop firm rules for this account; 0 / null means "not set". See lib/accountRules.ts.
    rules: {
      drawdownType: { type: String, enum: ["none", "eod_trailing"], default: "none" },
      maxDrawdown: { type: Number, default: 0, min: 0 },     // trailing distance, USD
      lockAt: { type: Number, default: null },                // floor stops trailing at this balance
      dailyLossLimit: { type: Number, default: 0, min: 0 },
      profitTarget: { type: Number, default: 0, min: 0 },
      consistencyPct: { type: Number, default: 0, min: 0, max: 100 }, // best day ≤ this % of total profit
    },
  },
  { timestamps: true }
);
AccountSchema.index({ propFirm: 1, startDate: -1 });

// ─── PropFirm Account Transaction Schema (challenge investment / payout) ────
const AccountTxnSchema = new mongoose.Schema(
  {
    propFirm: { type: String, required: true },
    accountId: { type: String, default: "" }, // set when the fee/payout belongs to one account
    type: { type: String, enum: ["investment", "payout"], required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);
AccountTxnSchema.index({ propFirm: 1 });

// ─── Trading Rule Schema (user-editable) ────────────────────────────────────
const RuleSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ["pre", "during", "post", "emergency"], required: true },
    text: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
RuleSchema.index({ category: 1, order: 1 });

// ─── Custom Pair/Instrument Schema (user-added, beyond the built-in list) ───
const PairSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

// ─── Certificate Schema (evaluation pass / payout proof — multiple allowed) ─
const CertificateSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["evaluation", "payout"], required: true },
    label: { type: String, default: "" },
    propFirm: { type: String, default: "" },
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    fileData: { type: String, default: "" }, // legacy/fallback: base64 data URL kept in the DB
    filePath: { type: String, default: "" }, // Vercel Blob pathname when the file lives in Blob
    fileSize: { type: Number },               // bytes; set for Blob-stored files
  },
  { timestamps: true }
);
CertificateSchema.index({ type: 1, createdAt: -1 });
CertificateSchema.index({ propFirm: 1 });

// ─── Login Attempt Schema (brute-force lockout on /api/auth/login) ─────────
const LoginAttemptSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);
// Auto-clean stale rows a day after their last activity — keeps the collection small.
LoginAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

// ─── Push Subscription Schema (Web Push, for reminders when the app is closed) ─
const PushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

// ─── Restore staging (backup restore uploads in chunks, then swaps in one transaction) ─
const RestoreChunkSchema = new mongoose.Schema(
  {
    restoreId: { type: String, required: true },
    collectionName: { type: String, required: true },
    seq: { type: Number, required: true },
    docs: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);
RestoreChunkSchema.index({ restoreId: 1, collectionName: 1, seq: 1 }, { unique: true });
// An abandoned restore (tab closed mid-upload) cleans itself up after a day.
RestoreChunkSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

const RestoreSessionSchema = new mongoose.Schema(
  {
    restoreId: { type: String, required: true, unique: true },
    expected: { type: mongoose.Schema.Types.Mixed, required: true }, // { trades: 120, rules: 19, ... }
  },
  { timestamps: true }
);
RestoreSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export const TradeModel =
  mongoose.models.Trade || mongoose.model("Trade", TradeSchema);

export const PropFirmModel =
  mongoose.models.PropFirm || mongoose.model("PropFirm", PropFirmSchema);

export const DailyMistakeModel =
  mongoose.models.DailyMistake ||
  mongoose.model("DailyMistake", DailyMistakeSchema);

export const GoalModel =
  mongoose.models.Goal || mongoose.model("Goal", GoalSchema);

export const TransactionModel =
  mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);

export const AccountModel =
  mongoose.models.Account || mongoose.model("Account", AccountSchema);

export const AccountTxnModel =
  mongoose.models.AccountTxn || mongoose.model("AccountTxn", AccountTxnSchema);

export const RuleModel =
  mongoose.models.Rule || mongoose.model("Rule", RuleSchema);

export const PairModel =
  mongoose.models.Pair || mongoose.model("Pair", PairSchema);

export const CertificateModel =
  mongoose.models.Certificate || mongoose.model("Certificate", CertificateSchema);

export const LoginAttemptModel =
  mongoose.models.LoginAttempt || mongoose.model("LoginAttempt", LoginAttemptSchema);

export const PushSubscriptionModel =
  mongoose.models.PushSubscription || mongoose.model("PushSubscription", PushSubscriptionSchema);

export const RestoreChunkModel =
  mongoose.models.RestoreChunk || mongoose.model("RestoreChunk", RestoreChunkSchema);

export const RestoreSessionModel =
  mongoose.models.RestoreSession || mongoose.model("RestoreSession", RestoreSessionSchema);
