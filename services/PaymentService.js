const promise = require('bluebird')
const request = require('request-promise')
const moment = require('moment')
const secrets = require('../dbconfig/secrets')
const Wallet = require('../models/wallet')
const Groups = require('../models/groups')
const Payments = require('../models/payments')
const User = require('../models/user')
const Card = require('../models/card')
const WalletTransaction = require('../models/walletTransaction')
const _ = require('lodash')
const io = require('../io');
const { response, mailer, randomID } = require('../utils')



module.exports = {
  mainOption: {
    method: 'POST',
    uri: 'https://api.paystack.co/',
    headers: {
      Authorization: `Bearer ${secrets.PAYSTACK_KEY}`,
      'Content-Type': 'application/json'
    },
    json: true // Automatically stringifies the body to JSON
  },

  initializeTransaction(data) {
    const options = _.clone(this.mainOption)
    options.uri += 'transaction/initialize'
    options.body = data
    return request(options)
  },

  verifyTransaction(data) {
    const options = _.clone(this.mainOption)
    options.uri += `transaction/verify/${data}`
    options.method = 'GET'
    return request(options)
  },

  initializeTransferRecipient(data) {
    const { teamId, email, groupId, amount, gw, accountNumber, bank } = data
    const options = _.clone(this.mainOption)
    options.uri += 'transferrecipient'
    options.body = {
      type: 'nuban',
      name: data.teamId,
      description: `Payment for ${teamId} to ${email} on behalf of winning GW${gw} on group ${groupId}`,
      account_number: accountNumber,
      bank_code: bank.code,
      currency: 'NGN',
      metadata: {
        data
      }
    }
    return request(options).then(r => r)
  },

  transferFunds(data) {
    const options = _.clone(this.mainOption)
    options.uri += 'transfer'
    options.body = {
      source: 'balance',
      reason: `payment to ${data.teamId} for winning GW${data.gw} of ${
        data.groupId
      }`,
      amount: data.amount * 100,
      recipient: data.recipient_code
    }

    return request(options).then(r => r)
  },

  async createRecipients(arr, obj, groupId, gw) {
    const { full, sliced, amount } = obj
    const totalAmount = full.length * amount
    const length = sliced.length

    const createdPayments = arr.map(async (data, index) => {
      const user = await User.findOne({ teamId: data.team_id }).populate('bank')

      if (!user) return

      const payment = {
        teamId: data.team_id,
        groupId: groupId,
        rank: data.rank,
        accountNumber: user.accountNumber,
        bank: user.bank._id,
        email: user.email,
        gw: gw
      }

      if (length === 1) {
        payment.amount = totalAmount
      }
      if (length === 2) {
        if (index === 0) {
          payment.amount = totalAmount * 0.7
        }
        if (index === 1) {
          payment.amount = totalAmount * 0.3
        }
      }
      if (length === 3) {
        if (index === 0) {
          payment.amount = totalAmount * 0.5
        }
        if (index === 1) {
          payment.amount = totalAmount * 0.3
        }
        if (index === 2) {
          payment.amount = totalAmount * 0.2
        }
      }
      return Payments.create(payment)
    })

    return promise.all(createdPayments).then(res => _.compact(res))
  },

  async chargedSuccess(res, data) {
    const { metadata, reference, customer, authorization } = data.data
    const {
      userEmail,
      userName,
      userAlias,
      userTeamId,
      groupId,
      groupName,
      type,
      groupAdmin,
      chargeAmount,
      started
    } = metadata
    const {
      authorization_code,
      last4,
      exp_month,
      exp_year,
      brand
    } = authorization
    console.log(data.data)

    if (type && type === 'admin-user-setup') {
      try {
        const userCreationQry = await User.findOrCreate(
          {
            email: userEmail
          },
          {
            alias: userAlias,
            name: userName,
            teamId: userTeamId
          }
        )

        const invite = randomID(7);
        const groupCreationQry = await Groups.create({
          name: groupName,
          groupId,
          groupAdmin,
          adminUserRef: userCreationQry.doc._id,
          collectionAmount: chargeAmount,
          started,
          prizeShare: '1',
          members:[userCreationQry.doc],
          invite
        })

        const cardCreationQry = await Card.create({
          cardReference: authorization_code,
          last4,
          expiryMonth: exp_month,
          expiryYear: exp_year,
          brand,
          user: userCreationQry.doc._id
        })

        io.sockets.emit('admin_add', { invite });

      } catch (err) {
        console.log(err, 'error while logging')
      }
    }

    // Wallet.findOne({ groupId: metadata.groupId })
    //   .then(wallet => {
    //     if (!_.isNull(wallet)) {
    //       const settlementDate = moment()
    //         .endOf('day')
    //         .toDate();
    //       const newWalletTransaction = new WalletTransaction({
    //         amount: parseInt(metadata.chargeAmount, 10) / 100,
    //         previous_amount: wallet.totalBalance,
    //         action: 'credit',
    //         details: `charge for ${metadata.groupId} fpl`,
    //         initiator_type: 'paystack card checkout',
    //         initiatior_ref: `${reference}`,
    //         settlement_date: settlementDate,
    //         wallet: wallet.id,
    //         groupId: `${metadata.groupId}`
    //       });

    //       wallet.totalBalance =
    //         parseInt(wallet.totalBalance) +
    //         parseInt(metadata.chargeAmount) / 100;

    //       const message = {
    //         to: 'pietrosparks@gmail.com',
    //         from: 'payments@fplauto.com',
    //         subject: `New Deposit for FPL Group "${metadata.groupName}"`,
    //         html: `<h3>Hello, ${
    //           customer.email
    //         },<h3><br><p>This is to inform you that a deposit of ${metadata.chargeAmount /
    //           100} was made to the FPL Group ${metadata.groupName}`
    //       };

    //       const walletTransactionQry = WalletTransaction.create(
    //         newWalletTransaction
    //       );

    //       const groupPaymentUpdate = Groups.update(
    //         { groupId: metadata.groupId },
    //         {
    //             paymentActive: true
    //         }
    //       );
    //       return promise
    //         .all([
    //           mailer(message),
    //           walletTransactionQry,
    //           groupPaymentUpdate,
    //           wallet.save()
    //         ])
    //         .then(() => {
    //           return response(
    //             200,
    //             'success',
    //             res,
    //             'Successfully Deposited Amount into Group Account'
    //           );
    //         })
    //         .catch(err => {
    //           return response(
    //             500,
    //             'error',
    //             res,
    //             'There was an error while Creating Wallet and sending mail',
    //             err
    //           );
    //         });
    //     } else {
    //       const newWallet = new Wallet({
    //         groupId: metadata.groupId,
    //         availableBalance: 0,
    //         totalBalance: parseInt(metadata.chargeAmount, 10) / 100
    //       });

    //       return newWallet.save().then(wallet => {
    //         const settlementDate = moment()
    //           .endOf('day')
    //           .toDate();
    //         const newWalletTransaction = new WalletTransaction({
    //           amount: parseInt(metadata.chargeAmount, 10) / 100,
    //           previous_amount: 0,
    //           action: 'credit',
    //           details: `charge for ${metadata.groupId} fpl`,
    //           initiator_type: 'paystack card checkout',
    //           initiatior_ref: `${reference}`,
    //           settlement_date: settlementDate,
    //           wallet: wallet.id,
    //           groupId: `${metadata.groupId}`
    //         });

    //         const groupPaymentUpdate = Groups.update(
    //           { groupId: metadata.groupId },
    //           {
    //               paymentActive: true
    //           }
    //         );

    //         const message = {
    //           to: 'pietrosparks@gmail.com',
    //           from: 'payments@fplauto.com',
    //           subject: `New Deposit for FPL Group "${metadata.groupName}"`,
    //           html: `<h3>Hello, ${
    //             customer.email
    //           },<h3><br><p>This is to inform you that a deposit of ${metadata.chargeAmount /
    //             100} was made to the FPL Group ${metadata.groupName}`
    //         };

    //         promise
    //           .all([
    //             mailer(message),
    //             newWalletTransaction.save(),
    //             groupPaymentUpdate
    //           ])
    //           .then(() => {
    //             return response(
    //               200,
    //               'success',
    //               res,
    //               'Successfully Deposited Amount into Group Account'
    //             );
    //           })
    //           .catch(err => {
    //             return response(
    //               500,
    //               'error',
    //               res,
    //               'There was an error while Creating Wallet and sending mail',
    //               err
    //             );
    //           });
    //       });
    //     }
    //   })
    //   .catch(err => {
    //     return response(
    //       500,
    //       'error',
    //       res,
    //       'Error occured while searching for wallet',
    //       err
    //     );
    //   });
  }
}
