
# ble-Android库使用文档

## 简介
该库主要是对Android BLE API的一个封装，方便开发人员轻松接入BLE功能


### 特性：
1. 不依赖第三方库
1. 使用Android本地广播传递消息
1. 使用JSON文档描述BLE设备
1. 内部处理手机蓝牙开关与权限问题

### 集成库：

**方式1：使用gradle**

Step1.在项目根build.gradle文件中配置如下

```
allprojects {
 
	repositories {
	...
	maven { url 'https://jitpack.io' }
	}
}
```
Step2.添加依赖：

```
dependencies {
	
	compile 'com.github.rabbitom:ble-app-android:0.1'
}
```

**方式2：克隆该库源码然后导入自己项目中**

具体导入方式可以看[官方文档](https://developer.android.com/studio/projects/android-library.html?hl=zh-cn)


### 使用方法及原理：

#### 1.编写JSON文档
使用JSON文档描述相应BLE设备（[JSON文档规格看这里](https://github.com/rabbitom/ble/blob/master/ble-device-schema.json))，至于JSON文档的存放位置该库并没有限制，你可以在assets目录下，也可以网络获取。该库只需传入一个用于描述相应BLE设备的JSONObject对象即可。


#### 2.扫描设备
设备扫描主要会使用到该库的以下2个类：
**BleDevicesManager:** 
该类使用单例模式实现。此类用以实现BLE设备的搜索，添加过滤条件，BleDevice类（或者子类）对象的创建。

示例代码：
```
//获取BleDevicesManager对象
BleDevicesManager bleDevicesManager = BleDevicesManager.getInstance(this);

//搜索指定设备（可选），没有过滤条件默认将搜索所有BLE设备
try {
	bleDevicesManager.addSearchFilter(JsonObject jsonObject);
} catch (JSONException e) {
	e.printStackTrace();
}

//搜索超时时间，默认10s
bleDevicesManager.setSearchTimeout(10*1000);
 //开始搜索
bleDevicesManager.startSearch(this);
 
```


**BleSearchReceiver:** 
这是一个广播接收器，继承自Android系统BroadcastReceiver类并且实现了自定义BLESearchCallback接口。此类主要方便开发人员接收搜索设备时发出的广播信息。一般情况下你将在调用BleDevicesManager类的startSearch(Activity activity)方法的页面注册该广播接收器，用以处理搜索设备时发出的各种广播事件。

示例代码：
```
...

//注册本地广播接收器
LocalBroadcastManager lbm = LocalBroadcastManager.getInstance(this);
MySearchReceiver  mySearchReceiver = new MySearchReceiver() 
mySearchReceiver.registerReceiver(lbm);


class MySearchReceiver extends BleSearchReceiver{
	@Override
	public void onSearchStarted() {
		super.onSearchStarted();
		//设备开始搜索时发出的广播，可以在此方法内做显示进度条等操作
	}
	@Override
	public void onFoundDevice(String deviceID, int rssi, Map<Integer, byte[]> data, String deviceType) {
		super.onFoundDevice(deviceID, rssi, data, deviceType);
		//每搜索到设备发出的广播，
	}
	@Override
	public void onAdvertisementUpdated(String deviceID, Map<Integer, byte[]> data) {
		super.onAdvertisementUpdated(deviceID, data);
		//考虑到BLE设备可能会有分段广播的情况，当收到同一BLE设备发出的不同广播时将会发出此广播
	}
	@Override
	public void onRSSIUpdated(String deviceID, int rssi) {
		super.onRSSIUpdated(deviceID, rssi);
		//RSSI信号信息
	}
	@Override
		public void onSearchError(int errId, String error) {
		super.onSearchError(errId, error);
		//当设备不支持BLE功能，用户拒绝开启蓝牙，或者拒绝授予蓝牙权限时会发出此广播
	}
	@Override
	public void onSearchTimeOut() {
		super.onSearchTimeOut();
		//搜索超时发出此广播
		}
	}

```


#### 3.连接设备
设备连接主要也会使用到2个类：
**BleDevice:**
该类主要是对Android原生BluetoothDevice类以及其相应操作的一个封装。使用此对象可方便的实现BLE设备的连接，断开连接，特征读写，通知开关等操作。

示例代码：
 ```
 //BLE设备的mac地址
 String deviceID = getIntent().getStringExtra("deviceID"); 
 
 //先查找bleDevicesManager内是否存在此BleDevice对象，避免重复创建
 BleDevice bleDevice = bleDevicesManager.findDevice(deviceID);
 
 //你应该使用如下方式创建BleDevice对象，bleDevicesManager内部会维护所有创建过的BleDevice对象，以避免重复创建
 if (bleDevice == null) {
	bleDevice = bleDevicesManager.createDevice(deviceID, this, BleDevice.class, jsonObject);
	}
	
//连接设备
 if (bleDevice != null) {
		bleDevice.connect(); }

 ```

**DeviceStateReceiver:** 
此类和BleSearchReceiver类似，继承自Android系统BroadcastReceiver类并且实现了自定义DeviceStateCallback接口。此类主要方便开发人员接收设备连接以及数据收发时发出的各种广播信息。一般情况下你将在调用BleDevice的connect()方法的页面注册该广播接收器。

```
...

//注册本地广播接收器
LocalBroadcastManager lbm = LocalBroadcastManager.getInstance(this);
MyDeviceStateReceiver  myDeviceStateReceiver = new MyDeviceStateReceiver() 
myDeviceStateReceiver.registerReceiver(lbm);


class MyDeviceStateReceiver extends DeviceStateReceiver {
	@Override
	public void onDeviceConnected(String deviceID) {
		super.onDeviceConnected(deviceID);
		//设备连接上时发出的广播
	}
	@Override
	public void onDeviceDisconnected(String deviceID) {
		super.onDeviceDisconnected(deviceID);
		//设备断开连接时发出的广播
	}
	@Override
	public void onDeviceError(String deviceID, int errId, String error) {
		super.onDeviceError(deviceID, errId, error);
		//设备连接失败时发出的广播
	}
	@Override
	public void onDeviceMismatch(String deviceID) {
		super.onDeviceMismatch(deviceID);
		//JSON文档描述的服务与特征在搜索到的设备内未找到时发出的广播
	}
	@Override
   	public void onDeviceReady(String deviceID){
   		super.onDeviceReady(deviceID);
   		//设备连接并成功发现JSON文档描述的所有服务与特征时发出的广播
   }
   @Override
   public void onDeviceReceivedData(String deviceID, String name, byte[] data) {
   		super.onDeviceReceivedData(deviceID, name, data);
   		//接收到BLE设备发送的数据时发出的广播
   }
   @Override
   public void onDeviceRSSIUpdated(String deviceID, int rssi) {
   		super.onDeviceRSSIUpdated(deviceID, rssi);
   		//BLE设备RSSI信号改变时发出的广播
   }
   @Override
   public void onDeviceValueChanged(String deviceID, int key, Serializable value) {
   		super.onDeviceValueChanged(deviceID, key, value);
   		//预留给用户的在数据改变时发送的广播，可以在onDeviceReceivedData方法内解析完数据后调用此方法
   		}
   }  

```

#### 4.数据读写与通知开关
使用该库可以很方便的对BLE设备进行数据读写与开关通知。所有这些操作都是通过JSON文档内的节点名来调用的。

**写入数据：**
```
//向节点名为“send”的节点发送字节数据 1
bleDevice.sendData(“send”, new byte[]{1});
```
**读数据：**
```
//读取节点名为“read”的数据 
bleDevice.readData(“read”);
```
**打开通知：**
```
//打开节点名为“notifyData”的数据 
bleDevice.startReceiveData(“notifyData”);

```
**关闭通知：**
```
//关闭节点名为“notifyData”的数据 
bleDevice.stopReceiveData(“notifyData”);

```



