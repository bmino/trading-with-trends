function CrossoverObject(ticker, time, price, macd, rsi, stoch, ema, dema, tema) {
    let self = this;
    self.ticker = ticker;
    self.time = time;
    self.price = price;
    self.macd = macd;
    self.rsi = rsi;
    self.stoch = stoch;
    self.ema = ema;
    self.dema = dema;
    self.tema = tema;
}

module.exports = CrossoverObject;