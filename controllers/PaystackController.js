const _ = require('lodash')
const Groups = require('../models/groups')
const { response } = require('../utils')
const crypto = require('crypto')
const PaymentService = require('../services/PaymentService')
const { PAYSTACK_KEY } = require('../dbconfig/secrets')

class PaystackController {
  confirmTransaction(req, res) {
    const data = req.body
    const hash = crypto
      .createHmac('sha512', PAYSTACK_KEY)
      .update(JSON.stringify(data))
      .digest('hex')
    console.log('paystack subscription event', data.event)

    if (hash == req.headers['x-paystack-signature']) {
      if (data.event === 'charge.success') {
        return PaymentService.chargedSuccess(res, data)
      }
      if (data.event === 'transfer.failed') {
        return PaymentService.failedTransfer(res, data)
      }
      if (data.event === 'transfer.success') {
        return PaymentService.successTransfer(res, data)
      }
      return res.sendStatus(200)
    }
    return res.sendStatus(200)
  }
}

module.exports = new PaystackController()
