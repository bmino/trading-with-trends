const TechnicalAnalysisService = require('./TechnicalAnalysisService');
const OpenPositionService = require('./OpenPositionService');

let EntryPointService = {
    shouldEnter: shouldEnter,
    historicalEntryPoints: historicalEntryPoints,

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
        },
        TEMA: {
            period: 200
        },
        CRITERIA: {
            ENABLE: {
                macd_higher: true,
                rsi_higher: true,
                stoch_k_higher_d: true,
                tema_higher_price: true
            },
            min_rsi: 50,
            stoch_blacklist: [
                {k: [90,99], d: [90,99]},
                {k: [80,89], d: [80,89]},
                {k: [80,84], d: [70,79]}
            ]
        }
    }
};

module.exports = EntryPointService;

function shouldEnter(candles, config=EntryPointService.CONFIG) {
    let ticker = candles[0].ticker;

    if (OpenPositionService.getOpenPosition(ticker)) {
        return Promise.resolve(false);
    }

    return TechnicalAnalysisService.calculatePositiveCrossovers(candles, config)
        .then((crossovers) => {
            if (!crossovers) return false;
            let recentCrossover = crossovers[crossovers.length-1];
            let recentCandle = candles[candles.length-1];
            if (recentCrossover.time !== recentCandle.time) return false;
            return shouldEnterFromCrossovers(crossovers, config);
        });
}

function historicalEntryPoints(candles, config=EntryPointService.CONFIG) {
    console.log(`Calculating entry points for ${candles[0].ticker} from ${new Date(candles[0].time)} - ${new Date(candles[candles.length-1].time)}`);
    return TechnicalAnalysisService.calculatePositiveCrossovers(candles, config)
        .then((crossovers) => {
            let historyEntryCrossovers = crossovers.filter((crossover) => {
                return shouldEnterFromCrossovers(crossovers.slice(0, crossovers.indexOf(crossover)+1), config);
            });
            console.log(`\nFound ${historyEntryCrossovers.length} historical entry points`);
            console.log(historyEntryCrossovers.map((crossover) => new Date(crossover.time).toString()));
            return historyEntryCrossovers;
        });
}


function shouldEnterFromCrossovers(crossovers, config) {
    if (!crossovers || crossovers.length < 2) {
        console.log(`No previous crossover found to compare against`);
        return false;
    }

    try {
        let currentCrossover = crossovers[crossovers.length-1];
        let previousCrossover = crossovers[crossovers.length-2];
        console.log(`\nChecking crossover at ${new Date(currentCrossover.time).toString()}`);
        verifyMACD(previousCrossover, currentCrossover, config);
        verifyRSI(previousCrossover, currentCrossover, config);
        verifySTOCH(currentCrossover, config);
        verifyTEMA(currentCrossover, config);
    } catch (customError) {
        console.log(customError);
        return false;
    }

    return true;
}


function verifyMACD(previousCrossover, currentCrossover, config) {
    if (config.CRITERIA.ENABLE.macd_higher && !(currentCrossover.macd.cross > previousCrossover.macd.cross)) {
       throw `MACD crossover wasn\'t higher than previous crossover, ${previousCrossover.macd.cross} -> ${currentCrossover.macd.cross}`;
    }
}

function verifyRSI(previousCrossover, currentCrossover, config) {
    if (config.CRITERIA.ENABLE.rsi_higher && !(currentCrossover.rsi > previousCrossover.rsi)) {
        throw `RSI wasn\'t higher than the previous crossover, ${previousCrossover.rsi} -> ${currentCrossover.rsi}`;
    }
    if (!(currentCrossover.rsi > config.CRITERIA.min_rsi)) {
        throw `RIS wasn\'t above 50, ${currentCrossover.rsi}`;
    }
}

function verifySTOCH(currentCrossover, config) {
    if (config.CRITERIA.ENABLE.stoch_k_higher_d && !(currentCrossover.stoch.k > currentCrossover.stoch.d)) {
        throw `STOCH wasn\'t favorable, k:${currentCrossover.stoch.k} d:${currentCrossover.stoch.d}`;
    }
    config.CRITERIA.stoch_blacklist.forEach((blacklist) => {
        if (inRange(currentCrossover.stoch.k, blacklist.k[0], blacklist.k[1]) && inRange(currentCrossover.stoch.d, blacklist.d[0], blacklist.d[1])) {
            throw `STOCH falls within blacklisted ranges, k:${currentCrossover.stoch.k} d:${currentCrossover.stoch.d}`;
        }
    });
}

function verifyTEMA(currentCrossover, config) {
    if (config.CRITERIA.ENABLE.tema_higher_price && (currentCrossover.tema > currentCrossover.price)) {
        throw `TEMA was above price, ${currentCrossover.tema} > ${currentCrossover.price}`;
    }
}

function inRange(number, low, high) {
    return number >= low && number <= high;
}