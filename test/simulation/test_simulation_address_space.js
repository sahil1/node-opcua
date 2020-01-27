"use strict";
require("requirish")._(module);

var _ = require("underscore");
var async = require("async");

var sinon = require("sinon");

var opcua = require("index");


var TimestampsToReturn = opcua.read_service.TimestampsToReturn;

var makeNodeId = opcua.makeNodeId;
var coerceNodeId = opcua.coerceNodeId;

var DataType = opcua.DataType;
var Variant = opcua.Variant;
var VariantArrayType = opcua.VariantArrayType;
var DataValue = opcua.DataValue;
var AttributeIds = opcua.AttributeIds;
var StatusCodes = opcua.StatusCodes;
var NumericRange = opcua.NumericRange;

var WriteValue = opcua.write_service.WriteValue;
var ReadValueId = opcua.read_service.ReadValueId;
var subscription_service = opcua.subscription_service;
var Subscription = subscription_service.Subscription;
var MonitoredItemCreateRequest = subscription_service.MonitoredItemCreateRequest;


var address_space_for_conformance_testing = require("lib/simulation/address_space_for_conformance_testing");
var build_address_space_for_conformance_testing = address_space_for_conformance_testing.build_address_space_for_conformance_testing;

var address_space = require("lib/address_space/address_space");
var server_engine = require("lib/server/server_engine");
var SessionContext = require("lib/server/session_context").SessionContext;
var context = SessionContext.defaultContext;


var should = require("should");
var assert = require("better-assert");

var namespaceIndex = 411; // namespace for conformance testing nodes

var resourceLeakDetector = require("test/helpers/resource_leak_detector").resourceLeakDetector;
var assert_arrays_are_equal = require("test/helpers/typedarray_helpers").assert_arrays_are_equal;


