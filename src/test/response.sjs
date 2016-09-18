const sinon = require('sinon');
const assert = require('better-assert');
const equal = require('deep-eql');
const inspect = require('util').inspect;
const format = require('util').format;

const debug = Boolean(false || process.env.VERBOSE);
const logfn = debug ? console.log.bind(console) : function () {};

const Response = require('../lib/response');

const message = {
    channel: "#channel",
    nickname: "sender"
};

// See https://tennu.github.io/documentation/api/response for user facing documentation.

describe("Response", function () {
    describe("Creation", function () {
        it("gives no response to an `undefined` value", function () {
            assert(equal(Response.create(undefined, message), {
                intent: "none",
                message: undefined,
                target: undefined
            }));
        });

        it("makes the intent 'say' for a String", function () {
            assert(equal(Response.create("Hello World!", message), {
                intent: "say",
                message: "Hello World!",
                target: "#channel"
            }));
        });

        it("makes the intent 'say' for an Array", function () {
            assert(equal(Response.create(["Hello", "World"], message), {
                intent: "say",
                message: ["Hello", "World"],
                target: "#channel"
            }));
        });

        describe("given an Object", function () {
            it("copies all the properties from an object with the same shape as a Response", function () {
                assert(equal(Response.create({
                    intent: "say",
                    message: "Goodbye World!",
                    target: "#channel"
                }, message), {
                    intent: "say",
                    message: "Goodbye World!",
                    target: "#channel"
                }));
            });

            it("copies all properties from an object with the same shape as a Response but changes target if 'query' is true", function () {
                assert(equal(Response.create({
                    intent: "say",
                    message: "Hello User!",
                    target: "#channel",
                    query: true
                }, message), {
                    intent: "say",
                    message: "Hello User!",
                    target: "sender"
                }));
            });

            it("missing a target with no or false query", function () {
                assert(equal(Response.create({
                    intent: "say",
                    message: "Hello Who?",
                }, message), {
                    intent: "say",
                    message: "Hello Who?",
                    target: "#channel"
                }));
            });

            it("missing an intent", function () {
                assert(equal(Response.create({
                    message: "Hello!",
                    target: "#channel"
                }, message), {
                    intent: "say",
                    message: "Hello!",
                    target: "#channel"
                }));
            });

            it("non-say intent", function () {
                assert(equal(Response.create({
                    intent: "act",
                    message: "does something.",
                    target: "#channel"
                }, message), {
                    intent: "act",
                    message: "does something.",
                    target: "#channel"
                }))
            });
        });
    });

    describe("Sending", function () {
        var client;

        beforeEach(function () {
            client = {
                notice: sinon.spy(),
                say: sinon.spy(),
                act: sinon.spy(),
                ctcpRequest: sinon.spy(),
                ctcpRespond: sinon.spy(),
                warn: sinon.spy()
            }
        });

        it("with intent of 'none'", function () {
            Response.send({
                intent: "none",
                message: undefined,
                target: undefined
            }, client);

            assert(!client.notice.called);
            assert(!client.say.called);
            assert(!client.act.called);
            assert(!client.ctcpRequest.called);
            assert(!client.ctcpRespond.called);
        });

        it("with intent of 'notice'", function () {
            Response.send({
                intent: "notice",
                message: "Do you really want to know?",
                target: "sender"
            }, client);
            
            assert(!client.say.called);
            assert(!client.act.called);
            assert(!client.ctcpRequest.called);
            assert(!client.ctcpRespond.called);

            assert(client.notice.calledOnce);
            assert(client.notice.calledWithExactly("sender", "Do you really want to know?"));
        });

        it("with intent of 'say'", function () {
            Response.send({
                intent: "say",
                message: "Your bot greets you!",
                target: "#channel"
            }, client);
            
            assert(!client.notice.called);
            assert(!client.act.called);
            assert(!client.ctcpRequest.called);
            assert(!client.ctcpRespond.called);

            assert(client.say.calledOnce);
            assert(client.say.calledWithExactly("#channel", "Your bot greets you!"));
        });

        it("with intent of 'act'", function () {
            Response.send({
                intent: "act",
                message: "dances wildly!",
                target: "#channel"
            }, client);
            
            assert(!client.notice.called);
            assert(!client.say.called);
            assert(!client.ctcpRequest.called);
            assert(!client.ctcpRespond.called);

            assert(client.act.calledOnce);
            assert(client.act.calledWithExactly("#channel", "dances wildly!"));
        });

        it("with intent of 'ctcpRespond'", function () {
            Response.send({
                intent: "ctcpRespond",
                message: ["FINGER", "gives you the index finger!"],
                target: "sender"
            }, client);
            
            assert(!client.notice.called);
            assert(!client.say.called);
            assert(!client.act.called);
            assert(!client.ctcpRequest.called);

            assert(client.ctcpRespond.calledOnce);
            assert(client.ctcpRespond.calledWithExactly("sender", "FINGER", "gives you the index finger!"));
        });

        it("with intent of 'ctcpRequest'", function () {
            Response.send({
                intent: "ctcpRequest",
                message: ["VERSION"],
                target: "sender"
            }, client);
            
            assert(!client.notice.called);
            assert(!client.say.called);
            assert(!client.act.called);
            assert(!client.ctcpRespond.called);

            assert(client.ctcpRequest.calledOnce);
            logfn(inspect(client.ctcpRequest, {colors: true, depth: 4}));
            assert(client.ctcpRequest.calledWith("sender", "VERSION"));
        });
    });
});