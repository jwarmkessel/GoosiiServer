var pushNotifyModuleHandler = function(app, dbName, serverType) {
  console.log("including pushNotifyModule");

  var express = require('express')
      ,fs = require('fs')
      ,crypto = require('crypto')
      ,tls = require('tls')
      ,http = require('http');
      
  var certPem;
  var keyPem;
  var caCert;
  var options;
  var apnsServer = "gateway.sandbox.push.apple.com";
  
  if(serverType == "production") {
    certPem = fs.readFileSync('./apns_dist/goosii_apns_dist_cer.pem', encoding='ascii')
    keyPem = fs.readFileSync('./apns_dist/goosii_apns_dist_noenc.pem', encoding='ascii')
    caCert = fs.readFileSync('./apns_dist/entrust_2048_ca.cer', encoding='ascii')
    // caCert = fs.readFileSync('./apns_dist/aps_production.cer', encoding='ascii')
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
  //Import Utilities Module
  var utilitiesModule = require('./utilitiesModule.js');
  utilitiesModule.getCurrentUtcTimestamp();
      
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
  app.get('/sendNotification', function(req, res) {
    console.log('sending test notification');
    console.log(apnsServer);
    next = function(){};

    var stream = tls.connect(2195, apnsServer, options, function() {
        console.log("Connecting with APNS");
        // connected
        next( !stream.authorized, stream );
        console.log("Connected with APNS" + stream.authorized);
    });

    var
        pushnd = { aps: { alert:'Goosii Push Notification Test.' }, customParam: { foo: 'bar' } } // 'aps' is required
        ,hextoken = '4bea9cb164a51c06d6671af71c786b01c5fb04272d729d55516f7f78423aacae' // Push token from iPhone app. 32 bytes as hexadecimal string
        //,hextoken = '6ebf5909fb9fa9a451ab685820896c475a62fb7b8410119926f5783f38b9bb57' // Push token from iPhone app. 32 bytes as hexadecimal string
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

        console.log("Apple Push Notification Error message :" + command + ':' + status + ':' + msgid);

    });
    
    res.send("Message sent");
  });

  app.get('/', function(req, res) {
    res.send("Server is okay "+ utilitiesModule.getCurrentUtcTimestamp());
  });
};

exports.pushNotifyModuleHandler = pushNotifyModuleHandler;