var yourCompanyWebsiteModuleHandler = function(app, dbName) {
  console.log("including companiesModule");
    
  //Native mongodb objects
  var mongodb = require('mongodb');
  var ObjectID = require('mongodb').ObjectID;
  var server = new mongodb.Server('127.0.0.1', 27017, {auto_reconnect: true, safe:true});
  var db = new mongodb.Db(dbName, server);   
  var GridStore = require('mongodb').GridStore;
  var assert = require('assert');
  var Binary = require('mongodb').Binary;
  
  //Include asynblock
  var asyncblock = require('asyncblock');
  var exec = require('child_process').exec;
  
  //Import Utilities Module
  var utilitiesModule = require('./utilitiesModule.js');
  utilitiesModule.getCurrentUtcTimestamp();
  
  /**************************************** API METHODS */


  app.get('/couponValidation/:companyId', function(req, res) {
    
    //open database
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};
      
      var companies = new mongodb.Collection(client, 'companies');
      
      //Add or update coupon coupon by incrementing by one.
      companies.update({_id: ObjectID(req.params.companyId)}, { $inc : { "coupon.total": 1 } }, {safe:true}, function(err, object) {
        if(error) throw error;
        
        console.log("incrementing total coupon count by 1");

        //Capture this validated coupon.
        var validatedCouponsMongo = new mongodb.Collection(client, 'validatedCoupons');     

        //Build the first time checkin object.
        var validatedCouponsObject = {
                                      "companyId": req.params.companyId,
                                      "timestamp" : utilitiesModule.getCurrentUtcTimestamp()
                                     };

        //Insert employee object into 'validatedCoupons' collection.
        validatedCouponsMongo.insert(validatedCouponsObject, {safe:true}, function(error, object){
          if(error) throw error;

          res.jsonp("success");
          db.close();
        });
      });
    });
  });

};
exports.yourCompanyWebsiteModuleHandler = yourCompanyWebsiteModuleHandler;
  