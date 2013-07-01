var gameEngineModuleHandler = function(app) {
  console.log("including gameEngineModule");
  
  app.get('/createSweepstakes/:companyId/:sweepstakesInfo', function(req, res) {
    var utc_timestamp = getCurrentUtcTimestamp();

     //Create the user document object to save to mongoDB 
    var sweepstakesObj =   {
  			                      "startDate" : utc_timestamp,
                        			"endDate" : "",
                        			"prize" : "",
                        			"winnerId" : "",
                        			"lastCheckin" : "",
                        			"totalParticipating" : "",
                        			"posts" : [ ]
                        		}

    //insert the user document object into the collection
    db.open(function (error, client) {
      if (error) {console.log("Db open failed"); throw error};
      var companies = new mongodb.Collection(client, 'companies');
      console.log("Inserting new user right now");
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
  
  app.get('/enterSweepstake/:post/:userId/:companyId', function(req, res) {
    var utc_timestamp = getCurrentUtcTimestamp();
    //Open the database

    db.open(function (error, client) {
      if (error) {throw error;}    

      var community = new mongodb.Collection(client, 'users');                      		

      //TODO: If user is already in active sweepstakes at this company then return sweepstakes information.
      community.findOne({ $and: [{ "user.sweepstakes.companyId" : req.params.companyId }, { "user.sweepstakes.isActive": "yes"}]}, function(err, object) {
        if (err) { 
          console.log("we have an error");
        }

        if (object) {
            // we have a result
            console.log("we have a result so do nothing " + object._id);  
            res.send(0);  
            db.close();  
            return;    
        } else {
            // we don't
            console.log("we don't"); 


          var userSweepstakesObj = {
                                     "companyId" : req.params.companyId,
                                     "startDate": "",
                                     "endDate": "",
                                     "prize": "",
                                     "isActive" : "yes",
                                     "isWinner" : "",
                                     "lastPostTimestamp" : utc_timestamp,
                                     "totalPosts" : "1"
                                   };

          community.update({_id: ObjectID(req.params.userId)}, {$push: { "user.sweepstakes": userSweepstakesObj} }, {safe:true}, function(err, result) {
            if (err) console.warn(err.message);
            if (err && err.message.indexOf('E11000 ') !== -1) {
              // this _id was already inserted in the database
              console.log("E11000 error");
            }
            console.log("sweepstakes added to user object");

            var userPostObj = {
                                 "companyId" : req.params.companyId,
                                 "timestamp" : utc_timestamp,
                                 "post" : req.params.post
                               };

            community.update({_id: ObjectID(req.params.userId)}, {$push: { "user.posts": userPostObj} }, {safe:true}, function(err, result) {
              if (err) console.warn(err.message);
              if (err && err.message.indexOf('E11000 ') !== -1) {
                // this _id was already inserted in the database
                console.log("E11000 error");
              }

              console.log("Post object added to user object");

              var companySweepstakesObj = {
                                            "playerId" : req.params.userId,
                                            "timestamp" : utc_timestamp,
                                            "post" : req.params.post
                                          };  

              var companies = new mongodb.Collection(client, 'companies');                                                 
              companies.update({_id: ObjectID(req.params.companyId)}, {$push: { "company.sweepstakes": companySweepstakesObj}}, {safe:true}, function(err, result) {
                if (err) console.warn(err.message);
                if (err && err.message.indexOf('E11000 ') !== -1) {
                  // this _id was already inserted in the database
                  console.log("E11000 error");
                }

                //send the response to the client
                res.send(1);
                db.close()
              });
            });
          });
        }
      });
    });
  });

  app.get('/getSweepstake/:companyId', function(req, res) {  
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