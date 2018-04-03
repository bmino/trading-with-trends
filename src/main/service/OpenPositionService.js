require('dotenv').config({path: '../../../config/application.env'});
const liveConfiguration = require('../../../config/manual/monitorLive');
const OpenPosition = require('../object/OpenPosition');
const TechnicalAnalysisService = require('./TechnicalAnalysisService');
const binance = require('node-binance-api');
binance.options({
    APIKEY: process.env.BINANCE_API_KEY,
    APISECRET: process.env.BINANCE_API_SECRET,
    test: process.env.BINANCE_API_TEST_MODE
});

let OpenPositionService = {
    POSITIONS: {},
    HISTORY: {
        PROFIT: {},
    },

    reset: reset,

    getOpenPosition: getOpenPosition,
    getOpenPositions: getOpenPositions,

    enterPosition: enterPosition,
    exitPosition: exitPosition,

    updateCondition: updateCondition,

    calculateProfit: calculateProfit,
    calculateTotalProfit: calculateTotalProfit
};

module.exports = OpenPositionService;


function reset() {
    OpenPositionService.POSITIONS = {};
    OpenPositionService.HISTORY.PROFIT = {};
}

function getOpenPosition(ticker) {
    return OpenPositionService.POSITIONS[ticker];
}

function getOpenPositions() {
    return Object.values(OpenPositionService.POSITIONS).map((position) => position.candle.ticker);
}

function enterPosition(ticker, CandleBox, configuration) {
    if (getOpenPosition(ticker)) return Promise.reject(`Position already open for ${ticker}`);
    if (!OpenPositionService.HISTORY.PROFIT[ticker]) OpenPositionService.HISTORY.PROFIT[ticker] = [];

    let currentCandle = CandleBox.getLastCandle();
    let closeValues = CandleBox.getAll().map((candle) => candle.close);
    let stochValues = {
        highValues: CandleBox.getAll().map((candle) => candle.high),
        lowValues: CandleBox.getAll().map((candle) => candle.low),
        closeValues: closeValues
    };
    let quantity = liveConfiguration.tickers[ticker] ? liveConfiguration.tickers[ticker].quantity : undefined;
    if (!quantity && !configuration.TESTING) throw `Quantity must be set for ${ticker}`;

    console.log(`Entering ${ticker} at ${new Date(currentCandle.time).toString()}`);
    return Promise.all([
        configuration.TESTING ? Promise.resolve() : marketBuy(ticker, quantity),
        TechnicalAnalysisService.calculateMACD(configuration.MACD, closeValues),
        TechnicalAnalysisService.calculateRSI(configuration.RSI, closeValues),
        TechnicalAnalysisService.calculateSTOCH(configuration.STOCH, stochValues)
    ])
        .then((results) => {
            let [order, calculatedMACD, calculatedRSI, calculatedSTOCH] = results;
            let currentMacd = calculatedMACD[calculatedMACD.length-1];
            let currentRsi = calculatedRSI[calculatedRSI.length-1];
            let currentStoch = calculatedSTOCH[calculatedSTOCH.length-1];
            return Promise.resolve(OpenPositionService.POSITIONS[ticker] = new OpenPosition(ticker, quantity, currentCandle, currentMacd, currentRsi, currentStoch, currentCandle.time));
        });
}

function exitPosition(ticker, CandleBox, configuration) {
    let currentCandle = CandleBox.getLastCandle();
    console.log(`Exiting ${ticker} at ${new Date(currentCandle.time).toString()}`);

    let position = OpenPositionService.POSITIONS[ticker];
    return (configuration.TESTING ? Promise.resolve() : marketSell(ticker, position.quantity))
        .then((response) => {
            let profit = (currentCandle.close - position.candle.close) / currentCandle.close * 100;
            OpenPositionService.HISTORY.PROFIT[ticker].push(profit);
            console.log(`Profit: ${profit}%`);

            delete OpenPositionService.POSITIONS[ticker];
            return position
        });
}

function updateCondition(ticker, condition, value) {
    OpenPositionService.POSITIONS[ticker].condition[condition] = value;
}

function calculateProfit(ticker) {
    return OpenPositionService.HISTORY.PROFIT[ticker].reduce((accumulator, currentValue) => accumulator + currentValue);
}

function calculateTotalProfit() {
    return Object.values(OpenPositionService.HISTORY.PROFIT)
        .reduce((flat, next) => flat.concat(next), [])
        .reduce((accumulator, currentValue) => accumulator + currentValue);
}

function marketBuy(ticker, quantity) {
    return new Promise((resolve, reject) => {
        binance.marketBuy(ticker, quantity, (error, response) => {
            if (error) return reject(JSON.parse(error.body).msg);
            return resolve(response);
        });
    });
}

function marketSell(ticker, quantity) {
    return new Promise((resolve, reject) => {
        binance.marketSell(ticker, quantity, (error, response) => {
            if (error) return reject(JSON.parse(error.body).msg);
            return resolve(response);
        });
    });
}