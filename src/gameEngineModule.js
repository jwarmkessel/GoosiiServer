var gameEngineModuleHandler = function(app, dbName, serverType, port) {
  console.log("including gameEngineModule");
  
  var express = require('express')
      ,fs = require('fs')
      ,crypto = require('crypto')
      ,tls = require('tls')
      ,http = require('http')
      ,loggingSystem = require('./loggingSystem.js');      
      
  var certPem;
  var keyPem;
  var caCert;
  var options;
  var apnsServer = "gateway.sandbox.push.apple.com";

  if(serverType == "production") {
    certPem = fs.readFileSync('./apns_dist/goosii_apns_dist_cer.pem', encoding='ascii')
    keyPem = fs.readFileSync('./apns_dist/goosii_apns_dist_noenc.pem', encoding='ascii')
    caCert = fs.readFileSync('./apns_dist/entrust_2048_ca.cer', encoding='ascii')
    options = { key: keyPem, cert: certPem, ca: [ caCert ] }
    apnsServer = "gateway.push.apple.com"
  } else {
    console.log("Setting up sandbox apns configurations");
    certPem = fs.readFileSync('./apns_dev/goosii_apns_dev_cer.pem', encoding='ascii')
    keyPem = fs.readFileSync('./apns_dev/goosii_apns_dev_key_noenc.pem', encoding='ascii')
    caCert = fs.readFileSync('./apns_dev/entrust_2048_ca.cer', encoding='ascii')
    options = { key: keyPem, cert: certPem, ca: [ caCert ] }
    apnsServer = "gateway.sandbox.push.apple.com";    
  }
  
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
  
  //include node-time
  var time = require('time');
  
  //Include asynblock
  var asyncblock = require('asyncblock');
  var exec = require('child_process').exec;
    
  var utilitiesModule = require('./utilitiesModule.js');
  
  app.post('/test', express.bodyParser(), function (req, res) {
    res.header("Access-Control-Allow-Origin", "*");

    // Request headers you wish to allow
     res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // res.header("Access-Control-Allow-Headers", "X-Requested-With");

    // Request methods you wish to allow
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    console.log("got post");
    console.log(req.body);
    console.log(req.files);

    fs.readFile(req.files.uploadingFile.path, function (err, data) {
      console.log("File Path: /root/justin/companyAssets/" + req.body.companyId + "/" +  req.body.imageIsFor);
      fs.writeFile("/root/justin/companyAssets/" + req.body.companyId + "/" +  req.body.imageIsFor, data, function (err) {
        //res.redirect("back");
        if(err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
        }

      });
    });
  });
  
  app.get('/testFile', function(req, res) {
    console.log('testfile');
        
    fs.stat("/root/justin/companyAssets/5233805ec22ccd54d6fd2cff/rewardImage.jpg", function(err, stat) {
        console.log("STAT " + stat.mtime);
        console.log("STAT " + stat.mtime.getTime());        
        
        //Perhaps converting time to milliseconds.
        var lastModifiedTime = stat.mtime.getTime();
        res.send(lastModifiedTime.toString());
    });
  });
  
  //This ends the event, tags all participants with a fulfillment flag, and resets the contest object in the companies document.
  app.get('/expireContest/:companyId', function(req, res) {
    loggingSystem.addToLog("GET /expireContest/" + req.params.companyId);    
    console.log("Expire the contest");
    //Open the database
    db.open(function (error, client) {
      if (error) throw error;

      var companiesMongo = new mongodb.Collection(client, 'companies');    
       
       var contestObj =  { "startDate" : "",
                             "endDate" : "", 
                               "prize" : "", 
                            "prizeImg" : "",
               "mobileBackgroundImage" : "",                           
                   "participationPost" : "",
                                "post" : "",                  
                            "password" : "",
                             "website" : ""
                         }                    

      companiesMongo.update({_id: ObjectID(req.params.companyId)}, {$set : {"contest" : contestObj}}, {safe:true}, function(error, object) {
        if(error) throw error;

        console.log("success " + JSON.stringify(object));
        db.close();
        res.send();
      });
    });
  });
    
  //Set the job number for the Event created
  var setEventJobNumber = function(companyId, jobNumber, res) {
    db.open(function (error, client) {
      if (error) throw error;
      
      var companiesMongo = new mongodb.Collection(client, 'companies');
      
      companiesMongo.update({_id: ObjectID(companyId)}, {$set : {"contest.jobId" : jobNumber}}, {safe:true}, function(error, object) {
        if(error) throw error;
        db.close();
        res.jsonp(JSON.stringify(object));        
      });
    });
  };
  
  app.get('/updateEvent/:companyId/:eventObject', function(req, res) {
    loggingSystem.addToLog("GET /updateEvent/" + req.params.companyId + "/" + req.params.eventObject);        
    var eventObj = JSON.parse(req.params.eventObject);

    var contestObj = {"contest" : eventObj };
                     
    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) throw error;
      
      var companiesMongo = new mongodb.Collection(client, 'companies');
      
      companiesMongo.update({_id: ObjectID(req.params.companyId)}, {$set : contestObj}, {safe:true}, function(error, object) {
        if (error) throw error;
        db.close();
        res.send();
      });
    });
  });
  
  app.get('/createContest/:companyId/:eventObj', function(req, res) {
    loggingSystem.addToLog("GET /updateEvent/" + req.params.companyId + "/" + req.params.eventObject);            
    //var utc_timestamp = utilitiesModule.getCurrentUtcTimestamp();
    var eventObject = JSON.parse(req.params.eventObj);
    console.log("start date " + eventObject.startDate);
    console.log("end date " + eventObject.endDate);    
    //Assembling the update for the company document.
    var contestObj = {"contest" : 
                        { "startDate" : eventObject.startDate,
                            "endDate" : eventObject.endDate, 
                              "prize" : eventObject.prize, 
                           "prizeImg" : eventObject.prizeImg,
              "mobileBackgroundImage" : eventObject.mobileBackgroundImage,                           
                  "participationPost" : eventObject.participationPost,
                               "post" : eventObject.post,                  
                           "password" : eventObject.password,
                            "website" : eventObject.website
                        }
                     };
    
    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) throw error;
      
      var companiesMongo = new mongodb.Collection(client, 'companies');
      
      companiesMongo.update({_id: ObjectID(req.params.companyId)}, {$set : contestObj}, {safe:true}, function(error, object) {
        if (error) throw error;
        db.close();
        
        //At command to execute batch notifications on the end date .
        asyncblock(function (flow) {
          //TODO set this up so that it can handle multiple time zones.  
          console.log("The end date " + eventObject.endDate);
          eventObject.endDate = parseInt(eventObject.endDate);
          console.log("setting at command to execute company event" + req.params.companyId + " at " + utilitiesModule.getAtCommandFormattedDate(eventObject.endDate));
          
          exec('echo "curl http://127.0.0.1:'+port+'/determineContestWinner/'+ req.params.companyId +'" | at ' + utilitiesModule.getAtCommandFormattedDate(eventObject.endDate), function (error, stdout, stderr) {
            if(error) throw error;

            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);

            var stderrArray = stderr.split(/[ ]+/);

            var i = 0;
            var jobNumber;
            for(i=0; i< stderrArray.length; i++) {

              if(stderrArray[i] == "using") {
                var jobIndex = i+2;
                console.log("The job number is " + stderrArray[jobIndex]);   
                jobNumber = stderrArray[jobIndex];          
              }
            }
            
            //Set job number in company object in mongodb.
            setEventJobNumber(req.params.companyId, jobNumber, res);
          });
        });
      });
    });
  });
  
  //Used for creating connection APNS server    	
	function hextobin(hexstr) {
      buf = new Buffer(hexstr.length / 2);

      for(var i = 0; i < hexstr.length/2 ; i++) {
        buf[i] = (parseInt(hexstr[i * 2], 16) << 4) + (parseInt(hexstr[i * 2 + 1], 16));
      }

      return buf;
  }
  
  //Send notification test to Justin's phone
  var sendPushNotification = function(pushIdentifier, pushMessage, customParameter){

    next = function(){};

    var stream = tls.connect(2195, apnsServer, options, function() {
        console.log("Connecting with APNS");
        // connected
        next( !stream.authorized, stream );
        console.log("Connected with APNS" + stream.authorized);
    });

    var
        pushnd = { aps: { "alert": pushMessage, "badge" : 1 }} // 'aps' is required
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
            ,status = data[1] & 0x0FF  // error, code
            ,msgid = (data[2] << 24) + (data[3] << 16) + (data[4] << 8 ) + (data[5])
        ;

        console.log(command + ':' + status + ':' + msgid);
    });
  };
  
  
  function selectWinnerRecursive(count, participants, event, client, res) {    
    event.contest.companyId = event._id.toString(); 
    var selectWinnerRecursiveGlobalCompanyId = event._id.toString(); 
    
    console.log("THE COMPANY ID " + event.contest.companyId); 
    console.log("selectWinnerRecursive() using " + participants[count-1].pushIdentifier);
    
    var usersMongo = new mongodb.Collection(client, 'users');
    var companiesMongo = new mongodb.Collection(client, 'companies');
    
    usersMongo.findOne({ "fulfillments.companyId": { $in : [event._id.toString()]}, _id : new ObjectID(participants[count-1].userId)}, function(error, object) {
      if(error) throw error;
      
      usersMongo.update({ "fulfillments.companyId": { $in : [event._id.toString()]}, _id : new ObjectID(participants[count-1].userId)}, {$pull : {"fulfillments" : {"companyId" : event._id.toString()}}}, function(error, object) {                
        if(error) throw error;
        console.log("Previous fulfillment object is removed");
        
        usersMongo.update({_id : new ObjectID(participants[count-1].userId)}, {$push :{ "fulfillments" : event.contest}}, function(error, object) {
          if(error) throw error;
          
          console.log("fulFillment object added " + JSON.stringify(object));

           if(participants[count-1].pushIdentifier != "empty") {
            sendPushNotification(participants[count-1].pushIdentifier, "A winner has been selected! Check out if you've won.");
          }
          

          if(count == 1) {

            asyncblock(function (flow) {
              //TODO set this up so that it can handle multiple time zones.  
              console.log("Expiring " + event._id.toString());

              //expire the contest after the users have had their fulfillment set.
              exec('echo "curl http://127.0.0.1:'+port+'/expireContest/' + event._id.toString() + '"', flow.add());
            });

            console.log("Let's not call our recursive function again."); 

            //Set the winner and delete the entrylist contents
            console.log("THIS IS THE FREAKING ID: "+event.contest.companyId);
            
            companiesMongo.findOne({_id: new ObjectID(event.contest.companyId)}, function(error, companyObj) {      
              if(error) throw error;        
              console.log("ENTRYLIST? " + companyObj.entryList);
              console.log("participants? " + companyObj.participants);              
              
              
              //If the ENTRYLIST is not undefined then use this list, otherwise, use the participants list.
              if(companyObj.entryList != 'undefined') {
                
                console.log(JSON.stringify(companyObj));
                var count = 0;
                for (var key in companyObj.entryList)
                {
                  count++;
                }
                
                console.log("THE COUNT IS " + count);
                
                //If there are participants then set the reward object in rewards array
                if(count > 0) {              

                  console.log("The Length " + count);
                  var winnerId = companyObj.entryList[Math.floor(Math.random() * count)];
                  console.log(winnerId);
                  companyObj.contest.companyId = event.contest.companyId;
                  console.log("Adding this contest " + JSON.stringify(companyObj.contest));

                  //Set the fulfillment flag
                  companyObj.contest.fulfillment = 1;
                  
                   usersMongo.update({ _id : new ObjectID(winnerId), "rewards.companyId": { $in : [event._id.toString()]}},{ $pull: { "rewards": {"companyId" : event._id.toString()}}} , {safe:false}, function(error, userObj) {
                     if(error) throw error;
                     console.log("Removing Reward Object");
                     usersMongo.update({_id: new ObjectID(winnerId)}, {$push : {"rewards" : companyObj.contest}}, function(error, userObj) {
                       if(error) throw error;

                      console.log("Winner has been set");

                      usersMongo.update({"fulfillments.companyId": { $in : [event._id.toString()]} , _id: new ObjectID(winnerId)}, {$set : {"fulfillments.$.reward" : 1}}, function(error, userObj) {
                        if(error) throw error;
                        
                        console.log("Setting reward flag on fulfillment object.");                      
                        companiesMongo.update({_id : new ObjectID(event.contest.companyId)}, {$unset : { "entryList" : ""}}, function(error, object) {
                          if(error) throw error;
                          console.log("DELETING THE ENTRY LIST! " + event.contest.companyId);
                          db.close();      
                          res.send("complete");
                        });  
                      });
                     });
                   });                    
                }else {
                  console.log("Using Participants array to set winner");
                  var count = 0;
                  for (var key in companyObj.participants)
                  {
                    count++;
                  }
                  
                  console.log("The Length " + count);
                  var winner = companyObj.participants[Math.floor(Math.random() * count)];
                  console.log(winner.userId);
                  
                  companyObj.contest.companyId = event.contest.companyId;
                  console.log("Adding this contest " + JSON.stringify(companyObj.contest));

                  //Set the fulfillment flag
                  companyObj.contest.fulfillment = 1;
                  
                  usersMongo.update({ _id : new ObjectID(winnerId), "rewards.companyId": { $in : [event._id.toString()]}},{ $pull: { "rewards": {"companyId" : event._id.toString()}}} , {safe:false}, function(error, userObj) {
                    if(error) throw error;

                    usersMongo.update({_id: new ObjectID(winner.userId)}, {$push : {"rewards" : companyObj.contest}}, function(error, userObj) {
                      if(error) throw error;
                      console.log("Winner has been set");

                      usersMongo.update({"fulfillments.companyId": { $in : [event._id.toString()]} , _id: new ObjectID(winner.userId)}, {$set : {"fulfillments.$.reward" : 1}}, function(error, userObj) {
                        if(error) throw error;                        
                        console.log("Setting reward flag on fulfillment object.");
                        
                        companiesMongo.update({_id : new ObjectID(companyObj.contest.companyId) }, {$unset : { "entryList" : ""}}, function(error, object) {
                          if(error) throw error;

                          console.log("DELETING THE ENTRY LIST! " + companyObj.contest.companyId);
                          db.close();      
                          res.send("complete");
                        });                       
                      });
                    });
                  });
                }
              }
            });
          } else {
            count--;
            selectWinnerRecursive(count, participants, event, client, res); 
          }
        });
      });                      
    });        
  }

  app.get('/determineContestWinner/:companyId', function(req, res) {
    loggingSystem.addToLog("GET /determineContestWinner/" + req.params.companyId);            
    db.open(function (error, client) {
      if(error) throw error;
      
      var companies = new mongodb.Collection(client, 'companies');
      
      companies.findOne({_id: new ObjectID(req.params.companyId)}, function(error, object) {
        if(error) throw error;
      
        var count = 0;
        for (var key in object.participants) {
          count++;
        }
        
        console.log("sending selectWinnerRecursive with " + count + "\n");
        db.close();
        //Select winner iterates through the participants, determines a winner, and sets the fulfillment parameters in the user object. 
        selectWinnerRecursive(count, object.participants, object, client, res);
      });
    }); 
  });
  
  //Checking in is akin to entering the contest. Within this method we check whether the user is already included in this contest
  app.get('/enterContest/:userId/:companyId', function(req, res) {
    loggingSystem.addToLog("GET /enterContest/" + req.params.userId + "/" + req.params.companyId);    

    //Open the database
    loggingSystem.addToLog("/enterContest: Opening database.");
    db.open(function (error, client) {
      if (error) throw error;

      var usersMongo = new mongodb.Collection(client, 'users');   
      var isCheckedIn = 0;
      
      //find the single users object.
      usersMongo.findOne({_id: new ObjectID(req.params.userId)}, function(error, userObject) {
        if (error) throw error;
      
        //Quickly check how many contests the user is particpating in here.
        var i = 0;
        
        //Itereate through the list of contests (userObject.contests) the user is a part of.
        for (var key in userObject.contests) {
          //If the companyID is present within the users list of contests then we know the user has already checked into this event.
          if(userObject.contests[key].companyId == req.params.companyId) {
            console.log("set 'entered' flag to yes");
            //Set a flag to indicate that the user is already checked in.
            isCheckedIn = 1;
            res.send();
            loggingSystem.addToLog("/enterContest: User is already entered. Closing database.");
            db.close();  
            
            return;
          }            
          i++;
        }
        console.log("This object has " + i + " elements");
        
        //Once we've verified that the user is NOT in the contest we can update both company and user object in our database.
        if(!isCheckedIn) {
          var companiesMongo = new mongodb.Collection(client, 'companies'); 
          
          //This is what the participants object looks like.
          addToParticipantsObj = {"userId" : req.params.userId, "pushIdentifier" : userObject.pushIdentifier};
          
          //Push this object into the array of participants.
          companiesMongo.update({_id: ObjectID(req.params.companyId)}, {$addToSet: {"participants" : addToParticipantsObj}}, {safe:true}, function(error, result) {                        
            if (error) throw error;

            usersMongo.update({_id: new ObjectID(req.params.userId)}, {$addToSet: {"contests" : {"companyId" :req.params.companyId, "participationCount" : 0}}}, {safe:true}, function(error, userObject) {
              if (error) throw error;
              
              companiesMongo.update({_id: new ObjectID(req.params.companyId)}, {$push: {"entryList" : req.params.userId}}, {safe:true}, function(error, userObject) {
                if (error) throw error;

                //Capture this first time checkin.
                var firstTimeCheckinsMongo = new mongodb.Collection(client, 'firstTimeCheckins');     

                //Build the first time checkin object.
                var firstTimeCheckinObject = {"companyId": req.params.companyId,
                                      "userId" : req.params.userId,
                                      "timestamp" : utilitiesModule.getCurrentUtcTimestamp()
                                      };

                //Insert employee object into 'firstTimeCheckins' collection.
                firstTimeCheckinsMongo.insert(firstTimeCheckinObject, {safe:true}, function(error, object){
                  if(error) throw error;

                  res.send("YES");  
                  loggingSystem.addToLog("/enterContest: User is now entered. Closing database.");                           
                  db.close();
                });
              });                 
            });
          });  
        } else {
          //TODO capture last checkin
          console.log("NO");
          res.send("NO");
          loggingSystem.addToLog("/enterContest: Closing database.");      
          db.close();
        }
      });
    });
  });

  app.get('/getContest/:companyId', function(req, res) {  
    loggingSystem.addToLog("GET /getContest/" + req.params.companyId);          

    db.open(function (error, client) {
      if (error) throw error;

      var company = new mongodb.Collection(client, 'companies');    
      company.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(error, object) {
        if (error) throw error;
        
        res.send(object);
        db.close() 
      });
    });
  });
  
  app.get('/getCompanyAndUser/:companyId/:userId', function(req, res) {  
    loggingSystem.addToLog("GET /getCompanyAndUser/" + req.params.companyId + "/" + req.params.userId);    

    db.open(function (error, client) {
      if (error) throw error;
      
      var companiesMongo = new mongodb.Collection(client, 'companies');  
      var usersMongo = new mongodb.Collection(client, 'users');      

      companiesMongo.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(error, companyObj) {
        if (error) throw error;

        usersMongo.findOne({_id: new ObjectID(req.params.userId)}, {safe:false}, function(error, userObj) {
          if (error) throw error;
          
          companyObj.user = userObj;    
          res.send(JSON.stringify(companyObj));
          db.close();
        });    
      });
    });
  });
  
  //There are two events where the fulfillment object is removed.
  /*
  1. The user doesn't want to participate or fulfill and, therefore, the fulfillment flag should be removed. 
  2. The user participates and thus has an opportunity to see if there is a reward. 
  */
  app.get('/removeFulfillmentAndReward/:companyId/:userId', function(req, res) {  
    loggingSystem.addToLog("GET /removeFulfillmentAndReward" + req.params.companyId + "/" + req.params.userId);    
    db.open(function (error, client) {
      if (error) throw error;

      var usersMongo = new mongodb.Collection(client, 'users');
      usersMongo.update({ _id : new ObjectID(req.params.userId), "fulfillments.companyId": { $in : [req.params.companyId]}},{ $pull: { "fulfillments": {"companyId" : req.params.companyId}}} , {safe:false}, function(error, userObj) {
        if (error) throw error;
        
        usersMongo.update({ _id : new ObjectID(req.params.userId), "rewards.companyId": { $in : [req.params.companyId]}},{ $pull: { "rewards": {"companyId" : req.params.companyId}}} , {safe:false}, function(error, userObj) {
          if (error) throw error;
        
          usersMongo.update({_id : new ObjectID(req.params.userId), "contests.companyId": { $in : [req.params.companyId]} }, {$set : {"contests.$.participationCount" : 0}}, function(error, object) {                
            if (error) throw error;
        
            res.send("Fulfillment flag removed and participation count set to 0");
            db.close();
          });
        });  
      });
    });
  });

  
  app.get('/removeFulfillmentObject/:companyId/:userId', function(req, res) {  
    loggingSystem.addToLog("GET /removeFulfillmentObject/" + req.params.companyId + "/" + req.params.userId);        
    db.open(function (error, client) {
      if (error) throw error;
      
      var usersMongo = new mongodb.Collection(client, 'users');      
      usersMongo.update({ _id : new ObjectID(req.params.userId), "fulfillments.companyId": { $in : [req.params.companyId]}},{ $pull: { "fulfillments": {"companyId" : req.params.companyId}}} , {safe:false}, function(error, userObj) {
        if (error) throw error;
        
        if(userObj) {
          console.log("I have the user obj");
          companyObj.user = userObj;    
          console.log(companyObj);            
        }

        usersMongo.update({_id : new ObjectID(req.params.userId), "contests.companyId": { $in : [req.params.companyId]} }, {$set : {"contests.$.participationCount" : 0}}, function(error, object) {                
          if (error) throw error;

          console.log("contest object added count " + JSON.stringify(object));
          usersMongo.update({"rewards.companyId": { $in : [ req.params.companyId ] } , _id : new ObjectID(req.params.userId)}, {$inc: {"rewards.$.fulfillment": -1}}, function(error, object) {
            if (error) throw error;
            
            console.log("Fulfillment flag removed and participation count set to 0");

            //Capture this fulfillment event.
            var fulfillmentsMongo = new mongodb.Collection(client, 'fulfillments');     

            //Build the fulfillment object.
            var fulfillmentsObj = {
                                    "companyId": req.params.companyId,
                                    "userId": req.params.userId,                                          
                                    "timestamp" : utilitiesModule.getCurrentUtcTimestamp()
                                   };

            //Insert employee object into 'fulfillments' collection.
            fulfillmentsMongo.insert(fulfillmentsObj, {safe:true}, function(error, object){
              if(error) throw error;

              res.send("success");
              db.close();
            });       
          });
        });
      });
    });
  });
  
  app.get('/getReward/:companyId/:userId', function(req, res) {  
    loggingSystem.addToLog("GET /getReward/" + req.params.companyId + "/" + req.params.userId);            
    db.open(function (error, client) {
      if (error) throw error;
      
      var usersMongo = new mongodb.Collection(client, 'users');
      
      usersMongo.findOne({ _id : new ObjectID(req.params.userId), "rewards.companyId": { $in : [req.params.companyId]}}, {safe:false}, function(error, userObj) {
        if (error) throw error;

        var isWinner;      

        if(userObj) {        
          isWinner = "YES"
        } else {
          isWinner = "NO"
        }

        res.send(isWinner);
        db.close();
      });
    });
  });
  
  app.get('/checkPassword/:companyId/:userId/:password', function(req, res) {  
    loggingSystem.addToLog("GET /checkPassword/" + req.params.companyId + "/" + req.params.userId + "/" + req.params.password);                
    db.open(function (error, client) {
      if (error) throw error;
      
      var companiesMongo = new mongodb.Collection(client, 'companies');
      var usersMongo = new mongodb.Collection(client, 'users');
      
      companiesMongo.findOne({ _id : new ObjectID(req.params.companyId)}, {safe:false}, function(error, compObj) {
        if (error) throw error;
       
        if(compObj) {
          if(req.params.password == compObj.contest.password) {
            usersMongo.findOne({"rewards.companyId": { $in : [req.params.companyId] } , "rewards.fulfillment": { $in : [0]}, "_id" : new ObjectID(req.params.userId)}, function(error, object) {
              if (error) throw error;
              
              var currentRewardObject = {};
              // console.log("THE REWARDS OBJECTS ARRAY : " + JSON.stringify(object.rewards));
              for (var key in object.rewards) { 
                if(object.rewards[key].companyId == req.params.companyId) {
                  console.log("Found my reward");
                  currentRewardObject = object.rewards[key].prize;
                
                  break;
                }
              }        
                      
              //Remove the reward and the null object $unset leaves behind.
              usersMongo.update({"rewards.companyId": { $in : [req.params.companyId] } , "rewards.fulfillment": { $in : [0]}, "_id" : new ObjectID(req.params.userId)}, { $unset : { "rewards.$" : ""}}, function(error, object) {
                if (error) throw error;                
                
                usersMongo.update({"_id" : new ObjectID(req.params.userId)}, { $pull : { "rewards" : null } }, function(error, object) {
                  if (error) throw error;
                  
                  console.log("THE REWARD " + currentRewardObject);
                  db.close();            
                  res.send(currentRewardObject);  
                });
              });                
            });
          }else {
            db.close();                            
            res.send("invalid");
          }
        }
      });
    });
  });
  
  //TODO: WARNING - THIS IS AN INCOMPLETE API CALL WHICH DOES NOT COMPLETELY WORK AS EXPECTED.
  app.get('/getAtCommandFormattedDate/:timeStamp/:companyId', function(req, res) {    
    loggingSystem.addToLog("GET /getAtCommandFormattedDate/:timeStamp");                
    var eventObject = {};
    eventObject.endDate = req.params.timeStamp;
    asyncblock(function (flow) {
      //TODO set this up so that it can handle multiple time zones.  
      console.log("The end date " + eventObject.endDate);
      eventObject.endDate = parseInt(eventObject.endDate);
      console.log("setting at command to execute company event" + req.params.companyId + " at " + utilitiesModule.getAtCommandFormattedDate(eventObject.endDate));
      
      exec('echo "curl http://127.0.0.1:'+port+'/determineContestWinner/'+ req.params.companyId +'" | at ' + utilitiesModule.getAtCommandFormattedDate(eventObject.endDate), function (error, stdout, stderr) {
        if(error) throw error;

        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);

        var stderrArray = stderr.split(/[ ]+/);

        var i = 0;
        var jobNumber;
        for(i=0; i< stderrArray.length; i++) {

          if(stderrArray[i] == "using") {
            var jobIndex = i+2;
            console.log("The job number is " + stderrArray[jobIndex]);   
            jobNumber = stderrArray[jobIndex];          
          }
        }
        
        //Set job number in company object in mongodb.
        setEventJobNumber(req.params.companyId, jobNumber, res);
      });
    });
  });
  
};

exports.gameEngineModuleHandler = gameEngineModuleHandler;