const EntryPointService = require('../main/service/EntryPointService');
const MarketDataService = require('../main/service/MarketDataService');
const config = require('../../config/manual/backtest');

MarketDataService.getCandleHistory(config.ticker, config.interval, config.endDate, config.limit)
    .then(EntryPointService.historical)
    .catch(console.error);
