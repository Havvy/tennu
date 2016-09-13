"use strict";

const program = require("commander");
const Client = require("../lib/client.js");
const fs = require("fs");
const inspect = require("util").inspect;

// NOTE(Havvy): String(symbol) gives "Symbol(symbol_name)". 
const symbolDescription = function symbolDescription(symbol) {
    return String(symbol).slice(7, -1);
};

program
.version("1.0.0")
.usage("[options] <config file>")
.option("-v, --verbose", "Log to standard out")
.option("-d, --debug", "Log debug messages. Requires -v")
.parse(process.argv);


// Get the configuration.
let configPath = program.args[0];

if (!configPath) {
    console.log("Error: No config file path passed to this program.");
    process.exit(1);
}

configPath = `${process.cwd()}/${configPath}`;

const config = function iife () {
    let config;

    try {
        config = fs.readFileSync(configPath, {encoding: "utf-8"});
    } catch (e) {
        console.log("Error occurred loading config file.");
        console.log(`[${e.name}] ${e.message}`);
        console.log(e.stack);
        process.exit(2);
    }

    try {
        config = JSON.parse(config)
    } catch (e) {
        console.log("Failed to parse configuration file.");
        console.log();
        console.log(e.stack);
        process.exit(3);
    }

    return config;
}();

if (program.verbose) {
    console.log(`Connecting to ${config.server}:${config.port}.`);
}

// Create the dependency management object.
var parts = {};

if (program.verbose) {
    var log = function (level) { 
        return function () {
            var args = Array.prototype.slice.call(arguments)
            .map(function (arg) {
                if (typeof arg === "object") {
                    return inspect(arg);
                } else {
                    return String(arg);
                }
            });
            console.log(String(Date()), level, args.join(" "));
        };
    };

    parts.Logger = {
        debug: program.debug ? log("debug") : function () {},
        info: log("info"),
        notice: log("notice"),
        warn: log("warn"),
        error: log("error"),
        crit: log("crit"),
        alert: log("alert"),
        emerg: log("emerg")
    };
}

// Try to initialize the client.
let client;
try {
    const clientResult = Client(config, parts);

    if (clientResult.isFail()) {
        console.log("Failure occurred initializing Tennu.");

        const failure = clientResult.fail();
        console.log(`[${symbolDescription(failure.failureReason)}] ${failure.message}`);

        if (failure.failureReason === Client.failures.InitializePluginsFailed) {
            console.log(`[${symbolDescription(failure.inner.failureReason)}] ${failure.inner.message}`);

            if (failure.inner.failureReason === failure.innerFailureTypes.CannotInitialize) {
                const validationFailure = failure.inner.validationFailure;
                console.log(`[${symbolDescription(validationFailure.failureReason)}] ${validationFailure.reason}`);

                if (validationFailure.help) {
                    console.log(validationFailure.help);
                }

                // TODO(Havvy): Check the failure type and special messages based on that.
                // NOTE(Havvy): At least there's no more inner kinds of failures from here on.
                // TODO(Havvy): Should validationFailure use `reason` or `message`?
            }
        } else {
            console.log("Unknown failure type (from the perspective of the tennu binary)!");
            console.log(inspect(failure, {depth: 10, colors: true}));
        }

        process.exit(4);
    }
} catch (e) {
    console.log("Error occurred initializing Tennu.");
    console.log(`[${e.name}] ${e.message}`);
    console.log(e.stack);
    process.exit(4);
}

// Try to connect.
try {
    client.connect();
} catch (e) {
    console.log("Error occurred connecting to server.");
    console.log(`[${e.name}] ${e.message}`);
    console.log(e.stack);
    process.exit(4);
}

// Register hangup functions.
var onabort = function self () {
    if (!self.attemptedToQuitAlready) {
        client.quit("Bot terminated.");
        self.attemptedToQuitAlready = true;
    } else {
        process.exit(100);
    }
};

process.on("SIGHUP", onabort);
process.on("SIGINT", onabort);
process.on("SIGQUIT", onabort);
process.on("SIGABRT", onabort);
process.on("SIGTERM", onabort);