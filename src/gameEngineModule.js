var gameEngineModuleHandler = function(app) {
  console.log("including gameEngineModule");
  
  var express = require('express')
      ,fs = require('fs')
      ,crypto = require('crypto')
      ,tls = require('tls')
      ,certPem = fs.readFileSync('GoosiiCert.pem', encoding='ascii')
      ,keyPem = fs.readFileSync('GoosiiKey-noenc.pem', encoding='ascii')
      ,caCert = fs.readFileSync('aps_development.cer', encoding='ascii')
      ,options = { key: keyPem, cert: certPem, ca: [ caCert ] }
      ,http = require('http');
    
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
  
  //Include asynblock
  var asyncblock = require('asyncblock');
  var exec = require('child_process').exec;
    
  var utilitiesModule = require('./utilitiesModule.js');
  utilitiesModule.getCurrentUtcTimestamp();
  
  app.get('/createContest/:companyId/:startDate/:endDate/:prize/:prizeImg', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();
    console.log("Checking vars " + req.params.startDate + " : "+ req.params.endDate + " : "+ req.params.prize + " : "+ req.params.prizeImg);
    
    //Assembling the update for the company document.
    var contestObj = {"contest" : { "startDate" : req.params.startDate, "endDate" : req.params.endDate, "prize" : req.params.prize, "prizeImg" : req.params.prizeImg}};
    
    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};
      
      var companies = new mongodb.Collection(client, 'companies');
      
      companies.update({_id: ObjectID(req.params.companyId)}, {$set : contestObj}, {safe:true}, function(err, object) {
        if (err) console.warn(err.message);

        //At command to execute batch notifications on the end date .
        asyncblock(function (flow) {
          //TODO set this up so that it can handle multiple time zones.  
          console.log("setting at command to execute " + req.params.endDate);

          exec('echo "curl http://127.0.0.1:3001/sendNotification" | at ' + req.params.endDate, flow.add());
        });
        
        res.send(JSON.stringify(object));
        db.close();
      });
    });
  });

  //Used for creating connection APNS server    	
	function hextobin(hexstr) {
      buf = new Buffer(hexstr.length / 2);

      for(var i = 0; i < hexstr.length/2 ; i++)
      {
          buf[i] = (parseInt(hexstr[i * 2], 16) << 4) + (parseInt(hexstr[i * 2 + 1], 16));
      }

      return buf;
  }
  
  //Send notification test to Justin's phone
  var sendPushNotification = function(pushIdentifier, pushMessage, customParameter){

    next = function(){};

    var stream = tls.connect(2195, 'gateway.sandbox.push.apple.com', options, function() {
        console.log("Connecting with APNS");
        // connected
        next( !stream.authorized, stream );
        console.log("Connected with APNS" + stream.authorized);
    });

    var
        pushnd = { aps: { alert: pushMessage }, customParam: { foo: 'bar' } } // 'aps' is required
        ,hextoken = pushIdentifier // Push token from iPhone app. 32 bytes as hexadecimal string
        ,token = hextobin(hextoken)
        ,payload = JSON.stringify(pushnd)
        ,payloadlen = Buffer.byteLength(payload, 'utf-8')
        ,tokenlen = 32
        ,buffer = new Buffer(1 +  4 + 4 + 2 + tokenlen + 2 + payloadlen)
        ,i = 0
        ,msgid = 0xbeefcace // message identifier, can be left 0
        ,seconds = Math.round(new Date().getTime() / 1000) + 1*60*60 // expiry in epoch seconds (1 hour)
        ,payload = JSON.stringify(pushnd);
    ;

    buffer[i++] = 1; // command
    buffer[i++] = msgid >> 24 & 0xFF;
    buffer[i++] = msgid >> 16 & 0xFF;
    buffer[i++] = msgid >> 8 & 0xFF;
    buffer[i++] = msgid & 0xFF;

    // expiry in epoch seconds (1 hour)
    buffer[i++] = seconds >> 24 & 0xFF;
    buffer[i++] = seconds >> 16 & 0xFF;
    buffer[i++] = seconds >> 8 & 0xFF;
    buffer[i++] = seconds & 0xFF;

    buffer[i++] = tokenlen >> 8 & 0xFF; // token length
    buffer[i++] = tokenlen & 0xFF;
    token = hextobin(hextoken);
    token.copy(buffer, i, 0, tokenlen)
    i += tokenlen;
    buffer[i++] = payloadlen >> 8 & 0xFF; // payload length
    buffer[i++] = payloadlen & 0xFF;

    payload = Buffer(payload);
    payload.copy(buffer, i, 0, payloadlen);
    stream.write(buffer);  // write push notification

    stream.on('data', function(data) {

        var
            command = data[0] & 0x0FF  // always 8
            ,status = data[1] & 0x0FF  // error code
            ,msgid = (data[2] << 24) + (data[3] << 16) + (data[4] << 8 ) + (data[5])
        ;

        console.log(command + ':' + status + ':' + msgid);
    });
  };
  
  var selectWinner = function(participants) {
    for (var key in participants)
    {
       if(participants.hasOwnProperty(key)) {      
         console.log("About to send notify to " + participants[key].pushIdentifier)
         sendPushNotification(participants[key].pushIdentifier, 'You are user' + participants[key].userId);
       }
    }
  }
  
  app.get('/determineContestWinner/:companyId', function(req, res) {
    var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();

    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};
      
      var companies = new mongodb.Collection(client, 'companies');
      
      companies.findOne({_id: new ObjectID(req.params.companyId)}, function(err, object) {
        if (err) console.warn(err.message);
        
        if(object) {
          console.log("calling selectWinner()");
          selectWinner(object.participants);

          res.send("determining winner");
        } else {
          res.send("No such company exists");
        }
        db.close();
      });
    });
  });
  
  //Checking in is akin to entering the contest. Within this method we check whether the user is already included in this contest
  app.get('/enterContest/:userId/:companyId', function(req, res) {
    //var utc_timestamp = getCurrentUtcTimestamp();

    //Open the database
    db.open(function (error, client) {
      if (error) {throw error;}    

      var usersMongo = new mongodb.Collection(client, 'users');
      var isCheckedIn = 0;
      //find the single users object.
      usersMongo.findOne({_id: new ObjectID(req.params.userId)}, function(err, userObject) {
        if(err){ return false };
        
        //Returned object should be a JSON array. Iterate through and check whether the companyID already exists within this list.
        if(userObject) {
          console.log("object exists");
          
          //Quickly check how many contests the user is particpating in here.
          var i = 0;
          
          //Itereate through the list of contests (userObject.contests) the user is a part of.
          for (var key in userObject.contests)
          {
            //If the companyID is present within the users list of contests then we know the user has already checked into this event.
            if(userObject.contests[key] == req.params.companyId) {
              
              //Set a flag to indicate that the user is already checked in.
              isCheckedIn = 1;
              db.close();  
              res.send("Awesome, you're already checked in.");
            }            
            i++;
          }
          console.log("This object has " + i + " elements");
        } else {
          console.log("enterContest() Something's wrong. There should be an object.");
          db.close();
          res.send();
          //exit gracefully.          
          return;
        }
        
        //Once we've verified that the user is NOT in the contest we can update both company and user object in our database.
        if(!isCheckedIn) {
          var companiesMongo = new mongodb.Collection(client, 'companies'); 
          
          //This is what the participants object looks like.
          addToParticipantsObj = {"userId" : req.params.userId, "pushIdentifier" : userObject.pushIdentifier};
          
          //Push this object into the array of participants.
          companiesMongo.update({_id: ObjectID(req.params.companyId)}, {$push: {"participants" : addToParticipantsObj}}, {safe:true}, function(err, result) {                        
            if(!err) {
              usersMongo.update({_id: new ObjectID(req.params.userId)}, {$push: {"contests" : req.params.companyId}}, {safe:true}, function(err, userObject) {
                if(!err) {
                 res.send("You are now participating"); 
                }
                
                //Close the database.
                db.close();
              });
            }
          });  
        }
      });
    });
  });

  app.get('/getContest/:companyId', function(req, res) {  
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
    db.close();
    db.open(function (error, client) {
      if (error) throw error;
      var company = new mongodb.Collection(client, 'companies');  
      console.log("So far so good");    
      company.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(err, object) {
        if (err) console.warn(err.message);
        console.log("Moment of truth");          
        if (object) {
          // we have a result
          console.log("we have a result");  
          //send the response to the client
          res.send(object);
          db.close() 
          return;    
        } else {
          console.log("no result returned");
          //send the response to the client
          res.send(object);
          db.close()
        }
      });
    });
  });
};

exports.gameEngineModuleHandler = gameEngineModuleHandler;