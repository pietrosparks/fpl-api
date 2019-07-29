const express = require('express');
const app = express();
const database = require('./dbconfig/database');
const server = require('http').Server(app);
database.connect()
require('./config')(app, express);

module.exports = {
    app, 
    server,
}