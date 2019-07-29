const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = Schema({
    amount: {
        type: String
    },
    teamId:{
        type: String
    },
    groupId: {
        type: String
    },
    rank: {
        type: String
    },
    accountNumber:{
        type: String
    },
    bank:{
        type: Schema.Types.ObjectId,
        ref: 'Bank'
    },
    email: {
        type: String
    },
    status:{
        type: String,
        enum:['pending','success', 'failed'],
        default: 'pending'
    },
    gw:{
        type: String
    },
    recipient_code: {
        type: String
    }
},{
    timestamp: true
})

module.exports = mongoose.model('Payments', paymentSchema)