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

    //insert the user document object into the collection
    db.open(function (error, client) {
      if(error) throw error;

      var company = new mongodb.Collection(client, 'companies');

      company.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(error, object) {
        if(error) throw error;

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
      companies.find({_id: req.params.companyId}, function(err, doc){
        if(error) throw error;        
        var startDate = new Date(doc[0].contest.startDate);
        var endDate = new Date(req.params.endDate);
        
        //get all first time check-ins between the beginning of the company's start date and the current date.
        firstTimeCheckIns.find({companyId: req.params.companyId, "timestamp" : {$gte: startDate.valueOf(), $lt: endDate.valueOf()}}, function(err, doc){
          if(error) throw error;          
          var firstTimeCheckInCount = doc.length;  
          console.log('THE COUNT: ' + firstTimeCheckInCount);     

          res.jsonp(firstTimeCheckInCount);
          db.close();
        });
      });
    });
  });
  
  app.get('/analytics/displayInRange/:companyId/:startDate/:endDate', function(req, res){
    
    db.open(function (error, client) {
      if(error) throw error;
      
      var firstTimeCheckinsMongo = new mongodb.Collection(client, 'firstTimeCheckins');      

      //get all first time check-ins between the beginning of the company's start date and the current date.
      firstTimeCheckIns.find({companyId: req.params.companyId, "timestamp" : {$gte: req.params.startDate, $lt: req.params.endDate}}, function(err, doc){
        if(error) throw error;        
        
        res.jsonp(doc);
        db.close();
      });
    });
  });
  
};

exports.companiesModuleHandler = companiesModuleHandler;