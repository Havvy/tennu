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
    it("Failure: CannotFindPlugin", function () {
        return spawnTennu("cannot-find-plugin")
        .then(function (output) {
            logfn(inspect(output));
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[CannotFindPlugin] Failed to locate plugin 'does-not-exist'"
                ],
                stderr: [],
            }));
        });
    });

    it("Failure: InconsistentlyNamedPlugin", function () {
        return spawnTennu("inconsistently-named-plugin")
        .then(function (output) {
            logfn(inspect(output));
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[InconsistentlyNamedPlugin] Tried to load plugin 'inconsistently-named'. Loaded plugin named 'badly-named' instead."
                ],
                stderr: []
            }));
        });
    });

    it("Failure: UnmetDependency", function () {
        return spawnTennu("unmet-dependency")
        .then(function (output) {
            logfn(inspect(output));
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[UnmetDependency] Plugin with name of 'does-not-exist' required but neither initialized nor in to be initialized list."
                ],
                stderr: []
            }));
        });
    });
    
    it("Failure: CyclicicDependency", function () {
        return spawnTennu("cyclicic-dependency")
        .then(function (output) {
            logfn(inspect(output));
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[CyclicicDependency] Two or more plugins depend on each other cyclicicly."
                ],
                stderr: []
            }));
        });
    });

    it("Failure: PluginNotAnObject (non-null)", function () {
        return spawnTennu("plugin-not-an-object")
        .then(function (output) {
            logfn(inspect(output));
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[PluginNotAnObject] Plugin instance from 'plugin-false' must be an object. Init function returned `false`, a boolean, instead."
                ],
                stderr: []
            }));
        });
    });

    // NOTE(Havvy): Skipped because it throws an error.
    //              The error is fixed on master of tennu-plugins,
    //              but currently just trying to get the bare minimum of 
    it("Failure: PluginNotAnObject (null)", function () {
        return spawnTennu("plugin-is-null")
        .then(function (output) {
            logfn(inspect(output));
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[PluginNotAnObject] Plugin instance from 'plugin-null' must be an object. Init function returned `null`, a null, instead."
                ],
                stderr: []
            }));
        });
    });

    it("Failure: InstanceHookAlreadyExists", function () {
        return spawnTennu("instance-hook-already-exists")
        .then(function (output) {
            logfn(inspect(output));
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[InstanceHookAlreadyExists] Tried to set instance hook 'instance', but a plugin already has that instance hook."
                ],
                stderr: []
            }));
        });
    });

    it("Failure: StaticHookAlreadyExists", function () {
        return spawnTennu("static-hook-already-exists")
        .then(function (output) {
            logfn(inspect(output));
            assert(equal(output, {
                code: 4,
                stdout: [
                    "Failure occurred initializing Tennu.",
                    "[InitializePluginsFailed] Loading user plugins failed.",
                    "[StaticHookAlreadyExists] Tried to set static hook 'static', but a plugin already has that static hook."
                ],
                stderr: []
            }));
        });
    });

    describe.only("Failure: CannotInitialize (Validation Failures)", function () {
        it("Failure: NotAnObject (non-null)", function () {
            return spawnTennu("plugin-factory-false")
            .then(function (output) {
                logfn(inspect(output));
                assert(equal(output, {
                    code: 4,
                    stdout: [
                        "Failure occurred initializing Tennu.",
                        "[InitializePluginsFailed] Loading user plugins failed.",
                        "[CannotInitialize] The plugin cannot be initialized. For why, check the validationFailure.",
                        "[NotAnObject] PluginFactory not an object.",
                        "Was given a boolean instead."
                    ],
                    stderr: []
                }));
            });
        });

        it("Failure: NotAnObject (null)", function () {
            return spawnTennu("plugin-factory-null")
            .then(function (output) {
                logfn(inspect(output));
                assert(equal(output, {
                    code: 4,
                    stdout: [
                        "Failure occurred initializing Tennu.",
                        "[InitializePluginsFailed] Loading user plugins failed.",
                        "[CannotInitialize] The plugin cannot be initialized. For why, check the validationFailure.",
                        "[NotAnObject] PluginFactory not an object.",
                        "Was given a null instead."
                    ],
                    stderr: []
                }));
            });
        });

        it("Failure: RequiresNotAnArray", function () {
            return spawnTennu("requires-not-an-array")
            .then(function (output) {
                logfn(inspect(output));
                assert(equal(output, {
                    code: 4,
                    stdout: [
                        "Failure occurred initializing Tennu.",
                        "[InitializePluginsFailed] Loading user plugins failed.",
                        "[CannotInitialize] The plugin cannot be initialized. For why, check the validationFailure.",
                        "[RequiresNotAnArray] PluginFactory's 'requires' property is not an array (or undefined).",
                        "PluginFactory's 'requires' property is a string instead."
                    ],
                    stderr: []
                }));
            });
        });

        it("Failure: RequiresRolesNotAnArray", function () {
            return spawnTennu("requires-roles-not-an-array")
            .then(function (output) {
                logfn(inspect(output));
                assert(equal(output, {
                    code: 4,
                    stdout: [
                        "Failure occurred initializing Tennu.",
                        "[InitializePluginsFailed] Loading user plugins failed.",
                        "[CannotInitialize] The plugin cannot be initialized. For why, check the validationFailure.",
                        "[RequiresRolesNotAnArray] PluginFactory's 'requiresRoles' property is not an array (or undefined).",
                        "PluginFactory's 'requiresRoles' property is a string instead."
                    ],
                    stderr: []
                }));
            });
        });

        it.skip("Failure: RoleNotAString", function () {
            return spawnTennu("role-not-a-string")
            .then(function (output) {
                logfn(inspect(output));
                assert(equal(output, {
                    code: 4,
                    stdout: [
                        "Failure occurred initializing Tennu.",
                        "[InitializePluginsFailed] Loading user plugins failed.",
                        "[CannotInitialize] The plugin cannot be initialized. For why, check the validationFailure.",
                        "[RoleNotAString] PluginFactory's 'requiresRoles' property is not an array (or undefined).",
                        "PluginFactory's 'requiresRoles' property is a string instead."
                    ],
                    stderr: []
                }));
            });
        });
    });
});