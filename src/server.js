
//Swith out these strings to run either production, sandbox, or demo.
var environment = "demo";
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
    // ,certPem = fs.readFileSync('GoosiiCert.pem', encoding='ascii')
    // ,keyPem = fs.readFileSync('GoosiiKey-noenc.pem', encoding='ascii')
    // ,caCert = fs.readFileSync('aps_development.cer', encoding='ascii')
    // ,options = { key: keyPem, cert: certPem, ca: [ caCert ] }
    ,http = require('http')
    //,mongoose = require('mongoose') // 10/10/2013 by MC
    ,nodemailer = require("nodemailer") // 10/10/2013 by MC
    ,cluster = require('cluster'); // 10/10/2013 by MC
   // ,spawn = require('child_process').spawn // 10/10/2013 by MC

var workers = process.env.WORKERS || require('os').cpus().length; // 10/10/2013 by MC
var loggingSystem = require('./loggingSystem.js'); // 10/10/2013 by MC

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

app.get('/test123', function(req, res){
  throw 'test123'
});

loggingSystem.addToLog('Program Entered'); // 10/10/2013 by MC

// //import Goosii Modules
// var pushNotifyModule = require('./pushNotifyModule.js');
// pushNotifyModule.pushNotifyModuleHandler(app, dbName);

// var usersModule = require('./usersModule.js');
// usersModule.usersModuleHandler(app, dbName);

// var companiesModule = require('./companiesModule.js');
// companiesModule.companiesModuleHandler(app, dbName);

// var gameEngineModule = require('./gameEngineModule.js');
// gameEngineModule.gameEngineModuleHandler(app, dbName);

// var geoSpatialModule = require('./geoSpatialModule.js');
// geoSpatialModule.geoSpatialModuleHandler(app, dbName);

//Start the http server listening on port 3000
// app.listen(port);
// console.log(serverType + ' server is Listening on port ' + port);

if (cluster.isMaster) {

  console.log('start cluster with %s workers', workers);


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
  var spawn = require('child_process').spawn;



  setInterval(function() {
    //console.log('Testing 123' + '\n');
    var child = spawn('grep', ['-c', 'UncaughtException', 'SystemLog.txt'])
    var smtpTransport = nodemailer.createTransport("SMTP", {
      service: "Gmail",
      auth: {
        user: "support@goosii.com",
        pass: "goosiI52"
      }
    });


    child.stdout.on('data', function (data) {

       console.log('This should repeat every 10 secs ');
       console.log('stdout: ' + data);
       
        if(data >= 4) {

          console.log('Warning email firing.');
          var mailOptions = {
              from: "support@goosii.com", // sender address
              to: "mars.kwong.cheung@gmail.com", // list of receivers
              subject: "Too many uncaught exceptions", // Subject line
              text: data + " uncaught exceptions detected.", // plaintext body
              html: "<b>" + data + " uncaught exceptions detected</b>" // html body
          }
          smtpTransport.sendMail(mailOptions, function(error, response){
              if(error){
                  console.log('error detected');
              }else{
                  console.log("Message sent: " + response.message);
              }
    smtpTransport.close(); // shut down the connection pool, no more messages
          });
        }
    });



    // child.stderr.on('data', function (data) {
    //   console.log('stderr: ' + data);
    // });

    // child.on('close', function (code) {
    //   console.log('child process exited with code ' + code);
    // });
  }, 10000);

  for (var i = 0; i < workers; ++i) {
    var worker = cluster.fork().process;
    console.log('worker %s started.', worker.pid);
  }

  cluster.on('exit', function(worker) {
    console.log('worker %s died. restart...', worker.process.pid);
    cluster.fork();
  });
} else {
    app.listen(port);
    console.log(serverType + ' server is Listening on port ' + port);
}

process.on('uncaughtException', function (err) {
  loggingSystem.addToLog('UncaughtException: ' + err.message);
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
})
//TODO remove mongojs from node_modules as it doesn't give me the option to use the GridStore object