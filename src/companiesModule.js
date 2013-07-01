var companiesModuleHandler = function(app) {
  console.log("including companiesModule");
  
  app.get('/createCompany/:companyInfo', function(req, res) {
    var utc_timestamp = getCurrentUtcTimestamp();

     //Create the user document object to save to mongoDB 
    var companyObject =  {
     	                    "company" : {
                         		"name" : "",
                         		"telephone" : "",
                         		"address" : "",
                         		"email" : "",
                         		"createDate" : utc_timestamp,
                         		"isActive" : "",
                         		"facebookPlacesId" : "",
                         		"currentSweepstake" : "",
                         		"completedSweepstakes" : [ ]
                         	}
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