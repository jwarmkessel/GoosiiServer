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

  //loginUser requires the additional pushIdentifier because these tokens may change. 
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

  app.get('/getUserContests/:userId', function(req, res) {

    //The array of company id's to query in companies.
    companyObjArray = new Array();
    db.open(function (error, client) {    
      var usersMongo = new mongodb.Collection(client, 'users');
      var companiesMongo = new mongodb.Collection(client, 'companies');      
      usersMongo.findOne({_id: new ObjectID(req.params.userId)}, function(err, userObj) {
        if(!err && userObj) {
          
          //Get the array of companyId's and build the list of company objects to query for.
          for(var key in userObj.contests) {            
            var companyObjectId = new ObjectID(userObj.contests[key]);
            companyObjArray.push(companyObjectId);
          }
          
          companiesMongo.findOne({"_id": {$in : companyObjArray }}, function(err, companyObj) {
            if(!err) {
              //Now that I have the list of company objects I can pass it back and modify the order here 
              db.close();              
              res.send(JSON.stringify(companyObj)); 
            }
          });
        }
      });
    });
  });
//This addCheckin is no longer necessary.  
  // app.get('/addCheckin/:userId/:companyId', function(req, res) {
  //   var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();
  // 
  //   //Open the database
  //   db.open(function (error, client) {
  //     if (error) throw error;
  // 
  //     var userCheckinObj = {
  //                        "companyId" : req.params.companyId,
  //                        "timestamp" : utc_timestamp
  //                      }
  // 
  //     var users = new mongodb.Collection(client, 'users');
  //     users.update({_id: ObjectID(req.params.userId)}, {$push: { "user.checkins": userCheckinObj} }, {safe:true}, function(err, result) {
  //       if (err) console.warn(err.message);
  //       if (err && err.message.indexOf('E11000 ') !== -1) {
  //         // this _id was already inserted in the database
  //         console.log("E11000 error");
  //       }
  // 
  //       //send the response to the client
  //       res.send(objects);
  //       db.close()
  //     });    
  //   });
  // });
  
};

exports.usersModuleHandler = usersModuleHandler;