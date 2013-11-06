
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
    // ,certPem = fs.readFileSync('GoosiiCert.pem', encoding='ascii')
    // ,keyPem = fs.readFileSync('GoosiiKey-noenc.pem', encoding='ascii')
    // ,caCert = fs.readFileSync('aps_development.cer', encoding='ascii')
    // ,options = { key: keyPem, cert: certPem, ca: [ caCert ] }
    ,http = require('http')
//     //,mongoose = require('mongoose') // 10/10/2013 by MC
//     ,nodemailer = require("nodemailer") // 10/10/2013 by MC
//     ,cluster = require('cluster'); // 10/10/2013 by MC
//    // ,spawn = require('child_process').spawn // 10/10/2013 by MC
// 
// var workers = process.env.WORKERS || require('os').cpus().length; // 10/10/2013 by MC
// var loggingSystem = require('./loggingSystem.js'); // 10/10/2013 by MC

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

app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    // app.use(express.static(__dirname + '/public'));
});

app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });

 app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   
   // Request headers you wish to allow
    res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
   // res.header("Access-Control-Allow-Headers", "X-Requested-With");
  
  
  
   // Request methods you wish to allow
   res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

   

   // Set to true if you need the website to include cookies in the requests sent
   // to the API (e.g. in case you use sessions)
   //res.setHeader('Access-Control-Allow-Credentials', true);
   
   next();
 });
 
app.get('/', function(req, res, next) {
  // Handle the get for this route
  res.send("Server okay");
});


app.post('/test', express.bodyParser(), function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  
  // Request headers you wish to allow
   res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  // res.header("Access-Control-Allow-Headers", "X-Requested-With");
 
 
 
  // Request methods you wish to allow
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  console.log("got post");
  console.log(req.body);
  console.log(req.files);
  
  fs.readFile(req.files.uploadingFile.path, function (err, data) {
    console.log("File Path: /root/justin/companyAssets/" + req.body.companyId + "/" +  req.body.imageIsFor);
    fs.writeFile("/root/justin/companyAssets/" + req.body.companyId + "/" +  req.body.imageIsFor, data, function (err) {
      //res.redirect("back");
      if(err) {
          console.log(err);
      } else {
          console.log("The file was saved!");
      }
      
    });
  });
  
  // var uploadedFile = req.files.uploadingFile;
  
  
  // var tmpPath = uploadedFile.path;
  // var targetPath = './uploads/' + uploadedFile.name;
  // req.files.uploadingFile.path = './uploads/' + uploadedFile.name;
  // 
  // fs.rename(tmpPath, targetPath, function(err) {
  //   //if (err) throw err;
  //   
  //   fs.unlink(tmpPath, function(err) {
  //       if (err) throw err;
  //         res.jsonp("cool");
  //           //res.jsonp('File Uploaded to ' + targetPath + ' - ' + uploadedFile.size + ' bytes');
  //       });
  // });
  
  //req.body is your array of objects now:
  // [{id:134123, url:'www.qwer.com'},{id:131211,url:'www.asdf.com'}]
});

// app.get('/test123', function(req, res){
//   throw 'test123'
// });

// loggingSystem.addToLog('Program Entered'); // 10/10/2013 by MC

// //import Goosii Modules
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

//Start the http server listening on port 3001
app.listen(port);
console.log(serverType + ' server is Listening on port ' + port);

// if (cluster.isMaster) {
// 
//   console.log('start cluster with %s workers', workers);
// 
// 
//   //import Goosii Modules
//   var pushNotifyModule = require('./pushNotifyModule.js');
//   pushNotifyModule.pushNotifyModuleHandler(app, dbName);
// 
//   var usersModule = require('./usersModule.js');
//   usersModule.usersModuleHandler(app, dbName);
// 
//   var companiesModule = require('./companiesModule.js');
//   companiesModule.companiesModuleHandler(app, dbName);
// 
//   var gameEngineModule = require('./gameEngineModule.js');
//   gameEngineModule.gameEngineModuleHandler(app, dbName);
// 
//   var geoSpatialModule = require('./geoSpatialModule.js');
//   geoSpatialModule.geoSpatialModuleHandler(app, dbName);
//   var spawn = require('child_process').spawn;
// 
// 
// 
//   setInterval(function() {
//     //console.log('Testing 123' + '\n');
//     var child = spawn('grep', ['-c', 'UncaughtException', 'SystemLog.txt'])
//     var smtpTransport = nodemailer.createTransport("SMTP", {
//       service: "Gmail",
//       auth: {
//         user: "mars.kwong.cheung@gmail.com",
//         pass: "MasagatsuAgatsu"
//       }
//     });
// 
// 
//     child.stdout.on('data', function (data) {
//        // console.log('stdout: ' + data);
// 
//         if(data == 4) {
// 
//         var mailOptions = {
//             from: "Mars Cheung <mars.kwong.cheung@gmail.com>", // sender address
//             to: "farsight@juno.com", // list of receivers
//             subject: "Too many uncaught exceptions", // Subject line
//             text: data + " uncaught exceptions detected.", // plaintext body
//             html: "<b>" + data + " uncaught exceptions detected</b>" // html body
//         }
//         smtpTransport.sendMail(mailOptions, function(error, response){
//             if(error){
//                 console.log(error);
//             }else{
//                 console.log("Message sent: " + response.message);
//             }
//         });
//         }
//     });
// 
//     // child.stderr.on('data', function (data) {
//     //   console.log('stderr: ' + data);
//     // });
// 
//     // child.on('close', function (code) {
//     //   console.log('child process exited with code ' + code);
//     // });
//   }, 10000);
// 
//   for (var i = 0; i < workers; ++i) {
//     var worker = cluster.fork().process;
//     console.log('worker %s started.', worker.pid);
//   }
// 
//   cluster.on('exit', function(worker) {
//     console.log('worker %s died. restart...', worker.process.pid);
//     cluster.fork();
//   });
// } else {
//     app.listen(port);
//     console.log(serverType + ' server is Listening on port ' + port);
// }
// 
// process.on('uncaughtException', function (err) {
//   loggingSystem.addToLog('UncaughtException: ' + err.message);
//   console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
//   console.error(err.stack);
//   process.exit(1);
// })
//TODO remove mongojs from node_modules as it doesn't give me the option to use the GridStore object