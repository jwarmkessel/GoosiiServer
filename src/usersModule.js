var usersModuleHandler = function(app, dbName) {
  console.log("including usersModule");
  
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
  
  app.get('/hi', function(req, res, next) {
    console.log("testing hi");
    // Handle the get for this route
    db.open(function (error, client) {
      if(error) throw error;

      res.send("hi");
    });
  });
  
  
  app.get('/createUser/:userIdentifier/:pushIdentifier', function(req, res) {
    
    console.log("starting createUser with userIdentifier " + req.params.userIdentifier);
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
                         		"posts" : [],
                         		"rewards" : [],
                         		"fulfillments" : []
                           };
                           

    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) throw error;
      var collection = new mongodb.Collection(client, 'users');
      collection.insert(newUserObject, {safe:true}, function(err, object) {
        if (err) throw error;
        if (err && err.message.indexOf('E11000 ') !== -1) {
          // this _id was already inserted in the database
        }

        db.close();
        res.send(JSON.stringify(object[0]._id));
      });
    });
  });

  //loginUser requires the additional pushIdentifier because these tokens may change.
  //Also updates the lastlogin.
  app.get('/loginUser/:userId/:pushIdentifier', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();
    console.log("Logging in: " + req.params.userId + " with pushIdentifier " + req.params.pushIdentifier);
    db.open(function (error, client) {
      if (error) throw error;    
      //validate the id string.
      try {
        var checker = check(req.params.userId).len(24).isHexadecimal();   
      }catch (e) {
        db.close();
        res.send("There was a problem with the userID");        
        console.log(e.message);
        
        return;
      }
      
      //Retrieve the users collection.
      var usersMongo = new mongodb.Collection(client, 'users');
      
      //Create the JSON object filled with elements to update.
      userObject = {"lastlogin" : utc_timestamp, "pushIdentifier" : req.params.pushIdentifier };      
      
      //Query and update the parameters for this userId.
      usersMongo.update({_id: new ObjectID(req.params.userId)}, {$set: userObject}, function(error, object) {
        if(error) throw error;
        
        console.log(JSON.stringify(object));
        
        db.close();
        res.send("login successful");        
      });
    });
  });
  
  app.get('/getUserFulfillments/:userId/:companyId', function(req, res) {
    console.log("getUser() for: http://www.goosii.com:3001/getUserFulfillments/" + req.params.userId + "/" + req.params.companyId);
    db.open(function (error, client) {
      if (error) throw error;    
      //validate the id string.
      try {
        var checker = check(req.params.userId).len(24).isHexadecimal();   
      }catch (e) {
        db.close();
        res.send("There was a problem with the userID");        
        console.log(e.message);
        
        return;
      }
      
      //Retrieve the users collection.
      var usersMongo = new mongodb.Collection(client, 'users');
        
      //Query and update the parameters for this userId.
      usersMongo.findOne({ "fulfillments.companyId": { $in : [req.params.companyId]}, _id: new ObjectID(req.params.userId)}, function(error, object) {
        if(error) throw error;

        if(object) {
          console.log("Object is not null");            
          console.log(JSON.stringify(object));
          res.send(object.fulfillments[0]);
        } else if(object == null) {
          console.log("Object is null");
          res.send(null);
        }
      
        db.close();
      });
    });
  });

  //Query and return the company objects for all the events the user is participating in. 
  app.get('/getUserContests/:userId', function(req, res) {
    console.log("getUserContests called by user " + req.params.userId);
    //The array of company id's to query in companies.
    var companyObjArray = new Array();
    
    var numOfEvents = 0;
    db.open(function (error, client) {  
      if (error) throw error;   

      var usersMongo = new mongodb.Collection(client, 'users');
      var companiesMongo = new mongodb.Collection(client, 'companies');      
      
      usersMongo.findOne({_id: new ObjectID(req.params.userId)}, function(error, userObj) {
        if (error) throw error; 
                  
        //Get the array of companyId's and build the list of company objects to query for.
        for(var key in userObj.contests) { 
          console.log("companyId being added to query " + userObj.contests[key].companyId);           
          var companyObjectId = new ObjectID(userObj.contests[key].companyId);
          companyObjArray.push(companyObjectId);
          console.log(JSON.stringify(companyObjArray));
          numOfEvents++;
        }
        
        //Query the companies collection and return the list of company objects.
        companiesMongo.find({"_id": {$in : companyObjArray }}).toArray(function(error, companyObj) {
          if (error) throw error; 

          //Now that I have the list of company objects I can pass it back and modify the order here 
          console.log("Sending client these company objects " + JSON.stringify(companyObj));
          userContestObj = {};
          userContestObj.contests = companyObj;
          userContestObj.userObject = userObj;
          res.send(userContestObj);
          db.close();              
        });
      });
    });
  });
  
  app.get('/addUserParticipation/:userId/:companyId', function(req, res) {
    console.log("Add user participation");
    
    db.open(function (error, client) {  
      if(error) throw error;
        
      var usersMongo = new mongodb.Collection(client, 'users');
      var companiesMongo = new mongodb.Collection(client, 'companies');
      
      //Push a contest object to the user object.
      usersMongo.update({"contests.companyId": { $in : [req.params.companyId]}, _id: new ObjectID(req.params.userId)}, {$inc: {"contests.$.participationCount": 1}},function(error, userObj) {
        if(error) throw error;

        //Push an entry onto the company object.
        companiesMongo.update({_id: new ObjectID(req.params.companyId)}, {$push : {"entryList" : req.params.userId }}, function(error, companyObj) {
          if(error) throw error;
          
          res.send("Participation complete");
          db.close();
        });
      });
    });
  });

};

exports.usersModuleHandler = usersModuleHandler;