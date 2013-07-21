var companiesModuleHandler = function(app) {
  console.log("including companiesModule");
  var check = require('validator').check
    ,sanitize = require('validator').sanitize
    
  //Native mongodb objects
  var mongodb = require('mongodb');
  var ObjectID = require('mongodb').ObjectID;
  var server = new mongodb.Server('127.0.0.1', 27017, {auto_reconnect: true, safe:true});
  var db = new mongodb.Db('GlobalGoosiiMetricsDB', server);   
  var GridStore = require('mongodb').GridStore;
  var assert = require('assert');
  var Binary = require('mongodb').Binary;
  
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
  
  app.get('/createCompany/:companyInfo', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

     //Create the user document object to save to mongoDB 
    var companyObject =   {
                            "name" : "",
     	                      "address" : "",
     	                      "longitude" : "",
     	                      "latitude" : "",
     	                      "telephone" : "",
     	                      "contest" : {
     		                                  "startDate" : "",
     		                                  "endDate" : "",
     		                                  "prize" : "",
     		                                  "prizeImg" : ""
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