const OpenPosition = require('../object/OpenPosition');
const TechnicalAnalysisService = require('./TechnicalAnalysisService');

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

function enterPosition(ticker, candles, configuration) {
    if (getOpenPosition(ticker)) return Promise.reject(`Position already open for ${ticker}`);
    if (!OpenPositionService.HISTORY.PROFIT[ticker]) OpenPositionService.HISTORY.PROFIT[ticker] = [];

    let currentCandle = candles[candles.length-1];
    let closeValues = candles.map((candle) => candle.close);
    let stochValues = {
        highValues: candles.map((candle) => candle.high),
        lowValues: candles.map((candle) => candle.low),
        closeValues: closeValues
    };

    console.log(`Entering ${ticker} at ${new Date(currentCandle.time).toString()}`);
    // TODO: api call to place buy order
    return Promise.all([
        TechnicalAnalysisService.calculateMACD(configuration.MACD, closeValues),
        TechnicalAnalysisService.calculateRSI(configuration.RSI, closeValues),
        TechnicalAnalysisService.calculateSTOCH(configuration.STOCH, stochValues)
    ])
        .then((results) => {
            let [calculatedMACD, calculatedRSI, calculatedSTOCH] = results;
            let currentMacd = calculatedMACD[calculatedMACD.length-1];
            let currentRsi = calculatedRSI[calculatedRSI.length-1];
            let currentStoch = calculatedSTOCH[calculatedSTOCH.length-1];
            return Promise.resolve(OpenPositionService.POSITIONS[ticker] = new OpenPosition(ticker, currentCandle, currentMacd, currentRsi, currentStoch, currentCandle.time));
        });
}

function exitPosition(ticker, candles, configuration) {
    let currentCandle = candles[candles.length-1];
    console.log(`Exiting ${ticker} at ${new Date(currentCandle.time).toString()}`);

    // TODO: api call to place sell order
    let position = OpenPositionService.POSITIONS[ticker];
    let profit = (currentCandle.close - position.candle.close) / currentCandle.close * 100;
    OpenPositionService.HISTORY.PROFIT[ticker].push(profit);
    console.log(`Profit: ${profit}%`);

    delete OpenPositionService.POSITIONS[ticker];
    return Promise.resolve(position);
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