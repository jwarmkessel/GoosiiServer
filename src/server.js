
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
    ,http = require('http')
    ,nodemailer = require("nodemailer") // 10/10/2013 by MC
    ,cluster = require('cluster') // 10/10/2013 by MC
    ,check = require('validator').check
    ,sanitize = require('validator').sanitize
    ,workers = process.env.WORKERS || require('os').cpus().length // 10/10/2013 by MC
    ,loggingSystem = require('./loggingSystem.js'); // 10/10/2013 by MC



//Image and form uploads. I might be able to remove this since I have Gridform
var formidable = require('formidable');
    
//Native mongodb
var mongodb = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
var server = new mongodb.Server('127.0.0.1', 27017, {safe:true});
//var server = new mongodb.Server('127.0.0.1', 27017, {auto_reconnect: true, safe:true});
var db = new mongodb.Db(dbName, server);   
var GridStore = require('mongodb').GridStore;
var assert = require('assert');
var Binary = require('mongodb').Binary;

//Gridform is npm node module used to easily upload files from the client into mongodb using mongodb's gridstore object
var gridform = require('gridform');    

// assuming you've already created a db instance and opened it
gridform.db = db;
gridform.mongo = mongodb;

//Easily create an http server using express
var app = express();

//With domain-middleware
app.use(require('express-domain-middleware'));
app.use(app.router);
app.use(function errorHandler(err, req, res, next) {
  console.log("good idea " + err.foo);
  
  // console.log('error on request %d %s %s: %j', process.domain.id, req.method, req.url, err);
  // 
  //   if(err.domain) {
  //     //you should think about gracefully stopping & respawning your server
  //     //since an unhandled error might put your application into an unknown state 
  //     console.log(JSON.stringify("Something specific"));
  //   }
  res.send(500, "Something bad happened. :(");
});

app.get('/hi', function(req, res, next) {
  // Handle the get for this route
  db.open(function (error, client) {
    
    console.log("Type of " + typeof(error));
    error = {"hello" : "hi"};
    
    error.foo = "blah";
    // if(error) throw new Error("The individual request will be passed to the express error handler, and your application will keep running.");
    // res.send("Server okay");
    
    throw error;
  });
});

//Start the http server listening on port 3001
// app.listen(port);
// console.log(serverType + ' server is Listening on port ' + port);

//import Goosii Modules
var pushNotifyModule = require('./pushNotifyModule.js');
pushNotifyModule.pushNotifyModuleHandler(app, dbName, serverType);

var usersModule = require('./usersModule.js');
usersModule.usersModuleHandler(app, dbName, serverType);

var companiesModule = require('./companiesModule.js');
companiesModule.companiesModuleHandler(app, dbName, serverType);

var gameEngineModule = require('./gameEngineModule.js');
gameEngineModule.gameEngineModuleHandler(app, dbName, serverType);

var geoSpatialModule = require('./geoSpatialModule.js');
geoSpatialModule.geoSpatialModuleHandler(app, dbName, serverType);

var yourCompanyWebsiteModule = require('./yourCompanyWebsiteModule.js');
yourCompanyWebsiteModule.yourCompanyWebsiteModuleHandler(app, dbName, serverType);

app.listen(port);
console.log(serverType + ' server is Listening on port ' + port);
