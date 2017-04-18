## 说明

* 命名空间或包名：net.erabbit
* 此SDK只考虑应用实现主设备角色的情况
* 此SDK的目标之一是为各平台的实现定义统一的接口，方便多平台及跨平台开发，在某一具体平台上，按照SDK的规定实现可能显繁琐或性能受影响，这可以接受

## 设备定义

以JSON文档描述蓝牙设备的广播信息、服务与特征，并将特征映射为数据点，规范详见：[BleDevice Schema](ble-device-schema.json)，示例：  
```
{
    "version": "2017-04-17",
    "advertisement": {
        "name": "NordicSerial",
        "service": "6e400001b5a3f393e0a9e50e24dcca9e",
        "nameFilterPattern": ".+"
    },
    "services": [
        {
            "uuid": "6e400001b5a3f393e0a9e50e24dcca9e",
            "name": "main",
            "characteristics": [
                {
                    "uuid": "6e400002b5a3f393e0a9e50e24dcca9e",
                    "name": "send",
                    "properties": [
                        "write"
                    ]
                },
                {
                    "uuid": "6e400003b5a3f393e0a9e50e24dcca9e",
                    "name": "receive",
                    "properties": [
                        "notify"
                    ]
                }
            ]
        }
    ]
}
```

## 实现思路

* 主要实现两个类，一个用于管理设备，一个代表具体的设备
* 具体设备以ID标识，此ID取自系统原生蓝牙设备对象
* 设备对象统一管理，不在应用的组件间传递，代之以设备ID
* 回调以通知机制传递，避免设置代理对象，将回调处理函数定义成接口

## 类

* BleDevicesManager
  
  搜索和管理设备

  * 单例模式，在应用的整个生命周期中可用
  * 属性：
    * autoSearch
      * 布尔类型，设置是否在蓝牙可用时立即开始搜索
    * curDevice
      * 在同一时刻只连接一个设备的应用中设置和获取当前设备，BleDevice或其子类
  * 方法：
    * addDeviceFilter
      * 添加设备定义，在搜索时只搜索指定类型的设备，可以多次调用以支持多个设备类型，若从未调用过则搜索所有设备
      * 参数：JSON文档的内容，类型可以是JSON对象或字典
    * setSearchTimeout
      * 设置搜索设备的超时时间，到时间后自动停止
      * 参数：时间
    * startSearch
      * 开始搜索
      * 返回：搜索是否可以启动，比如若设备不支持蓝牙、蓝牙没有打开、没有相应权限，都应当返回false
    * stopSearch
      * 结束搜索
    * findDevice
      * 从内部设备列表中查找设备，用于避免创建针对同一个原生设备的包装对象，以及避免在应用间传递设备信息时复制对象
      * 参数：设备ID
      * 返回：BleDevice或其子类
    * createDevice
      * 以工厂模式创建设备并保存在内部列表中
      * 参数：设备ID，设备类，设备定义
      * 返回：BleDevice或其子类
  * 回调接口：
    * onSearchStarted
      * 在搜索实际开始后调用
    * onSearchTimeout
      * 在搜索超时后调用，如果应用主动调用stopSearch中止搜索则不应调用
    * onFoundDevice
      * 在搜索到设备后调用，每启动一次搜索，一个设备只调用一次
      * 参数：设备ID，RSSI，广播信息，设备类型
    * onAdvertisementUpdated
      * 当设备的广播信息有更新时调用
    * onRSSIUpdated
      * 当设备的RSSI值更新时调用，用于在搜索过程中更新设备信号强度
      * 参数：设备ID，RSSI

* BleDevice
  
  包装蓝牙设备对象

  * 构造函数
    * 参数：系统原生的蓝牙设备，设备定义
  * 属性：
    * deviceKey
      * （只读）系统原生蓝牙设备的ID，字符串类型
    * deviceName
      * 设备名称，默认使用广播名或设备名，可以修改
    * connected
      * （只读）获取蓝牙连接状态，布尔类型
    * nativeDevice
      * 系统原生的蓝牙设备对象
    * advertisementData
      * 广播数据，字典类型
  * 方法：
    * connect
      * 建立连接
    * disconnect
      * 断开连接
    * sendData
      * 发送数据
      * 参数：数据点（字符串，默认：send），数据内容（字节数组）
    * readData
      * 读取数据
      * 参数：数据点（字符串，默认：settings）
    * startReceiveData
      * 开始接收数据
      * 参数：数据点（字符串，默认：receive）
    * stopReceiveData
      * 停止接收数据
      * 参数：数据点（字符串，默认：receive）
    * readRSSI
      * 读取设备信号强度
  * 回调接口：
    * onDeviceConnected
      * 在建立连接后调用
      * 参数：设备ID
    * onDeviceReady
      * 在发现服务、特征完成后调用
      * 参数：设备ID
    * onDeviceMismatch
      * 发现的服务、特征与设备定义不匹配
      * 参数：设备ID
    * onDeviceDisconnected
      * 在连接断开后调用
      * 参数：设备ID
    * onDeviceReceivedData
      * 在收到数据时调用
      * 参数：设备ID，数据点，数据内容（字节数组）
    * onDeviceValueChanged
      * 在设备解析接收到的数据完成后调用
      * 参数：设备ID，键（整数，通过枚举或常量定义），值（任意对象）
    * onDeviceError
      * 在设备操作出错时回调，比如发现服务和特征失败，发送数据失败等
      * 参数：设备ID，错误ID（整数），错误信息（字符串）
    * onDeviceRSSIUpdated
      * 在读取到设备的RSSI值时回调
      * 参数：设备ID，RSSI

* BleUtility
  
  工具类，只包含静态方法和常量定义，包括但不限于：

  * UUID转换（16位转128位，从字节数组或非标准字符串生成）
  * 获取常见服务、特征的文字描述
  * 获取系统API中的枚举、常量等的文字描述

## 日志

* 所有日志内容以[ble]开头
* BleDevice的日志内容在[ble]之后追加[deviceName]或[deviceKey]