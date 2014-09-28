//Swith out these strings to run either production, sandbox, or demo.
var environment = "sandbox";
var port;
var serverType;
var dbName;

if(environment == "sandbox") {
  port = 3010;
  serverType = "sandbox";
  dbName = "RightOn_sandbox";
} else if( environment == "production") {
  port = 3011; 
  serverType = "production";  
  dbName = "RightOn_sandbox";
} else if( environment == "demo") {
  port = 3012; 
  serverType = "demo";
  dbName = "RightOn_sandbox";
}

var express = require('express')
    ,fs = require('fs')
    ,crypto = require('crypto')
    ,tls = require('tls')
    ,http = require('http')
    ,utilitiesModule = require('./utilitiesModule.js');
    
//Native mongodb
var mongodb = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
var server = new mongodb.Server('127.0.0.1', 27017, {safe:true});
//var server = new mongodb.Server('127.0.0.1', 27017, {auto_reconnect: true, safe:true});
var db = new mongodb.Db('RightOn_sandbox', server);   
var GridStore = require('mongodb').GridStore;
var assert = require('assert');
var Binary = require('mongodb').Binary;


//Easily create an http server using express
var app = express();

var twilioClient = require('twilio')('AC4e35ac9235a71e90e07776a189bae646', 'ff3702f3ddab31e3a6a68fca1a0c838a');
var bodyParser = require('body-parser')

/* https://www.npmjs.org/package/validator */
var validator = require('validator');

/* https://github.com/AfterShip/node-phone */
var phone = require('phone');

//curl -H "Content-Type: application/json" -d '{"color":"red"://localhost:3010/test-page
//curl -H "Content-Type: application/json" -d '{"name":"1111111111", "password" : "12345"}' http://localhost:3010/createOrganization

//curl -H "Content-Type: application/json" -d '{ "name" : "Médecins Sans Frontières United States", "password" : "12345", "website" : "http://www.doctorswithoutborders.org/"}' http://localhost:3010/createOrganization

app.use(bodyParser.urlencoded({ extended: false })); 
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
	
app.get('/sendTwilioMessage/:countryCodeAndPhoneNumber', function(req, res) {
	//Send an SMS text message
	twilioClient.sendMessage({
	    to:req.params.countryCodeAndPhoneNumber, // Any number Twilio can deliver to
	    from: '+14084127038', // A number you bought from Twilio and can use for outbound communication
	    body: 'word to your mother.' // body of the SMS message

	}, function(err, responseData) { //this function is executed when a response is received from Twilio

	    if (!err) { // "err" is an error received during the request, if any

	        // "responseData" is a JavaScript object containing data received from Twilio.
	        // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
	        // http://www.twilio.com/docs/api/rest/sending-sms#example-1

	        console.log(responseData.from); // outputs "+14506667788"
	        console.log(responseData.body); // outputs "word to your mother."
			res.send('success');

	    } else {
			console.log(JSON.stringify(err));
			res.send('error' + err);
		}
	});	
});

app.get('/', function(req, res) {
	var date = new Date().toISOString().
				replace(/T/, ' ').      // replace T with a space
				replace(/\..+/, '');	// delete the dot and everything after
	
    res.send('Server Okay: ' + date);
});

app.post('/createOrganization', function(req, res) {
	
	/*
	{
	  "name" : "Médecins Sans Frontières",
	  "password" : "12345",
	  "website" : "blah.com"
	}
	*/
	console.log('createOrganization');
	var organizationObject = {"name" : req.body.name, "password" : req.body.password, "website" : req.body.website};
	
	//insert the user document object into the collection
    db.open(function (error, client) {
		if (error) throw error;
		var collection = new mongodb.Collection(client, 'Organizations');
		
		collection.insert(organizationObject, {safe:true}, function(err, object) {
			if (err) throw error;
        	db.close();
        	res.send(JSON.stringify(object[0]._id));
		});
	});
});

app.post('/createUser', function(req, res) {
	console.log('createUser \n request.body: ' + JSON.stringify(req.body));
	
	db.open(function (error, client) {
		var usersCollection = new mongodb.Collection(client, 'Users');
		usersCollection.findOne({ phoneNumber: req.body.phoneNumber}, function(error, result) { 
			if (error) throw error;	

			if (result) {
				console.log('User exists');
				db.close();
				res.send('User exists');
				return false;
			}
			
			if (!result) {
				if (typeof req.body.phoneNumber != 'undefined') {
					var phoneNumber = phone(req.body.phoneNumber);

					console.log(phoneNumber);

					if (phoneNumber[0] == null) {
						console.log('phoneNumber failed');
						db.close();
						res.send('phone number failed');
						return false;

					} else {

						var organizationsCollection = new mongodb.Collection(client, 'Organizations');			

						organizationsCollection.findOne({name: req.body.organizationName, password: req.body.password}, function(error, result) { 
							if (error) throw error;
							console.log(result);
							//If we have a result where the organization and password is found
							if (result) {
								var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

								     //Create the user document object to save to mongoDB 
								    var newUserObject =  {
															"created" : utc_timestamp,
								                      		"phoneNumber" : phoneNumber[0],  
								                       		"organizationId" : result._id, 
															"loc" : [],
															"locationAccuracy" : ''
								                          };

								var usersCollection = new mongodb.Collection(client, 'Users');

								//Insert the new user.
								usersCollection.insert(newUserObject, {safe:true}, function(err, object) {
									if (err) throw error;
							        	db.close();
							        	res.send(JSON.stringify(object[0]._id));
								});

							} else {
								db.close();
								res.send("no result")	
							}
						});
					}	
				}	
			}
		});	
	});
});

