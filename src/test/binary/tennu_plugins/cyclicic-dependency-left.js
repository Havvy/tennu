module.exports = {
    name: "cyclicic-dependency-left",
    requires: ["cyclicic-dependency-right"],
    init: function () {
        return {};
    }
};