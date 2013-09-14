
//Swith out these strings to run either production, sandbox, or demo.
var environment = "sandbox";
var port;
var serverType;
var dbName;

if(environment == "sandbox") {
  port = 3001;
  serverType = "sandbox";
  dbName = "GlobalGoosiiMetricsDB";
} else if( environment == "production") {
  port = 3005; 
  serverType = "production";  
  dbName = "GoosiiProduction";
} else if( environment == "demo") {
  port = 3007; 
  serverType = "demo";
  dbName = "GoosiiDemo";
}

var express = require('express')
    ,fs = require('fs')
    ,crypto = require('crypto')
    ,tls = require('tls')
    ,certPem = fs.readFileSync('GoosiiCert.pem', encoding='ascii')
    ,keyPem = fs.readFileSync('GoosiiKey-noenc.pem', encoding='ascii')
    ,caCert = fs.readFileSync('aps_development.cer', encoding='ascii')
    ,options = { key: keyPem, cert: certPem, ca: [ caCert ] }
    ,http = require('http');

var check = require('validator').check,
  sanitize = require('validator').sanitize

//Image and form uploads. I might be able to remove this since I have Gridform
var formidable = require('formidable');
    
//Native mongodb
var mongodb = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
var server = new mongodb.Server('127.0.0.1', 27017, {auto_reconnect: true, safe:true});
var db = new mongodb.Db(dbName, server);   
var GridStore = require('mongodb').GridStore;
var assert = require('assert');
var Binary = require('mongodb').Binary;

//Stephen's rollingLogAppender
var rollingLogAppender = require('../utilities/RollingLogAppender');

//Gridform is npm node module used to easily upload files from the client into mongodb using mongodb's gridstore object
var gridform = require('gridform');    

// assuming you've already created a db instance and opened it
gridform.db = db;
gridform.mongo = mongodb;

//Easily create an http server using express
var app = express();

//import Goosii Modules
var pushNotifyModule = require('./pushNotifyModule.js');
pushNotifyModule.pushNotifyModuleHandler(app, dbName);

var usersModule = require('./usersModule.js');
usersModule.usersModuleHandler(app, dbName);

var companiesModule = require('./companiesModule.js');
companiesModule.companiesModuleHandler(app, dbName);

var gameEngineModule = require('./gameEngineModule.js');
gameEngineModule.gameEngineModuleHandler(app, dbName);

var geoSpatialModule = require('./geoSpatialModule.js');
geoSpatialModule.geoSpatialModuleHandler(app, dbName);

//Start the http server listening on port 3000
app.listen(port);
console.log(serverType + ' server is Listening on port ' + port);

//TODO remove mongojs from node_modules as it doesn't give me the option to use the GridStore object