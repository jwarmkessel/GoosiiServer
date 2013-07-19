var usersModuleHandler = function(app) {
  console.log("including usersModule");
  
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
  
  app.get('/createUser/:userIdentifier/:pushIdentifier', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

     //Create the user document object to save to mongoDB 
    var newUserObject =  {
                           	"identifier" : req.params.userIdentifier,
                            "pushIdentifier" : req.params.pushIdentifier,
                         		"adIdentifier" : "",
                         		"created" : utc_timestamp,
                         		"lastlogin" : utc_timestamp,
                         		"firstName" : "",
                         		"lastName" : "",
                         		"email" : "",   
                         		"phoneNumber" : "",                         		                      		                         		
                         		"birthday" : "",
                         		"contests" : [],
                         		"posts" : []
                           };
                           

    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};
      var collection = new mongodb.Collection(client, 'users');
      collection.insert(newUserObject, {safe:true}, function(err, object) {
        if (err) console.warn(err.message);
        if (err && err.message.indexOf('E11000 ') !== -1) {
          // this _id was already inserted in the database
        }

        res.send(JSON.stringify(object[0]._id));
        db.close();
      });
    });
  });

  app.get('/loginUser/:userId/:pushIdentifier', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

    db.open(function (error, client) {
      if (error) throw error;    
      var collection = new mongodb.Collection(client, 'users');

      try {
        var checker = check(req.params.userId).len(24).isHexadecimal();   
        console.log("The checker : " + checker);
      }catch (e) {
        console.log(e.message); //Please enter a valid integer
        res.send("There was a problem with the userID");
        db.close();

        return;
      }

      collection.findOne({_id: new ObjectID(req.params.userId)}, function(error, object) {
        if(object) {
          //Example of multiple set updates: 
          /*
          collection.update({_id: ObjectID(req.params.userId)}, {$set: {'user.lastlogin':utc_timestamp, 'user.lastName':''}}, {safe:true}, function(err, result) {
          */        
          
          userObject = {"lastlogin" : utc_timestamp, "pushIdentifier" : req.params.pushIdentifier };

          console.log("The last time I logged in was " + utc_timestamp);
          collection.update({_id: ObjectID(req.params.userId)}, {$set: userObject}, {safe:true}, function(err, result) {

            if (err) console.warn(err.message);
            if (err && err.message.indexOf('E11000 ') !== -1) {
              // this _id was already inserted in the database
              console.log("E11000 error");
            }
          });
          res.send(object);
          db.close();                
        }
      });
    });
  });
  
  app.get('/addCheckin/:userId/:companyId', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

    //Open the database
    db.open(function (error, client) {
      if (error) throw error;

      var userCheckinObj = {
  		                  	"companyId" : req.params.companyId,
                    			"timestamp" : utc_timestamp
                    		}

      var users = new mongodb.Collection(client, 'users');
      users.update({_id: ObjectID(req.params.userId)}, {$push: { "user.checkins": userCheckinObj} }, {safe:true}, function(err, result) {
        if (err) console.warn(err.message);
        if (err && err.message.indexOf('E11000 ') !== -1) {
          // this _id was already inserted in the database
          console.log("E11000 error");
        }

        //send the response to the client
        res.send(objects);
        db.close()
      });    
    });
  });
  
};

exports.usersModuleHandler = usersModuleHandler;