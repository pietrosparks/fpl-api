const mongoose = require('mongoose')
const Schema = mongoose.Schema

const cardSchema = Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    cardReference: {
      type: String
    },
    name: {
      type: String
    },
    last4: {
      type: String
    },
    brand: {
      type: String
    },
    expiryMonth: {
      type: Number
    },
    expiryYear: {
      type: Number
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Card', cardSchema)
