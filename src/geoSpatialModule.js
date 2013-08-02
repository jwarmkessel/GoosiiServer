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
  
  // app.get('/nearbyCompanies', function(req, res) {
  //   var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();
  // 
  //   //insert the user document object into the collection
  //   db.open(function (error, client) {
  //     if (error) {console.log("Db open failed"); throw error};
  //     var company = new mongodb.Collection(client, 'companies');
  //     company.find().toArray(function(err, results) {
  //       console.log(JSON.stringify(results));
  //       res.send(results);        
  //       db.close();
  //     });
  //   });
  // });
  var nearbyCompaniesRecursive = function(userId, companiesArray, count, res) {
    console.log("nearbyCompaniesRecursive()");
    console.log("userid " + userId);
    console.log("companiesArray " + JSON.stringify(companiesArray[count-1]));    
    console.log("count " + count);    
    db.open(function (error, client) {
      var usersMongo = new mongodb.Collection(client, 'users');
      
      usersMongo.findOne({ _id : new ObjectID(userId)}, function(err, userObj) {
        if(!err) {          
          console.log(companiesArray[count-1]);
          companiesArray[count-1].user = userObj
        }
        
        if(count == 1) {
          res.send(companiesArray);
          db.close();
          
          return;
        }
        db.close();
        nearbyCompaniesRecursive(userId, companiesArray, count-1, res);
        
      });
    });           
  };

  app.get('/nearbyCompanies/:userId', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};
      var company = new mongodb.Collection(client, 'companies');
      company.find().toArray(function(err, results) {
        console.log(JSON.stringify(results.length));
        if(results.length == 0) {
         res.send(); 
        }
        db.close();
        nearbyCompaniesRecursive(req.params.userId, results, results.length, res);
      });
    });
  });


  app.get('/getCompanyAndUser/:companyId/:userId', function(req, res) {  
    console.log("Get sweepstake");
    console.log("The company id " + req.params.companyId);
    try {
      var checker = check(req.params.companyId).len(24).isHexadecimal();   
      console.log("The checker : " + checker);
    }catch (e) {
      console.log(e.message); //Please enter a valid integer
      res.send("There was a problem with the userID");
      db.close();

      return;
    }

    db.open(function (error, client) {
      if (error) throw error;
      var companiesMongo = new mongodb.Collection(client, 'companies');  
      var usersMongo = new mongodb.Collection(client, 'users');      
      console.log("So far so good");    
      companiesMongo.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(err, companyObj) {
        if (err) console.warn(err.message);      
        if(!err) {
          if (companyObj) {
            usersMongo.findOne({_id: new ObjectID(req.params.userId)}, {safe:false}, function(err, userObj) {
              if(!err) {
                if(userObj) {
                  companyObj.user = userObj;    
                  console.log(companyObj);            
                }
              }

              //send the response to the client
              res.send(companyObj);
              db.close()
            });
          }
        }
      });
    });
  });  
};

exports.geoSpatialModuleHandler = geoSpatialModuleHandler;