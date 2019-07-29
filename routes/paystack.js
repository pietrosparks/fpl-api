const PaystackController = require('../controllers/PaystackController');

module.exports = api => {
  api.post('/confirm-subscription', PaystackController.confirmTransaction)
//   api.get('/confirm-subscription', PaystackController.callbackUrl)
};
