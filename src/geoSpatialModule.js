var geoSpatialModuleHandler = function(app, dbName) {
	console.log("geoSpatialmodule loaded");
  var check = require('validator').check
    ,sanitize = require('validator').sanitize
    ,loggingSystem = require('./loggingSystem.js'); // 11/05/2013 by MC
    
  loggingSystem.addToLog('geoSpatialModule.js: loaded gSM.');
  //Native mongodb
  var mongodb = require('mongodb');
  var ObjectID = require('mongodb').ObjectID;
  var server = new mongodb.Server('127.0.0.1', 27017, {auto_reconnect: true, safe:true});
  var db = new mongodb.Db(dbName, server);   
  var GridStore = require('mongodb').GridStore;
  var assert = require('assert');
  var Binary = require('mongodb').Binary;
  
  var utilitiesModule = require('./utilitiesModule.js');
  utilitiesModule.getCurrentUtcTimestamp();
  
  var nearbyCompaniesRecursive = function(userId, companiesArray, count, res) {
    loggingSystem.addToLog('geoSpatialModule.js: nearbyCompaniesRecursive().');
    loggingSystem.addToLog('geoSpatialModule.js: db.open().');
    console.log("nearbyCompaniesRecursive()");

    console.log("db.open()");
    db.open(function (error, client) {
      var usersMongo = new mongodb.Collection(client, 'users');
      
      loggingSystem.addToLog('geoSpatialModule.js: query database.');
      console.log("query database");
      usersMongo.findOne({ _id : new ObjectID(userId)}, function(err, userObj) {
        if(!err) {
          loggingSystem.addToLog('geoSpatialModule.js: Create super company/user object.'); 
          loggingSystem.addToLog('geoSpatialModule.js: ' + companiesArray[count-1]);          
          console.log("Create super company/user object");
          console.log(companiesArray[count-1]);
          companiesArray[count-1].user = userObj
        }
        
        if(count == 1) {
          loggingSystem.addToLog('geoSpatialModule.js: Finish recursive method and respond.'); 
          console.log("Finish recursive method and respond");
          res.send(companiesArray);
          loggingSystem.addToLog('geoSpatialModule.js: close db.'); 
          console.log("close db");
          db.close();
          
          return;
        }
        loggingSystem.addToLog('geoSpatialModule.js: close db.'); 
        console.log("close db");
        db.close();
        nearbyCompaniesRecursive(userId, companiesArray, count-1, res);
        
      });
    });           
  };

  //This doesn't actually get the closest companies. It gets EVERY SINGLE company.
  //TODO setup geo-spatial queries
  app.get('/nearbyCompanies/:userId', function(req, res) {
    loggingSystem.addToLog('geoSpatialModule.js: nearbyCompanies request.'); 
    console.log("nearbyCompanies request");

    loggingSystem.addToLog('geoSpatialModule.js: open db.'); 
    console.log("open db");
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); loggingSystem.addToLog('geoSpatialModule.js: Db open failed.');throw error};
      var company = new mongodb.Collection(client, 'companies');
      loggingSystem.addToLog('geoSpatialModule.js: query db.'); 
      console.log("query db");
      company.find().toArray(function(err, results) {
        if(!err) {
          if(results.length == 0) {
           res.send(); 
          }
        }
        loggingSystem.addToLog('geoSpatialModule.js: close db.'); 
        console.log("close db");
        db.close();
        nearbyCompaniesRecursive(req.params.userId, results, results.length, res);
      });
    });
  });
  
  
  
};

exports.geoSpatialModuleHandler = geoSpatialModuleHandler;