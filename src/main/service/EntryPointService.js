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
        EMA: {
            period: 250
        },
        DEMA: {
            period: 250
        },
        TEMA: {
            period: 250
        },
        CRITERIA: {
            ENABLE: {
                macd_higher: true,
                rsi_higher: true,
                stoch_k_above_d: true,
                price_above_tema: true,
                price_above_dema: true,
                tema_above_ema: true
            },
            min_rsi: 50,
            stoch_blacklist: [
                {k: [90,99], d: [90,99]},
                {k: [80,89], d: [80,89]},
                {k: [80,84], d: [70,79]}
            ]
        },
        TESTING: true
    }
};

module.exports = EntryPointService;

function shouldEnter(CandleBox, config=EntryPointService.CONFIG) {
    let ticker = CandleBox.getTicker();

    if (OpenPositionService.getOpenPosition(ticker)) {
        return Promise.resolve(false);
    }

    return TechnicalAnalysisService.calculatePositiveCrossovers(CandleBox, config)
        .then((crossovers) => {
            if (!crossovers) return false;
            let recentCrossover = crossovers[crossovers.length-1];
            let recentCandle = CandleBox.getLastCandle();
            if (!recentCrossover || !recentCandle) return false;
            if (recentCrossover.time !== recentCandle.time) return false;
            return shouldEnterFromCrossovers(crossovers, config);
        });
}

function historicalEntryPoints(CandleBox, config=EntryPointService.CONFIG) {
    console.log(`\nCalculating entry points for ${CandleBox.getTicker()} from ${new Date(CandleBox.getCurrent()[0].time)} - ${new Date(CandleBox.getLastCandle().time)}`);
    return TechnicalAnalysisService.calculatePositiveCrossovers(CandleBox, config)
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
        verifyEMAS(currentCrossover, config);
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
    if (config.CRITERIA.ENABLE.stoch_k_above_d && !(currentCrossover.stoch.k > currentCrossover.stoch.d)) {
        throw `STOCH wasn\'t favorable, k:${currentCrossover.stoch.k} d:${currentCrossover.stoch.d}`;
    }
    config.CRITERIA.stoch_blacklist.forEach((blacklist) => {
        if (inRange(currentCrossover.stoch.k, blacklist.k[0], blacklist.k[1]) && inRange(currentCrossover.stoch.d, blacklist.d[0], blacklist.d[1])) {
            throw `STOCH falls within blacklisted ranges, k:${currentCrossover.stoch.k} d:${currentCrossover.stoch.d}`;
        }
    });
}

function verifyEMAS(currentCrossover, config) {
    if (config.CRITERIA.ENABLE.price_above_tema && !(currentCrossover.price > currentCrossover.tema)) {
        throw `Price was below TEMA, ${currentCrossover.price} < ${currentCrossover.tema}`;
    }
    if (config.CRITERIA.ENABLE.price_above_dema && !(currentCrossover.price > currentCrossover.dema)) {
        throw `Price was below DEMA, ${currentCrossover.price} < ${currentCrossover.dema}`;
    }
    if (config.CRITERIA.ENABLE.tema_above_ema && !(currentCrossover.tema > currentCrossover.ema)) {
        throw `TEMA was below EMA, ${currentCrossover.tema} < ${currentCrossover.ema}`;
    }
}

function inRange(number, low, high) {
    return number >= low && number <= high;
}