const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
const defaults = require("lodash.defaults");

const debug = Boolean(false || process.env.VERBOSE);
const logfn = debug ? console.log.bind(console) : function () {};
const logger = {debug: logfn, info: logfn, notice: logfn, warn: logfn, error: logfn, crit: logfn, alert: logfn, emerg: logfn};

const Client = require("../lib/client.js");
const NetSocket = require("@havvy/mock-net-socket")(sinon);

const networkConfig = {
    "server": "irc.test.net",
    "nicknames": ["testbot"],
    "username": "testuser",
    "realname": "tennu irc bot"
};

const messages = {
    rpl_welcome: ":irc.test.net 001 testbot :Welcome to the Test IRC Network testbot!testuser@localhost\r\n",
    rpl_cap_ls: ":irc.test.net CAP * LS :multi-prefix\r\n",
    rpl_ack_default_capabilities: ":irc.test.net CAP * ACK :multi-prefix\r\n",
    _: ""
};

describe("Integration tests:", function () {
    var netsocket, client;

    beforeEach(function () {
        netsocket = NetSocket(logfn);
    });

    // TODO(Havvy): Move this to a test for the Self plugin.
    describe("Self plugin:", function () {
        beforeEach(function (done) {
            client = Client(networkConfig, {
                NetSocket: netsocket,
                Logger: logger
            }).ok();

            netsocket.on("connect", done);
            client.connect();
            client._socket.impl.acceptConnect();
        });

        afterEach(function (done) {
            netsocket.on("close", done);
            client.disconnect();
        });

        it("does not know its nickname until startup finishes", function () {
            assert(client.nickname() === undefined);
        });

        it("tracks its initial nickname", function (done) {
            assert(client._socket.impl.write.getCall(0).calledWithExactly("CAP LS\r\n", "utf-8"));
            client._socket.impl.acceptData(messages.rpl_cap_ls);
            assert(client._socket.impl.write.getCall(1).calledWithExactly("CAP REQ :multi-prefix\r\n", "utf-8"));
            client._socket.impl.acceptData(messages.rpl_ack_default_capabilities);
            assert(client._socket.impl.write.getCall(2).calledWithExactly("CAP END\r\n", "utf-8"));
            assert(client._socket.impl.write.getCall(3).calledWithExactly("USER testuser 8 * :tennu irc bot\r\n", "utf-8"));
            assert(client._socket.impl.write.getCall(4).calledWithExactly("NICK testbot\r\n", "utf-8"));
            client._socket.impl.acceptData(messages.rpl_welcome);

            client._socket.startupPromise.then(function () {
                setImmediate(function () {
                    assert(client.nickname() === "testbot");
                    done();
                });
            });
        });

        it("tracks its changed nick", function () {
            assert(client._socket.impl.write.getCall(0).calledWithExactly("CAP LS\r\n", "utf-8"));
            client._socket.impl.acceptData(messages.rpl_cap_ls);
            assert(client._socket.impl.write.getCall(1).calledWithExactly("CAP REQ :multi-prefix\r\n", "utf-8"));
            client._socket.impl.acceptData(messages.rpl_ack_default_capabilities);
            assert(client._socket.impl.write.getCall(2).calledWithExactly("CAP END\r\n", "utf-8"));
            assert(client._socket.impl.write.getCall(3).calledWithExactly("USER testuser 8 * :tennu irc bot\r\n", "utf-8"));
            assert(client._socket.impl.write.getCall(4).calledWithExactly("NICK testbot\r\n", "utf-8"));
            client._socket.impl.acceptData(messages.rpl_welcome);

            return client._socket.startupPromise
            .then(function () {}) // skip a turn.
            .then(function () {
                client.nick("changed-nick")
                assert(client._socket.impl.write.getCall(5).calledWithExactly("NICK changed-nick\r\n", "utf-8"));
                client._socket.impl.acceptData(":testbot!testuser@user.isp.net NICK changed-nick\r\n");
            })
            .then(function () {})
            .then(function () {
                assert(client.nickname() === "changed-nick");
            });
        });
    });

    // TODO(havvy): Move to own file.
    describe("Startup Plugin", function () {

        afterEach(function (done) {
            netsocket.on("close", done);
            client.disconnect();
        });

        describe("autojoin", function () {
            it("automatically joins specified channels.", function (done) {
                client = Client(defaults({channels: ["#test"]}, networkConfig), {
                    NetSocket: netsocket,
                    Logger: logger
                }).ok();

                client.connect();

                client._socket.impl.acceptConnect();
                assert(client._socket.impl.write.getCall(0).calledWithExactly("CAP LS\r\n", "utf-8"));
                client._socket.impl.acceptData(messages.rpl_cap_ls);
                assert(client._socket.impl.write.getCall(1).calledWithExactly("CAP REQ :multi-prefix\r\n", "utf-8"));
                client._socket.impl.acceptData(messages.rpl_ack_default_capabilities);
                assert(client._socket.impl.write.getCall(2).calledWithExactly("CAP END\r\n", "utf-8"));
                assert(client._socket.impl.write.getCall(3).calledWithExactly("USER testuser 8 * :tennu irc bot\r\n", "utf-8"));
                assert(client._socket.impl.write.getCall(4).calledWithExactly("NICK testbot\r\n", "utf-8"));
                client._socket.impl.acceptData(messages.rpl_welcome);

                client._socket.impl.write.on(5, function (spyCall) {
                    assert(spyCall.calledWithExactly("JOIN :#test\r\n", "utf-8"));
                    // client._socket.impl.acceptData(messages.join_test);
                    // client._socket.impl.acceptData(messages.rpl_topic_test);
                    // client._socket.impl.acceptData(messages.rpl_topicwhotime_test);
                    // client._socket.impl.acceptData(messages.rpl_names_test);
                    // client._socket.impl.acceptData(messages.rpl_endofnames_test);
                    done();
                });
            });
        });

        describe("autoidentify", function () {
            it("automatically identifies to services.", function (done) {
                var config = defaults({
                    "nickserv": "nickserv",
                    "auth-password": "123456"
                }, networkConfig);

                client = Client(config, {
                    NetSocket: netsocket,
                    Logger: logger
                }).ok();

                client.connect();

                client._socket.impl.acceptConnect();
                assert(client._socket.impl.write.getCall(0).calledWithExactly("CAP LS\r\n", "utf-8"));
                client._socket.impl.acceptData(messages.rpl_cap_ls);
                assert(client._socket.impl.write.getCall(1).calledWithExactly("CAP REQ :multi-prefix\r\n", "utf-8"));
                client._socket.impl.acceptData(messages.rpl_ack_default_capabilities);
                assert(client._socket.impl.write.getCall(2).calledWithExactly("CAP END\r\n", "utf-8"));
                assert(client._socket.impl.write.getCall(3).calledWithExactly("USER testuser 8 * :tennu irc bot\r\n", "utf-8"));
                assert(client._socket.impl.write.getCall(4).calledWithExactly("NICK testbot\r\n", "utf-8"));
                client._socket.impl.acceptData(messages.rpl_welcome);

                client._socket.impl.write.on(5, function (spyCall) {
                    assert(spyCall.calledWithExactly("PRIVMSG nickserv :identify 123456\r\n", "utf-8"));
                    done();
                });
            });
        });

        // When ERROR is sent before 001.
        it.skip("does not do post-startup tasks if server never started", function () {});
        it.skip("tells you why startup failed when it fails", function () {});
    });

    it("CTCP VERSION handling", function (done) {
        client = Client(networkConfig, {
            NetSocket: netsocket,
            Logger: logger
        }).ok();

        client.connect();

        client._socket.impl.acceptConnect();
        assert(client._socket.impl.write.getCall(0).calledWithExactly("CAP LS\r\n", "utf-8"));
        client._socket.impl.acceptData(messages.rpl_cap_ls);
        assert(client._socket.impl.write.getCall(1).calledWithExactly("CAP REQ :multi-prefix\r\n", "utf-8"));
        client._socket.impl.acceptData(messages.rpl_ack_default_capabilities);
        assert(client._socket.impl.write.getCall(2).calledWithExactly("CAP END\r\n", "utf-8"));
        assert(client._socket.impl.write.getCall(3).calledWithExactly("USER testuser 8 * :tennu irc bot\r\n", "utf-8"));
        assert(client._socket.impl.write.getCall(4).calledWithExactly("NICK testbot\r\n", "utf-8"));
        client._socket.impl.acceptData(messages.rpl_welcome);

        client._socket.impl.acceptData(":IRC!IRC@irc.test.net PRIVMSG testbot :\u0001VERSION\u0001\r\n");

        client._socket.impl.write.on(5, function (spyCall) {
            try {
                const versionResponseRegexp = /^NOTICE IRC :\u0001VERSION Tennu \d+\.\d+\.\d+ \(https:\/\/tennu\.github\.io\)\u0001\r\n$/;
                assert(spyCall.calledWith(sinon.match(versionResponseRegexp), "utf-8"));
                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it("Add plugin with command that returns a String response and is then called", function (done) {
        client = Client(networkConfig, {
            NetSocket: netsocket,
            Logger: logger
        }).ok();

        client.initializePlugin({
            name: "test-plugin",
            init: function (client, deps) {
                return {
                    handlers: {
                        "!foo": function (command) {
                            return "bar";
                        }
                    }
                };
            }
        });

        client.connect();

        client._socket.impl.acceptConnect();
        assert(client._socket.impl.write.getCall(0).calledWithExactly("CAP LS\r\n", "utf-8"));
        client._socket.impl.acceptData(messages.rpl_cap_ls);
        assert(client._socket.impl.write.getCall(1).calledWithExactly("CAP REQ :multi-prefix\r\n", "utf-8"));
        client._socket.impl.acceptData(messages.rpl_ack_default_capabilities);
        assert(client._socket.impl.write.getCall(2).calledWithExactly("CAP END\r\n", "utf-8"));
        assert(client._socket.impl.write.getCall(3).calledWithExactly("USER testuser 8 * :tennu irc bot\r\n", "utf-8"));
        assert(client._socket.impl.write.getCall(4).calledWithExactly("NICK testbot\r\n", "utf-8"));
        client._socket.impl.acceptData(messages.rpl_welcome);

        client._socket.impl.write.on(5, function (spyCall) {
            try {
                assert(spyCall.calledWithExactly("PRIVMSG user :bar\r\n", "utf-8"));
                done();
            } catch (e) {
                done(e);
            }
        });

        client._socket.impl.acceptData(":user!user@user.net PRIVMSG user :!foo\r\n");
    });
});