(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "http", "fs"], factory);
    }
})(function (require, exports) {
    "use strict";
    exports.__esModule = true;
    var http = require("http");
    var fs = require("fs");
    var App = /** @class */ (function () {
        function App(config, global, appname, url) {
            console.log("constructor of App called");
            this.global = global;
            this.appname = appname;
            this.config = config;
            this.url = url;
        }
        App.prototype.openDoc = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.global.openDoc(_this.appname)
                    .then(function (doc) {
                    _this.app = doc;
                    resolve();
                })["catch"](function (error) { return reject(error); });
            });
        };
        App.prototype.selectValue = function (field, value) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.app.getField(field)
                    .then(function (field) {
                    return field.selectValues([{
                            qText: value
                        }]);
                })
                    .then(function () { return resolve(); })["catch"](function (error) { return reject(error); });
            });
        };
        App.prototype.createReport = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var postData = fs.readFileSync("./src/assets/ExecutiveDashboard.xlsx");
                var fileId = _this._guid();
                var jsonFile = {
                    "tasks": [
                        {
                            "reports": [
                                {
                                    "general": {
                                        "cleanupTimeOut": 10,
                                        "timeout": 900,
                                        "errorRepeatCount": 2,
                                        "useUserSelections": "OnDemandOn"
                                    },
                                    "template": {
                                        "input": "ExecutiveDashboard.xlsx",
                                        "output": "Report",
                                        "outputformat": "pdf",
                                        "selections": [
                                            {
                                                "type": "static",
                                                "name": "Fiscal Year",
                                                "values": "2014"
                                            },
                                            {
                                                "type": "dynamic",
                                                "name": "Region"
                                            }
                                        ]
                                    },
                                    "distribute": {},
                                    "connections": [
                                        {
                                            "serverUri": _this.url.split("/app/engineData")[0],
                                            "app": "engineData",
                                            "identities": [_this.url.split("identity/")[1]],
                                            "sslValidThumbprints": [
                                                {
                                                    "url": "https://nb-fc-208000/ser",
                                                    "thumbprint": "e0e1b550a72365bdbf2aa9a0c5ecc320e35b5985"
                                                }
                                            ],
                                            "credentials": {
                                                "type": "NONE"
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    "uploadGuids": [fileId]
                };
                var options = {
                    hostname: _this.config.hostnameServer,
                    port: 11271,
                    path: "/api/v1/file/" + fileId + "?filename=ExecutiveDashboard.xlsx",
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain"
                    }
                };
                var id = "";
                var req = http.request(options, function (res) {
                    console.log("STATUS: " + res.statusCode);
                    console.log("HEADERS: " + JSON.stringify(res.headers));
                    res.setEncoding("utf8");
                    res.on("data", function (resId) {
                        id = resId;
                    });
                    res.on("end", function () {
                        _this.callTaskPost(jsonFile);
                        console.log("No more data in response.");
                    });
                });
                req.on("error", function (e) {
                    console.error("problem with request: " + e.message);
                });
                req.write(postData);
                req.end();
            });
        };
        App.prototype._guid = function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
        };
        App.prototype.callTaskPost = function (jsonFile) {
            var _this = this;
            console.log("callTaskPost");
            var options = {
                hostname: this.config.hostnameServer,
                port: 11271,
                path: "/api/v1/task",
                method: "POST",
                headers: {
                    "Content-Type": "text/plain"
                }
            };
            var id2 = "";
            var req = http.request(options, function (res) {
                console.log("STATUS: " + res.statusCode);
                res.setEncoding("utf8");
                res.on("data", function (taskRequest) {
                    id2 = taskRequest;
                    console.log("taskCall", taskRequest);
                });
                res.on("end", function () {
                    _this.callTaskGet(JSON.parse(id2));
                    console.log("No more data in response.");
                });
            });
            req.on("error", function (e) {
                console.error("problem with request: " + e.message);
            });
            req.write(JSON.stringify(jsonFile));
            req.end();
        };
        App.prototype.callTaskGet = function (id) {
            var _this = this;
            console.log("callTaskGet");
            setTimeout(function () {
                var options = {
                    hostname: _this.config.hostnameServer,
                    port: 11271,
                    path: "/api/v1/task/" + id,
                    method: "GET"
                };
                var data = "";
                var req = http.request(options, function (res) {
                    console.log("STATUS: " + res.statusCode);
                    res.setEncoding("utf8");
                    res.on("data", function (taskRequest) {
                        console.log("taskCall data", taskRequest);
                        data += taskRequest;
                    });
                    res.on("end", function (taskRequest) {
                        console.log("taskCall end", taskRequest);
                        var a = JSON.parse(data);
                        if (typeof (a[0]) === "undefined") {
                            console.log("RETRY");
                            _this.callTaskGet(id);
                        }
                        var status = a[0].status;
                        if (status === "RETRYERROR") {
                            console.log("NOT WORKING RETRYERROR");
                            return;
                        }
                        if (status === "SUCCESS") {
                            console.log("SUCCESS");
                            _this.getFinalReport(id);
                            return;
                        }
                        if (status === "ERROR") {
                            console.log("NOT WORKING ERROR");
                            return;
                        }
                        setTimeout(function () {
                            _this.callTaskGet(id);
                        }, 1000);
                    });
                });
                req.on("error", function (e) {
                    console.error("problem with request: " + e.message);
                });
                req.end();
            }, 1000);
        };
        App.prototype.getFinalReport = function (taskid) {
            var _this = this;
            console.log(taskid);
            var options = {
                hostname: this.config.hostnameServer,
                port: 11271,
                path: "/api/v1/file/" + taskid,
                method: "GET"
            };
            var data = "";
            var req = http.request(options, function (res) {
                console.log("STATUS: " + res.statusCode);
                res.setEncoding("utf8");
                res.on("data", function (taskRequest) {
                    data += taskRequest;
                });
                res.on("end", function (taskRequest) {
                    data += taskRequest;
                    // fs.writeFileSync(this.config.outputPath, data);
                    fs.writeFile(_this.config.outputPath, data, 'utf8', function (err) {
                        if (err) {
                            return console.log(err);
                        }
                        console.log("The file was saved!");
                    });
                });
            });
            req.on("error", function (e) {
                console.error("problem with request: " + e.message);
            });
            req.end();
        };
        return App;
    }());
    exports.App = App;
});
