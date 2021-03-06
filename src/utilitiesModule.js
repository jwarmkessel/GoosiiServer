
var getCurrentUtcTimestamp = function() {
  var now = new Date;
  var curTime = Date.UTC(now.getFullYear(),now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());    
  return curTime;
  
};

var getAtCommandFormattedDate = function(dateInMilliseconds) {
  var timeOffset = new time.Date(dateInMilliseconds);
  
  var hours = timeOffset.getHours();
  if(hours < 10) {
   hours = "0" + hours;
  }
  
  var minutes = timeOffset.getMinutes();
  if(minutes < 10) {
   minutes = "0" + minutes;
  }
  
  var month = timeOffset.getMonth() + 1;
  if(month < 10) {
   month = "0" + month;
  }
     
  var year = timeOffset.getFullYear();
  year = year.toString();
  year = year.slice(2);
     
  var date = timeOffset.getDate();
  if(date < 10) {
   date = "0" + date;
  }
  
  var dateTimeObj = hours + ":" + minutes + " " + month + date + year;             
          
  return dateTimeObj;
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
exports.getAtCommandFormattedDate = getAtCommandFormattedDate;
exports.timeConverter = timeConverter;