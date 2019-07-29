const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = Schema(
  {
    name: {
      type: String,
      required: true
    },
    groupId: {
      type: String,
      required: true
    },
    paymentActive: {
      type: Boolean,
      default: false
    },
    groupAdmin: {
      type: String,
      required: true
    }, 
    collectionAmount: {
      type: String,
      required: true
    },
    members:{
        type: Array
    },
    started: {
        type: String
    },
    finalPrize: {
      type: Boolean,
      default: false
    },
    finalPrizeAmount: {
      type: String
    },
    wallet: {
      type: Schema.Types.ObjectId
    },
    prizeShare: {
      type: String,
      enum: ['1', '2', '3'],
      required: true
    },
    transferHit: {
      type: Boolean,
      default: false
    },
    paystackReference: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Groups', groupSchema);
