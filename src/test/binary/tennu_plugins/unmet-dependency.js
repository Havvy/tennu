module.exports = {
    name: "unmet-dependency",
    requires: ["does-not-exist"],
    init: function () {
        return {};
    }
};