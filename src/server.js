require('newrelic');

//Swith out these strings to run either production, sandbox, or demo.
var environment = "production";
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
    ,loggingSystem = require('./loggingSystem.js') // 10/10/2013 by MC
    ,utilitiesModule = require('./utilitiesModule.js');

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

var uncaughtExceptionCounter = 0;
var uncaughtExceptionStartTime = utilitiesModule.getCurrentUtcTimestamp();

app.use(function errorHandler(err, req, res, next) {
  
  //Count the number of times an uncaught exception occurs and check the starting timestamp. 
  //If the starting timestamp is less than 24 hours and the number of uncaught exceptions is greater than 100 then email notify me. 
  uncaughtExceptionCounter++;
  
  if(uncaughtExceptionCounter == 1) {
   //Set the starting time
   uncaughtExceptionStartTime = utilitiesModule.getCurrentUtcTimestamp();
   
  } else if( uncaughtExceptionCounter > 99 && (utilitiesModule.getCurrentUtcTimestamp() - uncaughtExceptionStartTime) < 86400000) {
    
    var smtpTransport = nodemailer.createTransport("SMTP", {
      service: "Gmail",
      auth: {
              user: "support@goosii.com",
              pass: "goosiI52"
            }
    });

    console.log('Warning email firing.');
    
    var mailOptions = {
                        from: "support@goosii.com", // sender address
                        to: "support@goosii.com", // list of receivers
                        subject: "Too many uncaught exceptions", // Subject line
                        text: uncaughtExceptionCounter + " uncaught exceptions detected.", // plaintext body
                        html: "<b>" + uncaughtExceptionCounter + " uncaught exceptions detected</b>" // html body
                      }
    
    smtpTransport.sendMail(mailOptions, function(error, response){
      if(error){
        console.log('error detected');
      }else{
        console.log("Message sent: " + response.message);
        //Reset the uncaughtExceptionCounter to 0 and set the new uncaughtExceptionStartTime
        uncaughtExceptionCounter = 0;
        uncaughtExceptionStartTime = utilitiesModule.getCurrentUtcTimestamp();
      }
      smtpTransport.close(); // shut down the connection pool, no more messages
    
    });  
  }
  
  //Output error and log to SystemLog.txt
  console.log('error on request ' + process.domain.id + ' ' + req.method + ' ' + req.url + ' ' + err.message + ' ' + err.domain + ' ' + err.domainThrown);

  //Domain object can be dissected.
  // console.log('Domain object ' + err.domain.domain + ' : ' + err.domain._events + ' : ' +err.domain._maxListeners + ' : ' + err.domain.members + ' : ' + err.domain.id);
  
  //Log error to systemLog.txt
  loggingSystem.addToLog('UncaughtException. Error on Process: ' + process.domain.id + ' Request Type: ' + req.method + ' URL:' + req.url + ' Message:' + err.message + ' ' + Object.keys(err.domain) + ' ' + err.domainThrown);
  
  //Let the client know something bad happened.
  res.send(500, "Something bad happened.");
});

//import Goosii Modules
var pushNotifyModule = require('./pushNotifyModule.js');
pushNotifyModule.pushNotifyModuleHandler(app, dbName, serverType);

var usersModule = require('./usersModule.js');
usersModule.usersModuleHandler(app, dbName, serverType);

var companiesModule = require('./companiesModule.js');
companiesModule.companiesModuleHandler(app, dbName, serverType);

var gameEngineModule = require('./gameEngineModule.js');
gameEngineModule.gameEngineModuleHandler(app, dbName, serverType, port);

var geoSpatialModule = require('./geoSpatialModule.js');
geoSpatialModule.geoSpatialModuleHandler(app, dbName, serverType);

var yourCompanyWebsiteModule = require('./yourCompanyWebsiteModule.js');
yourCompanyWebsiteModule.yourCompanyWebsiteModuleHandler(app, dbName, serverType);

app.listen(port);
console.log(serverType + ' server is Listening on port ' + port);
