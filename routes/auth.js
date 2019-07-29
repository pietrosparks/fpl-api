const AuthController = require('../controllers/AuthController');

module.exports = api => {
  api.post('/fpl/login', AuthController.login)
  api.get('/fpl/user', AuthController.getUser)
  api.get('/fpl/user/groups/:id', AuthController.getGroups)
  api.get('/fpl/user/group/:id', AuthController.getGroup)
  api.post('/fpl/group/new', AuthController.createPaymentGroup)
  api.get('/update/events', AuthController.checkForNewResults)
  api.get('/create/bank', AuthController.createBank)
  
};
