require('dotenv').config({path: '../../../config/application.env'});
const liveConfiguration = require('../../../config/manual/monitorLive');
const OpenPosition = require('../object/OpenPosition');
const TechnicalAnalysisService = require('./TechnicalAnalysisService');
const MailerService = require('./MailerService');
const binance = require('node-binance-api');
binance.options({
    APIKEY: process.env.BINANCE_API_KEY,
    APISECRET: process.env.BINANCE_API_SECRET,
    useServerTime: true
});

let OpenPositionService = {
    POSITIONS: {},
    HISTORY: {
        PROFIT: {},
    },

    PROFIT_PRECISION: 5,

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
    OpenPositionService.POSITIONS[ticker] = 'PLACEHOLDER';

    let currentCandle = CandleBox.getLastCandle();
    let closeValues = CandleBox.getAll().map((candle) => candle.close);
    let stochValues = {
        highValues: CandleBox.getAll().map((candle) => candle.high),
        lowValues: CandleBox.getAll().map((candle) => candle.low),
        closeValues: closeValues
    };
    let quantity = liveConfiguration.tickers[ticker] ? liveConfiguration.tickers[ticker].quantity : undefined;
    if (!quantity && process.env.LIVE_TRADING) throw `Quantity must be set for ${ticker}`;

    return Promise.all([
        process.env.LIVE_TRADING ? marketBuy(ticker, quantity) : console.log(`Would enter ${ticker} at ${new Date(currentCandle.time).toString()}`),
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
    let position = OpenPositionService.POSITIONS[ticker];
    delete OpenPositionService.POSITIONS[ticker];

    return Promise.all([
        process.env.LIVE_TRADING ? marketSell(ticker, position.quantity) : console.log(`Would exit ${ticker} at ${new Date(currentCandle.time).toString()}`)
    ])
        .then((response) => {
            let profit = (currentCandle.close - position.candle.close) / currentCandle.close * 100;
            if (!OpenPositionService.HISTORY.PROFIT[ticker]) OpenPositionService.HISTORY.PROFIT[ticker] = [];
            OpenPositionService.HISTORY.PROFIT[ticker].push(profit);
            console.log(`${ticker} profit: ${profit}%`);
            if (process.env.NOTIFICATION_FOR_PROFIT) MailerService.sendEmail('Profit Report', `Profit of ${profit.toFixed(OpenPositionService.PROFIT_PRECISION)}% recorded for ${ticker}`, process.env.NOTIFICATION_EMAIL_ADDRESS);
            if (process.env.NOTIFICATION_FOR_TOTAL_PROFIT) MailerService.sendEmail('Total Profit Report', `Total profit of ${calculateTotalProfit().toFixed(OpenPositionService.PROFIT_PRECISION)}%`, process.env.NOTIFICATION_EMAIL_ADDRESS);
            return position;
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
    console.log(`${new Date().toString()} - Executing market buy of ${quantity} ${ticker}`);
    return new Promise((resolve, reject) => {
        binance.marketBuy(ticker, quantity, (error, response) => {
            if (error) return reject(JSON.parse(error.body).msg);
            if (process.env.NOTIFICATION_FOR_BUY) MailerService.sendEmail('Successful Buy', `Executed market buy of ${quantity} ${ticker}`, process.env.NOTIFICATION_EMAIL_ADDRESS);
            return resolve(response);
        });
    });
}

function marketSell(ticker, quantity) {
    console.log(`${new Date().toString()} - Executing market sell of ${quantity} ${ticker}`);
    return new Promise((resolve, reject) => {
        binance.marketSell(ticker, quantity, (error, response) => {
            if (error) return reject(JSON.parse(error.body).msg);
            if (process.env.NOTIFICATION_FOR_SELL) MailerService.sendEmail('Successful Sell', `Executed market sell of ${quantity} ${ticker}`, process.env.NOTIFICATION_EMAIL_ADDRESS);
            return resolve(response);
        });
    });
}