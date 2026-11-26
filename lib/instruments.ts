// One place that knows what a 1.0 price move is worth, per instrument.
// P&L (USD) = price difference × pointValue × lots (or contracts).
// TradeForm (auto P&L) and the position-size calculator both read from here.

export type InstrumentKind = "forex" | "metal" | "cfd" | "crypto" | "future";

export interface InstrumentSpec {
  kind: InstrumentKind;
  pointValue: number; // USD per 1.0 price move per 1 lot / contract
  note: string;       // shown under the form, so the assumption is visible
}

export const INSTRUMENTS: Record<string, InstrumentSpec> = {
  // ── Forex: standard lot = 100,000 units (pip 0.0001 → $10/pip on USD-quoted pairs) ──
  "EURUSD": { kind: "forex", pointValue: 100000, note: "1 lot = 100k · $10/pip" },
  "GBPUSD": { kind: "forex", pointValue: 100000, note: "1 lot = 100k · $10/pip" },
  "AUDUSD": { kind: "forex", pointValue: 100000, note: "1 lot = 100k · $10/pip" },
  "NZDUSD": { kind: "forex", pointValue: 100000, note: "1 lot = 100k · $10/pip" },
  // Non-USD quote currencies: pip value moves with the rate, these are approximations.
  "USDJPY": { kind: "forex", pointValue: 910,    note: "≈ $9.1/pip (approx)" },
  "GBPJPY": { kind: "forex", pointValue: 910,    note: "≈ $9.1/pip (approx)" },
  "EURJPY": { kind: "forex", pointValue: 910,    note: "≈ $9.1/pip (approx)" },
  "USDCAD": { kind: "forex", pointValue: 77000,  note: "≈ $7.7/pip (approx)" },
  "USDCHF": { kind: "forex", pointValue: 112000, note: "≈ $11.2/pip (approx)" },

  // ── Metals / commodities, CFD lots ──
  "XAUUSD (Gold)": { kind: "metal", pointValue: 100,  note: "1 lot = 100 oz · $100 per $1 move" },
  "USOIL":         { kind: "cfd",   pointValue: 1000, note: "1 lot = 1000 bbl · $10 per 0.01" },

  // ── Index CFDs (broker-dependent; most quote $1 per point per lot) ──
  "NASDAQ": { kind: "cfd", pointValue: 1, note: "CFD · $1/point per lot" },
  "US30":   { kind: "cfd", pointValue: 1, note: "CFD · $1/point per lot" },
  "SP500":  { kind: "cfd", pointValue: 1, note: "CFD · $1/point per lot" },

  // ── Crypto CFDs: 1 lot = 1 coin ──
  "BTCUSD": { kind: "crypto", pointValue: 1, note: "1 lot = 1 BTC" },
  "ETHUSD": { kind: "crypto", pointValue: 1, note: "1 lot = 1 ETH" },

  // ── CME futures (prop firms like Lucid): point value per contract ──
  "NQ":  { kind: "future", pointValue: 20,   note: "E-mini Nasdaq · $20/point" },
  "MNQ": { kind: "future", pointValue: 2,    note: "Micro Nasdaq · $2/point" },
  "ES":  { kind: "future", pointValue: 50,   note: "E-mini S&P · $50/point" },
  "MES": { kind: "future", pointValue: 5,    note: "Micro S&P · $5/point" },
  "YM":  { kind: "future", pointValue: 5,    note: "E-mini Dow · $5/point" },
  "MYM": { kind: "future", pointValue: 0.5,  note: "Micro Dow · $0.50/point" },
  "RTY": { kind: "future", pointValue: 50,   note: "E-mini Russell · $50/point" },
  "M2K": { kind: "future", pointValue: 5,    note: "Micro Russell · $5/point" },
  "GC":  { kind: "future", pointValue: 100,  note: "Gold 100 oz · $100 per $1" },
  "MGC": { kind: "future", pointValue: 10,   note: "Micro Gold 10 oz · $10 per $1" },
  "CL":  { kind: "future", pointValue: 1000, note: "Crude 1000 bbl · $10 per 0.01" },
  "MCL": { kind: "future", pointValue: 100,  note: "Micro Crude 100 bbl · $1 per 0.01" },
};

export function getInstrument(pair: string): InstrumentSpec | undefined {
  return INSTRUMENTS[pair];
}

// Signed P&L in USD, or null when the instrument's contract size is unknown
// (custom pairs) — then the trader enters P&L by hand rather than get a guess.
export function calcPnl(pair: string, type: "BUY" | "SELL", entry: number, exit: number, lots: number): number | null {
  const spec = INSTRUMENTS[pair];
  if (!spec || !entry || !exit || !lots) return null;
  const diff = type === "BUY" ? exit - entry : entry - exit;
  return Math.round(diff * spec.pointValue * lots * 100) / 100;
}

// Position size for a given USD risk and stop distance. Futures round down to whole
// contracts (you cannot trade 1.7 NQ); everything else to 0.01 lots.
export function calcPositionSize(pair: string, riskAmount: number, stopDistance: number): number | null {
  const spec = INSTRUMENTS[pair];
  if (!spec || riskAmount <= 0 || stopDistance <= 0) return null;
  const raw = riskAmount / (stopDistance * spec.pointValue);
  // The epsilon absorbs float noise (1.105 - 1.1 = 0.00499999…) so an exact fit is not cut by one step.
  return spec.kind === "future" ? Math.floor(raw + 1e-9) : Math.floor(raw * 100 + 1e-9) / 100;
}

export const isFuture = (pair: string) => INSTRUMENTS[pair]?.kind === "future";
