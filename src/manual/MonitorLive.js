const MarketDataService = require('../main/service/MarketDataService');
const config = require('../../config/manual/monitorLive');

MarketDataService.init()
    .then(() => {
        MarketDataService.watch(config.tickers, config.interval);
    });