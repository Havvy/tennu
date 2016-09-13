"use strict";

// const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
// const defaults = require("lodash.defaults");

const debug = Boolean(false || process.env.VERBOSE);
const logfn = debug ? console.log.bind(console) : function () {};

const spawnTennu = function iffe () {
    const spawn = require("child_process").spawn;

    return function spawnTennu (config) {
        const tennuProcess = spawn(
            "node",
            ["../../bin/tennu.js", `config/${config}.json`],
            { cwd: __dirname }
        );
        // const tennuProcess = spawn('ls', ['-lh', '/usr']);

        return new Promise(function (resolve, reject) {
            let stdout = "";
            let stderr = "";

            tennuProcess.stdout.on("data", function (data) {
                stdout += data;
            });

            tennuProcess.stderr.on("data", function (data) {
                stderr += data;
            });

            tennuProcess.on("error", function (error) {
                reject(error);
            });

            tennuProcess.on("close", function (code) {
                stdout = stdout.split("\n").slice(0, -1);
                stderr = stderr.split("\n").slice(0, -1);
                resolve({stdout, stderr, code});
            });
        });
    };
}();

describe("User-plugin use failures", function () {
    it.only("Failure: CannotFindPlugin", function () {
        return spawnTennu("dne")
        .then(function (output) {
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[CannotFindPlugin] Failed to locate plugin 'dne'"
                ],
                stderr: [],
            }));
        });
    });
});