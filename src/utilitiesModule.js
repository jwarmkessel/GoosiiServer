var getCurrentUtcTimestamp = function() {
  var now = new Date;
  var curTime = Date.UTC(now.getFullYear(),now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());    
  return curTime;
  
};

exports.getCurrentUtcTimestamp = getCurrentUtcTimestamp;