const tulind = require('tulind');
const lineIntersect = require('line-intersect');

let TechnicalAnalysisService = {
    calculateMACD: calculateMACD,
    calculateRSI: calculateRSI,
    calculateSTOCH: calculateSTOCH,

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

function calculateCross(macds, signals) {
    let result = lineIntersect.checkIntersection(
        0, macds[0], 1, macds[1],
        0, signals[0], 1, signals[1]
    );
    if (result.point === undefined) return undefined;
    return result.point.y;
}