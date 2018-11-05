//#region IMPORTS
import * as http from "http";
import * as fs from "fs";
import { isNullOrUndefined } from "util";
//#endregion

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
            const serJson = this.createSERJson(fileId);

            const headers = {
                    "SerFilename": "ExecutiveDashboard.xlsx"
            };

            this.sendRequest("POST", `/api/v1/file/${fileId}`, headers, postData)
                .then((data) => {
                    let id = JSON.parse(data);

                    return this.sendRequest("POST", `/api/v1/task`, null, serJson);
                })
                .then((data) => {
                    console.log(data);
                    const taskId
                })
                .catch(error => reject(error));


            // const options = {
            //     hostname: this.config.hostnameServer,
            //     port: 11271,
            //     path: `/api/v1/file/${fileId}?filename=ExecutiveDashboard.xlsx`,
            //     method: "POST",
            //     headers: {
            //         "Content-Type": "text/plain"
            //     }
            // };

            // let id = "";
            // const req = http.request(options, (res) => {
            //     console.log(`STATUS: ${res.statusCode}`);
            //     console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
            //     res.setEncoding("utf8");
            //     res.on("data", (resId) => {
            //         id = resId;
            //     });
            //     res.on("end", () => {
            //         this.callTaskPost(jsonFile);
            //         console.log("No more data in response.");
            //     });
            // });

            // req.on("error", (e) => {
            //     console.error(`problem with request: ${e.message}`);
            // });
            // req.write(postData);
            // req.end();

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
                res.on("end", () => {
                    console.log("taskCall end");

                    const a = JSON.parse(data);

                    if (typeof (a[0]) === "undefined") {
                        console.log("RETRY");
                        this.callTaskGet(id);
                        return;

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

    private getFinalReport(taskid: string) {
        console.log("getFinalReport", taskid);

        const options = {
            hostname: this.config.hostnameServer,
            port: 11271,
            path: `/api/v1/file/${taskid}`,
            method: "GET"
        };

        const req = http.request(options, (res) => {
            console.log(`STATUS: ${res.statusCode}`);
            let data = [];


            res.on("data", (chunk) => {
                console.log("DATA");
                data.push(chunk);
            });
            res.on("end", () => {
                console.log("END");

                let dataByte = Buffer.concat(data);


                fs.writeFile(this.config.outputPath, dataByte, "binary", (err) => {
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

    private sendRequest(methode: "GET" | "POST", path: string, headers: any, postData?: any): Promise<any> {

        return new Promise((resolve, reject) => {

            let options: http.RequestOptions = {
                hostname: this.config.hostnameServer,
                port: 11271,
                path: path,
                method: methode,
            };

            if (isNullOrUndefined(headers)) {
                options = { ...options,
                    headers: headers
                };
            }

            const request = http.request(options, (response) => {
                const data = [];

                response.on("data", (chunk) => {
                    console.log("chunk", chunk);
                    data.push(chunk);
                });

                response.on("end", () => {
                    resolve(data);
                });
            });

            request.on("error", (error) => {
                reject(error);
            });

            switch (methode) {
                case "POST":

                    request.write(postData);
                    request.end();
                    break;

                default:
                    request.end();
                    break;
            }

        });
    }

    private createSERJson(fileId: string): Object {
        return {
            "tasks": [
                {
                    "reports": [
                        {
                            "general": {
                                "cleanupTimeOut": 10,
                                "timeout": 900,
                                "errorRepeatCount": 2
                            },
                            "template": {
                                "input": "ExecutiveDashboard.xlsx",
                                "output": "='Report_'&only(Region)&'_'&max([Fiscal Year])&'.pdf'",
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
    }
}