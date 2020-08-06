const WebSocket = require('ws')
const crypto = require('crypto-js')
const {logMessage} = require('./utilities')


const print = msg => console.log(logMessage('Private socket', msg))


class PrivateSocket {
    /**
     * @param {String} apiKey
     * @param {String} apiSecret
     * @param {["trading" | "trading-tBTCUSD" | "funding" | "funding-fBTC" | "wallet" | "wallet-exchange-BTC" | "algo" | "balance" | "notify"]} [filter=null]
     * @param {function} [onMessageCallback=null] triggered when socket message arrives
     * @param {function} [onOpenCallback=null] triggered when socket open
     * @param {boolean} [mustReconnect=true] true if reconnect on close(default=true)
     */
    constructor(apiKey, apiSecret, filter=null, onMessageCallback=null, onOpenCallback=null, mustReconnect=true) {

        if(!apiKey || !apiSecret)
            throw new Error('Api Key and Api Secret is required')


        this.apiKey = apiKey
        this.apiSecret = apiSecret
        this.socketUrl = 'wss://api.bitfinex.com/ws/2'
        this.filter = filter
        this.onMessageCallback = onMessageCallback
        this.onOpenCallback = onOpenCallback
        this.mustReconnect = mustReconnect
        this.connected = false


        this.init = this.init.bind(this)
        this.auth = this.auth.bind(this)
        this.onOpen = this.onOpen.bind(this)
        this.onClose = this.onClose.bind(this)
        this.onMessage = this.onMessage.bind(this)
        
        this.setOnMessageCallback = this.setOnMessageCallback.bind(this)
        this.setOnOpenCallback = this.setOnOpenCallback.bind(this)

        this.init()
    }





    init() {
        print("init")
        this.wss = new WebSocket (this.socketUrl)
        this.wss.onopen = this.onOpen
        this.wss.onmessage = this.onMessage
        this.wss.onerror = this.onError
        this.wss.onclose = this.onClose
    }





    onOpen() {
        this.connected = true
        if(this.onOpenCallback)
            this.onOpenCallback()
        else
            print(`connected`)
        this.auth()
    }





    onClose() {
        print('closed')
        this.connected = false

        if(this.mustReconnect) {
            print('reconnecting')
            this.wss.removeAllListeners()

            this.init()
        }
    }
    




    onMessage(msg) {
        const data = JSON.parse(msg.data)

        if(this.onMessageCallback)
            this.onMessageCallback(data)
        else
            print(data)
    }





    onError(msg) {
        print(`error, ${msg.message}`)
    }





    auth() {
        const authNonce = Date.now() * 1000
        const authPayload = 'AUTH' + authNonce
        const authSig = crypto
  	        .HmacSHA384(authPayload, this.apiSecret)
            .toString(crypto.enc.Hex)
        const filter = this.filter


        const payload = {
            apiKey: this.apiKey,
            authSig,
            authNonce,
            authPayload,
            event: 'auth',
        }

        if(filter) payload.filter = filter


        this.wss.send(JSON.stringify(payload))
    }



    
    /**
     * Set function triggered when socket message arrives
     * @param {function} f function triggered on socket message 
     */
    setOnMessageCallback(f) {
        this.onMessageCallback = f
    }



    /**
     * Set function triggered when socket open
     * @param {function} f function triggered on socket open
     */
    setOnOpenCallback(f) {
        this.onOpenCallback = f
    }




    /**
     * Creates a new order, can be used to create margin, exchange, and derivative orders.
     * @param {Number} [gid=1] Group id for the order
     * @param {Number} [cid= new Date()] Should be unique in the day (UTC) (not enforced)
     * @param {"LIMIT" | "MARKET" | "STOP" | "STOP LIMIT" | "TRAILING STOP" | "EXCHANGE MARKET" | "EXCHANGE LIMIT" | "EXCHANGE STOP" | "EXCHANGE STOP LIMIT" | "EXCHANGE TRAILING STOP" | "FOK" | "EXCHANGE FOK" | "IOC" | "EXCHANGE IOC" } type The type of the order  
     * @param {String} symbol Symbol (tBTCUSD, tETHUSD, ...)
     * @param {String} amount Positive for buy, Negative for sell 
     * @param {String} price Price (Not required for market orders)
     * @param {Number} lev Set the leverage for a derivative order, supported by derivative symbol orders only. The value should be between 1 and 100 inclusive. The field is optional, if omitted the default leverage value of 10 will be used.
     * @param {String} price_trailing The trailing price 
     * @param {String} price_aux_limit Auxiliary Limit price (for STOP LIMIT)
     * @param {String} price_oco_stop OCO stop price
     * @param {Number} flags See https://docs.bitfinex.com/v2/docs/flag-values.
     * @param {String} tif Time-In-Force: datetime for automatic order cancellation (ie. 2020-01-01 10:45:23) )
     * @param {Object} meta The meta object allows you to pass along an affiliate code inside the object - example: meta: {aff_code: "AFF_CODE_HERE"} 
     */
    newOrder({
        gid=1,
        cid=Date.now(),
        type,
        symbol,
        amount,
        price,
        lev,
        price_trailing,
        price_aux_limit,
        price_oco_stop,
        flags,
        tif,
        meta={aff_code: "eUGsdsOUZf"}
    }) {

        if(!type || !symbol || !amount)
            throw new Error("type, symbol and amount is required ")


        const order = {
            gid,
            cid,
            type,
            symbol,
            amount,
            meta
        }

        if(price) order.price = price
        if(lev) order.lev = lev
        if(price_trailing) order.price_trailing = price_trailing
        if(price_aux_limit) order.price_aux_limit = price_aux_limit
        if(price_oco_stop) order.price_oco_stop = price_oco_stop
        if(flags) order.flags = flags
        if(tif) order.tif = tif


        this.wss.send(JSON.stringify([0, "on", null, order]))
    }




