const MarketDataService = require('../main/service/MarketDataService');
const OpenPositionService = require('../main/service/OpenPositionService');

const config = require('../../config/manual/backtest');

MarketDataService.getCandleHistory(config.ticker, config.interval, config.endDate, config.limit)
    .then(backtestPosition)
    .then(() => {
        console.log(`\nResults:`);
        console.log(`Total Profit: ${OpenPositionService.HISTORY.PROFIT}%`);
    })
    .catch(console.error);

function backtestPosition(candlesticks, candleIndex=0) {
    if (candleIndex >= candlesticks.length) return Promise.resolve();

    return MarketDataService.processCandlestick(candlesticks[candleIndex])
        .then(() => {
            return backtestPosition(candlesticks, ++candleIndex);
        });
}