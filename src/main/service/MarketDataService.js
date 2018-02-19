const binance = require('node-binance-api');
const EntryPointService = require('./EntryPointService');
const Candlestick = require('../object/Candlestick');

let MarketDataService = {
    symbols: [],
    tickers: [],
    candles: {},

    init: init,

    watch: watch,
    backfill: backfill,
    getCandleHistory: getCandleHistory
};

module.exports = MarketDataService;

function init() {
    console.log('Fetching exchange info ...');
    return new Promise((resolve, reject) => {
        return binance.exchangeInfo((error, data) => {
            if (error) return reject(error);

            let symbols = [];
            let tickers = [];

            data.symbols.map(obj => {
                if (obj.status !== 'TRADING') return;
                symbols.push(obj.baseAsset);
                tickers.push(obj.symbol);
            });

            MarketDataService.tickers = tickers;
            MarketDataService.symbols = symbols.filter((sym, index, self) => {
                return self.indexOf(sym) === index;
            });

            console.log(`Found ${MarketDataService.symbols.length} symbols`);
            console.log(`Found ${MarketDataService.tickers.length} tickers`);

            return resolve();
        });
    });
}

function watch(tickers, interval='1m') {
    if (!tickers) throw 'No tickers provided';
    if (typeof tickers === 'string') tickers = [tickers];
    tickers.forEach(clearCandles);
    console.log(`Opening websocket connection for ${tickers} ...`);
    binance.websockets.candlesticks(tickers, interval, processTick);
}

function processTick(tick) {
    let { E:eventTime, s:ticker, k:candle } = tick;
    let { o:open, c:close, h:high, l:low, y:volume, n:trades, x:final, i:interval } = candle;

    candle = new Candlestick(ticker, eventTime, open, close, high, low, volume, trades, final);

    if (containsNoCandles(ticker)) {
        // First tick update
        addCandle(ticker, candle);
        backfill(ticker, interval, eventTime, 500);
    } else if (getLastCandle(ticker).final) {
        // Need to create new candle
        console.log(`Received final ${ticker} candlesticks tick`);
        addCandle(ticker, candle);
        EntryPointService.current(MarketDataService.candles[ticker]);
    } else {
        // Update the most recent candle
        overrideLastCandle(ticker, candle);
    }
}

function backfill(ticker, interval, endTime, limit=500) {
    console.log(`Back filling ${limit} candlesticks for ${ticker} ...`);

    return getCandleHistory(ticker, interval, endTime, limit)
        .then((candles) => {
            let mostRecentBackfilledCandleTime = candles[candles.length - 1].time;
            let earliestExistingCandleTime = MarketDataService.candles[ticker][0].time;
            if (mostRecentBackfilledCandleTime >= earliestExistingCandleTime) {
                console.log(`Removing duplicate data for ${ticker}`);
                removeCandle(ticker, 0);
            }

            addCandlesToBeginning(ticker, candles);
            console.log(`Back filled ${candles.length} ${ticker} candles`);

            return candles;
        })
        .catch(console.error);
}

function getCandleHistory(ticker, interval, endTime, limit=500) {
    return new Promise((resolve, reject) => {
        let options = {
            limit: limit,
            endTime: typeof endTime === 'number' ? endTime : endTime.getTime()
        };

        binance.candlesticks(ticker, interval, (error, ticks, symbol) => {
            if (error) return reject(error);
            let candles = ticks.map(tick => {
                let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
                return new Candlestick(symbol, time, open, close, high, low, volume, trades, true, true);
            });
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

function addCandle(ticker, candle) {
    MarketDataService.candles[ticker].push(candle);
}

function removeCandle(ticker, index) {
    MarketDataService.candles[ticker].splice(MarketDataService.candles[ticker].indexOf(MarketDataService.candles[ticker][index]), 1);
}

function overrideLastCandle(ticker, candle) {
    return MarketDataService.candles[ticker][MarketDataService.candles[ticker].length - 1] = candle;
}

function addCandlesToBeginning(ticker, candles) {
    return MarketDataService.candles[ticker] = candles.concat(MarketDataService.candles[ticker]);
}
