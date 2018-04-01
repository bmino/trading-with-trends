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
            failsafe_max_percent_loss: 1.5,
            failsafe_max_minutes_in_position: 60,
            rsi_high_threshold_to_break_ceiling: 100,
            rsi_low_threshold_after_breaking_ceiling: 50,
            rsi_floor_threshold: 40,
            rsi_drop_threshold: 25,
            rsi_recent_candles_watch_count: 3,
            rsi_recent_candles_low_range: [40,49]
        },
        TESTING: true
    }

};

module.exports = ExitPositionService;


function shouldExit(CandleBox, config=ExitPositionService.CONFIG) {
    let ticker = CandleBox.getTicker();

    if (!OpenPositionService.getOpenPosition(ticker)) {
        return Promise.resolve(false);
    }

    return detectFailSafe(ticker, CandleBox, config)
        .then((detectedFailsafe) => {
            if (detectedFailsafe) return Promise.resolve(detectedFailsafe);
            return detectExitReason(ticker, CandleBox, config);
        })
        .catch(console.error);
}

function detectFailSafe(ticker, CandleBox, config) {
    let max_minutes = config.CRITERIA.failsafe_max_minutes_in_position;
    let MAX_MILLISECONDS = max_minutes * 60 * 1000;
    let openPosition = OpenPositionService.getOpenPosition(ticker);
    let currentCandle = CandleBox.getLastCandle();
    let profit = currentCandle.close - openPosition.candle.close;
    let profitPercent = profit / openPosition.candle.close * 100;

    if (profitPercent < (-1 * config.CRITERIA.failsafe_max_percent_loss)) {
        console.log(`Failsafe triggered, loss of ${profitPercent}%`);
        return Promise.resolve(true);
    }

    if (new Date(currentCandle.time).getTime() - openPosition.time > MAX_MILLISECONDS) {
        console.log(`Failsafe triggered, open time beyond ${max_minutes} minutes`);
        return Promise.resolve(true);
    }

    return Promise.resolve(false);
}

function detectExitReason(ticker, CandleBox, config) {
    return Promise.all([
        exitBecauseMacdCrossedBack(ticker, CandleBox, config),
        exitBecauseRsiDropped(ticker, CandleBox, config),
        exitBecauseRecentCandlesHaveLowRsi(ticker, CandleBox, config)
    ])
        .then((results) => {
            return Promise.resolve(results.indexOf(true) >= 0);
        })
        .catch(console.error);
}

function exitBecauseMacdCrossedBack(ticker, CandleBox, config) {
    return TechnicalAnalysisService.calculateNegativeCrossovers(CandleBox, config)
        .then((crossovers) => {
            let recentCrossover = crossovers[crossovers.length-1];
            let recentCandle = CandleBox.getLastCandle();
            if (recentCrossover.time === recentCandle.time) {
                console.log(`MACD crossed back`);
                return Promise.resolve(true);
            }
            return Promise.resolve(false);
        });
}

function exitBecauseRsiDropped(ticker, CandleBox, config) {
    let closeValues = CandleBox.getAll().map((candle) => {return candle.close;});
    return TechnicalAnalysisService.calculateRSI(config.RSI, closeValues)
        .then((rsiList) => {
            let previousRSI = rsiList[rsiList.length-2];
            let currentRSI = rsiList[rsiList.length-1];
            let openPosition = OpenPositionService.getOpenPosition(ticker);

            if (currentRSI < config.CRITERIA.rsi_low_threshold_after_breaking_ceiling && openPosition.condition.rsiMax > config.CRITERIA.rsi_high_threshold_to_break_ceiling) {
                console.log(`RSI broke ${config.CRITERIA.rsi_high_threshold_to_break_ceiling} and then fell to ${currentRSI}`);
                return Promise.resolve(true);
            }

            if (currentRSI > openPosition.condition.rsiMax) {
                OpenPositionService.updateCondition(ticker, 'rsiMax', currentRSI);
            }

            if (currentRSI < config.CRITERIA.rsi_floor_threshold) {
                console.log(`RSI low value of ${currentRSI} detected`);
                return Promise.resolve(true);
            }

            if (currentRSI < (previousRSI - config.CRITERIA.rsi_drop_threshold)) {
                console.log(`RSI dropped from ${previousRSI} to ${currentRSI}`);
                return Promise.resolve(true);
            }

            return Promise.resolve(false);
        });
}

function exitBecauseRecentCandlesHaveLowRsi(ticker, CandleBox, config) {
    if (!CandleBox.getLastCandle().final) return Promise.resolve(false);

    let closeValues = CandleBox.getAll().map((candle) => {return candle.close;});
    return TechnicalAnalysisService.calculateRSI(config.RSI, closeValues)
        .then((rsiList) => {
            let recentCandleCount = config.CRITERIA.rsi_recent_candles_watch_count;
            let rsiMin = config.CRITERIA.rsi_recent_candles_low_range[0];
            let rsiMax= config.CRITERIA.rsi_recent_candles_low_range[1];
            let recentRsiValues = rsiList.slice(-recentCandleCount);
            let withinWindow = recentRsiValues.map((rsiValue) => rsiValue >= rsiMin && rsiValue <= rsiMax);
            let allWithinWindow = withinWindow.indexOf(false) === -1;

            if (allWithinWindow) {
                console.log(`Recent ${recentCandleCount} candles had rsi values between ${rsiMin} and ${rsiMax}, ${recentRsiValues}`);
                return Promise.resolve(true);
            }

            return Promise.resolve(false);
        });
}
