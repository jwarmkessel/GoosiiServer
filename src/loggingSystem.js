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
}

exports.addToLog = addToLog;