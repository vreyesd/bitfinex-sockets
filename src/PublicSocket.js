const WebSocket = require('ws')
const {logMessage} = require('./utilities')


const print = msg => console.log(logMessage('Public socket', msg))


class PublicSocket {
    /**
     * 
     * @param {boolean} mustReconnect true if reconnect on close(default=true)
     */
    constructor(mustReconnect=true) {
        this.socketUrl = 'wss://api-pub.bitfinex.com/ws/2'
        this.connectionsLimit = 30

        this.subscribeTo = this.subscribeTo.bind(this)
        this.onOpen = this.onOpen.bind(this)
        this.onMessage = this.onMessage.bind(this)
        this.onClose = this.onClose.bind(this)
        this.onError = this.onError.bind(this)
        this.init = this.init.bind(this)

        this.setOnMessageCallback = this.setOnMessageCallback.bind(this)
        this.setOnOpenCallback = this.setOnOpenCallback.bind(this)
        this.close = this.close.bind(this)

        this.mustReconnect = mustReconnect
        this.connected = false
        this.init()
    }




    get acceptSubscribe() {
        const {channelToConnect, channelConnecting, channelConnected} = this
        const length = channelToConnect.length + channelConnecting + channelConnected.length

        if(length < this.connectionsLimit) return true
        return false
    }




    init() {
        print("init")
        this.wss = new WebSocket(this.socketUrl)
        this.wss.onopen = this.onOpen
        this.wss.onmessage = this.onMessage
        this.wss.onerror = this.onError
        this.wss.onclose = this.onClose
        
        this.channelToConnect = []
        this.channelConnecting = 0
        this.channelConnected = []
    }




    onOpen() {
        this.connected = true
        if(this.onOpenCallback)
            this.onOpenCallback()
        else
            print(`connected`)

        while(this.channelToConnect.length) {
            let toConnect = this.channelToConnect.pop()

            this.channelConnecting++
            this.subscribe(toConnect)
        }


    }




    onMessage(msg) {
        const data = JSON.parse(msg.data)
        
        if(data.event === 'subscribed') {
            this.channelConnecting--

            let connected = {
                ...JSON.parse(msg.data)
            }
            delete connected.event
            this.channelConnected.push(connected)
            
        } else if (data.event === 'unsubscribed' && data.status === "OK") {
            const index = this.connected.findIndex(c => JSON.parse(c).chanId === msg.chanId)
            this.channelConnected.splice(index, 1)
        }


        if(this.onMessageCallback)
            this.onMessageCallback(data)
    }




    onClose() {
        print('closed')
        this.connected = false

        if(this.mustReconnect) {
            print('reconnecting')
            this.wss.removeAllListeners()

            const toConnect = [...this.channelConnected]

            this.init()
            
            toConnect.forEach(console.log)
            toConnect.forEach(tc => {
                let data = {...tc}
                delete data.channel
                delete data.chanId

                this.subscribeTo(tc.channel, data)
            })
        }
    }




    onError(msg) {
        print(`error ${msg}`)
    }




    subscribe(msg) {
        if(!this.acceptSubscribe) 
            throw new Error(`Only support ${this.connectionsLimit} connections`)

        this.wss.send(msg)
    }




    unsubscribe(channelId) {
        const msg = JSON.stringify({
            event: 'unsubscribe',
            chanId: channelId
        })

        this.wss.send(msg)
    }




    subscribeTo(channel, data) {
        const msg = JSON.stringify({
            event: 'subscribe',
            channel,
            ...data
        })

        if(!this.connected) 
            this.channelToConnect.push(msg)
        else 
            this.subscribe(msg)
    }


    /**
     * Shows the current best bid and ask, the last traded price, as  
     * well as information on the daily volume and price movement over 
     * the last day.
     * @param {string} symbol Trading pair or funding currency 
     * (e.g. tBTCUSD, tETHUSD, fUSD, fBTC) 
     */

    subscribeToTicker(symbol) {
        this.subscribeTo('ticker', {symbol})
    }




    /**
     * This channel sends a trade message whenever a trade occurs 
     * at Bitfinex. It includes all the pertinent details of the 
     * trade, such as price, size and the time of execution. The 
     * channel can send funding trade data as well.
     * @param {string} symbol Trading pair or funding currency  
     * (e.g. tBTCUSD, tETHUSD, fUSD, fBTC)
     */
    subscribeToTrades(symbol) {
        this.subscribeTo('trades', {symbol})
    }




    /**
     * The Order Books channel allows you to keep track of the state 
     * of the Bitfinex order book. It is provided on a price 
     * aggregated basis with customizable precision. Upon connecting, 
     * you will receive a snapshot of the book followed by updates 
     * for any changes to the state of the book.
     * @param {string} symbol Trading pair or funding currency  
     * (e.g. tBTCUSD, tETHUSD, fUSD, fBTC)
     * @param {string} prec Level of price aggregation (P0, P1, P2, P3, P4).
     * The default is P0
     * @param {string} freq Frequency of updates (F0, F1). 
     * F0=realtime / F1=2sec. The default is F0.
     * @param {integer} len Number of price points (25, 100) [default=25]
     */
    subscribeToBooks(symbol, prec='P0', freq='F0', len=25) {
        this.subscribeTo('book', {symbol, prec, freq, len})
    }




    /**
     * The Raw Books channel provides the most granular books.
     * @param {string} symbol Trading pair or funding currency
     * (e.g. tBTCUSD, tETHUSD, fUSD, fBTC)
     * @param {integer} len Number of price points (1, 25, 100) [default=25]
     */
    subscribeToRawBooks(symbol, len=25) {
        this.subscribeTo('book', {symbol, prec: 'R0', len})
    }




    /**
     * The Candles endpoint provides OCHL (Open, Close, High, Low) 
     * and volume data for the specified trading pair.
     * @param {string} symbol Trading pair (e.g. tBTCUSD, tETHUSD)
     * @param {string} timeframe (e.g. 1m, 5m, 15m, 30m, 1h, 3h, 6h, 12h,
     * 1D, 7D, 14D, 1M)
     */
    subscribeToCandles(symbol, timeframe) {
        this.subscribeTo('candles', {key:`trade:${timeframe}:${symbol}`})
    }




    /**
     * Subscribe to and receive different types of platform 
     * information - currently supports derivatives pair status and 
     * liquidation feed.
     * @param {string} key "deriv:SYMBOL" // e.g. "deriv:tBTCF0:USTF0", 
     * "liq:global"
     */
    subscribeToStatus(key) {
        this.subscribeTo('status', {key})
    }



    /**
     * Set function when socket message arrives
     * @param {function} f function triggered on socket message 
     */
    setOnMessageCallback(f) {
        this.onMessageCallback = f
    }



    /**
     * Set function when socket open
     * @param {function} f function triggered on socket open 
     */
    setOnOpenCallback(f) {
        this.onOpenCallback = f
    }



    /**
     * Set function when socket close
     * @param {function} f function triggered on socket close 
     */
    setOnCloseCallback(f) {
        this.onCloseCallback = f
    }



    /**
     * Close socket
     */
    close() {
        this.mustReconnect = false
        this.wss.terminate()
    }
}

module.exports = PublicSocket