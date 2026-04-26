// models/Trade.ts
import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema({
  pair: String,
  type: String, // BUY / SELL
  lot: Number,
  entry: Number,
  sl: Number,
  tp: Number,
  exit: Number,
  pnl: Number,

  mistakes: {
    revenge: Boolean,
    overtrade: Boolean,
    noSetup: Boolean,
  },

  emotion: String,
  note: String,

  date: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Trade || mongoose.model("Trade", TradeSchema);