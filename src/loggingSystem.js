var addToLog = function(message) {
	console.log("including addToLog");

	var fs = require('fs');
        
  	var today = new Date;
	var currentTime = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate() + ', ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds() + ':' + today.getMilliseconds();    
	
	message = currentTime + ': ' + message;
	if(fs.existsSync("SystemLog.txt")){
		fs.appendFileSync("SystemLog.txt", '\n' + message);
	} else {
		fs.writeFile('SystemLog.txt', message);
	}
	// fs.exists("SystemLog.txt", function( exists ) {
	// 	console.log(exists);
	// 	console.log('how far do i get' + message)
	// 	if(exists){
	// 		fs.appendFile('SystemLog.txt', '\n' + message, function(err){
	// 			if(err){
	// 				console.log('Cannot append to log.');
	// 			}
	// 		});
	// 	} else {
	// 		fs.writeFile('SystemLog.txt', message, function(err){
	// 			if(err){
	// 				console.log('Cannot create log.');
	// 			}
	// 		});	
	// 	}       
	// });

	console.log("Log Successful");	
}

exports.addToLog = addToLog;