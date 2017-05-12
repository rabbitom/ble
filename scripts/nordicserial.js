var ble = require('ble-sdk');
var device = require('./nordicserial.json');

var currentStatus = Buffer.from([0xa0, 0x10, 0, 0]);
var currentStatusUpdateHandle;

var handler = {
	send: {
		onWrite: (data,offset,withoutResponse,callback)=>{
			console.log(`ble received config at offset ${offset}: `, data);
			if(data.length == currentStatus.length) {
				data.copy(currentStatus);
			}
			if(!withoutResponse)
				callback(mock.DONE);
		}
	},
	receive: {
		onSubscribe: (maxValueSize,updateValueCallback)=>{
			console.log(`ble subscribed data, maxValueSize = ${maxValueSize}`);
			currentStatusUpdateHandle = setInterval((callback)=>{
				console.log('send data: ', currentStatus);
				callback(currentStatus);
			}, 100, updateValueCallback);
		},
		onUnsubscribe: (maxValueSize)=>{
			console.log(`ble unsubscribed data, maxValueSize = ${maxValueSize}`);
			clearInterval(currentStatusUpdateHandle);
		}
	}
};

ble.mock(device, handler).catch((error)=>{
	console.error(error);
	process.exit(1);
});
