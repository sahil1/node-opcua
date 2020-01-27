require("requirish")._(module);


var BinaryStream = require("lib/misc/binaryStream").BinaryStream;
var should = require("should");

var parseEndpointUrl = require("lib/nodeopcua").parseEndpointUrl;
var HelloMessage = require("_generated_/_auto_generated_HelloMessage").HelloMessage;
var packTcpMessage = require("lib/nodeopcua").packTcpMessage;
var decodeMessage = require("lib/nodeopcua").decodeMessage;


describe("testing message encoding and decoding", function () {

    it("should encode and decode HelloMessage ", function () {

        var helloMessage1 = new HelloMessage();
        //xx console.log(Object.getPrototypeOf(helloMessage1),opcua.HelloMessage);


        var message = packTcpMessage('HEL', helloMessage1);


        var stream = new BinaryStream(message);

        var helloMessage2 = decodeMessage(stream, HelloMessage);
        //xx console.log(helloMessage2);

        helloMessage1.should.eql(helloMessage2);
        helloMessage1.protocolVersion.should.eql(helloMessage2.protocolVersion);
        helloMessage1.receiveBufferSize.should.eql(helloMessage2.receiveBufferSize);
        helloMessage1.sendBufferSize.should.eql(helloMessage2.sendBufferSize);
        helloMessage1.maxMessageSize.should.eql(helloMessage2.maxMessageSize);
        helloMessage1.endpointUrl.should.eql(helloMessage2.endpointUrl);

    });
});
describe("testing parseEndpointUrl", function () {


    it("should parse a endpoint ", function () {

        var ep = parseEndpointUrl("opc.tcp://abcd1234:51210/UA/SampleServer");

        ep.protocol.should.equal("opc.tcp");
        ep.hostname.should.equal("abcd1234");
        ep.port.should.equal(51210);
        ep.address.should.equal("/UA/SampleServer");
    });

    it("should parse this endpoint as well", function () {

        var ep = parseEndpointUrl("opc.tcp://ABCD12354:51210/UA/SampleServer");

        ep.protocol.should.equal("opc.tcp");
        ep.hostname.should.equal("ABCD12354");
        ep.port.should.equal(51210);
        ep.address.should.equal("/UA/SampleServer");
    });

    it("should parse this endpoint as well", function () {

        var ep = parseEndpointUrl("opc.tcp://portable-Precision-M4500:4841");

        ep.protocol.should.equal("opc.tcp");
        ep.hostname.should.equal("portable-Precision-M4500");
        ep.port.should.equal(4841);
        ep.address.should.equal("");
    });

    it("should raise an exception if Endpoint URL is malformed",function() {

        should(function() {
            var ep = parseEndpointUrl("foo@baz.bar://mymachine:4841");
        }).throwError();
    });


});