describe("testing address space for conformance testing", function () {

    var engine;

    this.timeout(140000); // very large time out to cope with heavy loaded vms on CI.


    before(function (done) {
        resourceLeakDetector.start();

        engine = new server_engine.ServerEngine();
        var nodeset_filename = [
            server_engine.mini_nodeset_filename,
            server_engine.part8_nodeset_filename
        ];
        engine.initialize({nodeset_filename: nodeset_filename}, function () {
            build_address_space_for_conformance_testing(engine, {mass_variables: false});

            // address space variable change for conformance testing are changing randomly
            // let wait a little bit to make sure variables have changed at least once
            setTimeout(done, 500);
        });
    });
    after(function () {
        if (engine) {
            engine.shutdown();
            engine = null;
        }
        resourceLeakDetector.stop();
    });

    it("should check that AccessLevel_CurrentRead_NotCurrentWrite Int32 can be read but not written", function (done) {

        var nodeId = makeNodeId("AccessLevel_CurrentRead_NotCurrentWrite", namespaceIndex);


        var nodesToRefresh = [{nodeId: nodeId}];
        engine.refreshValues(nodesToRefresh, function (err) {

            if (!err) {
                var value = engine.readSingleNode(context, nodeId, AttributeIds.Value);

                value.statusCode.should.eql(StatusCodes.Good);
                value.value.dataType.should.eql(DataType.Int32);
                value.value.arrayType.should.eql(VariantArrayType.Scalar);
                value.value.value.should.eql(36);

                // now write it again
                var writeValue = new WriteValue({
                    nodeId: nodeId,
                    attributeId: AttributeIds.Value,
                    value: {
                        value: {
                            dataType: DataType.Int32,
                            value: 1000
                        }
                    }
                });
                engine.writeSingleNode(context, writeValue, function (err, statusCode) {
                    statusCode.should.eql(StatusCodes.BadNotWritable, " writing on AccessLevel_CurrentRead_NotCurrentWrite should raise BadNotWritable ");
                    done(err);
                });

            } else {
                done(err);
            }

        });

    });


    it("should read a simulated float variable and check value change", function (done) {

        var nodeId = makeNodeId("Scalar_Simulation_Float", namespaceIndex);
        var variable = engine.addressSpace.findNode(nodeId);

        var value1 = null;

        async.series([
            function (callback) {
                var nodeId = makeNodeId("Scalar_Simulation_Interval", namespaceIndex);
                var simulationInterval = engine.addressSpace.findNode(nodeId, namespaceIndex);
                var dataValue = new DataValue({value: {dataType: "UInt16", value: 100}});
                simulationInterval.writeValue(context, dataValue, callback);
            },
            function (callback) {
                variable.readValueAsync(context, function (err, dataValue) {

                    should.exist(dataValue);
                    dataValue.statusCode.should.eql(StatusCodes.Good);
                    //xx console.log("xxx ", dataValue? dataValue.toString():"" );
                    value1 = dataValue.value.value;
                    callback(err);
                });
            },
            function (callback) {
                setTimeout(callback, 300);
            },

            function (callback) {
                variable.readValueAsync(context, function (err, dataValue) {

                    should.exist(dataValue);
                    dataValue.statusCode.should.eql(StatusCodes.Good);
                    var value2 = dataValue.value.value;
                    value2.should.not.eql(value1);
                    callback(err);
                });
            }
        ], done);
    });

    it("should be able to write a array of double on Scalar_Static_Array_Double", function (done) {

        var nodeId = makeNodeId("Scalar_Static_Array_Double", namespaceIndex);
        var value = engine.readSingleNode(context, nodeId, AttributeIds.Value);

        value.statusCode.should.eql(StatusCodes.Good);
        value.value.dataType.should.eql(DataType.Double);
        value.value.arrayType.should.eql(VariantArrayType.Array);
        value.value.value.length.should.eql(10);

        // now write it again
        var writeValue = new WriteValue({
            nodeId: nodeId,
            attributeId: AttributeIds.Value,
            value: {
                value: {
                    dataType: DataType.Double,
                    arrayType: VariantArrayType.Array,
                    value: [10, 20, 30, 40, 50]
                }
            }
        });
        engine.writeSingleNode(context, writeValue, function (err, statusCode) {
            statusCode.should.eql(StatusCodes.Good);
            done(err);
        });

    });

    it("should write a scalar Int32 value to the  Scalar_Static_Int32_NodeId node", function (done) {

        // change one value
        var nodeId = makeNodeId("Scalar_Static_Int32", namespaceIndex);

        var writeValue = new WriteValue({
            nodeId: nodeId,
            attributeId: AttributeIds.Value,
            value: {
                value: {
                    dataType: DataType.Int32,
                    value: 1000
                }
            }
        });
        engine.writeSingleNode(context, writeValue, function (err, statusCode) {
            statusCode.should.eql(StatusCodes.Good);
            done(err);
        });

    });

    it("should write a scalar Double value to the  Scalar_Static_Duration node", function (done) {

        // change one value
        var nodeId = makeNodeId("Scalar_Static_Duration", namespaceIndex);

        var writeValue = new WriteValue({
            nodeId: nodeId,
            attributeId: AttributeIds.Value,
            value: {
                value: {
                    dataType: DataType.Double,
                    value: 2.0
                }
            }
        });
        engine.writeSingleNode(context, writeValue, function (err, statusCode) {
            statusCode.should.eql(StatusCodes.Good);
            done(err);
        });

    });
    it("should write a scalar UInt32 value to the  Scalar_Static_UInteger node", function (done) {

        // change one value
        var nodeId = makeNodeId("Scalar_Static_UInteger", namespaceIndex);

        var writeValue = new WriteValue({
            nodeId: nodeId,
            attributeId: AttributeIds.Value,
            value: {
                value: {
                    dataType: DataType.UInt32,
                    value: 2.0
                }
            }
        });
        engine.writeSingleNode(context, writeValue, function (err, statusCode) {
            statusCode.should.eql(StatusCodes.Good);
            done(err);
        });

    });
    it("should build an address space for conformance testing with options.mass_variables", function (done) {


        async.series([
            function (callback) {
                // browseName Interval
                // browseName Enabled
                var intervalNodeId = makeNodeId("Scalar_Simulation_Interval", namespaceIndex);
                // change interval to 200 ms

                var writeValue = new WriteValue({
                    nodeId: intervalNodeId,
                    attributeId: AttributeIds.Value,
                    value: {
                        value: {
                            dataType: DataType.UInt16,
                            value: 250
                        }
                    }
                });

                engine.writeSingleNode(context, writeValue, function (err, statusCode) {
                    callback(err);
                });
            },
            function (callback) {

                // set enable to true
                var enabledNodeId = makeNodeId("Scalar_Simulation_Enabled", namespaceIndex);

                var writeValue = new WriteValue({
                    nodeId: enabledNodeId,
                    attributeId: AttributeIds.Value,
                    value: {
                        value: {
                            dataType: DataType.Boolean,
                            value: true
                        }
                    }
                });

                engine.writeSingleNode(context, writeValue, function (err, statusCode) {
                    callback(err);
                });
            }
        ], done);


    });

    function writeValueRangeInScalar(nodeId, dataType, value, range, callback) {
        var request = new WriteValue({
            nodeId: nodeId,
            attributeId: AttributeIds.Value,
            indexRange: range,
            value: {
                value: {
                    dataType: dataType,
                    arrayType: VariantArrayType.Scalar,
                    value: value
                }
            }
        });

        engine.writeSingleNode(context, request, function (err, statusCode) {
            callback(err, statusCode);
        });

    }

    function writeValue(nodeId, dataType, value, callback) {

        writeValueRangeInScalar(nodeId, dataType, value, null, callback);
    }

    function readValue(nodeId, callback) {
        var request = new ReadValueId({
            nodeId: nodeId,
            attributeId: AttributeIds.Value
        });
        var dataValue = engine._readSingleNode(context, request);
        callback(null, dataValue.value.value);
    }

    it("should write a new value on Scalar_Static_Int16 and check with read", function (done) {

        var nodeId = makeNodeId("Scalar_Static_Int16", namespaceIndex);

        var l_value = 555;
        async.series([


            function (callback) {
                readValue(nodeId, function (err, value) {
                    l_value = value;
                    l_value.should.eql(0);
                    callback(err);
                });
            },
            function (callback) {
                l_value.should.eql(0);
                writeValue(nodeId, DataType.Int16, l_value + 100, function (err, statusCode) {
                    callback(err);
                });
            },
            function (callback) {
                readValue(nodeId, function (err, value) {
                    value.should.eql(l_value + 100);
                    callback(err);
                });
            }
        ], done);
    });

    it("should read a array Boolean", function (done) {


        var nodeId = makeNodeId("Scalar_Static_Array_Boolean", namespaceIndex);

        var request = new ReadValueId({
            nodeId: nodeId,
            attributeId: AttributeIds.Value
        });
        var dataValue = engine._readSingleNode(context, request);
        dataValue.statusCode.should.eql(StatusCodes.Good);
        dataValue.value.value.should.be.instanceOf(Array);
        dataValue.value.value.length.should.eql(10);
        dataValue.value.value[0].should.eql(false);

        // -------------------------------------------------------------------------------------------------------------
        request = new ReadValueId({
            nodeId: nodeId,
            indexRange: "1",
            attributeId: AttributeIds.Value
        });
        dataValue = engine._readSingleNode(context, request);
        dataValue.statusCode.should.eql(StatusCodes.Good);
        dataValue.value.value.should.be.instanceOf(Array);
        dataValue.value.value.length.should.eql(1);
        dataValue.value.value[0].should.eql(false);

        done();
    });

    function readValueArray(nodeId, indexRange, callback) {

        indexRange = indexRange || new NumericRange();

        var request = new ReadValueId({
            nodeId: nodeId,
            indexRange: indexRange,
            attributeId: AttributeIds.Value
        });
        var dataValue = engine._readSingleNode(context, request);
        dataValue.statusCode.should.eql(StatusCodes.Good);
        callback(null, dataValue.value.value);
    }

    function writeValueArray(nodeId, dataType, indexRange, value, callback) {
        assert(_.isArray(value));
        var request = new WriteValue({
            nodeId: nodeId,
            attributeId: AttributeIds.Value,
            indexRange: indexRange,
            value: {     // DataValue
                value: new Variant({ // Variant
                    arrayType: VariantArrayType.Array,
                    dataType: dataType,
                    value: value
                })
            }
        });
        if(false) {
            console.log("      value = ", value);
            console.log(" indexRange = ", indexRange);
            console.log(" indexRange = ", request.indexRange.toString());
            console.log(" indexRange = ", request.indexRange.type.toString());
            console.log("    request = ", request.toString());
        }
        engine.writeSingleNode(context, request, function (err, statusCode) {
            callback(err, statusCode);
        });
    }

    it("should read an array slice inside an array ", function (done) {

        var nodeId = makeNodeId("Scalar_Static_Array_Int32", namespaceIndex);

        var data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        writeValueArray(nodeId, DataType.Int32, null, data, function (err, value) {
            should(err).eql(null);
            readValueArray(nodeId, "3:4", function (err, value) {
                value.length.should.eql(2);
                assert_arrays_are_equal(value, new Int32Array([4, 5]));
                done(err);
            });
        });
    });

    it("should read the last 3 elements of an array  ", function (done) {

        var nodeId = makeNodeId("Scalar_Static_Array_Int32", namespaceIndex);

        var data = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        writeValueArray(nodeId, DataType.Int32, null, data, function (err, value) {
            should(err).eql(null);
            readValueArray(nodeId, "7:9", function (err, value) {
                value.length.should.eql(3);
                assert_arrays_are_equal(value, new Int32Array([7, 8, 9]));
                done(err);
            });
        });
    });

    it("should read a range '1:2' of a ByteString Array",function (done){

        var nodeId = makeNodeId("Scalar_Static_Array_ByteString", namespaceIndex);

        var data = [ new Buffer("HelloWorld1") , new Buffer("HelloWorld2") ,new Buffer("HelloWorld3"),new Buffer("HelloWorld4")];

        writeValueArray(nodeId, DataType.ByteString, null, data, function (err, value) {

            should(err).eql(null);

            readValueArray(nodeId, "1:2", function (err, value) {
                value.length.should.eql(2);
                assert_arrays_are_equal(value, [ new Buffer("HelloWorld2") , new Buffer("HelloWorld3") ]);
                done(err);
            });
        });

    });

    it("should read a range '1:2,9:10' of a ByteString Array",function (done){

        var nodeId = makeNodeId("Scalar_Static_Array_ByteString", namespaceIndex);

                              // 01234567890
        var data = [ new Buffer("HelloWorld1") , new Buffer("HelloWorld2") ,new Buffer("HelloWorld3"),new Buffer("HelloWorld4")];

        writeValueArray(nodeId, DataType.ByteString, null, data, function (err, value) {

            should(err).eql(null);

            readValueArray(nodeId, "1:2,9:10", function (err, value) {
                value.length.should.eql(2);
                assert_arrays_are_equal(value, [ new Buffer("d2") , new Buffer("d3") ]);
                done(err);
            });
        });

    });


    it("should write an array slice inside an array ", function (done) {

        var nodeId = makeNodeId("Scalar_Static_Array_Int32", namespaceIndex);

        var original_data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        async.series([

            // load the variable with the initial array
            function (callback) {
                writeValueArray(nodeId, DataType.Int32, null, original_data, function (err, statusCode) {
                    statusCode.should.eql(StatusCodes.Good);
                    callback(err);
                });
            },

            // make sure that variable contains the initial array
            function (callback) {
                readValueArray(nodeId, null, function (err, value) {
                    value.length.should.eql(10);
                    assert_arrays_are_equal(value, new Int32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                    callback(err);
                });
            },

            // now read a single element
            function (callback) {
                readValueArray(nodeId, "3", function (err, value) {
                    value.length.should.eql(1);
                    assert_arrays_are_equal(value, new Int32Array([4]));
                    callback(err);
                });
            },
            // now read a single element
            function (callback) {
                readValueArray(nodeId, null, function (err, value) {
                    value.length.should.eql(10);
                    value.should.eql(new Int32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
                    callback(err);
                });
            },

            // now read a range
            function (callback) {
                readValueArray(nodeId, "3:4", function (err, value) {
                    value.length.should.eql(2);
                    assert_arrays_are_equal(value, new Int32Array([4, 5]));
                    callback(err);
                });
            },

            // now replace element 2 & 3
            function (callback) {

                var sub_array = [123, 345];
                writeValueArray(nodeId, DataType.Int32, "2:3", sub_array, function (err, statusCode) {

                    statusCode.should.eql(StatusCodes.Good);
                    callback(err);
                });
            },

            // verify that whole array is now as expected
            function (callback) {
                readValueArray(nodeId, null, function (err, value) {
                    value.length.should.eql(10);
                    //xx console.log(" =>", value);
                    assert_arrays_are_equal(value, new Int32Array([1, 2, 123, 345, 5, 6, 7, 8, 9, 10]));
                    callback(err);
                });
            }
        ], done);
    });

    xit("should write an  element inside an array of Float (indexRange 2:4) ", function (done) {

        done();
    });

    xit("should write an  element inside an array of Boolean (indexRange 2:4) ", function (done) {
        done();
    });

    it("should write an  element inside an array ( indexRange 2:4 ) ", function (done) {


        var nodeId = makeNodeId("Scalar_Static_Array_Int16", namespaceIndex);

        var l_value = null;
        async.series([

            function (callback) {
                readValueArray(nodeId, null, function (err, value) {
                    l_value = value;
                    l_value.length.should.eql(10);
                    callback(err);
                });
            },
            function (callback) {

                l_value.length.should.eql(10);
                l_value[3] += 1000;
                l_value[4] += 2000;
                var newValue = [l_value[3], l_value[4]];

                writeValueArray(nodeId, DataType.Int16, "3:4", newValue, function (err, statusCode) {
                    callback(err);
                });

            },

            function (callback) {
                readValueArray(nodeId, null, function (err, value) {
                    value.length.should.eql(10);
                    value.should.eql(l_value);
                    callback(err);
                });
            },

            function (callback) {
                readValueArray(nodeId, "4", function (err, value) {
                    value.length.should.eql(1);
                    assert_arrays_are_equal(value, new Int16Array([l_value[4]]));
                    callback(err);
                });
            },
            function (callback) {
                readValueArray(nodeId, "3:5", function (err, value) {
                    value.length.should.eql(3);
                    assert_arrays_are_equal(value, new Int16Array([l_value[3], l_value[4], l_value[5]]));
                    callback(err);
                });
            }
        ], done);
    });


    it("should be possible to write to a an Array of Byte with a ByteString", function (done) {

        var nodeId = makeNodeId("Scalar_Static_Array_Byte", namespaceIndex);

        var l_value = null;

        async.series([

            function (callback) {
                readValueArray(nodeId, null, function (err, value) {
                    l_value = value;
                    l_value.length.should.eql(10);
                    callback(err);
                });
            },
            function (callback) {

                var newValue = new Buffer("Lorem ipsu");
                writeValue(nodeId, DataType.ByteString, newValue, function (err, statusCode) {
                    statusCode.should.eql(StatusCodes.Good);
                    callback(err);
                });
            }

        ], done);
    });

    it("should be possible to write to a an Array of Byte with a Byte Array", function (done) {

        var nodeId = makeNodeId("Scalar_Static_Array_Byte", namespaceIndex);

        var l_value = null;

        async.series([

            function (callback) {
                readValueArray(nodeId, null, function (err, value) {
                    l_value = value;
                    l_value.length.should.eql(10);
                    callback(err);
                });
            },
            function (callback) {
                var buf = [0, 1, 2, 3, 4, 5, 6, 9];
                writeValue(nodeId, DataType.ByteString, buf, function (err, statusCode) {
                    statusCode.should.eql(StatusCodes.Good);
                    callback(err);
                });
            },
            function (callback) {
                readValueArray(nodeId, "3", function (err, value) {
                    l_value = value;
                    l_value.length.should.eql(1);
                    l_value[0].should.eql(3);
                    callback(err);
                });
            },
            function (callback) {
                readValueArray(nodeId, "3:5", function (err, value) {
                    l_value = value;
                    l_value.length.should.eql(3);
                    l_value.should.eql(new Uint8Array([3, 4, 5]));
                    callback(err);
                });
            },
            function (callback) {
                var buf = new Buffer("LoremIpsum");
                writeValue(nodeId, DataType.ByteString, buf, function (err, statusCode) {
                    statusCode.should.eql(StatusCodes.Good);
                    callback(err);
                });
            },
            function (callback) {
                readValueArray(nodeId, null, function (err, value) {
                    l_value = value;
                    (new Buffer(l_value)).toString().should.eql("LoremIpsum");
                    callback(err);
                });
            },

            function (callback) {
                var buf = new Buffer("OREM");
                writeValueRangeInScalar(nodeId, DataType.ByteString, buf, "1:4", function (err, statusCode) {
                    statusCode.should.eql(StatusCodes.Good);
                    callback(err);
                });
            },
            function (callback) {
                readValueArray(nodeId, "0:6", function (err, value) {
                    l_value = value;
                    (new Buffer(l_value)).toString().should.eql("LOREMIp");
                    callback(err);
                });
            },
        ], done);
    });


});


describe("testing address space with large number of nodes", function () {

    var engine;
    this.timeout(200000);

    before(function (done) {
        resourceLeakDetector.start();

        engine = new server_engine.ServerEngine();
        var nodeset_filename = [
            server_engine.mini_nodeset_filename,
            server_engine.part8_nodeset_filename
        ];
        engine.initialize({nodeset_filename: nodeset_filename}, function () {

            var startDate = new Date();
            build_address_space_for_conformance_testing(engine, {mass_variables: true});
            var endDate = new Date();
            console.log("           time to generate conformance nodes (with mass variables) = ".grey.italic,endDate.getTime() - startDate.getTime() , " ms ");
            // address space variable change for conformance testing are changing randomly
            // let wait a little bit to make sure variables have changed at least once
            setTimeout(done, 500);
        });
    });
    after(function () {
        if (engine) {
            engine.shutdown();
            engine = null;
        }
        resourceLeakDetector.stop();
    });


    it("should create mass variables", function (done) {

        var node;
        node = engine.addressSpace.findNode(coerceNodeId("ns=" + namespaceIndex + ";s=Scalar_Mass_UInt32"));
        should.exist(node);

        node = engine.addressSpace.findNode(coerceNodeId("ns=" + namespaceIndex + ";s=Scalar_Mass_Time"));
        should.exist(node);
        done();
    });
});
