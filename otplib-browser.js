/*
 * Minimal TOTP/HOTP implementation for browser
 * Includes HmacSHA1 and Base32 decoding
 * Mimics basic otplib.authenticator interface
 */

(function(exports) {
    'use strict';

    // --- 1. SHA-1 Implementation (Sync) ---
    /*
     * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
     * in FIPS PUB 180-1.
     * Copyright (C) Paul Johnston 1999 - 2000.
     * See http://pajhome.org.uk/site/legal.html for details.
     */
    function hex_sha1(s){return binb2hex(core_sha1(str2binb(s),s.length * 8));}
    function b64_hmac_sha1(key,data){return binb2b64(core_hmac_sha1(key,data));}
    function str_hmac_sha1(key,data){return binb2str(core_hmac_sha1(key,data));}
    function core_sha1(x,len){
      x[len >> 5] |= 0x80 << (24 - len % 32);
      x[((len + 64 >> 9) << 4) + 15] = len;
      var w = Array(80);
      var a =  1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d =  271733878;
      var e = -1009589776;
      for(var i = 0; i < x.length; i += 16){
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;
        var olde = e;
        for(var j = 0; j < 80; j++){
          if(j < 16) w[j] = x[i + j];
          else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
          var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
          e = d;
          d = c;
          c = rol(b, 30);
          b = a;
          a = t;
        }
        a = safe_add(a, olda);
        b = safe_add(b, oldb);
        c = safe_add(c, oldc);
        d = safe_add(d, oldd);
        e = safe_add(e, olde);
      }
      return Array(a, b, c, d, e);
    }
    function sha1_ft(t, b, c, d){
      if(t < 20) return (b & c) | ((~b) & d);
      if(t < 40) return b ^ c ^ d;
      if(t < 60) return (b & c) | (b & d) | (c & d);
      return b ^ c ^ d;
    }
    function sha1_kt(t){
      return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
             (t < 60) ? -1894007588 : -899497514;
    }
    function core_hmac_sha1(key, data){
      var bkey = str2binb(key);
      if(bkey.length > 16) bkey = core_sha1(bkey, key.length * 8);
      var ipad = Array(16), opad = Array(16);
      for(var i = 0; i < 16; i++){
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
      }
      var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * 8);
      return core_sha1(opad.concat(hash), 512 + 160);
    }
    function safe_add(x, y){
      var lsw = (x & 0xFFFF) + (y & 0xFFFF);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xFFFF);
    }
    function rol(num, cnt){
      return (num << cnt) | (num >>> (32 - cnt));
    }
    function str2binb(str){
      var bin = Array();
      var mask = (1 << 8) - 1;
      for(var i = 0; i < str.length * 8; i += 8)
        bin[i>>5] |= (str.charCodeAt(i / 8) & mask) << (24 - i%32);
      return bin;
    }
    function binb2str(bin){
      var str = "";
      var mask = (1 << 8) - 1;
      for(var i = 0; i < bin.length * 32; i += 8)
        str += String.fromCharCode((bin[i>>5] >>> (24 - i%32)) & mask);
      return str;
    }
    // --- End SHA-1 ---

    // --- 2. Base32 Decoder ---
    function base32tohex(base32) {
        var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bits = "";
        var hex = "";
        base32 = base32.toUpperCase().replace(/=+$/, "");
        for (var i = 0; i < base32.length; i++) {
            var val = base32chars.indexOf(base32.charAt(i));
            if (val === -1) throw new Error("Invalid base32 character");
            var str = val.toString(2);
            while (str.length < 5) str = "0" + str;
            bits += str;
        }
        for (var i = 0; i + 4 <= bits.length; i += 4) {
            var chunk = bits.substr(i, 4);
            hex = hex + parseInt(chunk, 2).toString(16);
        }
        return hex;
    }

    // --- 3. TOTP Logic ---
    
    function hex2bin(hex) {
        var bytes = [];
        for(var i=0; i< hex.length-1; i+=2)
            bytes.push(parseInt(hex.substr(i, 2), 16));
        return String.fromCharCode.apply(String, bytes);
    }

    function generateTOTP(secret, options) {
        options = options || {};
        var step = options.step || 30;
        var epoch = Math.floor(Date.now() / 1000);
        var counter = Math.floor(epoch / step);
        
        // Base32 decode secret to hex, then to binary string for HMAC
        var keyHex = base32tohex(secret); 
        var keyBin = hex2bin(keyHex);

        // Counter to 8 bytes big-endian
        var time = dec2hex(counter);
        while (time.length < 16) time = "0" + time;
        var timeBin = hex2bin(time);

        // HMAC-SHA1
        var hmac = core_hmac_sha1(keyBin, timeBin); // returns array of 5 integers
        
        // Convert result to byte array
        var hmacBytes = [];
        for(var i=0; i<hmac.length; i++) {
             // each int is 32 bits (4 bytes)
             var val = hmac[i];
             hmacBytes.push((val >>> 24) & 0xFF);
             hmacBytes.push((val >>> 16) & 0xFF);
             hmacBytes.push((val >>> 8) & 0xFF);
             hmacBytes.push(val & 0xFF);
        }

        // Dynamic truncation
        var offset = hmacBytes[19] & 0xf;
        var binary =
            ((hmacBytes[offset] & 0x7f) << 24) |
            ((hmacBytes[offset + 1] & 0xff) << 16) |
            ((hmacBytes[offset + 2] & 0xff) << 8) |
            (hmacBytes[offset + 3] & 0xff);
        
        var otp = binary % 1000000;
        var result = otp.toString();
        while (result.length < 6) result = "0" + result;
        return result;
    }

    function dec2hex(s) { return (s < 15.5 ? '0' : '') + Math.round(s).toString(16); }

    // --- 4. Expose as otplib ---
    // Mimic the interface: otplib.authenticator.generate(secret)
    // and otplib.authenticator.options
    
    var authenticator = {
        options: { step: 30 },
        generate: function(secret) {
            return generateTOTP(secret, this.options);
        }
    };

    exports.otplib = {
        authenticator: authenticator
    };

})(window);