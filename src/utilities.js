const {format} = require('date-fns')

const now = () => format(new Date(), 'd/M HH:mm:ss.SSS')
const logMessage = (premsg, msg) => `${premsg} ${now()} - ${msg}`


module.exports = {logMessage, now}