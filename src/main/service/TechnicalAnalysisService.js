const tulind = require('tulind');
const lineIntersect = require('line-intersect');
const CrossoverObject = require('../object/CrossoverObject');

let TechnicalAnalysisService = {
    calculateEMA: calculateEMA,
    calculateDEMA: calculateDEMA,
    calculateTEMA: calculateTEMA,

    calculateMACD: calculateMACD,
    calculateRSI: calculateRSI,
    calculateSTOCH: calculateSTOCH,

    calculatePositiveCrossovers: calculatePositiveCrossovers,
    calculateNegativeCrossovers: calculateNegativeCrossovers,

    calculateCross: calculateCross
};

module.exports = TechnicalAnalysisService;

function calculateEMA(config, values) {
    if (!config) throw 'No config given.';
    if (!values) throw 'No values given.';
    if (!config.period) throw 'No period value given.';

    return tulind.indicators.ema.indicator([values], [config.period])
        .then((calculations) => {
            return calculations[0];
        })
        .catch((error) => {
            throw error;
        });
}

function calculateDEMA(config, values) {
    if (!config) throw 'No config given.';
    if (!values) throw 'No values given.';
    if (!config.period) throw 'No period value given.';

    return tulind.indicators.dema.indicator([values], [config.period])
        .then((calculations) => {
            return calculations[0];
        })
        .catch((error) => {
            throw error;
        });
}

function calculateTEMA(config, values) {
    if (!config) throw 'No config given.';
    if (!values) throw 'No values given.';
    if (!config.period) throw 'No period value given.';

    return tulind.indicators.tema.indicator([values], [config.period])
        .then((calculations) => {
            return calculations[0];
        })
        .catch((error) => {
            throw error;
        });
}

