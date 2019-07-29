const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const walletSchema = Schema(
  {
    groupId: {
      type: String,
      required: true
    },
    availableBalance: {
      type: String
    },
    totalBalance: {
      type: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Wallet', walletSchema);
