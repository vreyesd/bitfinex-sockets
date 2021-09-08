# Bitfinex Socket 

## Installation
```bash
npm install bitfinex-sockets
```

## Usage

### [Public Client](https://docs.bitfinex.com/docs/ws-public)

```javascript
const {PublicSocket} = require('bitfinex-sockets')
const pubSocket = new PublicSocket()
```

#### [Ticker](https://docs.bitfinex.com/v2/reference#ws-public-ticker)
```javascript
pubSocket.subscribeToTicker('tBTCUSD')
```

#### [Trades](https://docs.bitfinex.com/v2/reference#ws-public-trades)
```javascript
pubSocket.subscribeToTrades('tBTCUSD')
```

#### [Books](https://docs.bitfinex.com/v2/reference#ws-public-order-books)
```javascript
pubSocket.subscribeToBooks('tBTCUSD')
pubSocket.subscribeToBooks('tBTCUSD', {prec: 'P1', freq: 'F1', len: 100})
```

#### [Raw Books](https://docs.bitfinex.com/v2/reference#ws-public-raw-order-books)
```javascript
pubSocket.subscribeToRawBooks('tBTCUSD')
pubSocket.subscribeToRawBooks('tBTCUSD', {len: 1})
```

#### [Candles](https://docs.bitfinex.com/v2/reference#ws-public-candle)
```javascript
pubSocket.subscribeToCandles('tBTCUSD' , '1m')
```

#### [Status](https://docs.bitfinex.com/reference#ws-public-status)
```javascript
pubSocket.subscribeToStatus({key: 'deriv:tBTCF0:USTF0'})
pubSocket.subscribeToStatus({key: 'liq:global'})
```

#### SetOnOpenCallback
```javascript
pubSocket.setOnOpenCallback()
```

#### SetOnMessageCallback
```javascript
pubSocket.setOnMessageCallback()
```

#### SetOnCloseCallback
```javascript
pubSocket.setOnCloseCallback()
```

#### Close
```javascript
pubSocket.close()
```
