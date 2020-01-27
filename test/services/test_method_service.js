"use strict";
/* global describe, it,before,after,beforeEach,afterEach*/
require("requirish")._(module);

var encode_decode_round_trip_test = require("test/helpers/encode_decode_round_trip_test").encode_decode_round_trip_test;
var BinaryStream = require("lib/misc/binaryStream").BinaryStream;

var opcua = require("../../");
var DataType = opcua.DataType;
var utils = require("lib/misc/utils");

var Variant = require("lib/datamodel/variant").Variant;
var get_mini_address_space = require("test/fixtures/fixture_mininodeset_address_space").get_mini_address_space;
var AddressSpace = require("lib/address_space/address_space").AddressSpace;
var StatusCodes = require("lib/datamodel/opcua_status_code").StatusCodes;
//xx var getMethodDeclaration_ArgumentList = require("lib/datamodel/argument_list").getMethodDeclaration_ArgumentList;
//xx var Argument =require("lib/datamodel/argument_list").Argument;


var should = require("should");
var path = require("path");

describe("testing CallMethodRequest", function () {

    it("should encode CallMethodRequest (scalar UInt32)", function () {

        var callMethodRequest = new opcua.call_service.CallMethodRequest({
            objectId: opcua.coerceNodeId("ns=0;i=1"),  // Object
            methodId: opcua.coerceNodeId("ns=0;i=2"),  // Method
            inputArguments: [{dataType: DataType.UInt32, value: 123}]
        });

        encode_decode_round_trip_test(callMethodRequest);
    });
    it("should encode CallMethodRequest (array UInt32)", function () {

        var callMethodRequest = new opcua.call_service.CallMethodRequest({
            objectId: opcua.coerceNodeId("ns=0;i=1"),  // Object
            methodId: opcua.coerceNodeId("ns=0;i=2"),  // Method
            inputArguments: [{dataType: DataType.UInt32, value: [123]}]
        });

        encode_decode_round_trip_test(callMethodRequest);
    });


});


var build_retrieveInputArgumentsDefinition = require("lib/datamodel/argument_list").build_retrieveInputArgumentsDefinition;

var convertJavaScriptToVariant = require("lib/datamodel/argument_list").convertJavaScriptToVariant;

describe("CallMethodRequest with address space", function () {

    var addressSpace = null;
    require("test/helpers/resource_leak_detector").installResourceLeakDetector(true,function() {
        before(function (done) {
            get_mini_address_space(function (err, data) {
                addressSpace = data;
                done(err);
            });
        });
        after(function(){
            if(addressSpace) {
                addressSpace.dispose();
            }
        });
    });
    it("Q1 should encode CallMethodRequest", function () {

        var callMethodRequest = new opcua.call_service.CallMethodRequest({
            objectId: opcua.coerceNodeId("ns=0;i=2253"),  // SERVER
            methodId: opcua.coerceNodeId("ns=0;i=11492"), // GetMonitoredItem
            inputArguments: [new Variant({dataType: DataType.UInt32, value: 123})]
        });
        encode_decode_round_trip_test(callMethodRequest);
    });

    it("Q2 should encode CallMethodResult", function () {

        var callMethodResult = new opcua.call_service.CallMethodResult({
            statusCode: StatusCodes.Good,
            inputArgumentResults: [
                StatusCodes.Good,
                StatusCodes.Good
            ],
            inputArgumentDiagnosticInfos: [],
            outputArguments: [{dataType: DataType.UInt32, value: 10}]
        });

        encode_decode_round_trip_test(callMethodResult);
    });

});


describe("CallRequest on custom method", function () {

    var addressSpace;
    require("test/helpers/resource_leak_detector").installResourceLeakDetector(true,function() {
        before(function (done) {
            addressSpace = new AddressSpace();
            var xml_file = path.join(__dirname,"../fixtures/fixuture_nodeset_objects_with_some_methods.xml");
            require("fs").existsSync(xml_file).should.be.eql(true);

            opcua.generate_address_space(addressSpace, xml_file, function (err) {
                done(err);
            });
        });
        after(function(){
            if(addressSpace) {
                addressSpace.dispose();
            }
        });
    });
    var UAObject = require("lib/address_space/ua_object").UAObject;
    var UAMethod = require("lib/address_space/ua_method").UAMethod;

    it("Q3 should encode and decode a method call request", function (done) {

        var objectId = opcua.makeNodeId(999990, 0);
        var methodId = opcua.makeNodeId(999992, 0);


        var obj = addressSpace.findNode(objectId);
        obj.should.be.instanceOf(UAObject);

        var method = obj.getMethodById(methodId);
        method.should.be.instanceOf(UAMethod);
        method.browseName.toString().should.eql("DoStuff");

        var inputArguments = method.getInputArguments();
        inputArguments.should.be.instanceOf(Array);

        var callRequest = new opcua.call_service.CallRequest({

            methodsToCall: [{
                objectId: objectId,
                methodId: methodId,
                inputArguments: [{dataType: DataType.UInt32, value: [0xAA, 0xAB, 0xAC]}]
            }]
        });

        var retrieveInputArgumentsDefinition = build_retrieveInputArgumentsDefinition(addressSpace);

        //xx callRequest.factory = factory;

        var options = {retrieveInputArgumentsDefinition: retrieveInputArgumentsDefinition};
        var size = callRequest.binaryStoreSize(options);

        var stream = new BinaryStream(size, options);
        callRequest.encode(stream, options);

        console.log(utils.hexDump(stream._buffer));

        // now decode
        var callRequest_reloaded = new opcua.call_service.CallRequest();
        stream.addressSpace = {};
        stream.rewind();
        callRequest_reloaded.decode(stream, options);

        done();

    });
});
