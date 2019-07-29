const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const walletTransactionSchema = Schema({
    amount: {
        type: String
    },
    previous_balance:{
        type: String
    },
    action: {
        type: String
    },
    details:{
        type: String
    },
    initiatior_type:{
        type: String
    },
    initiatior_ref:{
        type: String
    },
    settlement_date:{
        type: String
    },
    wallet:{
        type: Schema.Types.ObjectId,
        ref: 'Wallet'
    },
    groupId:{
        type: String
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);