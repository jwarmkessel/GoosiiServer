var companiesModuleHandler = function(app, dbName) {
  console.log("including companiesModule");
  var check = require('validator').check
    ,sanitize = require('validator').sanitize
    
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

  // asyncblock(function (flow) {
  //     setTimeout(flow.add(), 5000);
  //     flow.wait(); //Wait for the second setTimeout to finish
  //     exec('node -v', flow.add());
  //     result = flow.wait();
  //     console.log(result);    // There'll be trailing \n in the output
  // 
  //     // Some other jobs
  //     console.log('More results like if it were sync...');
  // });
  
  //Import Utilities Module
  var utilitiesModule = require('./utilitiesModule.js');
  utilitiesModule.getCurrentUtcTimestamp();
  
  app.get('/getComp/:companyId',function  (req,res,next) {
    res.type('application/json');
    console.log(req.params.companyId);
    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};

      var company = new mongodb.Collection(client, 'companies');

      company.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(err, object) {
        console.log("The object " + object);
        if (err) console.warn(err.message);
        if (err && err.message.indexOf('E11000 ') !== -1) {
          // this _id was already inserted in the database
        }
        res.jsonp(object);
        db.close();
      });
    });      
  });
  
  app.get('/testTime', function(req, res) {
    console.log(utilitiesModule.getCurrentUtcTimestamp());
    var atCommandDate = utilitiesModule.getAtCommandFormattedDate(utilitiesModule.getCurrentUtcTimestamp());
    console.log("test time returning " +atCommandDate);
    callback("hello world");
    
    res.send(atCommandDate);
  });
      
  app.get('/getCurrentTime', function(req, res) {
    console.log(utilitiesModule.getCurrentUtcTimestamp());
    res.send(utilitiesModule.getCurrentUtcTimestamp());
  });
  
  app.get('/createEndDate/:hour/:minute/:year/:month/:day', function(req, res) {
    
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
  
  /*
  getTimezone: [Function: getTimezone],
  getDate: [Function: getDate],
  getDay: [Function: getDay],
  getYear: [Function: getYear],
  getFullYear: [Function: getFullYear],
  getHours: [Function: getHours],
  getMinutes: [Function: getMinutes],
  getMonth: [Function: getMonth],
  getSeconds: [Function: getSeconds],
  getTimezoneOffset: [Function: getTimezoneOffset],
  getTimezoneAbbr: [Function: getTimezoneAbbr],
  setAllDateFields: [Function: setAllDateFields],
  setDate: [Function: setDate],
  setFullYear: [Function: setFullYear],
  setHours: [Function: setHours],
  setMilliseconds: [Function: setMilliseconds],
  setMinutes: [Function: setMinutes],
  setMonth: [Function: setMonth],
  setSeconds: [Function: setSeconds],
  setTime: [Function: setTime],
  setUTCDate: [Function: setUTCDate],
  setUTCFullYear: [Function: setUTCFullYear],
  setUTCHours: [Function: setUTCHours],
  setUTCMilliseconds: [Function: setUTCMillseconds],
  setUTCMinutes: [Function: setUTCMinutes],
  setUTCMonth: [Function: setUTCMonth],
  setUTCSeconds: [Function: setUTCSeconds],
  toDateString: [Function: toDateString],
  toTimeString: [Function: toTimeString],
  toString: [Function: toString],
  toLocaleDateString: [Function: toLocaleDateString],
  toLocaleTimeString: [Function: toLocaleTimeString],
  toLocaleString: [Function: toString]  
  */
    
  app.get('/createCompany/:companyInfo', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

     //Create the user document object to save to mongoDB 
    var companyObject =   {
                            "name" : "Goosii",
     	                      "address" : "767 Chopin Drive, Sunnyvale, CA 94087",
                          	"location" : {
                          		"type" : "Point",
                          		"coordinates" : [
                          			-121.89409,
                          			37.383613
                          		]
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
      if (error) {console.log("Db open failed"); throw error};
      var companies = new mongodb.Collection(client, 'companies');

      companies.insert(companyObject, {safe:true}, function(err, object) {
        console.log("The object " + object);
        if (err) console.warn(err.message);
        if (err && err.message.indexOf('E11000 ') !== -1) {
          // this _id was already inserted in the database
        }
        console.log("Sending id back " + object[0]._id);
        res.send(JSON.stringify(object[0]._id));
        db.close();
      });
    });
  });

  //Get a company object using the "_id".
  app.get('/getCompany/:companyId', function(req, res) {
    var utc_timestamp = getCurrentUtcTimestamp();

    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};

      var company = new mongodb.Collection(client, 'companies');

      company.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(err, object) {
        console.log("The object " + object);
        if (err) console.warn(err.message);
        if (err && err.message.indexOf('E11000 ') !== -1) {
          // this _id was already inserted in the database
        }
        res.send(object);
        db.close();
      });
    });
  });
};

exports.companiesModuleHandler = companiesModuleHandler;