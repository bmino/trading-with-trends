function Candlestick(ticker, time, open, close, high, low, volume, trades, final, backfilled=false) {
    let self = this;
    self.time = time;
    self.ticker = ticker;
    self.open = parseFloat(open);
    self.close = parseFloat(close);
    self.high = parseFloat(high);
    self.low = parseFloat(low);
    self.volume = parseFloat(volume);
    self.trades = trades;
    self.final = final;
    self.backfilled = backfilled;
}

module.exports = Candlestick;