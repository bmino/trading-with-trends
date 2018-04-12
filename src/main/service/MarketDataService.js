const binance = require('node-binance-api');
const EntryPointService = require('./EntryPointService');
const ExitPointService = require('./ExitPointService');
const OpenPositionService = require('./OpenPositionService');
const Candlestick = require('../object/Candlestick');
const CandleBox = require('../object/CandleBox');

let MarketDataService = {
    symbols: [],
    tickers: [],
    candles: {},

    BACKTEST_LIMIT: 1000,

    init: init,

    watch: watch,
    backfill: backfill,
    getCandleHistory: getCandleHistory,
    getCandleHistoryBox: getCandleHistoryBox,

    processTick: processTick,
    processCandlestick: processCandlestick
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

            console.log(`\tFound ${MarketDataService.symbols.length} symbols`);
            console.log(`\tFound ${MarketDataService.tickers.length} tickers`);
            console.log();

            return resolve();
        });
    });
}

function watch(tickers, interval='1m') {
    if (!tickers) throw 'No tickers provided';
    let tickerNames = Object.keys(tickers);
    tickerNames.forEach(clearCandles);
    console.log(`Opening websocket connection for ${tickerNames} ...`);
    binance.websockets.candlesticks(tickerNames, interval, processTick);
}

function processTick(tick) {
    let {E: eventTime, s: ticker, k: candle} = tick;
    let {o: open, c: close, h: high, l: low, y: volume, n: trades, x: final, i: interval} = candle;

    let candlestick = new Candlestick(ticker, eventTime, interval, open, close, high, low, volume, trades, final);
    return processCandlestick(candlestick);
}

function processCandlestick(candle) {
    let ticker = candle.ticker;
    addCandle(ticker, candle);

    if (containsXCandles(ticker, 1)) return backfill(ticker, candle.interval, candle.time);

    let tempCandleBox = new CandleBox([], MarketDataService.candles[ticker].slice(0));
    return EntryPointService.shouldEnter(tempCandleBox)
        .then((shouldEnter) => {
            if (shouldEnter) return OpenPositionService.enterPosition(ticker, tempCandleBox, EntryPointService.CONFIG);
        })
        .then((openPosition) => {
            if (!openPosition) return ExitPointService.shouldExit(tempCandleBox);
        })
        .then((shouldExit) => {
            if (shouldExit) return OpenPositionService.exitPosition(ticker, tempCandleBox, ExitPointService.CONFIG);
        })
        .catch(console.error);
}

function backfill(ticker, interval, endTime, limit=MarketDataService.BACKTEST_LIMIT) {
    console.log(`\nBack filling ${limit} candlesticks for ${ticker} ...`);

    return getCandleHistory(ticker, interval, endTime, limit)
        .then((backfilledCandles) => {
            backfilledCandles = removeOutdatedCandles(backfilledCandles);
            addCandlesToBeginning(ticker, backfilledCandles);
            console.log(`Back filled ${backfilledCandles.length} ${ticker} candles\n`);
            return backfilledCandles;
        })
        .catch(console.error);
}

function getCandleHistory(ticker, interval, endTime, limit=500, candleShelf=[]) {
    if (limit <= 0) return Promise.resolve(candleShelf);

    return new Promise((resolve, reject) => {
        let options = {
            limit: limit > 500 ? 500 : limit,
            endTime: typeof endTime === 'number' ? endTime : endTime.getTime()
        };

        console.log(`Fetching candlesticks ${options.limit} intervals before ${new Date(endTime).toString()}`);
        binance.candlesticks(ticker, interval, (error, ticks, symbol) => {
            if (error) return reject(error);
            candleShelf = ticks.map(tick => {
                let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
                return new Candlestick(symbol, time, interval, open, close, high, low, volume, trades, true, true);
            }).concat(candleShelf);
            return getCandleHistory(ticker, interval, candleShelf[0].time-1, limit-=500, candleShelf)
                .then(resolve)
                .catch(reject);
        }, options);
    });
}

function getCandleHistoryBox(ticker, interval, endTime, limit=500) {
    let currentCandles = [];
    return getCandleHistory(ticker, interval, endTime, limit)
        .then((candles) => {
            currentCandles = candles;
            return getCandleHistory(ticker, interval, currentCandles[0].time - 1, MarketDataService.BACKTEST_LIMIT);
        })
        .then((backfilledCandles) => {
            console.log(backfilledCandles[backfilledCandles.length - 1]);
            console.log(currentCandles[0]);
            return new CandleBox(backfilledCandles, currentCandles);
        });
}

function clearCandles(ticker) {
    MarketDataService.candles[ticker] = [];
}

function containsNoCandles(ticker) {
    if (!MarketDataService.candles[ticker]) return true;
    return MarketDataService.candles[ticker].length === 0;
}

function containsXCandles(ticker, count) {
    if (!MarketDataService.candles[ticker]) return false;
    return MarketDataService.candles[ticker].length === count;
}

function getLastCandle(ticker) {
    return MarketDataService.candles[ticker][MarketDataService.candles[ticker].length - 1];
}

function addCandle(ticker, candle) {
    if (containsNoCandles(ticker)) return MarketDataService.candles[ticker] = [candle];
    if (getLastCandle(ticker).final) return MarketDataService.candles[ticker].push(candle);
    else return overrideLastCandle(ticker, candle);
}

function removeOutdatedCandles(candlesToFilter) {
    return candlesToFilter.filter((candle) => {
        return candle.time < MarketDataService.candles[candle.ticker][0].time;
    });
}

function overrideLastCandle(ticker, candle) {
    return MarketDataService.candles[ticker][MarketDataService.candles[ticker].length - 1] = candle;
}

function addCandlesToBeginning(ticker, candles) {
    return MarketDataService.candles[ticker] = candles.concat(MarketDataService.candles[ticker]);
}
