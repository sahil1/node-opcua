require("requirish")._(module);
/*global describe, require, it*/

var factories = require("lib/misc/factories");
var should = require("should");
var BinaryStream = require("lib/misc/binaryStream").BinaryStream;
var util = require("util");
var ec = require("lib/misc/encode_decode");

var encode_decode_round_trip_test = require("test/helpers/encode_decode_round_trip_test").encode_decode_round_trip_test;


var ExtensionObject = require("lib/misc/extension_object").ExtensionObject;

describe("ExtensionObject", function () {

    exports.MetaShapeForUnitTest_Schema = {
        name: "MetaShapeForUnitTest",
        id: factories.next_available_id(),
        fields: [
            {name: "name", fieldType: "String"},
            {name: "shape", fieldType: "ExtensionObject"},
            {name: "comment", fieldType: "String"}
        ]
    };

    var MetaShape = factories.registerObject(exports.MetaShapeForUnitTest_Schema, "tmp");


    var Potato_Schema_Id = 0xF00001;
    exports.Potato_Schema = {
        name: "Potato",
        id: Potato_Schema_Id,
        fields: [
            {name: "length", fieldType: "Double"},
            {name: "radius", fieldType: "Double"}

        ]
    };
    var Potato = factories.registerObject(exports.Potato_Schema, "tmp");

    it("should encode an object with an embedded ExtensionObject set to null ", function () {

        var shape = new MetaShape({
            name: "MyPotato",
            shape: null,
            comment: "this is a comment"
        });
        shape.encodingDefaultBinary.should.eql(ec.makeExpandedNodeId(exports.MetaShapeForUnitTest_Schema.id));

        var stream = new BinaryStream(shape.binaryStoreSize());
        shape.encode(stream);
        encode_decode_round_trip_test(shape);
    });

    it("should encode an object with a valid embedded ExtensionObject", function () {

        var shape = new MetaShape({
            name: "Potato",
            shape: new Potato({length: 10.0, radius: 5.0}),
            comment: "this is a comment"
        });
        shape.encodingDefaultBinary.should.eql(ec.makeExpandedNodeId(exports.MetaShapeForUnitTest_Schema.id));

        var stream = new BinaryStream(shape.binaryStoreSize());
        shape.encode(stream);

        encode_decode_round_trip_test(shape);

    });
});
