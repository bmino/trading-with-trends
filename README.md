-----------
Entry Point
-----------

MACD is (12, 26, close, 14)
STOCH is (14, 3, 3)
RSI is (10)
"crossover" is defined where the 12x MACD crosses up through the 26x MACD

1) MACD crossover occurred
2) MACD crossover is higher than previous crossover

3) RSI is higher than last crossover
4) RSI at current crossover is greater than 50

5) STOCH (14)k-line is greater than (3)d-line
6) STOCH is not within blacklisted numbers
        9X/9X
        8X/8X
        80-84/7X




----------
Exit Point
----------

Fail safe triggers:
1) Gross loss of > 1.50%
2) Open position lasts longer than 1 hour
3) ...


Conditions:
1) MACD crosses back
2) Live RSI falls below 40
3) Live RSI drops 16 points from last closing candle
4) Last three closing candles have RSI of 4X
5) RSI closes at 70+ and then later falls below 50