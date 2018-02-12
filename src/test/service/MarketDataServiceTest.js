const MarketDataService = require('../../main/service/MarketDataService');

let tickers = ['BTCUSDT', 'ETHUSDT'];
let interval = '1m';
let limit = 500;

MarketDataService.init()
    .then(() => {
        MarketDataService.watch(tickers, interval);
    });