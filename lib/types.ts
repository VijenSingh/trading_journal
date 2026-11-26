import type { AccountRules, RuleCheck } from "./accountRules";
export interface Trade {
  _id?: string;
  date: string;
  time: string;
  pair: string;
  type: "BUY" | "SELL";
  lot: number;
  entry: number;
  sl: number;
  target: number;
  exit: number;
  pnl: number;
  riskAmount?: number; // $ at risk if SL is hit (per account); R = pnl / riskAmount
  pips: number;
  rr: number;
  strategy: string;
  session: string;
  mistakes: number[];
  noMistakesFlag?: boolean;
  emotion: string;
  reasoning: string;
  lesson: string;
  rulesFollowed: string;
  tags: string[];
  screenshot?: string;     // only present on single-trade responses; lists send hasScreenshot instead
  hasScreenshot?: boolean;
  propFirm?: string;
  accounts?: string[]; // account ids this trade ran on (copier); pnl is per account
  createdAt?: string;
  updatedAt?: string;
}

export type AccountStatus = "evaluation" | "funded" | "passed" | "failed" | "closed";
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  evaluation: "Evaluation", funded: "Funded", passed: "Passed", failed: "Failed / Blown", closed: "Closed",
};
// Accounts that can still take trades (pre-ticked in the trade form).
export const ACTIVE_STATUSES: AccountStatus[] = ["evaluation", "funded"];

export interface PropAccount {
  _id: string;
  propFirm: string;
  name: string;
  size: number;
  startDate: string;
  status: AccountStatus;
  statusHistory: { status: AccountStatus; date: string }[];
  notes: string;
  rules?: AccountRules;
}

// PropAccount + figures computed by /api/accounts
export interface AccountStats extends PropAccount {
  trades: number;
  pnl: number;          // sum of trade P&L on this account
  payouts: number;
  fees: number;
  balance: number;      // size + pnl - payouts
  peakBalance: number;  // highest balance reached
  maxDrawdown: number;  // largest peak-to-trough fall of the balance, USD
  lastTradeDate: string;
  net: number;          // payouts - fees: what the account has made you so far
  check: RuleCheck;     // prop firm rule status (lib/accountRules)
}

// URL of a trade's screenshot; updatedAt busts the (immutable) browser cache after an edit.
export function screenshotUrl(t: { _id?: string; updatedAt?: string }): string {
  return `/api/trades/${t._id}/screenshot?v=${encodeURIComponent(t.updatedAt || "")}`;
}

export interface Certificate {
  _id?: string;
  type: "evaluation" | "payout";
  label?: string;
  propFirm?: string;
  fileName: string;
  mimeType: string;
  fileSize?: number; // bytes; the file itself is at /api/certificates/[id]/file
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthStat {
  month: string;
  label: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
}

export const MISTAKES = [
  { id:1, name:"Revenge Trading", short:"Revenge", tip:"Loss ke baad chart band karo. 30 min cooling period mandatory.", color:"red" },
  { id:2, name:"Lot Size Badhaana", short:"Lot↑", tip:"Lot size kabhi bhi loss cover ke liye increase mat karo. Hamesha fix rakhna.", color:"red" },
  { id:3, name:"Purana Profit Recover", short:"FORO", tip:"Har trade fresh hai. Purani P&L bhool jao, sirf aaj pe focus karo.", color:"amber" },
  { id:4, name:"Overtrade / Random", short:"Overtrade", tip:"2 se zyada trade nahi. Boredom pe trade nahi lena — kabhi bhi.", color:"amber" },
  { id:5, name:"Loss Accept Nahi", short:"No Accept", tip:"SL hit hona plan ka hissa hai. Loss = business expense. Accept karo.", color:"red" },
  { id:6, name:"Target Se Pehle Cut", short:"Early Exit", tip:"Target set kiya? Full wait karo. Beech mein cut karna = pattern todna.", color:"amber" },
  { id:7, name:"Sideways Mein Trade", short:"Sideways", tip:"Market sideways? No trade. Clear direction ka wait karo, tabhi entry.", color:"blue" },
  { id:8, name:"Fixed Strategy Nahi", short:"No Plan", tip:"Ek strategy, ek setup, ek plan. Random trade = guaranteed loss.", color:"purple" },
];

// Grouped for the pair dropdowns. Names are stored on trades as-is, so never rename one.
export const PAIR_GROUPS: { label: string; pairs: string[] }[] = [
  { label: "Futures (CME)", pairs: ["NQ", "MNQ", "ES", "MES", "YM", "MYM", "RTY", "M2K", "GC", "MGC", "CL", "MCL"] },
  { label: "Forex / Metals", pairs: ["XAUUSD (Gold)", "EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "EURJPY", "AUDUSD", "USDCAD", "NZDUSD"] },
  { label: "Index CFDs", pairs: ["NASDAQ", "US30", "SP500"] },
  { label: "Crypto / Commodities", pairs: ["BTCUSD", "ETHUSD", "USOIL"] },
];

export const PAIRS = [...PAIR_GROUPS.flatMap(g => g.pairs), "Other"];

export const STRATEGIES = [
  "Structure Break","Order Block","Supply & Demand","Trend Follow","Shivam William Live","Telegram","Youtube Live","Random",
  "Support & Resistance","Scalp","Breakout","Mean Reversion","News Trade","ICT Concepts","Other",
];

export const SESSIONS = ["Asian","London","New York","London-NY Overlap","Pre-Market"];

export const EMOTIONS = [
  { value:"calm",        label:"😌 Calm",          color:"#10B981" },
  { value:"disciplined", label:"✅ Disciplined",    color:"#10B981" },
  { value:"patient",     label:"🧘 Patient",        color:"#6366F1" },
  { value:"greedy",      label:"🤑 Greedy",         color:"#F59E0B" },
  { value:"overconfident",label:"💪 Overconfident", color:"#F59E0B" },
  { value:"fearful",     label:"😰 Fearful",        color:"#6366F1" },
  { value:"fomo",        label:"😱 FOMO",           color:"#F43F5E" },
  { value:"revengeful",  label:"😤 Revenge",        color:"#F43F5E" },
];

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
