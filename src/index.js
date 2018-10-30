(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./model/connection", "./model/app"], factory);
    }
})(function (require, exports) {
    "use strict";
    exports.__esModule = true;
    var config = require("./config.json");
    var connection_1 = require("./model/connection");
    var app_1 = require("./model/app");
    function run() {
        console.log("example started", config.hostnameQlik);
        var connection = new connection_1.Connection({ hostname: config.hostnameQlik });
        var app;
        connection.openSession()
            .then(function (global) {
            console.log("session opened");
            app = new app_1.App({
                hostnameQlik: config.hostnameQlik,
                hostnameServer: config.hostnameServer,
                appname: config.appname,
                templateName: config.templateName,
                outputPath: config.outputPath
            }, global, config.appname, connection.url);
            return app.openDoc();
        })
            // .then(() => {
            //     console.log("doc opened");
            //     return app.selectValue(config.firstSelection.field, config.firstSelection.value);
            // })
            .then(function () {
            console.log("values selected");
            return app.createReport();
        })
            .then(function () {
            console.log("Report created selected");
            process.exit();
        })["catch"](function (error) {
            console.error(error);
            process.exit();
        });
    }
    run();
});
