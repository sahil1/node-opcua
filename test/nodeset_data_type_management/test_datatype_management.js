/* global describe,require,it,before */
"use strict";
require("requirish")._(module);
var opcua = require("../../");
var AddressSpace = opcua.AddressSpace;
var should = require("should");
var assert = require("assert");

var _ = require("underscore");
var path = require("path");

var encode_decode_round_trip_test = require("test/helpers/encode_decode_round_trip_test").encode_decode_round_trip_test;


var makeNodeId = opcua.makeNodeId;
var makeExpandedNodeId = opcua.makeExpandedNodeId;
var Variant = opcua.Variant;
var DataType = opcua.DataType;

var nodeset = require("lib/address_space/convert_nodeset_to_types").nodeset;
var createExtensionObjectDefinition = require("lib/address_space/convert_nodeset_to_types").createExtensionObjectDefinition;
var assert_arrays_are_equal = require("test/helpers/typedarray_helpers").assert_arrays_are_equal;


require("lib/datamodel/buildinfo");

describe("ComplexType read from XML NodeSET file shall be binary Encodable", function () {

    var addressSpace;

    before(function (done) {
        addressSpace = new AddressSpace();

        var xml_file = path.join(__dirname,"../fixtures/fixture_nodeset_enumtype.xml");
        require("fs").existsSync(xml_file).should.be.eql(true);

        opcua.generate_address_space(addressSpace, xml_file, function (err) {
            createExtensionObjectDefinition(addressSpace);
            done(err);
        });
    });
    after(function(){
        addressSpace.dispose();
    });

    it("a DataType should provide a DefaultBinary Encoding object", function () {

        var serverStatusType = addressSpace.findDataType("ServerStatusDataType");
        serverStatusType.getEncodingNodeId("Default Binary").nodeId.toString().should.eql("ns=0;i=864");

    });


    it("should create an enumeration from the ServerState object", function (done) {

        var test_value = nodeset.ServerState.NoConfiguration;
        //xx console.log(nodeset.ServerState);
        test_value.value.should.eql(2);
        done();

    });

    it("should create an structure from the ServerStatus object", function () {

        var serverStatus = new nodeset.ServerStatus({
            startTime: new Date(),
            buildInfo: {},
            secondsTillShutdown: 100,
            shutdownReason: {text: "for maintenance"}
        });

        assert(serverStatus._schema.name === "ServerStatus");
        serverStatus.startTime.should.be.instanceOf(Date);
        serverStatus.secondsTillShutdown.should.eql(100);
    });


    it("should ServerStatus object have correct encodingDefaultBinary ", function () {

        var serverStatus = new nodeset.ServerStatus({});
        serverStatus.encodingDefaultBinary.should.eql(makeExpandedNodeId(864, 0));

    });

    it("should encode and decode a ServerStatus object", function () {

        var serverStatus = new nodeset.ServerStatus({
            startTime: new Date(),
            buildInfo: {},
            secondsTillShutdown: 100,
            shutdownReason: {text: "for maintenance"}
        });
        encode_decode_round_trip_test(serverStatus);

    });

    it("should encode and decode a variant containing an extension object being a ServerStatus", function () {

        var serverStatus = new nodeset.ServerStatus({});

        var v = new Variant({
            dataType: DataType.ExtensionObject,
            value: serverStatus
        });
        encode_decode_round_trip_test(v);
    });


});
