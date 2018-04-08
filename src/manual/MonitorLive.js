require('dotenv').config({path: '../../config/application.env'});
const MarketDataService = require('../main/service/MarketDataService');
const config = require('../../config/manual/monitorLive');

// Enable live trading
process.env.LIVE_TRADING = true;

// Enable notifications
process.env.NOTIFICATION_FOR_BUY = config.notifications.buy;
process.env.NOTIFICATION_FOR_SELL = config.notifications.sell;
process.env.NOTIFICATION_FOR_PROFIT = config.notifications.profit;

MarketDataService.init()
    .then(() => {
        MarketDataService.watch(config.tickers, config.interval);
    });