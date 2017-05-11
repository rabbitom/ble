var Characteristic = require('bleno').Characteristic;

var currentStatus = Buffer.from([0xa0, 0x10, 0, 0]);
var currentStatusUpdateHandle;

function SimpleEchoDevice()
{
	this.config = {
		onWrite: (data,offset,withoutResponse,callback)=>{
			console.log(`ble received config at offset ${offset}: `, data);
			if(data.length == currentStatus.length) {
				data.copy(currentStatus);
			}
			if(!withoutResponse)
				callback(Characteristic.RESULT_SUCCESS);
		}
	};
	this.data = {
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
}

module.exports = SimpleEchoDevice;