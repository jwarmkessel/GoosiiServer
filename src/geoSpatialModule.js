var geoSpatialModuleHandler = function(app, dbName) {
	console.log("geoSpatialmodule loaded");
  var check = require('validator').check
    ,sanitize = require('validator').sanitize
    ,loggingSystem = require('./loggingSystem.js');  
    
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
    console.log("nearbyCompaniesRecursive()");

    console.log("db.open()");
    db.open(function (error, client) {
      var usersMongo = new mongodb.Collection(client, 'users');
      
      console.log("query database");
      usersMongo.findOne({ _id : new ObjectID(userId)}, function(err, userObj) {
        if(!err) {          
          console.log("Create super company/user object");
          console.log(companiesArray[count-1]);
          companiesArray[count-1].user = userObj
        }
        
        if(count == 1) {
          console.log("Finish recursive method and respond");
          res.send(companiesArray);
          console.log("close db");
          db.close();
          
          return;
        }
        console.log("close db");
        db.close();
        nearbyCompaniesRecursive(userId, companiesArray, count-1, res);
        
      });
    });           
  };

  //This doesn't actually get the closest companies. It gets EVERY SINGLE company.
  //TODO setup geo-spatial queries
  app.get('/nearbyCompanies/:userId', function(req, res) {
    loggingSystem.addToLog("GET /nearbyCompanies/" + req.params.userId);    
    console.log("nearbyCompanies request");

    console.log("open db");
    db.open(function (error, client) {
      if(error) throw error;      

      var company = new mongodb.Collection(client, 'companies');
      console.log("query db");
      company.find().toArray(function(error, results) {
        if(error) throw error;

        if(results.length == 0) {
         res.send(); 
        }
      
        console.log("close db");
        db.close();
        nearbyCompaniesRecursive(req.params.userId, results, results.length, res);
      });
    });
  });
  
  
  app.get('/geoSpatialQuery/:userId/:longitude/:latitude', function(req, res) {
    loggingSystem.addToLog("GET /geoSpatialQuery/" + req.params.userId + "/" + req.params.longitude + "/" + req.params.latitude);    
    console.log("nearbyCompanies request");
    console.log("Long: "+ req.params.longitude + " Lat: "+ req.params.latitude);

    loggingSystem.addToLog("/geoSpatialQuery: Opening database");      
    db.open(function (error, client) {
      if(error) throw error;
    
      //db.runCommand( { geoNear : "companies" , near : [-122.015041, 37.324044], num : 10, spherical: true });
      loggingSystem.addToLog("/geoSpatialQuery: Starting geoQuery using db.comamnd()");    
      db.command( { geoNear : "companies" , near : [parseFloat(req.params.longitude), parseFloat(req.params.latitude)], num : 10, spherical: true }, function(error, results){
        if(error) throw error;
      
        var usersMongo = new mongodb.Collection(client, 'users');
        
        loggingSystem.addToLog("/geoSpatialQuery: Querying users collection for user document");      
        usersMongo.findOne({ _id : new ObjectID(req.params.userId)}, function(error, userObj) {
          if(error) throw error;

          results.userObject = userObj;
          results.distanceConfiguration = {"distance" : 30};
          
          loggingSystem.addToLog("/geoSpatialQuery: Closing DB");      
          db.close();
          res.send(results);  
        });
      });  
    });
  });

  
};

exports.geoSpatialModuleHandler = geoSpatialModuleHandler;