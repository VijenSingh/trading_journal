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
    time: { type: String, default: "" },
    pair: { type: String, required: true },
    type: { type: String, enum: ["BUY", "SELL"], required: true },
    lot: { type: Number, default: 0 },
    entry: { type: Number, default: 0 },
    sl: { type: Number, default: 0 },
    target: { type: Number, default: 0 },
    exit: { type: Number, default: 0 },
    pnl: { type: Number, required: true },
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
    screenshot: { type: String, default: "" },
    propFirm: { type: String, default: "" },
  },
  { timestamps: true }
);
TradeSchema.index({ date: -1, time: -1 });
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

// ─── PropFirm Account Transaction Schema (challenge investment / payout) ────
const AccountTxnSchema = new mongoose.Schema(
  {
    propFirm: { type: String, required: true },
    type: { type: String, enum: ["investment", "payout"], required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);
AccountTxnSchema.index({ propFirm: 1 });

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

export const AccountTxnModel =
  mongoose.models.AccountTxn || mongoose.model("AccountTxn", AccountTxnSchema);
