const MACD = require('technicalindicators').MACD;
const RSI = require('technicalindicators').RSI;
const STOCH = require('technicalindicators').Stochastic;
const CrossoverObject = require('../object/CrossoverObject');

let EntryPointService = {
    current: current,
    historical: historical
};

module.exports = EntryPointService;

function current(candles) {
    let crossovers = calculateCrossovers(candles);
    let recentCrossover = crossovers[crossovers.length-1];
    let recentCandle = candles[candles.length-1];
    if (recentCrossover.time !== recentCandle.time) return false;
    return shouldEnterFromCrossovers(crossovers);
}

function historical(candles) {
    console.log(`Calculating entry points for ${candles[0].ticker} from ${new Date(candles[0].time)} - ${new Date(candles[candles.length-1].time)}`);
    let crossovers = calculateCrossovers(candles);
    console.log(`Found ${crossovers.length} favorable MACD crossovers\n`);

    let historyEntryCrossovers = [];
    crossovers.forEach((crossover, index) => {
        if (shouldEnterFromCrossovers(crossovers, index)) {
            historyEntryCrossovers.push(crossover);
        }
    });
    console.log(`\nFound ${historyEntryCrossovers.length} historical entry points`);
    console.log(historyEntryCrossovers.map((crossover) => {return new Date(crossover.time).toString();}));
    return historyEntryCrossovers;
}

function calculateCrossovers(candlesticks) {
    let closeValues = candlesticks.map((candle) => {return candle.close;});
    let lowValues = candlesticks.map((candle) => {return candle.low;});
    let highValues = candlesticks.map((candle) => {return candle.high;});

    let crossoverObjects = [];

    let calculatedMACD = MACD.calculate({
        values            : closeValues,
        fastPeriod        : 12,
        slowPeriod        : 26,
        signalPeriod      : 14,
        SimpleMAOscillator: false,
        SimpleMASignal    : false
    });

    let calculatedRSI = RSI.calculate({
        values : closeValues,
        period : 10
    });

    let calculatedSTOCH = STOCH.calculate({
        high: highValues,
        low: lowValues,
        close: closeValues,
        period: 14,
        signalPeriod: 3
    });

    for (let offset=0; offset<candlesticks.length; offset++) {
        let currentCandlestick = candlesticks[candlesticks.length - 1 - offset];
        let currentMACD = calculatedMACD[calculatedMACD.length - 1 - offset];
        let previousMACD = calculatedMACD[calculatedMACD.length - 1 - 1 - offset];
        let currentRSI = calculatedRSI[calculatedRSI.length - 1 - offset];
        let currentSTOCH = calculatedSTOCH[calculatedSTOCH.length - 1 - offset];
        if (!currentMACD || currentMACD.histogram === undefined) continue;
        if (!previousMACD || previousMACD.histogram === undefined) continue;
        if (currentRSI === undefined) continue;
        if (currentSTOCH === undefined) continue;

        if (previousMACD.histogram < 0 && currentMACD.histogram >= 0) {
            // Favorable crossover occurred
            crossoverObjects = [new CrossoverObject(currentCandlestick.ticker, currentCandlestick.time, currentMACD, currentRSI, currentSTOCH)].concat(crossoverObjects);
        }
    }

    return crossoverObjects;
}

function shouldEnterFromCrossovers(crossovers, crossoverReference=crossovers.length-1) {
    console.log(`Found favorable MACD crossover`);

    if (!crossovers || crossovers.length <= 1) {
        console.log(`No previous crossovers found to compare against`);
        return false;
    }
    if (crossoverReference < 1 || crossoverReference > crossovers.length) {
        console.log(`Crossover reference of ${crossoverReference} is invalid`);
        return false;
    }

    let currentCrossover = crossovers[crossoverReference];
    let previousCrossover = crossovers[crossoverReference-1];
    if (!verifyRSI(previousCrossover, currentCrossover)) {
        console.log(`RSI didn\'t meet criteria, ${previousCrossover.rsi} -> ${currentCrossover.rsi}`);
        return false;
    }
    if (!verifySTOCH(currentCrossover)) {
        console.log(`STOCH didn\'t meet criteria, k:${currentCrossover.stoch.k} d:${currentCrossover.stoch.d}`);
        return false;
    }
    console.log('Met all entry criteria');
    return true;
}

function verifyRSI(previousCrossover, currentCrossover) {
    return currentCrossover.rsi > previousCrossover.rsi &&
            currentCrossover.rsi > 50;
}

function verifySTOCH(currentCrossover) {
    return currentCrossover.stoch.k > currentCrossover.stoch.d &&
        !(inRange(currentCrossover.stoch.k, 90, 99) && inRange(currentCrossover.stoch.d, 90, 99)) &&
        !(inRange(currentCrossover.stoch.k, 80, 89) && inRange(currentCrossover.stoch.d, 80, 89)) &&
        !(inRange(currentCrossover.stoch.k, 80, 84) && inRange(currentCrossover.stoch.d, 70, 79));
}

function inRange(number, low, high) {
    return number >= low && number <= high;
}