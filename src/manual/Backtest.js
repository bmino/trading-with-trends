const EntryPointService = require('../main/service/EntryPointService');
const MarketDataService = require('../main/service/MarketDataService');

let ticker = 'BTCUSDT';
let interval = '1m';
let endDate = new Date(2018, 1, 12, 17, 0, 0, 0);
let limit = 900;

MarketDataService.getCandleHistory(ticker, interval, endDate, limit)
    .then(EntryPointService.historical);
