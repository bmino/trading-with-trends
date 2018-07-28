const MarketDataService = require('../main/service/MarketDataService');
const OpenPositionService = require('../main/service/OpenPositionService');
const config = require('../../config/manual/backtest');

MarketDataService.getCandleHistory(config.ticker, config.interval, config.endDate, config.limit)
    .then(backtestPosition)
    .then(() => {
        console.log(`\n\nResults:`);
        console.log(`Position Profits:`);
        if (OpenPositionService.HISTORY.PROFIT[config.ticker]) {
            console.log(OpenPositionService.HISTORY.PROFIT[config.ticker].map((p) => p.toFixed(4) + '%'));
        }
        console.log(`\nTotal Profit: ${OpenPositionService.calculateTotalProfit()}%`);
    })
    .catch(console.error);

function backtestPosition(candlesticks, candleIndex=0) {
    if (candleIndex >= candlesticks.length) return Promise.resolve();

    return MarketDataService.processCandlestick(candlesticks[candleIndex])
        .then(() => {
            return backtestPosition(candlesticks, ++candleIndex);
        });
}