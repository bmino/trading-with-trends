# Trading with Trends

This app auto-trades on the [Binance](https://www.binance.com) cryptocurrency exchange when configured entry and exit patterns are detected.


## Getting Started

These instructions will get you a copy of the project up and running on your local machine.


### Installing Prerequisites

The following dependencies are required to run an instance:

1. NodeJS
2. Npm


## Deployment

Clone the code from github
```
git clone https://github.com/bmino/trading-with-trends.git
```

Build the project from the root directory
```
npm install
```

Start the application
```
npm run live
```


## Configuration

All configuration is done inside the `/config` directory.
To setup your configuration for the first time, duplicate each of the `*.example` files, remove the ".example" extension, and fill in the appropriate information.

#### File: config/backtest.js
* **ticker** - {String} Ticker used for backtesting.
* **interval** - {String} Candlestick period sizes to look at.
* **endDate** - {Date} Ending date of backtesting timeframe.
* **limit** - {Number} Number of candlesticks to include in the timeframe.

#### File: config/monitorLive.js
* **tickers** - {Object} Contains key value pairs where the key is the ticker, and the value contains options for the ticker.
    * **quantity** - {Number} Quantity of the ticker you wish to buy/sell when a position is opened or closed.
* **interval** - {String} Candlestick period sizes to look at.
* **notifications** - {Object} Contains settings to turn on and off notifications.
    * **buy** - {Boolean} Send an email when a new position is opened.
    * **sell** - {Boolean} Send an email when a position is closed.
    * **profit** - {Boolean} Send an email including profit when a position is closed.
    * **totalProfit** - {Boolean} Send an email including total system profit after each position is closed.

## Backtesting

Show detected entry points base on your entry strategy.
```
npm run entries
```

Calculate entry points, exit points, and overall profit.
```
npm run backtest
```

## Authors

* **[Brandon Mino](https://github.com/bmino)** - *Project Lead*
* **[Brennan Hill](https://github.com/Brennan10)** - *Strategy Development*

See also the list of [contributors](https://github.com/bmino/trading-with-trends/contributors) who participated in this project.


## License

This project is licensed under mit
