var geoSpatialModuleHandler = function(app) {
	console.log("geoSpatialmodule loaded");
  var check = require('validator').check
    ,sanitize = require('validator').sanitize
    
  //Native mongodb
  var mongodb = require('mongodb');
  var ObjectID = require('mongodb').ObjectID;
  var server = new mongodb.Server('127.0.0.1', 27017, {auto_reconnect: true, safe:true});
  var db = new mongodb.Db('GlobalGoosiiMetricsDB', server);   
  var GridStore = require('mongodb').GridStore;
  var assert = require('assert');
  var Binary = require('mongodb').Binary;
  
  var utilitiesModule = require('./utilitiesModule.js');
  utilitiesModule.getCurrentUtcTimestamp();
  
  app.get('/nearbyCompanies', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};
      var company = new mongodb.Collection(client, 'companies');
      company.find().toArray(function(err, results) {
        console.log(JSON.stringify(results));
        res.send(results);        
        db.close();
      });
    });
  });
};

exports.geoSpatialModuleHandler = geoSpatialModuleHandler;