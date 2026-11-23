# PeakTrail — cbBTC trading bot

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/ranstar04/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/ranstar04/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)

Entry for [Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261123-0511) — a bot that trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute on-chain Orca Whirlpool prices, starting with $1,000 of paper money.

## Strategy

One-minute BTC prices are mostly noise (about 8 bps of jitter per bar) on top of a slow drift, and a full round trip costs roughly 25–45 bps in fees, slippage and pool impact. Fast EMA-cross and momentum bots backtested on the frozen dev window all lost $50–$200, while buy-and-hold made about +$32. So PeakTrail trades rarely:

- **Buy all $1,000 on the first tradeable bar** — waiting for a slow EMA cross costs more in missed drift than it saves in avoided early dips.
- **Ride with a 1.25% trailing stop** from the highest close seen so far — a stop-out locks in most of a rise and caps a fall at about 1.25% plus costs.
- **Re-enter only on a genuine new high**: a close above the peak that triggered the exit, with the 30-bar EMA above the 120-bar EMA, after at least 30 bars of cooling off, and never in the final 60 bars.

Long only, one position, a handful of trades per day, no leverage, no shorts, no randomness, no clock, no network. Deterministic: two runs on the same data produce the same orders.

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, standard library only)
- `vendor/makefun-bars.ts` — the kit's bars-replay protocol shim, copied byte-for-byte

## Local backtest

On the kit's frozen 24h dev window (1,440 bars), the strategy's offline backtest gave about **+$14 net PnL with 3 trades** (buy, one stop-out, one breakout re-entry), max drawdown about 2.6% — comfortably above the $0 dev gate, with the trailing stop capping the loss at about −$15 on the mirrored (falling) window versus −$39 for buy-and-hold.

## Referral

Built with make.fun — [join via my referral](https://make.fun/r/dn9c31df).
