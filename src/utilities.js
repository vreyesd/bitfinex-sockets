const {format} = require('date-fns')

const now = () => format(new Date(), 'd/M HH:mm:ss.SSS')


module.exports = {now}