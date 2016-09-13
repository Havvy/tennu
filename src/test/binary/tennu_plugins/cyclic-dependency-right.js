module.exports = {
    name: "cyclicic-dependency-right",
    requires: ["cyclicic-dependency-left"],
    init: function () {
        return {};
    }
};