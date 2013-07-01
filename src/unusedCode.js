//These are some variables for native mongodb that are not currently used. I'm putting them here temporarily just to remind me that they do exist.
/*var ReplSetServers = require('mongodb').ReplSetServers;
var Binary = require('mongodb').Binary;
var Code = require('mongodb').Code;
var BSON = require('mongodb').pure().BSON;
var assert = require('assert');*/

// io.sockets.on('connection', function (socket) {
//   socket.emit('news', { hello: 'world' });
//   socket.on('my other event', function (data) {
//     console.log(data);
//   });
// });

// io = require('socket.io').listen(3000);
// 
// io.sockets.on('connection', function (socket) {
//   console.log('Emit User connected');
//   socket.broadcast.emit('user connected');
// });
// 
// var dgram = require('dgram');
// console.log("include dgram");
// var message1 = new Buffer("message1");
// console.log("create Socket");
// var client1 = dgram.createSocket("udp4");
// 
// var server = "118.21.136.4";
// console.log("Send Dgram");
// client1.send(message1, 0, message1.length, 25785, server, function(err, bytes) {
//   client1.close();
// });
// 
// 
// /****
// I'm keeping these options for SPDY below for the future for when iOS can support it.
// Options for SPDY (It has to come after the express variable. Plan on implementing support in objective C after a couple iterations
// ****/
// /*var spdy = require('spdy')
// var options = {
//   key: fs.readFileSync('../node_modules/spdy/keys/spdy-key.pem'),
//   cert: fs.readFileSync('../node_modules/spdy/keys/spdy-cert.pem'),
//   ca: fs.readFileSync('../node_modules/spdy/keys/spdy-csr.pem')
// };
// var server = spdy.createServer(options, app);
// var foo = server.listen(443);*/
//

//Enable jsonP
//app.enable("jsonp callback");

/* File and image routes **************************************************************************************************************/
// app.post("/testImage", function(req, res) {
//   // create a gridform
//   var form = gridform();
// 
//   // returns a custom IncomingForm
//   form instanceof formidable.IncomingForm;
// 
//   // You can optionally store per-file metadata. I'm keeping this comment here as a reference to be able to do.
//   /*form.on('fileBegin', function (name, file) {
//     file.metadata = 'so meta'
//   })*/
// 
//   // parse normally
//   form.parse(req, function (err, fields, imageFile) {
// 
//     // use files and fields as you do today. Here I'm creating the object to store the data
//     var file = {"name":"","type":"","size":"","path":"","lastModified":"","upload":""};
//     
//     //Here I assign the data.
//     file.name = imageFile.photo.name;// the uploaded file name
//     file.type = imageFile.photo.type;// file type per [mime](https://github.com/bentomas/node-mime)
//     file.size = imageFile.photo.size;// uploaded file size (file length in GridFS) named "size" for compatibility
//     file.path = imageFile.photo.path;// same as file.name. included for compatibility
//     file.lastModified = imageFile.photo.lastModifiedDate;// included for compatibility
// 
//     // files contain additional gridfs info
//     file.root // the root of the files collection used in MongoDB ('fs' here means the full collection in mongo is named 'fs.files')
//     
//     //TODO this doesn't look like it's doing shit.
//     //file.id = "506d37a242e33ba0c913bb58";  // the ObjectId for this file
//     
//     //Check if the file exists using native mongoDB
//     mongodb.GridStore.exist(db, imageFile.photo.name, function(err, exists){
//       if(exists) res.send("Picture uploaded: " + imageFile.photo.name);
//     });
//   });
// });    
// 
// app.get("/getImage/:gangId", function(req, res) {
//   console.log("The gangID" + req.params.gangId);
//   //TODO Delete this image "Justin WarmkesselWarmkessel730561710.jpg"
//   //Create the gridstore object with the file included
//   var gs = new mongodb.GridStore(db, new ObjectID("5098486cd8b1aa73a1000032"), "r");
// 
//   GridStore.read(db, new ObjectID("5098486cd8b1aa73a1000032"), function(err, data) {
//     console.log(data);
//     buffer = new Buffer(data,'binary')
//     hex = buffer.toString('base64')
//     console.log(hex);
//     res.send(hex);
// 
//   });
//   //Open the file
//   gs.open(function(err, obj){
//     
//     if(err) console.log("The error"+ err);
//     
//     
//     // console.log("contentType: " + gs.contentType);
//     //     console.log("uploadDate: " + gs.uploadDate);
//     //     console.log("chunkSize: " + gs.chunkSize);
//     //     console.log("metadata: " + gs.metadata);
//     //     
//     
//     //Read the file
//     // Peform a find to get a cursor
//     // var stream = obj.stream();
//     //     // For each data item
//     //     stream.on("data", function(item) {
//     //       console.log("The item");
//     //       console.log(item);
//     //       res.send(item)
//     //     });
//     // 
//     //     // For each data item
//     //     stream.on("end", function(item) {
//     //       console.log("On stream end "+item);
//     //       stream.destroy();
//     //     });
//     //     // When the stream is done
//     //     stream.on("close", function() {
//     //       db.close();
//     //     });
//     
//     /*obj.read(function(err, data){
//       res.send(data);
//     });*/
//   });
// });
//

/* Examples of MONGODB shell commands *************************************************************************************************/

/*Remove a key/value from collection
db.users.update({ _id: ObjectId("")}, { $unset : { gangs : 1} });
*/