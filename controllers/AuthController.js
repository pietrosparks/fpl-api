const request = require('request-promise')
const promise = require('bluebird')
const _ = require('lodash')
const { response, hasher, responseError } = require('../utils')
const PaymentService = require('../services/PaymentService')
const Groups = require('../models/groups')
const Events = require('../models/events')
const Users = require('../models/user')
const Payments = require('../models/payments')
const Wallet = require('../models/wallet')

const generalQuery = {
  uri: 'https://fantasy.premierleague.com/drf',
  method: 'GET',
  resolveWithFullResponse: true,
  simple: true,
  json: true,
  headers: {}
}

const cookieParse = (cookies, cookie) => {
  const re = new RegExp(cookie, 'g')
  const cook = cookies
    .find(c => c.match(re))
    .split('; ')[0]
    .replace(/[/"]+/g, '')
  console.log(cook, 'cook')
  return cook
  // .split('=')[1]
}

const loginCheck = link => {
  const re = new RegExp('success', 'g')
  return link.match(re)
}

const getNewEvents = () => {
  const event = {
    uri: `https://fantasy.premierleague.com/drf/events`,
    method: 'GET',
    simple: true,
    json: true
  }

  return request(event).then(r => r)
}

const getNewStandings = data => {
  const standings = {
    uri: `https://fantasy.premierleague.com/drf/leagues-classic-standings/${data}`,
    method: 'GET',
    simple: true,
    json: true
  }
  return request(standings).then(s => s)
}

class AuthController {
  login(req, res) {
    //Login to get sessionId cookie
    const { email, password } = req.body

    const loginQry = {
      uri: 'https://users.premierleague.com/accounts/login/',
      method: 'POST',
      resolveWithFullResponse: true,
      form: {
        login: email,
        password: password,
        app: 'plusers',
        redirect_uri: 'https://users.premierleague.com/'
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Access-Control-Expose-Headers': 'Set-Cookie'
      },
      json: true,
      simple: true
    }

    request(loginQry)
      .catch(err => {
        if (err.statusCode === 302) {
          if (!err.response.headers['set-cookie']) {
            return response(403, 'error', res, 'Unauthorized', err)
          }

          const cookies = err.response.headers['set-cookie']

          const pl_profile = cookieParse(cookies, 'pl_profile')

          const mainOptions = {
            uri: 'https://fantasy.premierleague.com/',
            method: 'GET',
            resolveWithFullResponse: true,
            simple: true,
            json: true,
            headers: {
              Cookie: `${pl_profile}`
            }
          }

          const firstQry = _.clone(mainOptions)
          firstQry.uri += 'a/team/my'

          const secondQry = _.clone(mainOptions)
          secondQry.uri += 'a/login'

          return request(firstQry).then(resp => {
            const sessionid = cookieParse(
              resp.headers['set-cookie'],
              'sessionid'
            )
            secondQry.headers.Cookie += `${sessionid};`

            return request(secondQry)
              .then(respy => {
                const csrftoken = cookieParse(
                  respy.headers['set-cookie'],
                  'csrftoken'
                )

                Users.findOrCreate(
                  { email: email },
                  {
                    password: hasher(password)
                  }
                ).then(user => {
                  return response(
                    200,
                    'success',
                    res,
                    'User successfully logged in',
                    {
                      csrftoken,
                      sessionid,
                      pl_profile,
                      user: user.email
                    }
                  )
                })
              })
              .catch(err => {
                return responseError(err, res)
              })
          })
        }
        return response(403, 'error', res, 'Unauthorized', err)
      })
      .catch(err => responseError(err, res))
  }

  getUser(req, res) {
    const { pl_profile, sessionid, csrftoken } = req.headers
    const cookieString = `${pl_profile}; ${sessionid}; ${csrftoken}`
    const query = _.clone(generalQuery)
    query.uri += '/bootstrap-dynamic'
    query.headers.Cookie = cookieString

    request(query)
      .then(resp => {
        return response(200, 'success', res, 'Retrieved User Info', resp)
      })
      .catch(err => responseError(err, res))
  }

  getGroups(req, res) {
    const { pl_profile, sessionid, csrftoken } = req.headers
    const { id } = req.params

    const cookieString = `${pl_profile}; ${sessionid}; ${csrftoken}`
    const query = _.clone(generalQuery)
    query.uri += `/leagues-entered/${id}`
    query.headers.Cookie = cookieString
    query.resolveWithFullResponse = false

    return request(query)
      .then(resp => {
        return response(200, 'success', res, 'Retrieved User Info', resp)
      })
      .catch(err => responseError(err, res))
  }

  getGroup(req, res) {
    const { pl_profile, sessionid, csrftoken } = req.headers
    const { id } = req.params

    const cookieString = `${pl_profile}; ${sessionid}; ${csrftoken}`
    const leagueQuery = _.clone(generalQuery)
    leagueQuery.uri += `/leagues-classic-standings/${id}`
    leagueQuery.headers.Cookie = cookieString
    leagueQuery.resolveWithFullResponse = false

    const eventQuery = _.clone(leagueQuery)
    eventQuery.uri = 'https://fantasy.premierleague.com/drf/events/'

    return promise
      .all([request(leagueQuery), request(eventQuery)])
      .spread((league, event) => {
        league.events = event
        return Groups.findOne({ groupId: id }).then(group => {
          if (group) {
            league.groupData = group
          } else {
            league.groupData = null
          }
          return response(200, 'success', res, 'Retrieved User Info', league)
        })
      })
      .catch(err => responseError(err, res))
  }

  createPaymentGroup(req, res) {
    // let newGroupQuery
    const {
      groupId,
      collectionAmount,
      adminMail,
      name,
      groupAdmin,
      started,
      adminAlias,
      adminTeamId,
      adminName
    } = req.body
    // Groups.findOne({ groupId: groupId }).then(g => {
    //   if (_.isNull(g)) {
    //     newGroupQuery = new Groups(req.body).save()
    //   }

    const initializeQry = PaymentService.initializeTransaction({
      amount: 10000,
      email: 'pietrosparks@gmail.com' || adminMail,
      metadata: {
        chargeAmount: collectionAmount,
        userEmail: adminMail,
        userAlias: adminAlias,
        userName: adminName,
        userTeamId: adminTeamId,
        groupId: groupId,
        groupName: name,
        groupAdmin,
        started,
        type: 'admin-user-setup'
      }
    })

    return initializeQry
      .then(initLink => {
        console.log(initLink, 'initlink')
        return response(
          200,
          'success',
          res,
          'Successfully created Group',
          initLink
        )
      })
      .catch(err => responseError(err, res))
    // })
  }

  async getPaystackRecipients(req, res) {
    Payments.find({ status: 'pending' })
      .populate('bank')
      .then(pay => {
        const assignWinnersRecipientCode = pay.map(async p => {
          p.recipient_code = (await PaymentService.initializeTransferRecipient(
            p
          )).data.recipient_code
          return p.save()
        })

        promise
          .all(assignWinnersRecipientCode)
          .then(recipient => {
            return response(
              200,
              'success',
              res,
              'Successfully gotten recepient codes',
              recipient
            )
          })
          .catch(err => responseError(err, res))
      })
  }

  async payWinners(req, res) {
    Payments.find({
      status: 'pending',
      recipient_code: {
        $ne: null
      }
    })
      .populate('bank')
      .then(payment => {
        Wallet.find({ groupId: payment.map(p => p.groupId) }).then(wallet => {
          const allPayments = payment.map(p => {
            return PaymentService.transferFunds(p)
          })
          promise.all(allPayments).then(resp => {
            console.log(resp, 'Winners Have Been Paid Successfully')
          })
        })
      })
      .catch(err => responseError(err, res))
  }

  async checkForNewResults(req, res) {
    Events.findOne({})
      .then(event => {
        if (_.isEmpty(event)) {
          return getNewEvents().then(e => {
            Events({ events: e })
              .save()
              .then(() => {
                return
              })
          })
        }
        const latestGW = event.events.find(g => g.is_current)

        return getNewEvents().then(e => {
          const updatedGW = e.find(g => g.is_current)
          if (!updatedGW) {
            return response(404, 'error', res, 'No Payments Ready')
          }

          //change back. test environment
          if (
            latestGW.id
            // === (mostUpdated.id + 1)
            // mostUpdated.id === latestGameWeek.id
          ) {
            return Groups.find({ paymentActive: true }).then(grp => {
              const groupIds = grp.map(g => getNewStandings(g.groupId))
              //Need lots of commenting here

              promise.all(groupIds).then(g => {
                const currentGrp = g.map(gr => {
                  const tempGroup = grp.find(
                    data => data.groupId == gr.league.id
                  )
                  tempGroup.members = gr.standings.results.map(group => {
                    return {
                      player_name: group.player_name,
                      team_name: group.entry_name,
                      team_id: group.entry,
                      started: group.start_event,
                      rank: group.rank,
                      event_total: group.event_total,
                      current_gw: mostUpdated.id
                    }
                  })
                  return tempGroup.save()
                })

                promise.all(currentGrp).then(result => {
                  result.forEach(data => {
                    const sorted = data.members.sort(
                      (a, b) => b.event_total - a.event_total
                    )
                    if (data.prizeShare) {
                      const slicedRecipientArray = sorted.slice(
                        0,
                        data.prizeShare
                      )
                      const obj = {
                        sliced: slicedRecipientArray,
                        full: sorted,
                        amount: data.collectionAmount
                      }

                      const createRecipientsQuery = PaymentService.createRecipients(
                        slicedRecipientArray,
                        obj,
                        data.groupId,
                        updatedGW.id
                      )

                      //Update Events
                      const updateEventsQry = Events({
                        events: event.events
                      }).save()

                      promise
                        .all([createRecipientsQuery, updateEventsQry])
                        .spread(recipient => {
                          return response(
                            200,
                            'success',
                            res,
                            `${
                              recipient.length
                            } Payment recipients were created`,
                            recipient
                          )
                        })
                    }
                  })
                })
              })
            })
          }
        })
      })
      .catch(err => responseError(err, res))
  }
}

module.exports = new AuthController()
