function Candlestick(ticker, time, interval, open, close, high, low, baseVolume, quoteVolume, trades, final, backfilled=false) {
    let self = this;
    self.ticker = ticker;
    self.time = time;
    self.interval = interval;
    self.open = parseFloat(open);
    self.close = parseFloat(close);
    self.high = parseFloat(high);
    self.low = parseFloat(low);
    self.baseVolume = parseFloat(baseVolume);
    self.quoteVolume = parseFloat(quoteVolume);
    self.trades = trades;
    self.final = final;
    self.backfilled = backfilled;
}

module.exports = Candlestick;