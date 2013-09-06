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
  
  //include node-time
  var time = require('time');
  
  //Include asynblock
  var asyncblock = require('asyncblock');
  var exec = require('child_process').exec;
    
  var utilitiesModule = require('./utilitiesModule.js');
  
  app.get('/expireContest/:companyId', function(req, res) {
    console.log("Expire the contest");
    //Open the database
    db.open(function (error, client) {
      if (error) {throw error;}    

      var companiesMongo = new mongodb.Collection(client, 'companies');    
      var contestObj = {  "startDate" : "",
                          "endDate" : "",
                      		"prize" : "",
                      		"prizeImg" : ""
                       };
      companiesMongo.update({_id: ObjectID(req.params.companyId)}, {$set : {"contest" : contestObj}}, {safe:true}, function(err, object) {
        if(!err) {
          console.log("success " + JSON.stringify(object));
        } else {
          console.log("error " + JSON.stringify(err));
        }
        db.close();
        res.send();
      });
    });
  });
    
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
          console.log("The end date " + req.params.endDate);
          req.params.endDate = parseInt(req.params.endDate);
          console.log("setting at command to execute company event" + req.params.companyId + " at " + utilitiesModule.getAtCommandFormattedDate(req.params.endDate));

          exec('echo "curl http://127.0.0.1:3001/determineContestWinner/'+ req.params.companyId +'" | at ' + utilitiesModule.getAtCommandFormattedDate(req.params.endDate), flow.add());
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
  
  var setWinner = function(companyId) {
    /*
    - Get the entryList
    - Select a winner from the list
    - Set winner
    */
    db.open(function (error, client) {
      var companiesMongo = new mongodb.Collection(client, 'companies');
      var usersMongo = new mongodb.Collection(client, 'users');
      
      companiesMongo.findOne({_id: new ObjectID(companyId)}, function(err, companyObj) {
        if(!err) {
          if(companyObj.entryList) {
            console.log(JSON.stringify(companyObj));
            var count = 0;
            for (var key in companyObj.entryList)
            {
              count++;
            }
            
            //If there are participants then set the reward object in rewards array
            if(count > 0) {              
              
              console.log("The Length " + count);
              var winnerId = companyObj.entryList[Math.floor(Math.random() * count)];
              console.log(winnerId);
              companyObj.contest.companyId = companyId;
              console.log("Adding this contest " + JSON.stringify(companyObj.contest));
              usersMongo.update({_id: new ObjectID(winnerId)}, {$push : {"rewards" : companyObj.contest}}, function(err, userObj) {
                if(!err) {
                 console.log("Winner has been set");

                }
                db.close();                
              });
            }
          }
        }
      });
    });
  };
  
  app.get('/testWinner/:companyId', function(req, res) {
    setWinner(req.params.companyId);
    res.send("Setting winner");
  });
  
  function selectWinnerRecursive(count, participants, event) {    
    event.contest.companyId = event._id.toString();    
    console.log("selectWinnerRecursive() using " + participants[count-1].pushIdentifier);
    
    db.open(function (error, client) {
      var usersMongo = new mongodb.Collection(client, 'users');
      
      usersMongo.findOne({ "fulfillments.companyId": { $in : [event._id.toString()]}, _id : new ObjectID(participants[count-1].userId)}, function(err, object) {
        if(!err) {          
          if(object == null) {
            console.log("No fulfillments object for " + event._id.toString());

            usersMongo.update({_id : new ObjectID(participants[count-1].userId)}, {$push :{ "fulfillments" : event.contest}}, function(err, object) {
              console.log("fulFillment object added " + JSON.stringify(object));                  
            });
          } else {
            console.log("First remove");
            usersMongo.update({ "fulfillments.companyId": { $in : [event._id.toString()]}, _id : new ObjectID(participants[count-1].userId)}, {$pull : {"fulfillments" : {"companyId" : event._id.toString()}}}, function(err, object) {                
              if(err){console.log("There was an error pulling");}
              console.log("Previous fulfillment object is removed");
              if(!err) {
                usersMongo.update({_id : new ObjectID(participants[count-1].userId)}, {$push :{ "fulfillments" : event.contest}}, function(err, object) {
                  console.log("fulFillment object added " + JSON.stringify(object));       
                  db.close();           
                });
              }
            });
          }

          if(participants[count-1].pushIdentifier != "empty") {
            sendPushNotification(participants[count-1].pushIdentifier, "A winner has been selected! Check out if you've won.");
          }
          
          if(count == 1) {
            
            asyncblock(function (flow) {
              //TODO set this up so that it can handle multiple time zones.  
              console.log("Expiring " + event._id.toString());
              
              //expire the contest after the users have had their fulfillment set.
              exec('echo "curl http://127.0.0.1:3001/expireContest/' + event._id.toString() + '"', flow.add());
            });
            
            console.log("Let's not call our recursive function again.");    
            db.close();    
            return;
          }
          db.close();
          count--;
          selectWinnerRecursive(count, participants, event);
        }                      
      });        
    });
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
          db.close();
          
          var count = 0;
          for (var key in object.participants)
          {
            count++;
          }
          console.log("sending selectWinnerRecursive with " + count + "\n");
          //Select winner iterates through the participants, determines a winner, and sets the fulfillment parameters in the user object. 
          selectWinnerRecursive(count, object.participants, object);

          res.send("determining winner");
        } else {
          res.send("No such company exists");
          db.close();          
        }
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
            if(userObject.contests[key].companyId == req.params.companyId) {
              
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
              usersMongo.update({_id: new ObjectID(req.params.userId)}, {$push: {"contests" : {"companyId" :req.params.companyId, "participationCount" : 1}}}, {safe:true}, function(err, userObject) {
                if(!err) {
                  companiesMongo.update({_id: new ObjectID(req.params.companyId)}, {$push: {"entryList" : req.params.userId}}, {safe:true}, function(err, userObject) {
                    if(!err) {
                      res.send("You are now participating"); 
                    } else {
                      console.log("Error " + JSON.stringify(err));
                    }
                    //Close the database.
                    db.close();
                  });                 
                }                
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
  
  app.get('/getCompanyAndUser/:companyId/:userId', function(req, res) {  
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
    
    db.open(function (error, client) {
      if (error) throw error;
      var companiesMongo = new mongodb.Collection(client, 'companies');  
      var usersMongo = new mongodb.Collection(client, 'users');      
      console.log("So far so good");    
      
      companiesMongo.findOne({_id: new ObjectID(req.params.companyId)}, {safe:false}, function(err, companyObj) {
        if(!err) {
          if (companyObj) {
            console.log("I have the comp object");
            usersMongo.findOne({_id: new ObjectID(req.params.userId)}, {safe:false}, function(err, userObj) {
              if(!err) {
                if(userObj) {
                  console.log("I have the user obj");
                  companyObj.user = userObj;    
                  console.log(companyObj);            
                }
              }
              res.send(JSON.stringify(companyObj));
              db.close();
            });
          }
        }else { 
          db.close();  
          res.send("There was an error, dude.");
        }
      });
    });
  });
  
  app.get('/removeFulfillmentObject/:companyId/:userId', function(req, res) {  
    db.open(function (error, client) {
      if (error) throw error;
      
      var usersMongo = new mongodb.Collection(client, 'users');
      
      usersMongo.update({ _id : new ObjectID(req.params.userId), "fulfillments.companyId": { $in : [req.params.companyId]}},{ $pull: { "fulfillments": {"companyId" : req.params.companyId}}} , {safe:false}, function(err, userObj) {
        if(!err) {
          if(userObj) {
            console.log("I have the user obj");
            companyObj.user = userObj;    
            console.log(companyObj);            
          }
        }
        res.send("Fulfillment flag removed");
        db.close();
      });
    });
  });
  
  app.get('/getReward/:companyId/:userId', function(req, res) {  
    db.open(function (error, client) {
      if (error) throw error;
      
      var usersMongo = new mongodb.Collection(client, 'users');
      
      usersMongo.findOne({ _id : new ObjectID(req.params.userId), "rewards.companyId": { $in : [req.params.companyId]}}, {safe:false}, function(err, userObj) {
        var isWinner;
        if(!err) {
          if(userObj) {
            console.log("YES");          
            console.log("YES" + userObj);
            isWinner = "YES"
          } else {
            isWinner = "NO"
            console.log("NO" + userObj);
          }
        }
        res.send(isWinner);
        db.close();
      });
    });
  });
  
  app.get('/checkPassword/:companyId/:password', function(req, res) {  
    db.open(function (error, client) {
      if (error) throw error;
      
      var companiesMongo = new mongodb.Collection(client, 'companies');
      
      companiesMongo.findOne({ _id : new ObjectID(req.params.companyId)}, {safe:false}, function(err, compObj) {
        if(!err) {
          if(compObj) {
            if(req.params.password == compObj.contest.password) {
              res.send("valid");
            }else {
              res.send("invalid");
            }
          }
        }
        db.close();
      });
    });
  });
  // db.users.update({_id : ObjectId("51f9d464a02efddd23000001"), "fulfillments.companyId": { $in : ["51d9fd1812a0f4116b675197"]}}, { $pull: { "fulfillments": {"companyId" : "51d9fd1812a0f4116b675197"}}});
  //   db.users.find({_id : ObjectId("51f9d464a02efddd23000001"), "fulfillments.companyId": { $in : ["51d9fd1812a0f4116b675197"]}}).pretty();
};

exports.gameEngineModuleHandler = gameEngineModuleHandler;