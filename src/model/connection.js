(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "enigma.js", "ws"], factory);
    }
})(function (require, exports) {
    "use strict";
    exports.__esModule = true;
    //#region IMPORTS
    var schema = require("../../node_modules/enigma.js/schemas/12.170.2.json");
    var enigmajs = require("enigma.js");
    var websocket = require("ws");
    var Connection = /** @class */ (function () {
        function Connection(config) {
            var _this = this;
            console.log("constructor of Connection called");
            this.url = config.hostname + "/identity/" + this._guid();
            this.sessionConfig = {
                schema: schema,
                url: this.url,
                createSocket: function (url) { return new websocket(_this.url); }
            };
        }
        Connection.prototype.openSession = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.session = enigmajs.create(_this.sessionConfig);
                _this.session.open()
                    .then(function (global) { return resolve(global); })["catch"](function (error) { return reject(error); });
            });
        };
        Connection.prototype.closeSession = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.session.close()
                    .then(function () { return resolve(); })["catch"](function (error) { return reject(error); });
            });
        };
        Connection.prototype._guid = function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
        };
        return Connection;
    }());
    exports.Connection = Connection;
});
