const MarketDataService = require('../main/service/MarketDataService');

let tickers = ['BTCUSDT', 'ETHUSDT'];
let interval = '1m';

MarketDataService.init()
    .then(() => {
        MarketDataService.watch(tickers, interval);
    });