const binance = require('node-binance-api');
const MACD = require('technicalindicators').MACD;

let MarketDataService = {
    candles: {},

    populate: populate
};

module.exports = MarketDataService;

function populate(tickers, interval='1m') {
    console.log('Populating candlesticks cache for ' + tickers);

    tickers.forEach(clearCandles);

    binance.websockets.candlesticks(tickers, interval, (tick) => {
        let { E:eventTime, s:ticker, k:candle } = tick;
        console.log(`Received ${ticker} candlesticks tick`);

        candle = {
            time: eventTime,
            open: parseFloat(candle.o),
            close: parseFloat(candle.c),
            high: parseFloat(candle.h),
            low: parseFloat(candle.l),
            volume: parseFloat(candle.v),
            trades: candle.n,
            final: candle.x
        };

        // Consider only adding final candles to the cache
        if (containsNoCandles(ticker)) {
            MarketDataService.candles[ticker].push(candle);
            backfill(ticker, interval, eventTime, 30);
        } else if (getLastCandle(ticker).final) {
            MarketDataService.candles[ticker].push(candle);
        } else {
            overrideLastCandle(ticker, candle);
        }

    });
}

function backfill(ticker, interval, endTime, limit=10) {
    console.log(`Back filling ${limit} candlesticks for ${ticker}`);

    let options = {
        limit: limit,
        endTime: typeof endTime === 'number' ? endTime : endTime.getTime()
    };

    return new Promise((resolve, reject) => {
        binance.candlesticks(ticker, interval, (error, ticks, symbol) => {
            let candles = ticks.map(tick => {
                let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
                return {
                    time: time,
                    open: parseFloat(open),
                    high: parseFloat(high),
                    low: parseFloat(low),
                    close: parseFloat(close),
                    volume: parseFloat(volume),
                    trades: trades,
                    final: true,
                    backfilled: true
                };
            });
            // console.log(`0 time is ${candles[0].time}`);
            // console.log(`X time is ${candles[candles.length - 1].time}`);
            // if (MarketDataService.candles[ticker]) console.log(`Earliest time existing is ${MarketDataService.candles[ticker][0].time}`);
            addCandlesToBeginning(ticker, candles);
            console.log(`Back filled ${candles.length} ${ticker} candles`);

            return resolve(candles);
        }, options);
    });
}

function clearCandles(ticker) {
    MarketDataService.candles[ticker] = [];
}

function containsNoCandles(ticker) {
    return MarketDataService.candles[ticker].length === 0;
}

function getLastCandle(ticker) {
    return MarketDataService.candles[ticker][MarketDataService.candles[ticker].length - 1];
}

function overrideLastCandle(ticker, candle) {
    return MarketDataService.candles[ticker][MarketDataService.candles[ticker].length - 1] = candle;
}

function addCandlesToBeginning(ticker, candles) {
    return MarketDataService.candles[ticker] = candles.concat(MarketDataService.candles[ticker]);
}

function macd(candlesticks) {
    let values = candlesticks.map((candle) => {return candle.close;});

    let macd = MACD.calculate({
        values            : values,
        fastPeriod        : 12,
        slowPeriod        : 26,
        signalPeriod      : 14,
        SimpleMAOscillator: false,
        SimpleMASignal    : false
    });

    console.log(`Macd: ${macd}`);
}