const randomID = require('random-id')
const JWT = require('jsonwebtoken')
const secrets = require('./dbconfig/secrets')
const bcrypt = require('bcrypt-nodejs')
const _ = require('lodash')
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const mailer = msg => {
  /** const msg = {
    to: 'test@example.com',
    from: 'test@example.com',
    subject: 'Sending with SendGrid is Fun',
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
  }; **/

  return sgMail.send(msg)
}

const encryptPayload = payload => {
  return JWT.sign(
    {
      data: payload,
      expiresIn: Math.floor(Date.now() / 1000) + 360,
      iat: Math.floor(new Date(Date.now()))
    },
    secrets.JWT_SECRET
  )
}

const requestAuthorization = (req, res, next) => {
  let bearerHeader = req.headers['authorization']

  if (!_.isUndefined(bearerHeader)) {
    JWT.verify(bearerHeader, secrets.JWT_SECRET, (err, verified) => {
      if (err) {
        return res.sendStatus(403)
      }
      req.user = verified.data
      return next()
    })
  } else return res.sendStatus(403)
}

const passwordHash = password => {
  let salt = bcrypt.genSaltSync(10)
  let encrypted = bcrypt.hashSync(password, salt)
  return encrypted
}

const passwordDecrypt = (password, hashedPassword) => {
  return bcrypt.compareSync(password, hashedPassword)
}

const json = (status, statusText, res, message, data, meta) => {
  var response = {
    message: message
  }
  if (typeof data !== 'undefined') {
    response.data = data
  }
  if (typeof meta !== 'undefined') {
    response.meta = meta
  }
  if (typeof statusText !== 'undefined') {
    response.status = statusText
  }

  return res.status(status).json(response)
}

const jsonResolveError = (err, res, message) => {
  const response = {
    response: {
      message: 'Validation error has occured'
    }
  }

  if (typeof message !== 'undefined') {
    response.response.message = message
  }
  if (err.message) {
    response.response.message = err.message
  }
  if (err.response && err.response.body) {
    response.response.message = err.response.body.message
    response.response.errors = err
    return res.status(400).json(response)
  }
  if (err.Errors) {
    response.response.errors = err.Errors
    return res.status(400).json(response)
  }
  if (err.name === 'StatusCodeError') {
    response.response.message = err.message
    response.response.errors = err
    return res.status(err.statusCode).json(response)
  }
  if (err.name === 'RequestError') {
    response.response.message = 'External Server Is Down'
    response.response.errors = err
    return res.status(500).json(response)
  }
  if (err.cause && err.cause.code === 'ECONNREFUSED') {
    response.response.message = 'External Server Is Down'
    response.response.errors = err
    return res.status(500).json(response)
  }
  if (err.error && err.error.message) {
    response.response.message = err.error.message
    response.response.errors = err
    return res.status(500).json(response)
  }
  return res.negotiate(err)
}

module.exports = {
  randomID,
  hasher: passwordHash,
  decrypter: passwordDecrypt,
  encryptPayload: encryptPayload,
  requestAuthorization: requestAuthorization,
  response: json,
  responseError: jsonResolveError,
  mailer
}
