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
    emotion: { type: String, default: "" },
    reasoning: { type: String, default: "" },
    lesson: { type: String, default: "" },
    rulesFollowed: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// ─── DailyMistake Schema ─────────────────────────────────────────────────────
const DailyMistakeSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  avoided: { type: [Number], default: [] },
});

export const TradeModel =
  mongoose.models.Trade || mongoose.model("Trade", TradeSchema);

export const DailyMistakeModel =
  mongoose.models.DailyMistake ||
  mongoose.model("DailyMistake", DailyMistakeSchema);
