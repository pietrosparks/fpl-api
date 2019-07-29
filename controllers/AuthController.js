const request = require('request-promise');
const promise = require('bluebird');
const _ = require('lodash');
const { response, hasher } = require('../utils');
const PaymentService = require('../services/PaymentService');
const Groups = require('../models/groups');
const Events = require('../models/events');
const Users = require('../models/user');
const Bank = require('../models/bank');

const cookieParse = (cookies, cookie) => {
  const re = new RegExp(cookie, 'g');
  return cookies
    .find(c => c.match(re))
    .split(';')[0]
    .split('=')[1]
    .replace(/[/"]+/g, '');
};

const getNewEvents = () => {
  const event = {
    uri: `https://fantasy.premierleague.com/drf/events`,
    method: 'GET',
    simple: true,
    json: true
  };

  return request(event).then(r => r);
};

const getNewStandings = data => {
  const standings = {
    uri: `https://fantasy.premierleague.com/drf/leagues-classic-standings/${data}`,
    method: 'GET',
    simple: true,
    json: true
  };
  return request(standings).then(s => s);
};

class AuthController {
  login(req, res) {
    //Login to get sessionId cookie
    const { email, password } = req.body;

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
    };

    request(loginQry).catch(err => {
      if (err.statusCode === 302) {
        const cookies = err.response.headers['set-cookie'];
        const pl_profile = cookieParse(cookies, 'pl_profile') + '=';

        const mainOptions = {
          uri: 'https://fantasy.premierleague.com/',
          method: 'GET',
          resolveWithFullResponse: true,
          simple: true,
          json: true,
          headers: {
            Cookie: `pl_profile="${pl_profile}";`
          }
        };

        const firstQry = _.clone(mainOptions);
        firstQry.uri += 'a/team/my';

        const secondQry = _.clone(mainOptions);
        secondQry.uri += 'a/login';

        return request(firstQry).then(resp => {
          const sessionid = cookieParse(
            resp.headers['set-cookie'],
            'sessionid'
          );
          secondQry.headers.Cookie += `sessionid="${sessionid}";`;

          return request(secondQry).then(respy => {
            const csrftoken = cookieParse(
              respy.headers['set-cookie'],
              'csrftoken'
            );

            Users.findOrCreate(
              { email: email },
              {
                password: hasher({ password })
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
              );
            });
          });
        });
      }

      return response(403, 'error', res, 'Unauthorized', err);
    });
  }

  getUser(req, res) {
    const { pl_profile, sessionid, csrftoken } = req.headers;

    const query = {
      uri: 'https://fantasy.premierleague.com/drf/bootstrap-dynamic',
      method: 'GET',
      resolveWithFullResponse: true,
      simple: true,
      json: true,
      headers: {
        Cookie: `pl_profile="${pl_profile}"; sessionid=${sessionid}; csrftoken=${csrftoken}`
      }
    };

    request(query).then(resp => {
      if (resp) {
        return response(200, 'success', res, 'Retrieved User Info', resp);
      }
      return response(404, 'error', res, 'Error while retrieving User', e);
    });
  }

  getGroups(req, res) {
    const { pl_profile, sessionid, csrftoken } = req.headers;
    const { id } = req.params;

    const query = {
      uri: `https://fantasy.premierleague.com/drf/leagues-entered/${id}`,
      method: 'GET',
      simple: true,
      json: true,
      headers: {
        Cookie: `pl_profile="${pl_profile}"; sessionid=${sessionid}; csrftoken=${csrftoken}`
      }
    };

    return request(query).then(resp => {
      if (resp) {
        return response(200, 'success', res, 'Retrieved User Info', resp);
      }
      return response(404, 'error', res, 'Error while retrieving User', e);
    });
  }

  getGroup(req, res) {
    const { pl_profile, sessionid, csrftoken } = req.headers;
    const { id } = req.params;

    const leagueQuery = {
      uri: `https://fantasy.premierleague.com/drf/leagues-classic-standings/${id}`,
      method: 'GET',
      simple: true,
      json: true,
      headers: {
        Cookie: `pl_profile="${pl_profile}"; sessionid=${sessionid}; csrftoken=${csrftoken}`
      }
    };
    const eventQuery = _.clone(leagueQuery);
    eventQuery.uri = 'https://fantasy.premierleague.com/drf/events/';

    promise
      .all([request(leagueQuery), request(eventQuery)])
      .spread((league, event) => {
        if (league) {
          league.events = event;
          return Groups.findOne({ groupId: id }).then(group => {
            if (group) {
              league.groupData = group;
            } else {
              league.groupData = null;
            }
            return response(200, 'success', res, 'Retrieved User Info', league);
          });
        }
        return response(404, 'error', res, 'Error while retrieving User');
      });
  }

  createPaymentGroup(req, res) {
    let newGroupQuery;
    const { body } = req;
    Groups.findOne({ groupId: body.groupId }).then(g => {
      if (_.isNull(g)) {
        const newGroup = new Groups(body);
        newGroupQuery = newGroup.save();
      }

      const initializeQry = PaymentService.initializeTransaction({
        amount: body.totalAmount,
        email: body.adminMail,
        metadata: {
          chargeAmount: body.totalAmount,
          userEmail: body.adminEmail,
          groupId: body.groupId,
          groupName: body.name,
          type: 'group-credit-setup'
        }
      });

      return promise
        .all([initializeQry, newGroupQuery])
        .spread(init => {
          return response(
            200,
            'success',
            res,
            'Successfully created Group',
            init
          );
        })
        .catch(err => {
          return response(
            500,
            'error',
            res,
            'Error while creating payment',
            err
          );
        });
    });
  }

  createBank(req, res){
    const newBank = new Bank({
     
      code : "058",
      name : "Guaranty Trust Bank",
  })
    newBank.save()
    res.send("doneee")
  }

  async checkForNewResults(req, res) {
    Events.findOne({})
      .then(event => {
        if (_.isEmpty(event)) {
          return getNewEvents().then(e => {
            Events({ events: e })
              .save()
              .then(() => {
                return response(
                  200,
                  'success',
                  res,
                  'Successfully Updated Events'
                );
              });
          });
        }
        const latestGameWeek = event.events.find(
          g => g.finished && g.data_checked && g.is_current
        );

        return getNewEvents().then(e => {
          const mostUpdated = e.find(
            g => g.finished && g.data_checked && g.is_current
          );
          //change back. test environment
          if (
            latestGameWeek.id === mostUpdated.id
            // mostUpdated.id === latestGameWeek.id
          ) {
            return Groups.find({ paymentActive: true }).then(grp => {
              const groupIds = grp.map(g => {
                return getNewStandings(g.groupId);
              });
              //Need lots of commenting here
              promise.all(groupIds).then(g => {
                const currentGrp = g.map(gr => {
                  const tempGroup = grp.find(
                    data => data.groupId == gr.league.id
                  );
                  tempGroup.members = gr.standings.results.map(group => {
                    return {
                      player_name: group.player_name,
                      team_name: group.entry_name,
                      team_id: group.entry,
                      started: group.start_event,
                      rank: group.rank,
                      event_total: group.event_total
                    };
                  });
                  return tempGroup.save();
                });
                promise.all(currentGrp).then((result) => {
                  result.forEach(data => {
                   const sorted = data.members.sort((a, b) => b.event_total - a.event_total);
                   if(data.prizeShare){
                     const slicedRecipientArray = sorted.slice(0, data.prizeShare);
                     const obj ={
                       sliced: slicedRecipientArray,
                       full: sorted,
                       amount: data.collectionAmount
                     }
                     return PaymentService.createRecipients(slicedRecipientArray, obj, data.groupId)
                   }
                  })
                });
              });
            });
          }
        });
      })
      .catch(err => {});
  }
}

module.exports = new AuthController();
