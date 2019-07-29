const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = Schema({
    events:{
        type: Array
    }
},{
    timestamp: true
})

module.exports = mongoose.model('Events', eventSchema);