    /**
     * Update an existing order, can be used to update margin, exchange, and derivative orders.
     * @param {Number} id Order ID
     * @param {Number} [cid] Client Order ID
     * @param {String} [cid_date] Client Order ID Date
     * @param {Number} [gid] Group id for the order
     * @param {String} price Price
     * @param {String} amount Amount
     * @param {Number} lev Set the leverage for a derivative order, supported by derivative symbol orders only. The value should be between 1 and 100 inclusive. The field is optional, if omitted the default leverage value of 10 will be used.
     * @param {String} delta Change of amount
     * @param {String} price_aux_limit Auxiliary Limit price (for STOP LIMIT)
     * @param {String} price_trailing The trailing price 
     * @param {Number} flags See https://docs.bitfinex.com/v2/docs/flag-values.
     * @param {String} tif Time-In-Force: datetime for automatic order cancellation (ie. 2020-01-01 10:45:23) )
     */
    updateOrder({
        id,
        cid,
        cid_date,
        gid,
        price,
        amount,
        lev,
        delta,
        price_aux_limit,
        price_trailing,
        flags,
        tif
    }) {
        if(!id)
            throw new Error("id is required")


        const order = {id}

        if(cid) order.cid = cid 
        if(cid_date) order.cid_date = cid_date 
        if(gid) order.gid = gid
        if(price) order.price = price
        if(amount) order.amount = amount
        if(lev) order.lev = lev
        if(delta) order.delta = delta
        if(price_aux_limit) order.price_aux_limit = price_aux_limit
        if(price_trailing) order.price_trailing = price_trailing
        if(flags) order.flags = flags
        if(tif) order.tif = tif

        this.wss.send(JSON.stringify([0, "ou", null, order]))
    }




    /**
     * Send multiple order-related operations
     * @param {Order[]} orders
     */
    orderMulti(orders) {
        if(!Array.isArray(orders) && !orders.length())
            throw new Error("orders must be Array")


        this.wss.send(JSON.stringify([0, "ox_multi", null, orders]))
    }




    /**
     * Cancels the specified order
     * @param {Number} id Internal Order ID
     * @param {Number} cid Client Order ID
     * @param {String} cid_date Client Order ID Date
     */
    cancelOrder({
        id,
        cid,
        cid_date
    }) {
        if(!id && !(cid && cid_date))
            throw new Error("id is required ")


        const order = {}

        if(id) order.id = id 
        if(cid) order.cid = cid 
        if(cid_date) order.cid_date = cid_date


        this.wss.send(JSON.stringify([0, "oc", null, order]))
    }



    /**
     * Cancel the specified order list
     * @param {Object} orders Please see https://docs.bitfinex.com/reference#ws-auth-input-order-cancel-multi
     */
    cancelOrderMulti(orders) {
        if(!Array.isArray(orders) && !orders.length())
            throw new Error("Orders must be Array")

        this.wss.send(JSON.stringify([0, "oc_multi", null, orders]))
    }




    /**
     * Create a new funding offer.
     * @param {String} type LIMIT, FRRDELTAVAR, FRRDELTAFIX
     * @param {String} symbol Symbol (fUSD, fBTC, ...)
     * @param {String} amount Positive for buy, Negative for sell 
     * @param {String} rate Rate (or offset for FRRDELTA offers)
     * @param {Number} period Time period of offer. Minimum 2 days. Maximum 30 days
     * @param {Number} flags See https://docs.bitfinex.com/v2/docs/flag-values
     */
    newOffer({
        type,
        symbol,
        amount,
        rate,
        period,
        flags
    }) {
        if(!type || !symbol || !amount || !rate || !period || !flags)
            throw new Error("type, symbol, amount, rate, period and flags is required ")


        const offer = {
            type,
            symbol,
            amount,
            rate,
            period,
            flags
        }

        this.wss.send(JSON.stringify([0, "fon", null, offer]))
    }




    /**
     * Cancel a funding offer
     * @param {Number} id Offer ID
     */
    cancelOffer({id}) {
        if(!id)
            throw new Error("id is required")
        
        const offer = {id}

        this.wss.send(JSON.stringify([0, "foc", null, offer]))
    }




    /**
     * Send calc requests to trigger specific calculations
     * @param {String[]} payload ([["margin_base"], ["margin_sym_tBTCUSD"], ["position_tBTCUSD"], ["wallet_margin_BTC"], ["wallet_funding_USD"], ["balance"]])
     */
    calc(payload) {
        if(!Array.isArray(payload) && payload.length())
            throw new Error("Orders must be Array")

        this.wss.send(JSON.stringify([0, "calc", null, payload]))
    }
}


module.exports = PrivateSocket