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
  pips: number;
  rr: number;
  strategy: string;
  session: string;
  mistakes: number[];
  emotion: string;
  reasoning: string;
  lesson: string;
  rulesFollowed: string;
  tags: string[];
  createdAt?: string;
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

export const PAIRS = [
  "XAUUSD (Gold)","EURUSD","GBPUSD","USDJPY","GBPJPY",
  "NASDAQ","US30","SP500","BTCUSD","ETHUSD",
  "USOIL","EURJPY","AUDUSD","USDCAD","NZDUSD","Other",
];

export const STRATEGIES = [
  "Structure Break","Order Block","Supply & Demand","Trend Follow","Shivam William Live","Telegram Entry","Youtube Live","Random",
  "Support & Resistance","Scalp","Breakout","Mean Reversion","News Trade","ICT Concepts","Other",
];

export const SESSIONS = ["Asian","London","New York","London-NY Overlap","Pre-Market"];

export const EMOTIONS = [
  { value:"calm",        label:"😌 Calm",          color:"#00E676" },
  { value:"disciplined", label:"✅ Disciplined",    color:"#00E676" },
  { value:"patient",     label:"🧘 Patient",        color:"#4D8EFF" },
  { value:"greedy",      label:"🤑 Greedy",         color:"#FFB020" },
  { value:"overconfident",label:"💪 Overconfident", color:"#FFB020" },
  { value:"fearful",     label:"😰 Fearful",        color:"#4D8EFF" },
  { value:"fomo",        label:"😱 FOMO",           color:"#FF4560" },
  { value:"revengeful",  label:"😤 Revenge",        color:"#FF4560" },
];

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
