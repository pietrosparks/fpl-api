require('dotenv').load();
const bodyParser = require('body-parser');
const cors = require('cors');
const logger = require('morgan');
const cookieParser = require('cookie-parser');


//CORS CONFIGURATION

const incomingOriginWhitelist = [
  //for machines that use 'origin'
  'http://localhost:5000',
  //for machines that use 'host'
  'localhost:5000',
]

const corsConfig = (req, next) => {
  let corsOptions;
  let incomingOrigin = req.header('host') || req.header('origin');
  if (incomingOriginWhitelist.indexOf(incomingOrigin !== -1)) {
    corsOptions = {
      origin: true
    }
    return next(null, corsOptions);
  } else
    corsOptions = {
      origin: false
    }
  return next(new Error('You like going under the hood, i like you. Contact me '))

}

module.exports = (app, express) => {

  const api = require('./routes/api')(express);
  
  app.use(cors(corsConfig), (req, res, next) => {
    next();
  })
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());
  app.use('/', api);
  app.use(logger('short'));
 
  //catch errors 
  app.use((req, res, next) => {
    var err = new Error("Not Found");
    err.status = 404;
    next(err);
  })
  // error handler 
  app.use((err, req, res) => {
    res.locals.message = err.message
    //Only providing errors in development 
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    console.log(err);
    res.render('error')
  })

}