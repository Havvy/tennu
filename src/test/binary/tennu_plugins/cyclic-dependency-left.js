module.exports = {
    name: "cyclic-dependency-left",
    requires: ["cyclic-dependency-right"],
    init: function () {
        return {};
    }
};