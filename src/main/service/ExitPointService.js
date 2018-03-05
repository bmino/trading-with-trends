const OpenPositionService = require('./OpenPositionService');
const TechnicalAnalysisService = require('./TechnicalAnalysisService');

let ExitPositionService = {
    shouldExit: shouldExit,

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

module.exports = ExitPositionService;


function shouldExit(candles) {
    let ticker = candles[0].ticker;

    if (!OpenPositionService.getOpenPosition(ticker)) {
        //console.log(`An open position does not exist for ${ticker}`);
        return Promise.resolve(false);
    }

    return detectFailSafe(ticker, candles)
        .then((detectedFailsafe) => {
            if (detectedFailsafe) return Promise.resolve(detectedFailsafe);
            return detectExitReason(ticker, candles);
        })
        .catch(console.error);
}

function detectFailSafe(ticker, candles) {
    let ONE_HOUR = 60 * 60 * 1000;
    let openPosition = OpenPositionService.getOpenPosition(ticker);
    let currentCandle = candles[candles.length-1];
    let profit = candles[candles.length - 1].close - openPosition.candle.close;
    let profitPercent = profit / openPosition.candle.close * 100;

    if (profitPercent < -1.5) {
        console.log(`Failsafe triggered, loss of ${profitPercent}%`);
        return Promise.resolve(true);
    }

    if (new Date(currentCandle.time).getTime() - openPosition.time > ONE_HOUR) {
        console.log(`Failsafe triggered, open time beyond 1 hour`);
        return Promise.resolve(true);
    }

    return Promise.resolve(false);
}

function detectExitReason(ticker, candles) {
    return Promise.all([
        exitBecauseMacdCrossedBack(ticker, candles),
        exitBecauseRsiDropped(ticker, candles),
        exitBecauseRecentCandlesHaveLowRsi(ticker, candles)
    ])
        .then((results) => {
            return Promise.resolve(results.indexOf(true) >= 0);
        })
        .catch(console.error);
}

function exitBecauseMacdCrossedBack(ticker, candles) {
    return TechnicalAnalysisService.calculateNegativeCrossovers(candles, ExitPositionService.CONFIG)
        .then((crossovers) => {
            let recentCrossover = crossovers[crossovers.length-1];
            let recentCandle = candles[candles.length-1];
            if (recentCrossover.time === recentCandle.time) {
                console.log(`MACD crossed back`);
                return Promise.resolve(true);
            }
            return Promise.resolve(false);
        });
}

function exitBecauseRsiDropped(ticker, candles) {
    let closeValues = candles.map((candle) => {return candle.close;});
    return TechnicalAnalysisService.calculateRSI(ExitPositionService.CONFIG.RSI, closeValues)
        .then((rsiList) => {
            let previousRSI = rsiList[rsiList.length-2];
            let currentRSI = rsiList[rsiList.length-1];
            let openPosition = OpenPositionService.getOpenPosition(ticker);

            if (currentRSI < 50 && openPosition.condition.rsiBroke70) {
                console.log(`RSI broke 70 and then fell to ${currentRSI}`);
                return Promise.resolve(true);
            }

            if (currentRSI > 70 && !openPosition.condition.rsiBroke70) OpenPositionService.updateCondition(ticker, 'rsiBroke70', true);

            if (currentRSI < 40) {
                console.log(`RSI low value of ${currentRSI} detected`);
                return Promise.resolve(true);
            }

            if (currentRSI < (previousRSI - 16)) {
                console.log(`RSI dropped from ${previousRSI} to ${currentRSI}`);
                return Promise.resolve(true);
            }

            return Promise.resolve(false);
        });
}

function exitBecauseRecentCandlesHaveLowRsi(ticker, candles) {
    if (!candles[candles.length-1].final) return Promise.resolve(false);

    let closeValues = candles.map((candle) => {return candle.close;});
    return TechnicalAnalysisService.calculateRSI(ExitPositionService.CONFIG.RSI, closeValues)
        .then((rsiList) => {
            let recentCandleCount = 3;
            let rsiMin = 40;
            let rsiMax= 49;
            let recentRsiValues = [];
            for (let i=recentCandleCount; i>0; i--) {
                recentRsiValues.push(rsiList[rsiList.length - recentCandleCount]);
            }
            let withinWindow = recentRsiValues.map((rsiValue) => rsiValue >= rsiMin && rsiValue <= rsiMax);
            let allWithinWindow = withinWindow.indexOf(false) === -1;

            if (allWithinWindow) {
                console.log(`Recent ${recentCandleCount} candles had rsi values between ${rsiMin} and ${rsiMax}, ${recentRsiValues}`);
                return Promise.resolve(true);
            }

            return Promise.resolve(false);
        });
}
