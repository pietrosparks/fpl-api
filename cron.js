const cron = require('node-cron');

//run task at 3am
cron.schedule('0 3 * * *', function() {
  console.log('running a task every minute');
});
