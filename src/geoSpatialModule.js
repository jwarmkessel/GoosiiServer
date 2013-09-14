var geoSpatialModuleHandler = function(app, dbName) {
	console.log("geoSpatialmodule loaded");
  var check = require('validator').check
    ,sanitize = require('validator').sanitize
    
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
    console.log("nearbyCompanies request");

    console.log("open db");
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};
      var company = new mongodb.Collection(client, 'companies');
      console.log("query db");
      company.find().toArray(function(err, results) {
        if(!err) {
          if(results.length == 0) {
           res.send(); 
          }
        }
        console.log("close db");
        db.close();
        nearbyCompaniesRecursive(req.params.userId, results, results.length, res);
      });
    });
  });
  
  
  
};

exports.geoSpatialModuleHandler = geoSpatialModuleHandler;