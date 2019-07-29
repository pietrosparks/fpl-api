const mongoose = require('mongoose');
const secrets = require('./secrets');
const dbConnection = mongoose.connection;

mongoose.connect(secrets.DATABASE);
mongoose.Promise = require('bluebird');

module.exports = {
    connect() {
        dbConnection.on('error', console.error.bind(console.error));
        dbConnection.once('open', () => {
            console.log('FPL Connected');
        })
    }
}