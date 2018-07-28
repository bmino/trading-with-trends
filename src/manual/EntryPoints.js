const EntryPointService = require('../main/service/EntryPointService');
const MarketDataService = require('../main/service/MarketDataService');
const config = require('../../config/manual/backtest');

MarketDataService.getCandleHistoryBox(config.ticker, config.interval, config.endDate, config.limit)
    .then(EntryPointService.historicalEntryPoints)
    .catch(console.error);
