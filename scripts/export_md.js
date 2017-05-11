var device = require('./nordicserial.json');
let propertyNames = {
    read: '读',
    write: '写',
    notify: '通知'
};
var arr = [];
for(var service of device.services) {
    arr.push('\n');
    arr.push('服务UUID：',service.uuid,'\n\n');
    arr.push('特征：\n\n');
    arr.push('名称|UUID|属性|说明\n');
    arr.push('-|-|-|-\n');
    for(var char of service.characteristics) {
        arr.push(char.name, '|');
        arr.push(char.uuid, '|');
        var props = [];
        for(var prop of char.properties) {
            props.push(propertyNames[prop]);
        }
        arr.push(props.join(','), '|');
        arr.push(char.description, '\n');
    }
}
var str = arr.join('');
console.log(str);
var fs = require('fs');
fs.writeFile('export.md', str, (err)=>{
    if(err)
        console.error('write to file failed', err);
    else
        console.log('written to file.');
});