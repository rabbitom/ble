#!/usr/bin/env node
var device = require('./nordicserial.json');
var chars = [];
for(var service of device.services)
    for(var char of service.characteristics)
        chars.push(char.name);
for(var char of chars) {
    console.log(char);
    //console.log(`<string name="${char}"></string>`);
}
