"use strict";
require("requirish")._(module);

var should = require("should");
var assert = require("better-assert");
var async = require("async");
var util = require("util");
var os = require("os");
var _ = require("underscore");

var opcua = require("index");

var OPCUAServer = opcua.OPCUAServer;
var OPCUAClient = opcua.OPCUAClient;
var StatusCodes = opcua.StatusCodes;
var BrowseDirection = opcua.browse_service.BrowseDirection;

var empty_nodeset_filename = require("path").join(__dirname, "./fixtures/fixture_empty_nodeset2.xml");


var debugLog = require("lib/misc/utils").make_debugLog(__filename);

var port = 4000;

var resourceLeakDetector = require("test/helpers/resource_leak_detector").resourceLeakDetector;

describe("Testing ChannelSecurityToken lifetime", function () {

    this.timeout(Math.max(100000,this._timeout));

    var server, client;
    var endpointUrl;

    before(function () {
        resourceLeakDetector.start();
    });
    after(function () {
        resourceLeakDetector.stop();
    });
    beforeEach(function (done) {

        port += 1;
        server = new OPCUAServer({port: port, nodeset_filename: empty_nodeset_filename});

        // we will connect to first server end point
        endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        debugLog("endpointUrl", endpointUrl);
        opcua.is_valid_endpointUrl(endpointUrl).should.equal(true);

        client = new OPCUAClient({
            defaultSecureTokenLifetime: 100  // very short live time !
        });
        server.start(function () {
            setImmediate(done);
        });
    });

    afterEach(function (done) {

        setImmediate(function () {
            client.disconnect(function () {
                server.shutdown(function () {

                    OPCUAServer.registry.count().should.eql(0);

                    done();
                });
            });
        });

    });

    it("A secure channel should raise a event to notify its client that its token is at 75% of its livetime", function (done) {

        client.connect(endpointUrl, function (err) {
            should(!!err).equal(false);
        });
        client._secureChannel.once("lifetime_75", function () {
            debugLog(" received lifetime_75");
            done();
        });
    });

    it("A secure channel should raise a event to notify its client that a token about to expired has been renewed", function (done) {

        client.connect(endpointUrl, function (err) {
            should(!!err).equal(false);
        });
        client._secureChannel.on("security_token_renewed", function () {
            debugLog(" received security_token_renewed");
            done();
        });
    });

    it("A client should periodically renew the expiring security token", function (done) {

        client.connect(endpointUrl, function (err) {
            should(!!err).equal(false);
        });

        var security_token_renewed_counter = 0;
        client._secureChannel.on("security_token_renewed", function () {
            debugLog(" received security_token_renewed");
            security_token_renewed_counter += 1;
        });
        var waitingTime = 1000;
        if (os.arch() === "arm") {
            // give more time for slow raspberry to react */
            waitingTime += 4000;
        }
        setTimeout(function () {
            security_token_renewed_counter.should.be.greaterThan(3);
            done();
        }, waitingTime);
    });

});
