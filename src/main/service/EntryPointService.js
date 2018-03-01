const TechnicalAnalysisService = require('./TechnicalAnalysisService');

let EntryPointService = {
    shouldEnter: shouldEnter,
    historical: historical,

    CONFIG: {
        MACD: {
            fast: 12,
            slow: 26,
            signal: 14
        },
        RSI: {
            period: 10
        },
        STOCH: {
            k: 14,
            slowing: 3,
            d: 3
        }
    }
};

module.exports = EntryPointService;

function shouldEnter(candles) {
    return TechnicalAnalysisService.calculatePositiveCrossovers(candles, EntryPointService.CONFIG)
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
    return TechnicalAnalysisService.calculatePositiveCrossovers(candles, EntryPointService.CONFIG)
        .then((crossovers) => {
            let historyEntryCrossovers = crossovers.filter((crossover) => {
                console.log(`\nChecking crossover at ${new Date(crossover.time).toString()}`);
                return shouldEnterFromCrossovers(crossovers.slice(0, crossovers.indexOf(crossover)+1));
            });
            console.log(`\nFound ${historyEntryCrossovers.length} historical entry points`);
            console.log(historyEntryCrossovers.map((crossover) => new Date(crossover.time).toString()));
            return historyEntryCrossovers;
        });
}


function shouldEnterFromCrossovers(crossovers) {
    if (!crossovers || crossovers.length < 2) {
        console.log(`No previous crossover found to compare against`);
        return false;
    }

    try {
        let currentCrossover = crossovers[crossovers.length-1];
        let previousCrossover = crossovers[crossovers.length-2];
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