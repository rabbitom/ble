var bleno = require('bleno');
var PrimaryService = bleno.PrimaryService;
var Characteristic = bleno.Characteristic;

function startMock(device, handler) {
	console.log('waiting for ble state to be on...');
	process.env['BLENO_DEVICE_NAME'] = device.advertisement.name;
	return new Promise((resolve,reject) => {
		bleno.on('stateChange', (state)=>{
			console.log('ble state changed to: ' + state);
			if(state == 'poweredOn') {
				resolve();
			}
		});
	}).then(()=>{
		return new Promise((resolve,reject) => {
			bleno.startAdvertising(device.advertisement.name, [device.advertisement.service], (error)=>{
				if(error) {
					console.error('ble start advertising failed');
					if(error instanceof Error)
						throw error;
					else
						throw new Error(error);
				}
				else {
					console.log('ble started advertising');
					resolve();
				}
			});
		});
	}).then(()=>{
		var services = [];
		for(var s of device.services) {
			var characteristics = [];
			for(var c of s.characteristics) {
				var characteristic = new Characteristic({
					uuid: c.uuid,
					properties: c.properties,
					onReadRequest: handler[c.name].onRead,
					onWriteRequest: handler[c.name].onWrite,
					onSubscribe: handler[c.name].onSubscribe,
					onUnsubscribe: handler[c.name].onUnsubscribe
				});
				characteristics.push(characteristic);
			}
			var service = new PrimaryService({
				uuid: s.uuid,
				characteristics: characteristics
			});
			services.push(service);
		}
		return new Promise((resolve,reject) => {
			bleno.setServices(services, (error)=>{
				if(error) {
					console.error('ble set services failed');
					if(error instanceof Error)
						throw error;
					else
						throw new Error(error);
				}
				else {
					console.log('ble services set');
					resolve();
				}
			});
		});
	});
}

module.exports.start = startMock;
module.exports.DONE = Characteristic.RESULT_SUCCESS;