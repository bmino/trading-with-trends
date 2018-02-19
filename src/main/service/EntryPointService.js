const TechnicalAnalysisService = require('./TechnicalAnalysisService');
const CrossoverObject = require('../object/CrossoverObject');

let EntryPointService = {
    current: current,
    historical: historical
};

module.exports = EntryPointService;

function current(candles) {
    return calculatePositiveCrossovers(candles)
        .then((crossovers) => {
            let recentCrossover = crossovers[crossovers.length-1];
            let recentCandle = candles[candles.length-1];
            if (recentCrossover.time !== recentCandle.time) return false;
            return shouldEnterFromCrossovers(crossovers);
        })
        .then((result) => {
            if (result) console.log(`Would enter into ${candles[0].ticker} at ${new Date().toString()}`);
        });
}

function historical(candles) {
    console.log(`Calculating entry points for ${candles[0].ticker} from ${new Date(candles[0].time)} - ${new Date(candles[candles.length-1].time)}`);
    return calculatePositiveCrossovers(candles)
        .then((crossovers) => {
            console.log(`Found ${crossovers.length} MACD crossovers\n`);

            let historyEntryCrossovers = [];
            crossovers.forEach((crossover, index) => {
                console.log(`Checking crossover at ${new Date(crossovers[index].time).toString()}`);
                if (shouldEnterFromCrossovers(crossovers, index)) {
                    historyEntryCrossovers.push(crossover);
                }
                console.log();
            });
            console.log(`\nFound ${historyEntryCrossovers.length} historical entry points`);
            console.log(historyEntryCrossovers.map((crossover) => {return new Date(crossover.time).toString();}));
            return historyEntryCrossovers;
        });
}

function calculatePositiveCrossovers(candlesticks) {
    let closeValues = candlesticks.map((candle) => {return candle.close;});
    let lowValues = candlesticks.map((candle) => {return candle.low;});
    let highValues = candlesticks.map((candle) => {return candle.high;});

    let crossoverObjects = [];
    let calculationPromises = [];

    calculationPromises.push(TechnicalAnalysisService.calculateMACD({
        values: closeValues,
        fast: 12,
        slow: 26,
        signal: 14
    }));
    calculationPromises.push(TechnicalAnalysisService.calculateRSI({
        values: closeValues,
        period: 10
    }));
    calculationPromises.push(TechnicalAnalysisService.calculateSTOCH({
        highValues: highValues,
        lowValues: lowValues,
        closeValues: closeValues,
        k: 14,
        slowing: 3,
        d: 3
    }));

    return Promise.all(calculationPromises)
        .then((results) => {
            let [calculatedMACD, calculatedRSI, calculatedSTOCH] = results;

            for (let offset=0; offset<candlesticks.length; offset++) {
                let currentCandlestick = candlesticks[candlesticks.length - 1 - offset];
                let currentMACD = calculatedMACD[calculatedMACD.length - 1 - offset];
                let previousMACD = calculatedMACD[calculatedMACD.length - 1 - 1 - offset];
                let currentRSI = calculatedRSI[calculatedRSI.length - 1 - offset];
                let currentSTOCH = calculatedSTOCH[calculatedSTOCH.length - 1 - offset];
                if (currentMACD === undefined || currentMACD.histogram === undefined) continue;
                if (previousMACD === undefined || previousMACD.histogram === undefined) continue;
                if (currentRSI === undefined) continue;
                if (currentSTOCH === undefined) continue;

                if (currentMACD.cross !== undefined && previousMACD.histogram < 0 && currentMACD.histogram >= 0) {
                    crossoverObjects = [new CrossoverObject(currentCandlestick.ticker, currentCandlestick.time, currentMACD, currentRSI, currentSTOCH)].concat(crossoverObjects);
                }
            }
            return crossoverObjects;
        })
        .catch((error) => {
            throw error;
        });
}

function shouldEnterFromCrossovers(crossovers, crossoverReference=crossovers.length-1) {
    if (!crossovers || crossovers.length <= 1) {
        console.log(`No previous crossover found to compare against`);
        return false;
    }
    if (crossoverReference < 1 || crossoverReference > crossovers.length) {
        console.log(`Crossover reference of ${crossoverReference} is invalid`);
        return false;
    }

    try {
        let currentCrossover = crossovers[crossoverReference];
        let previousCrossover = crossovers[crossoverReference-1];
        verifyMACD(previousCrossover, currentCrossover);
        verifyRSI(previousCrossover, currentCrossover);
        verifySTOCH(currentCrossover);
    } catch (customError) {
        console.log(customError);
        return false;
    }

    console.log('Met all entry criteria for crossover!');
    return true;
}


function verifyMACD(previousCrossover, currentCrossover) {
    if (!(currentCrossover.macd.cross > previousCrossover.macd.cross)) {
       throw `MACD crossover wasn\'t higher than previous crossover, ${previousCrossover.macd.cross} -> ${currentCrossover.macd.cross}`;
    }
    if (!(previousCrossover.macd.histogram < 0 && currentCrossover.macd.histogram >= 0)) {
        throw `MACD crossover wasn\'t crossing upwards, ${previousCrossover.macd.histogram} -> ${currentCrossover.macd.histogram}`;
    }
}

function verifyRSI(previousCrossover, currentCrossover) {
    if (!(currentCrossover.rsi > previousCrossover.rsi)) {
        throw `RSI wasn\'t higher than the previous crossover, ${previousCrossover.rsi} -> ${currentCrossover.rsi}`;
    }
    if (!(currentCrossover.rsi > 50)) {
        throw `RIS wasn\'t above 50, ${currentCrossover.rsi}`;
    }
}

function verifySTOCH(currentCrossover) {
    if (!(currentCrossover.stoch.k > currentCrossover.stoch.d)) {
        throw `STOCH wasn\'t favorable, k:${currentCrossover.stoch.k} d:${currentCrossover.stoch.d}`;
    }
    if ((inRange(currentCrossover.stoch.k, 90, 99) && inRange(currentCrossover.stoch.d, 90, 99)) ||
        (inRange(currentCrossover.stoch.k, 80, 89) && inRange(currentCrossover.stoch.d, 80, 89)) ||
        (inRange(currentCrossover.stoch.k, 80, 84) && inRange(currentCrossover.stoch.d, 70, 79))) {
        throw `STOCH falls within blacklisted ranges, k:${currentCrossover.stoch.k} d:${currentCrossover.stoch.d}`;
    }
}

function inRange(number, low, high) {
    return number >= low && number <= high;
}