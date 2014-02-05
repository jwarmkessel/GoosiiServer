var companiesModuleHandler = function(app, dbName) {
  console.log("including companiesModule");
  var check = require('validator').check
    ,sanitize = require('validator').sanitize
    ,loggingSystem = require('./loggingSystem.js'); // 11/05/2013 by MC
    
  //Native mongodb objects
  var mongodb = require('mongodb');
  var ObjectID = require('mongodb').ObjectID;
  var server = new mongodb.Server('127.0.0.1', 27017, {auto_reconnect: true, safe:true});
  var db = new mongodb.Db(dbName, server);   
  var GridStore = require('mongodb').GridStore;
  var assert = require('assert');
  var Binary = require('mongodb').Binary;
  
  //include node-time
  var time = require('time');
  
  //Include asynblock
  var asyncblock = require('asyncblock');
  var exec = require('child_process').exec;

  //Import Utilities Module
  var utilitiesModule = require('./utilitiesModule.js');
  utilitiesModule.getCurrentUtcTimestamp();
  
  app.get('/getComp/:companyId',function  (req,res,next) {
    loggingSystem.addToLog("GET /getComp/" + req.params.companyId);          
    res.type('application/json');

    loggingSystem.addToLog("/getComp/: Opening the DB");          
    //insert the user document object into the collection
    db.open(function (error, client) {
      if(error) throw error;

      var company = new mongodb.Collection(client, 'companies');
      loggingSystem.addToLog("/getComp/: Querying for the company object" + req.params.companyId);          
      company.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(error, object) {
        if(error) throw error;
        loggingSystem.addToLog("/getComp/: Responding with company object " + object);          
        res.jsonp(object);
        db.close();
      });
    });      
  });
  
  app.get('/testTime', function(req, res) {
    loggingSystem.addToLog("GET /testTime");            
    console.log(utilitiesModule.getCurrentUtcTimestamp());
    var atCommandDate = utilitiesModule.getAtCommandFormattedDate(utilitiesModule.getCurrentUtcTimestamp());
    loggingSystem.addToLog('companiesModule.js: test time returning ' + atCommandDate);
    console.log("test time returning " +atCommandDate);
    res.send(atCommandDate);
    
  });
      
  app.get('/getCurrentTime', function(req, res) {
    loggingSystem.addToLog("GET /getCurrentTime");    
    console.log(utilitiesModule.getCurrentUtcTimestamp());
    res.send(utilitiesModule.getCurrentUtcTimestamp());
  });
  
  app.get('/createEndDate/:hour/:minute/:year/:month/:day', function(req, res) {
    loggingSystem.addToLog("GET /createEndDate");        
    //set the date and time.
    timeinfo = {
        hour: req.params.hour,
        minute: req.params.minute,
        year: req.params.year,
        month: req.params.month,
        date: req.params.day
    };
    
    //Set the timezone.
    timezone = 'America/Los_Angeles';

    //Create the date & time object. Year, Month, Day, hour, Minute, Millisecond, Millisecond
    var d = new time.Date(timeinfo.year, timeinfo.month - 1, timeinfo.date, timeinfo.hour, timeinfo.minute, 1, 1);
    
    //Check the timezone.
    console.log(d.getTimezone());
    
    var timeOffset = new time.Date()
    var offSetHours = timeOffset.getHours()
    
    console.log("Default hours " + offSetHours);
    
    var timeInMilliseconds = d.getTime();    
    console.log("Original time " + timeInMilliseconds);
    var utcHour = d.getHours();
    console.log("Hours " + utcHour);

    timeOffset.setTimezone('US/Pacific');
    offSetHours = timeOffset.getHours();
    console.log("America/Los_Angeles Time zone " + offSetHours);
    
    var pacificTimeOffset = 7;
    console.log("The hour offset " + pacificTimeOffset);
    pacificTimeOffset = pacificTimeOffset * 3600000;
    console.log("offset in milliseconds " + pacificTimeOffset);
    timeInMilliseconds = timeInMilliseconds + pacificTimeOffset;
    console.log("Created object " + timeInMilliseconds);

    res.send(timeInMilliseconds.toString());
  });
      
  app.get('/createCompany/:companyInfo', function(req, res) {
    loggingSystem.addToLog("GET /createCompany/" + req.params.companyInfo);          
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

     //Create the user document object to save to mongoDB 
    var companyObject =   {
                            "name" : "Goosii",
     	                      "address" : "767 Chopin Drive, Sunnyvale, CA 94087",
                          	"location" : {
                                      		"type" : "Point",
                                      		"coordinates" : []
                          	              },
     	                      "telephone" : "4086054692",
     	                      "contest" : {
     		                                  "startDate" : "",
     		                                  "endDate" : "",
     		                                  "prize" : "",
     		                                  "prizeImg" : "",
     		                                  "post" : ""
     	                                  },
                            "participants" : []
                          }

    //insert the user document object into the collection
    db.open(function (error, client) {
      if(error) throw error;

      var companies = new mongodb.Collection(client, 'companies');
      companies.insert(companyObject, {safe:true}, function(error, object) {
        if(error) throw error;

        console.log("Sending id back " + object[0]._id);
        res.send(JSON.stringify(object[0]._id));
        db.close();
      });
    });
  });

  //Get a company object using the "_id".
  app.get('/getCompany/:companyId', function(req, res) {
    loggingSystem.addToLog("GET /createCompany/" + req.params.companyId);          
    //insert the user document object into the collection
    db.open(function (error, client) {
      if(error) throw error;

      var company = new mongodb.Collection(client, 'companies');
      company.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(error, object) {
        if(error) throw error;        
        
        res.send(object);
        db.close();
      });
    });
  });
  
  app.get('/getAllOfCompanyFirstTimeCheckins/:companyId', function(req, res) {
    loggingSystem.addToLog("GET /getAllOfCompanyFirstTimeCheckins/" + req.params.companyId);          
    //insert the user document object into the collection
    db.open(function (error, client) {
      if(error) throw error;

      var firstTimeCheckinsMongo = new mongodb.Collection(client, 'firstTimeCheckins');
      
      firstTimeCheckinsMongo.find({"companyId": req.params.companyId }).toArray(function(error, results) {
        if(error) throw error;
        
        console.log("THE LENGTH " + results.length);
        console.log("THE LENGTH " + results[0]);        
        
        res.jsonp(results);        
        db.close();

      });
    });
  });
  
  app.get('/analytics/getFirsttimeCheckIns/:companyId/:endDate', function(req, res){
    loggingSystem.addToLog("GET /analytics/getFirsttimeCheckIns/:companyId/:endDate" + req.params.companyId);          

    db.open(function (error, client) {
      if(error) throw error;
      
      var companies = new mongodb.Collection(client, 'companies');
      var firstTimeCheckinsMongo = new mongodb.Collection(client, 'firstTimeCheckins');      

      //find the current event according to the selected company
      companies.findOne({_id: new ObjectID(req.params.companyId)}, function(err, doc){
        if(error) throw error;       
        
       
        var startDate = doc.contest.startDate;
        var endDate = parseInt(req.params.endDate);
        
        //get all first time check-ins between the beginning of the company's start date and the current date.
        firstTimeCheckinsMongo.find({companyId: req.params.companyId, "timestamp" : {$gte: startDate, $lt: endDate}}).toArray(function(error, results) {
          if(error) throw error;

          res.jsonp(results);        
          db.close();
        });
      });
    });
  });
  
  app.get('/analytics/displayInRange/:companyId/:startDate/:endDate', function(req, res){
    loggingSystem.addToLog("GET /analytics/displayInRange/:companyId/:startDate/:endDate" + req.params.companyId);          
    db.open(function (error, client) {
      if(error) throw error;
      
      var firstTimeCheckinsMongo = new mongodb.Collection(client, 'firstTimeCheckins'); 
      
      console.log(req.params.companyId);
      console.log(req.params.startDate);
      console.log(req.params.endDate);
      //db.firstTimeCheckins.find({companyId: "52019889f868cadd76000002", "timestamp" : {$gte: 1384003077000, $lt: 1389168000000}});
      //get all first time check-ins between the beginning of the company's start date and the current date.
      firstTimeCheckinsMongo.find({companyId: req.params.companyId, "timestamp" : {$gte: parseInt(req.params.startDate), $lt: parseInt(req.params.endDate)}}).toArray(function(error, results) {
        if(error) throw error;

        res.jsonp(results);        
        db.close();
      });
    });
  });
  
  app.get('/analytics/getTotalParticipants/:companyId', function(req, res){
    loggingSystem.addToLog("GET /analytics/getTotalParticipants/:companyId" + req.params.companyId);          
    
    db.open(function (error, client) {
      if(error) throw error;
      
      var companiesMongo = new mongodb.Collection(client, 'companies');      

      //get all first time check-ins between the beginning of the company's start date and the current date.
      companiesMongo.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(error, companyObj) {
        if(error) throw error;        
        
        res.jsonp(companyObj.participants);
        db.close();
      });
    });
  });
  
  app.get('/analytics/getTotalValidatedCoupons/:companyId', function(req, res){
    loggingSystem.addToLog("GET /analytics/getTotalValidatedCoupons/:companyId" + req.params.companyId);          
    
    db.open(function (error, client) {
      if(error) throw error;
      
      var validatedCouponsMongo = new mongodb.Collection(client, 'validatedCoupons');      

      //get all first time check-ins between the beginning of the company's start date and the current date.
      validatedCouponsMongo.find({"companyId": req.params.companyId }).toArray(function(error, results) {
        if(error) throw error;

        res.jsonp(results);        
        db.close();

      });
    });
  });

  app.get('/analytics/getTotalFulfillmentPosts/:companyId', function(req, res){
    loggingSystem.addToLog("GET /analytics/getTotalFulfillmentPosts/:companyId" + req.params.companyId);          
    
    db.open(function (error, client) {
      if(error) throw error;
      
      var fulfillmentsMongo = new mongodb.Collection(client, 'fulfillments');      

      //get all first time check-ins between the beginning of the company's start date and the current date.
      fulfillmentsMongo.find({"companyId": req.params.companyId }).toArray(function(error, results) {
        if(error) throw error;

        res.jsonp(results);        
        db.close();

      });
    });
  });
  
  app.get('/analytics/geteventEndedPosts/:companyId', function(req, res){
    loggingSystem.addToLog("GET /analytics/geteventEndedPosts/:companyId" + req.params.companyId);          
    
    db.open(function (error, client) {
      if(error) throw error;
      
      var eventEndedPostsMongo = new mongodb.Collection(client, 'participations');      

      //get all first time check-ins between the beginning of the company's start date and the current date.
      eventEndedPostsMongo.find({"companyId": req.params.companyId }).toArray(function(error, results) {
        if(error) throw error;

        res.jsonp(results);        
        db.close();

      });
    });
  });
  
  app.get('/login/getCompanyObject/:login/:password', function(req, res){
    loggingSystem.addToLog("GET /login/getCompanyObject/" + req.params.login + "/" + req.params.password);          
    //insert the user document object into the collection
    db.open(function (error, client) {
      if(error) throw error;

      var companyMongo = new mongodb.Collection(client, 'companies');
      companyMongo.findOne({"email" : req.params.login, "loginPassword" : req.params.password}, {safe:false}, function(error, companyObj) {
        if(error) throw error;        
        
        console.log(companyObj.email);
        
        res.jsonp(companyObj);
        db.close();
      });
    });

  });
  
};

exports.companiesModuleHandler = companiesModuleHandler;