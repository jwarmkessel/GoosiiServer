var moment = require('moment');

var getCurrentUtcTimestamp = function() {
  var now = new Date;
  var curTime = Date.UTC(now.getFullYear(),now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());    
  return curTime;
  
};

var timeConverter = function(utcTimestamp){
  console.log("The timeConverter function received " + utcTimestamp);
  console.log("is moment an obj " + moment);
  var date = moment.utc(utcTimestamp);
  console.log("the date " + date.isValid());
  //var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  return date;
}

exports.getCurrentUtcTimestamp = getCurrentUtcTimestamp;
exports.timeConverter = timeConverter;