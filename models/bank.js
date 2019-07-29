const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bankSchema = Schema({
    code:{
        type: String
    },
    name: {
        type: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model('Bank', bankSchema)