app.post('/setStatus', function(req, res) {
	var status = req.body.status;
	var phoneNumber = req.body.phoneNumber;
	var objectId = req.body.objectId;
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();
                           
    db.open(function (error, client) {
		var usersCollection = new mongodb.Collection(client, 'Users');
		usersCollection.insert({ phoneNumber: req.body.phoneNumber}, {$set: {status : req.body.status}}, function(error, result) { 
			if (error) throw error;	
			db.close();
			
			if (result) {
				console.log('User exists');
				
				res.send('success');
			} else {
				res.send('failure');
			}
		});
	});
});

app.post('/setMessage', function(req, res) {
	var status = req.body.message;
	var phoneNumber = req.body.phoneNumber;
	var objectId = req.body.objectId;
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();
                           
    db.open(function (error, client) {
		var usersCollection = new mongodb.Collection(client, 'Users');
		usersCollection.insert({ phoneNumber: req.body.phoneNumber}, {$set: {message : req.body.message}}, function(error, result) { 
			if (error) throw error;	
			db.close();
			
			if (result) {
				console.log('User exists');
				
				res.send('success');
			} else {
				res.send('failure');
			}
		});
	});
});

app.post('/reregister', function(req, res) {
	console.log('createUser \n request.body: ' + JSON.stringify(req.body));
	
	db.open(function (error, client) {
		var usersCollection = new mongodb.Collection(client, 'Users');
		usersCollection.findOne({ appId: req.body.applicationVendorId}, function(error, result) { 
			if (error) throw error;	

			if (result) {
				console.log('User exists');
				db.close();
				res.send('User exists');
				return false;
			}
			
			if (!result) {
				if (typeof req.body.applicationVendorId != 'undefined') {

					var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

					    //Create the user document object to save to mongoDB 
					    var newUserObject =  {
												"created" : utc_timestamp,
					                      		"phoneNumber" : req.body.device_phone_number,
												"appId" : req.body.applicationVendorId,
					                       		"organizationId" : 2, 
												"loc" : [],
												"locationAccuracy" : ''
					                          };

					var usersCollection = new mongodb.Collection(client, 'Users');

					//Insert the new user.
					usersCollection.insert(newUserObject, {safe:true}, function(err, object) {
						if (err) throw error;
				        	db.close();
				        	res.send(JSON.stringify(object[0]._id));
					});
				}	
			}
		});	
	});
});


app.get('/setUserLocation', function(req, res) {
	var longitude = req.body.longitude;
	var latitude = req.body.latitude;	
	var objectId = req.body.objectId;
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();
                           
    //insert the user document object into the collection
    db.open(function (error, client) {
		if (error) throw error;
		var collection = new mongodb.Collection(client, 'users');
		
		var message = {"message" : status, "updateTime" : utc_timestamp};
		
		// collection.update({_id: ObjectID(userIdentifier)}, {$set : {"status" : message}}, {safe:true}, function(error, result) { 
		// 			if (err) throw error;
		//         	db.close();
		// 			
		// 			if (result) {
		// 				res.send("success");
		// 			} else {
		// 				res.send("failure")	;	
		// 			}
		// 		});
	});
});


//import Goosii Modules
// var pushNotifyModule = require('./pushNotifyModule.js');
// pushNotifyModule.pushNotifyModuleHandler(app, dbName, serverType);

// var usersModule = require('./usersModule.js');
// usersModule.usersModuleHandler(app, dbName, serverType);
// 
// var companiesModule = require('./companiesModule.js');
// companiesModule.companiesModuleHandler(app, dbName, serverType);

// var gameEngineModule = require('./gameEngineModule.js');
// gameEngineModule.gameEngineModuleHandler(app, dbName, serverType, port);

// var geoSpatialModule = require('./geoSpatialModule.js');
// geoSpatialModule.geoSpatialModuleHandler(app, dbName, serverType);
// 
// var yourCompanyWebsiteModule = require('./yourCompanyWebsiteModule.js');
// yourCompanyWebsiteModule.yourCompanyWebsiteModuleHandler(app, dbName, serverType);

app.listen(port);
console.log(serverType + ' server is Listening on port ' + port);
