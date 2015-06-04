var setting = require('../config/settings.js'),
    Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server;
module.exports = function() {
    return new Db(setting.db, new Server(setting.host, Connection.DEFAULT_PORT), {safe: true});
}