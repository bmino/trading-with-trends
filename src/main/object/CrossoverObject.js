function CrossoverObject(ticker, time, macd, rsi, stoch) {
    let self = this;
    self.ticker = ticker;
    self.time = time;
    self.macd = macd;
    self.rsi = rsi;
    self.stoch = stoch;
}

module.exports = CrossoverObject;