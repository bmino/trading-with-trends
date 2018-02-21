const tulind = require('tulind');
const lineIntersect = require('line-intersect');
const CrossoverObject = require('../object/CrossoverObject');

let TechnicalAnalysisService = {
    calculateMACD: calculateMACD,
    calculateRSI: calculateRSI,
    calculateSTOCH: calculateSTOCH,

    calculatePositiveCrossovers: calculatePositiveCrossovers,

    calculateCross: calculateCross
};

module.exports = TechnicalAnalysisService;

function calculateMACD(config) {
    if (!config) throw 'No config given.';
    if (!config.values) throw 'No values given.';
    if (!config.fast) throw 'No fast value given.';
    if (!config.slow) throw 'No slow value given.';
    if (!config.signal) throw 'No signal value given.';

    return tulind.indicators.macd.indicator([config.values], [config.fast, config.slow, config.signal])
        .then((calculations) => {
            let [macds, signals, histograms] = calculations;
            let results = [];
            macds.forEach((macd, index) => {
                results.push({
                    macd: macds[index],
                    signal: signals[index],
                    histogram: histograms[index],
                    cross: calculateCross(
                        [macds[index-1], macds[index]],
                        [signals[index-1], signals[index]]
                    )
                });
            });
            return results;
        })
        .catch((error) => {
            throw error;
        });
}

function calculateRSI(config) {
    if (!config) throw 'No configuration given.';
    if (!config.values) throw 'No values given.';
    if (!config.period) throw 'No period value given.';

    return tulind.indicators.rsi.indicator([config.values], [config.period])
        .then((calculations) => {
            return calculations[0];
        })
        .catch((error) => {
            throw error;
        });
}

function calculateSTOCH(config) {
    if (!config) throw 'No config given.';
    if (!config.highValues) throw 'No high values given.';
    if (!config.lowValues) throw 'No low values given.';
    if (!config.closeValues) throw 'No close values given.';
    if (!config.k) throw 'No k value given';
    if (!config.slowing) throw 'No slowing value given';
    if (!config.d) throw 'No d value given';

    return tulind.indicators.stoch.indicator([config.highValues, config.lowValues, config.closeValues], [config.k, config.slowing, config.d])
        .then((calculations) => {
            let [kValues, dValues] = calculations;
            let results = [];
            kValues.forEach((k, index) => {
                results.push({
                    k: k,
                    d: dValues[index]
                });
            });
            return results;
        })
        .catch((error) => {
            throw error;
        });
}

function calculatePositiveCrossovers(candlesticks, configurations) {
    let closeValues = candlesticks.map((candle) => {return candle.close;});
    let lowValues = candlesticks.map((candle) => {return candle.low;});
    let highValues = candlesticks.map((candle) => {return candle.high;});

    configurations.MACD.values = closeValues;
    configurations.RSI.values = closeValues;
    configurations.STOCH.highValues = highValues;
    configurations.STOCH.lowValues = lowValues;
    configurations.STOCH.closeValues = closeValues;

    let crossoverObjects = [];

    return Promise.all([
        TechnicalAnalysisService.calculateMACD(configurations.MACD),
        TechnicalAnalysisService.calculateRSI(configurations.RSI),
        TechnicalAnalysisService.calculateSTOCH(configurations.STOCH)
    ])
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

function calculateCross(macds, signals) {
    let result = lineIntersect.checkIntersection(
        0, macds[0], 1, macds[1],
        0, signals[0], 1, signals[1]
    );
    if (result.point === undefined) return undefined;
    return result.point.y;
}