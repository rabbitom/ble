# BLE SDK for Android使用说明

## 简介
本SDK封装了Android BLE API，方便开发人员为应用接入BLE功能。

## 主要特点
1. 不依赖第三方库
1. 使用JSON文档描述BLE设备，将BLE特征映射为字符串
1. 包装原生类，开发者无需引用android.bluetooth包
1. 使用Android本地广播传递消息
1. 内部处理手机蓝牙开关与权限问题

## 使用方法

### 引入SDK

这里介绍两种在APP工程中引入本SDK的方法，一种是通过Gradle库，比较简单，但看不到源代码；另一种是直接将SDK的源代码作为一个模块加入工程。

**方法1：使用Gradle库**

打开项目根目录下的build.gradle，添加以下内容：

```
allprojects {

    repositories {
    ...
    maven { url 'https://jitpack.io' }
    }
}

dependencies {
    ...
    compile 'com.github.rabbitom:ble-app-android:0.1'
}
```

**方法2：使用源代码**

步骤如下：

1. 打开命令行，进入项目根目录，运行 `git clone git@github.com:rabbitom/ble-android.git ble`，将SDK的代码克隆到ble目录下；如果您的项目已经启用了git，则应当以子模块的形式添加：`git submodule add git@github.com:rabbitom/ble-android.git ble`；当然，也可以手动从[GitHub](https://github.com/rabbitom/ble-android)下载SDK的代码，将其解压后放到ble目录下。

1. 打开settings.gradle文件，添加ble目录：
    ```
    include ':app', ':ble'
    ```
1. 打开app/build.gradle文件，添加ble库：
    ```
    dependencies {
        ...
        compile project(path: ':ble')
    }
    ```

参考：[Android开发者文档 - 以依赖项形式添加您的库](https://developer.android.google.cn/studio/projects/android-library.html?hl=zh-cn#AddDependency)

### 准备JSON文档
需要编写JSON文档描述BLE设备的广播、服务和特征，格式请参考[BLE-SDK规格](https://github.com/rabbitom/ble/blob/master/ble-device-schema.json)。JSON文件可以从assets目录加载，也可以从网络获取，要将其解析为JSONObject对象。

### 初始化BleDevicesManager

BleDevicesManager使用单例模式，用以实现搜索BLE设备，以及创建和管理设备对象。  
在搜索设备的Activity中声明BleDevicesManager对象：  
```
BleDevicesManager bleDevicesManager;
```
在OnCreate函数中获取实例，并添加准备好的JSONObject作为搜索过滤条件：
```
bleDevicesManager = BleDevicesManager.getInstance(this);

//JSONObject deviceJson;

try {
    bleDevicesManager.addSearchFilter(deviceJson);
} catch (JSONException e) {
    e.printStackTrace();
}
```
其中addSearchFilter方法的参数device代表设备定义，此方法可多次调用，每次传不同的设备定义，以支持搜索多种设备。

### 搜索设备
（可选）设置搜索超时时间，默认10s，此处改成了5秒：
```
bleDevicesManager.setSearchTimeout(5*1000);
```
开始搜索，参数是Context，用于弹出开启蓝牙、请求权限的对话框：
```
bleDevicesManager.startSearch(this);
```
如果应用允许用户取消搜索，则可以使用stopSearch方法中止：
```
bleDevicesManager.stopSearch();
```
搜索结果通过应用内广播接收，需要实现广播接收器并注册：
```
LocalBroadcastManager lbm = LocalBroadcastManager.getInstance(this);

MySearchReceiver mySearchReceiver = new MySearchReceiver();

mySearchReceiver.registerReceiver(lbm);
```
其中MySearchReceiver继承自BleSearchReceiver，实现了BLESearchCallback接口，此接口中定义了与搜索设备有关的各种广播事件的处理函数。所有函数都为可选，可以有选择地重写：
```
class MySearchReceiver extends BleSearchReceiver{
    
    //无法启动搜索，可能的原因包括：手机不支持BLE、用户拒绝开启蓝牙、拒绝授予位置权限（因为蓝牙通过iBeacon实现室内定位，在Android 6.0以上，使用蓝牙需获取位置权限，并且要在运行时向用户动态请求）
    @Override
        public void onSearchError(int errId, String error) {
        super.onSearchError(errId, error);
    }

    //搜索开始，可以在此方法内显示进度条
    @Override
    public void onSearchStarted() {
        super.onSearchStarted();
    }

    //搜索时间到
    @Override
    public void onSearchTimeOut() {
        super.onSearchTimeOut();
    }

    /* 
     * 搜索到设备，针对每个设备只回调一次
     * 参数：
     *     deviceID：蓝牙地址，用于区分设备
     *     rssi：信号强度，一般为负数，值越大信号越好，距离越近
     *     data：广播信息
     *     deviceType：设备类型，取自传给addSearchFilter的设备定义
     */
    @Override
    public void onFoundDevice(String deviceID, int rssi, Map<Integer, byte[]> data, String deviceType) {
        super.onFoundDevice(deviceID, rssi, data, deviceType);
    }

    //发现设备（onFoundDevice）之后，如果设备的广播信息发生变化，则通过此函数回调
    @Override
    public void onAdvertisementUpdated(String deviceID, Map<Integer, byte[]> data) {
        super.onAdvertisementUpdated(deviceID, data);
    }

    //设备的信号强度变化，可用于实时更新设备列表或估算设备距离
    @Override
    public void onRSSIUpdated(String deviceID, int rssi) {
        super.onRSSIUpdated(deviceID, rssi);
    }

}
```

### 创建设备对象
SDK使用BleDevice包装Android原生的BluetoothDevice类，以实现BLE设备的连接管理和数据收发。BluetoothDevice对象是BleDevice对象的成员，为了防止针对同一个BluetoothDevice对象创建多个包装对象（这样会导致系统回调重复执行），应用应当使用BleDevicesManager来创建和管理设备对象：
```
BleDevice bleDevice = bleDevicesManager.findDevice(deviceID);
if (bleDevice == null)
    bleDevice = bleDevicesManager.createDevice(deviceID, this, BleDevice.class, deviceJson);
```
即先查找bleDevicesManager内是否已存在deviceID对应的BleDevice对象，若有就复用，没有就创建。使用createDevice方法创建的对象都会保存在BleDevicesManager实例的内部数组中。

### 连接设备

应用需要与设备建立连接才能收发数据：
```
bleDevice.connect();
```
连接的结果通过应用内广播接收，同样需要实现接收器并注册：
```
LocalBroadcastManager lbm = LocalBroadcastManager.getInstance(this);

MyDeviceStateReceiver  myDeviceStateReceiver = new MyDeviceStateReceiver();

myDeviceStateReceiver.registerReceiver(lbm);
```
其中MyDeviceStateReceiver继承自BleSearchReceiver，实现了DeviceStateCallback接口，以下是其中与设备连接有关的函数定义：
```
class MyDeviceStateReceiver extends DeviceStateReceiver {

    //蓝牙连接成功，此时还不能开始收发数据，SDK还需要发现服务和特征并与设备定义比对
    @Override
    public void onDeviceConnected(String deviceID) {
        super.onDeviceConnected(deviceID);
    }

    //连接断开
    @Override
    public void onDeviceDisconnected(String deviceID) {
        super.onDeviceDisconnected(deviceID);
    }

    //从设备上发现的服务和特征与设备定义中的描述不匹配
    @Override
    public void onDeviceMismatch(String deviceID) {
        super.onDeviceMismatch(deviceID);
    }

    //设备已准备好，设备定义中描述的服务和特征均已发现
    @Override
    public void onDeviceReady(String deviceID){
           super.onDeviceReady(deviceID);
   }
```

### 数据收发
BLE的数据收发是通过操作特征实现的，SDK在JSON文档中将特征的UUID映射成了字符串节点，因此可以通过这些节点发送和接收数据，数据格式为字节数组：

发送数据：
```
bleDevice.sendData("config", new byte[]{1});
```
开始从节点接收数据：
```
bleDevice.startReceiveData("temperature");
```
停止从节点接收数据：
```
bleDevice.stopReceiveData("temperature");
```
主动读取节点的数据：
```
bleDevice.readData("battery");
```
接收到的数据内容也通过应用内广播传递，回调函数同建立连接时一样，在DeviceStateReceiver中实现：
```
class MyDeviceStateReceiver extends DeviceStateReceiver {

    //收到了来自设备的数据
    @Override
    public void onDeviceReceivedData(String deviceID, String name, byte[] data) {
        super.onDeviceReceivedData(deviceID, name, data);
    }
}
```
在BleDevice类里有一个与上面这个函数同名的方法，用于发送广播，应用可以继承BleDevice类，重写此方法，在设备类内部解析数据：
```
class MyDevice extends BleDevice {

    public static final int VALUE_OF_TEMPERATURE = 1;

    @Override
    public void onDeviceReceivedData(String deviceID, String name, byte[] data) {
        if("tmperature".equals(name) && (data.length == 2)) {
            int value = (data[0] & 0xff) + ((data[1] & 0xff) << 8);
            float temperature = value / 100.0;
            super.onDeviceValueChanged(getDeviceKey(), VALUE_OF_TEMPERATURE, temperature);
        }
    }
}
```
注意重写的方法中并没有调用super的同名实现（onDeviceReceivedData），而是在解析字节数组之后调用了onDeviceValueChanged方法，此方法的第二个参数（VALUE_OF_TEMPERATURE）是一个自定义的整数，表示值的类型，而第三个参数可以是实现了Serializable接口的任何类型，在DeviceStateReceiver中使用同名函数接收广播：
```
class MyDeviceStateReceiver extends DeviceStateReceiver {

    //接收解析后的自定义数据
    @Override
    public void onDeviceValueChanged(String deviceID, int key, Serializable value) {
        super.onDeviceValueChanged(deviceID, key, value);
    }
}
```