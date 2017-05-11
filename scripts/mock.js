var bleno = require('bleno');
var PrimaryService = bleno.PrimaryService;
var Characteristic = bleno.Characteristic;
var device = require('./nordicserial.json');
var MockDevice = require('./nordicserial.js');

console.log('ble mock started with device definition: ', device);

process.env['BLENO_DEVICE_NAME'] = device.advertisement.name;

bleno.on('stateChange', (state)=>{
	console.log('ble state changed to: ' + state);
	if(state == 'poweredOn') {
		startAdvertising();
	}
});

function startAdvertising() {
	bleno.startAdvertising(device.advertisement.name, [device.advertisement.service], (error)=>{
		if(error)
			console.error('ble start advertising failed with error: ', error);
		else {
			console.log('ble started advertising');
			setServices();
		}
	});
}

function setServices() {
	var mock = new MockDevice();
	var services = [];
	for(var s of device.services) {
		var characteristics = [];
		for(var c of s.characteristics) {
			var characteristic = new Characteristic({
				uuid: c.uuid,
				properties: c.properties,
				onReadRequest: mock[c.name].onRead,
				onWriteRequest: mock[c.name].onWrite,
				onSubscribe: mock[c.name].onSubscribe,
				onUnsubscribe: mock[c.name].onUnsubscribe
			});
			characteristics.push(characteristic);
		}
		var service = new PrimaryService({
			uuid: s.uuid,
			characteristics: characteristics
		});
		services.push(service);
	}
	bleno.setServices(services, (error)=>{
		if(error)
			console.error('ble set services failed with error: ', error);
		else
			console.log('ble services set');
	});
}
