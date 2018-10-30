import * as http from "http";
import * as fs from "fs";

interface IAppConfig {
    hostnameServer: string;
    hostnameQlik: string;
    appname: string;
    templateName: string;
    outputPath: string;
}

export class App {

    app: EngineAPI.IApp;

    private global: EngineAPI.IGlobal;
    private appname: string;
    private config: IAppConfig;
    private url: string;

    constructor(config: IAppConfig, global: EngineAPI.IGlobal, appname: string, url: string) {
        console.log("constructor of App called");
        this.global = global;
        this.appname = appname;
        this.config = config;
        this.url = url;
    }

    openDoc(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.global.openDoc(this.appname)
                .then(doc => {
                    this.app = doc;
                    resolve();
                })
                .catch(error => reject(error));
        });
    }

    selectValue(field: string, value: string) {
        return new Promise((resolve, reject) => {
            this.app.getField(field)
                .then(field => {
                    return field.selectValues([{
                        qText: value
                    }]);
                })
                .then(() => resolve())
                .catch(error => reject(error));
        });
    }

    createReport(): Promise<void> {
        return new Promise((resolve, reject) => {

            let postData = fs.readFileSync("./src/assets/ExecutiveDashboard.xlsx");
            const fileId: string = this._guid();
            const jsonFile = {
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
                                        "serverUri": this.url.split("/app/engineData")[0],
                                        "app": "engineData",
                                        "identities": [this.url.split("identity/")[1]],
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

            const options = {
                hostname: this.config.hostnameServer,
                port: 11271,
                path: `/api/v1/file/${fileId}?filename=ExecutiveDashboard.xlsx`,
                method: "POST",
                headers: {
                    "Content-Type": "text/plain"
                }
            };

            let id = "";
            const req = http.request(options, (res) => {
                console.log(`STATUS: ${res.statusCode}`);
                console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                res.setEncoding("utf8");
                res.on("data", (resId) => {
                    id = resId;
                });
                res.on("end", () => {

                    this.callTaskPost(jsonFile);
                    console.log("No more data in response.");
                });
            });

            req.on("error", (e) => {
                console.error(`problem with request: ${e.message}`);
            });
            req.write(postData);
            req.end();

        });


    }

    private _guid(): string {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    }


    private callTaskPost(jsonFile: Object) {
        console.log("callTaskPost");

        const options = {
            hostname: this.config.hostnameServer,
            port: 11271,
            path: `/api/v1/task`,
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            }
        };
        let id2 = "";
        const req = http.request(options, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            res.setEncoding("utf8");
            res.on("data", (taskRequest) => {
                id2 = taskRequest;
                console.log("taskCall", taskRequest);
            });
            res.on("end", () => {

                this.callTaskGet(JSON.parse(id2));
                console.log("No more data in response.");
            });
        });

        req.on("error", (e) => {
            console.error(`problem with request: ${e.message}`);
        });
        req.write(JSON.stringify(jsonFile));
        req.end();



    }

    private callTaskGet(id: string) {
        console.log("callTaskGet");
        setTimeout(() => {


            const options = {
                hostname: this.config.hostnameServer,
                port: 11271,
                path: `/api/v1/task/${id}`,
                method: "GET"
            };

            let data = "";
            const req = http.request(options, (res) => {
                console.log(`STATUS: ${res.statusCode}`);
                res.setEncoding("utf8");
                res.on("data", (taskRequest) => {
                    console.log("taskCall data", taskRequest);
                    data += taskRequest;
                });
                res.on("end", (taskRequest) => {
                    console.log("taskCall end", taskRequest);

                    const a = JSON.parse(data);

                    if (typeof (a[0]) === "undefined") {
                        console.log("RETRY");
                        this.callTaskGet(id);

                    }
                    let status = a[0].status;

                    if (status === "RETRYERROR") {
                        console.log("NOT WORKING RETRYERROR");
                        return;
                    }

                    if (status === "SUCCESS") {
                        console.log("SUCCESS");
                        this.getFinalReport(id);
                        return;
                    }

                    if (status === "ERROR") {
                        console.log("NOT WORKING ERROR");
                        return;
                    }


                    setTimeout(() => {
                        this.callTaskGet(id);
                    }, 1000);
                });
            });

            req.on("error", (e) => {
                console.error(`problem with request: ${e.message}`);
            });
            req.end();

        }, 1000);
    }

    getFinalReport(taskid: string) {
        console.log(taskid);



        const options = {
            hostname: this.config.hostnameServer,
            port: 11271,
            path: `/api/v1/file/${taskid}`,
            method: "GET"
        };

        let data = "";
        const req = http.request(options, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            res.setEncoding("utf8");
            res.on("data", (taskRequest) => {
                data += taskRequest;
            });
            res.on("end", (taskRequest) => {
                data += taskRequest;

                // fs.writeFileSync(this.config.outputPath, data);

                fs.writeFile(this.config.outputPath, data, 'utf8', function (err) {
                    if (err) {
                        return console.log(err);
                    }

                    console.log("The file was saved!");
                });
            });
        });

        req.on("error", (e) => {
            console.error(`problem with request: ${e.message}`);
        });
        req.end();
    }


}