function calculateMACD(config, values) {
    if (!config) throw 'No config given.';
    if (!values) throw 'No values given.';
    if (!config.fast) throw 'No fast value given.';
    if (!config.slow) throw 'No slow value given.';
    if (!config.signal) throw 'No signal value given.';

    return tulind.indicators.macd.indicator([values], [config.fast, config.slow, config.signal])
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

function calculateRSI(config, values) {
    if (!config) throw 'No configuration given.';
    if (!values) throw 'No values given.';
    if (!config.period) throw 'No period value given.';

    return tulind.indicators.rsi.indicator([values], [config.period])
        .then((calculations) => {
            return calculations[0];
        })
        .catch((error) => {
            throw error;
        });
}

function calculateSTOCH(config, values) {
    if (!config) throw 'No config given.';
    if (!values) throw 'No values given';
    if (!values.highValues) throw 'No high values given.';
    if (!values.lowValues) throw 'No low values given.';
    if (!values.closeValues) throw 'No close values given.';
    if (!config.k) throw 'No k value given';
    if (!config.slowing) throw 'No slowing value given';
    if (!config.d) throw 'No d value given';

    return tulind.indicators.stoch.indicator([values.highValues, values.lowValues, values.closeValues], [config.k, config.slowing, config.d])
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

function calculatePositiveCrossovers(CandleBox, configurations) {
    let closeValues = CandleBox.getAll().map((candle) => candle.close);
    let lowValues = CandleBox.getAll().map((candle) => candle.low);
    let highValues = CandleBox.getAll().map((candle) => candle.high);
    let currentCandlesticks = CandleBox.getCurrent();

    let crossoverObjects = [];
    let stochValues = {
        highValues: highValues,
        lowValues: lowValues,
        closeValues: closeValues
    };

    return Promise.all([
        TechnicalAnalysisService.calculateMACD(configurations.MACD, closeValues),
        TechnicalAnalysisService.calculateRSI(configurations.RSI, closeValues),
        TechnicalAnalysisService.calculateSTOCH(configurations.STOCH, stochValues),
        TechnicalAnalysisService.calculateEMA(configurations.EMA, closeValues),
        TechnicalAnalysisService.calculateDEMA(configurations.DEMA, closeValues),
        TechnicalAnalysisService.calculateTEMA(configurations.TEMA, closeValues)
    ])
        .then((results) => {
            let [calculatedMACD, calculatedRSI, calculatedSTOCH, calculatedEMA, calculatedDEMA, calculatedTEMA] = results;

            for (let offset=0; offset<currentCandlesticks.length; offset++) {
                let currentCandlestick = currentCandlesticks[currentCandlesticks.length - 1 - offset];
                let currentMACD = calculatedMACD[calculatedMACD.length - 1 - offset];
                let previousMACD = calculatedMACD[calculatedMACD.length - 1 - 1 - offset];
                let currentRSI = calculatedRSI[calculatedRSI.length - 1 - offset];
                let currentSTOCH = calculatedSTOCH[calculatedSTOCH.length - 1 - offset];
                let currentEMA = calculatedEMA[calculatedEMA.length - 1 - offset];
                let currentDEMA = calculatedDEMA[calculatedDEMA.length - 1 - offset];
                let currentTEMA = calculatedTEMA[calculatedTEMA.length - 1 - offset];
                if (currentMACD === undefined || currentMACD.histogram === undefined) continue;
                if (previousMACD === undefined || previousMACD.histogram === undefined) continue;
                if (currentRSI === undefined) continue;
                if (currentSTOCH === undefined) continue;

                if (currentMACD.cross !== undefined && previousMACD.histogram < 0 && currentMACD.histogram >= 0) {
                    crossoverObjects = [new CrossoverObject(currentCandlestick.ticker, currentCandlestick.time, currentCandlestick.close, currentMACD, currentRSI, currentSTOCH, currentEMA, currentDEMA, currentTEMA)].concat(crossoverObjects);
                }
            }
            return crossoverObjects;
        })
        .catch((error) => {
            throw error;
        });
}

function calculateNegativeCrossovers(CandleBox, configurations) {
    let closeValues = CandleBox.getAll().map((candle) => candle.close);
    let lowValues = CandleBox.getAll().map((candle) => candle.low);
    let highValues = CandleBox.getAll().map((candle) => candle.high);
    let currentCandlesticks = CandleBox.getCurrent();

    let crossoverObjects = [];
    let stochValues = {
        highValues: highValues,
        lowValues: lowValues,
        closeValues: closeValues
    };

    return Promise.all([
        TechnicalAnalysisService.calculateMACD(configurations.MACD, closeValues),
        TechnicalAnalysisService.calculateRSI(configurations.RSI, closeValues),
        TechnicalAnalysisService.calculateSTOCH(configurations.STOCH, stochValues),
        TechnicalAnalysisService.calculateEMA(configurations.EMA, closeValues),
        TechnicalAnalysisService.calculateDEMA(configurations.DEMA, closeValues),
        TechnicalAnalysisService.calculateTEMA(configurations.TEMA, closeValues)
    ])
        .then((results) => {
            let [calculatedMACD, calculatedRSI, calculatedSTOCH, calculatedEMA, calculatedDEMA, calculatedTEMA] = results;

            for (let offset=0; offset<currentCandlesticks.length; offset++) {
                let currentCandlestick = currentCandlesticks[currentCandlesticks.length - 1 - offset];
                let currentMACD = calculatedMACD[calculatedMACD.length - 1 - offset];
                let previousMACD = calculatedMACD[calculatedMACD.length - 1 - 1 - offset];
                let currentRSI = calculatedRSI[calculatedRSI.length - 1 - offset];
                let currentSTOCH = calculatedSTOCH[calculatedSTOCH.length - 1 - offset];
                let currentEMA = calculatedEMA[calculatedEMA.length - 1 - offset];
                let currentDEMA = calculatedDEMA[calculatedDEMA.length - 1 - offset];
                let currentTEMA = calculatedTEMA[calculatedTEMA.length - 1 - offset];
                if (currentMACD === undefined || currentMACD.histogram === undefined) continue;
                if (previousMACD === undefined || previousMACD.histogram === undefined) continue;
                if (currentRSI === undefined) continue;
                if (currentSTOCH === undefined) continue;

                if (currentMACD.cross !== undefined && previousMACD.histogram > 0 && currentMACD.histogram <= 0) {
                    crossoverObjects = [new CrossoverObject(currentCandlestick.ticker, currentCandlestick.time, currentCandlestick.close, currentMACD, currentRSI, currentSTOCH, currentEMA, currentDEMA, currentTEMA)].concat(crossoverObjects);
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