function OpenPosition(ticker, candle, macd, rsi, stoch, time=new Date().getTime()) {
    if (typeof time === 'object') time = time.getTime();

    let self = this;
    self.ticker = ticker;
    self.candle = candle;
    self.time = time;

    self.macd = macd;
    self.rsi = rsi;
    self.stoch = stoch;

    self.condition = {
        rsiMax: rsi
    };
}

module.exports = OpenPosition;