// PeakTrail — a cbBTC trend bot for make.fun btc-race-24h-20261123-0511.
//
// Idea, in one paragraph: one-minute BTC prices are mostly noise (about
// 8 bps of jitter per bar) on top of a slow drift, and a full round trip
// costs roughly 25-45 bps in fees, slippage and pool impact. So any bot
// that trades often bleeds itself dry: on the frozen dev window the fast
// EMA-cross and momentum bots I backtested all lost $50-$200, while
// simply buying and holding made about +$32. PeakTrail therefore trades
// rarely and only in the direction of the slow drift. It buys all of its
// $1,000 on the first tradeable bar, then rides the position with a
// 1.25% trailing stop measured from the highest close seen so far. A
// stop-out locks in most of a rise (or caps a fall at about 1.25% plus
// costs). After a stop-out it does NOT chase the market back in: it
// re-enters only on a genuine new high — a close above the peak that
// triggered the exit, with the 30-bar EMA above the 120-bar EMA — after
// at least 30 bars of cooling off, and never in the final 60 bars, when
// a fresh round trip cannot pay for itself. That is the whole strategy:
// long-biased, one position, a handful of trades per day, no leverage,
// no shorts, no randomness, no clock, no network.
//
// All state is derived from the bars the harness sends, so two runs on
// the same data produce the same orders byte for byte.

import { runBars } from "./vendor/makefun-bars.ts";
import type { BarsState, OrderInput } from "./vendor/makefun-bars.ts";

const SYMBOL = "CBBTC";
const MAX_SLIPPAGE_BPS = 500;
const STOP_BPS = 125; // trailing stop: 1.25% below the peak close
const COOLDOWN_BARS = 30; // bars to wait after a stop-out before re-entering
const NO_NEW_ENTRY_AFTER_SEQ = 1380; // final 60 bars: ride or sit, do not start a trade
const EMA_FAST = 30;
const EMA_SLOW = 120;

let emaFast: number | null = null;
let emaSlow: number | null = null;
let peakClose = 0; // highest close seen while long (USDC, as a float)
let exitPeak = 0; // peak close that triggered the last stop-out
let lastExitSeq = -1000000;
let enteredOnce = false;

function updateEma(price: number): void {
  if (emaFast === null) {
    emaFast = price;
    emaSlow = price;
    return;
  }
  const kFast = 2 / (EMA_FAST + 1);
  const kSlow = 2 / (EMA_SLOW + 1);
  emaFast = price * kFast + emaFast * (1 - kFast);
  emaSlow = price * kSlow + emaSlow * (1 - kSlow);
}

await runBars({
  onBatch(state: BarsState): OrderInput[] {
    if (state.warmingUp) return [];
    const closeRaw = state.close(SYMBOL);
    if (closeRaw === null) return [];
    // Prices arrive at price_scale 5: divide by 100000 to get USDC.
    const price = Number(closeRaw) / 100000;
    updateEma(price);

    const held = state.positions.get(SYMBOL);
    const qty = held === undefined ? 0n : held.qty;

    if (qty > 0n) {
      // Long: trail the peak and sell everything on a 1.25% pullback.
      if (price > peakClose) peakClose = price;
      const stopPrice = (peakClose * (10000 - STOP_BPS)) / 10000;
      if (price < stopPrice) {
        exitPeak = peakClose;
        lastExitSeq = state.seq;
        return [{ side: "sell", symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Flat: enter.
    if (!enteredOnce) {
      // First tradeable bar: buy with all cash. Waiting for a slow EMA
      // cross first costs more in missed drift than it saves in
      // avoided early dips, and the trailing stop bounds the downside.
      enteredOnce = true;
      peakClose = price;
      if (state.cash > 1000000n) {
        return [{ side: "buy", symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Re-entry only on a confirmed new high after cooling off.
    if (state.seq - lastExitSeq < COOLDOWN_BARS) return [];
    if (state.seq >= NO_NEW_ENTRY_AFTER_SEQ) return [];
    if (exitPeak <= 0) return [];
    if (price <= exitPeak) return [];
    if (emaFast === null || emaSlow === null || emaFast <= emaSlow) return [];
    peakClose = price;
    if (state.cash > 1000000n) {
      return [{ side: "buy", symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
