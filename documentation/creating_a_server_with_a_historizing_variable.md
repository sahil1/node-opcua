
# Creating a server exposing a simple historizing variable

In this tutorial, we are going to create a simple server that
exposes the pressure of a vessel as an historizing variable.

### The Server Script

Let's use a very basic server script :

``` javascript
var opcua = require("node-opcua");
var path = require("path");
var assert = require("assert");
// Let's create an instance of OPCUAServer
var server = new opcua.OPCUAServer({
    port: 26543, // the port of the listening socket of the server
    resourcePath: "UA/MyLittleServer", // this path will be added to the endpoint resource name
    nodeset_filename: [
        opcua.standard_nodeset_file,
    ]
});
function construct_address_space(server) {
  var addressSpace = server.engine.addressSpace;
  _"create the vessel object"
  _"create historizing variable"
  _"adding historical configuration"
  _"simulating data"
};
function post_initialize() {
    construct_address_space(server);
    server.start(function() {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("port ", server.endpoints[0].port);
        var endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log(" the primary server endpoint url is ", endpointUrl );
    });
}
server.initialize(post_initialize);
```

We add the code to create the variable inside the ```construct_address_space``` method.

### create the vessel object

The vessel object will appear in the standard Object Folder

``` javascript
var vessel = addressSpace.addObject({
    browseName: "Vessel",
    organizedBy: addressSpace.rootFolder.objects
});

```

### create historizing variable

We will create  the ``vesselPressure``` variable as a AnalogDataItem, so we can specify
engineering  units in Bars and value range.

``` javascript
var vesselPressure = addressSpace.addAnalogDataItem({
    browseName: "Pressure",
    engineeringUnitsRange: {
        low:  0,
        high: 10.0
    },
    engineeringUnits: opcua.standarUnits.bar,
    componentOf: vessel
});
```

### adding historical configuration

We now declare the vesselPressure variable to be a Historical datanode.

``` javascript
addressSpace.installHistoricalDataNode(vesselPressure);
```

InstallHistoricalDataNode does a few things for us:
  * it instantiate a HA Configuration object
  * it sets the historizing flag of the variable
  * it starts recording value changes into a small online data storage of 2000 values.

### simulating data

To see the value change and create a fake history, we can simply install a timer
to change the value on a regular basis.

``` javascript
// simulate pressure change
var t = 0;
setInterval(function() {
  var value = (Math.sin(t/50)*0.70+Math.random()*0.20)*5.0+5.0;
  vesselPressure.setValueFromSource({dataType:"Double",value:value});
  t=t+1;
}, 200);

```

# exploring the results with UAExpert:

It is now time to launch your favorite OPCUA Client to check the results.

The Vessel exposing the historising VesselPressure variable and its HA Configuration object:

![](images/image1.png)

The History graph:
![](images/image2.png)

[sample_server_with_historizing_variable.js](#the-server-script "save:") script.

source code : [source.js](./sample_server_with_historizing_variable.js)
