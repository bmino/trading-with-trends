function CandleBox(backfilled, current) {
    let self = this;
    self.backfilled = backfilled;
    self.current = current;

    self.getTicker = () => {
        return (self.current[0] || self.backfilled[0]).ticker;
    };

    self.getLastCandle = () => {
        return self.current[self.current.length - 1];
    };

    self.getAll = () => {
        return self.backfilled.concat(self.current);
    };

    self.getBackfilled = () => self.backfilled;

    self.getCurrent = () => self.current;
}

module.exports = CandleBox;