//#region IMPORTS
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
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

    //#region variables
    private app: EngineAPI.IApp;
    private global: EngineAPI.IGlobal;
    private appname: string;
    private config: IAppConfig;
    private url: string;
    private path: string;
    //#endregion

    constructor(config: IAppConfig, global: EngineAPI.IGlobal, appname: string, url: string) {
        this.global = global;
        this.appname = appname;
        this.config = config;
        this.url = url;
    }

    //#region public functions
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

    createReport(mode: string): Promise<void> {
        return new Promise((resolve, reject) => {

            try {
                this.path = this.checkPath(this.config.outputPath);
            } catch (error) {
                console.log(error);
                reject(error);
            }

            let postData = fs.readFileSync(`./src/assets/${this.config.templateName}`);
            let taskId = "";
            let serJson: Object;

            const fileId: string = this._guid();

            switch (mode) {
                case "notShared":
                     serJson = this.createSERJsonNoShared(fileId);
                    break;

                default:
                    serJson = this.createSERJsonShared(fileId);
                    break;
            }

            const headers = {
                "SerFilename": this.config.templateName
            };

            this.sendRequest("POST", `/api/v1/file/${fileId}`, headers, postData)
                .then(() => {
                    return this.sendRequest("POST", `/api/v1/task`, null, JSON.stringify(serJson));

                })
                .then((data) => {
                    taskId = JSON.parse(data);

                    let interval = setInterval(() => {
                        this.sendRequest("GET", `/api/v1/task/${taskId}`)
                            .then((data) => {
                                let info = JSON.parse(data);

                                if (typeof (info[0]) === "undefined") {
                                    console.log("RETRY");
                                    return;
                                }

                                let status = info[0].status;

                                if (status === "RETRYERROR") {
                                    console.log("NOT WORKING RETRYERROR");
                                    clearInterval(interval);
                                    resolve();
                                }

                                if (status === "SUCCESS") {
                                    console.log("SUCCESS");
                                    clearInterval(interval);
                                    this.getFinalReport(taskId, info[0].reports)
                                        .then(() => resolve())
                                        .catch(error => reject(error));
                                }

                                if (status === "WARNING") {
                                    console.log("WARNING");
                                    clearInterval(interval);
                                    this.getFinalReport(taskId, info[0].reports)
                                        .then(() => resolve())
                                        .catch(error => reject(error));
                                }

                                if (status === "ERROR") {
                                    console.log("NOT WORKING ERROR");
                                    clearInterval(interval);
                                    resolve();
                                }

                            })
                            .catch();
                    }, 1000);

                })
                .catch(error => reject(error));

        });
    }
    //#endregion

    //#region private functions
    private _guid(): string {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    }

    private getFinalReport(taskid: string, reports: any[]): Promise<void> {

        return new Promise((resolve, reject) => {

            const promises: Promise<void>[] = [];

            for (const report of reports) {

                const arrPath: string[] = report.paths[0].split("/");
                const reportId = arrPath[arrPath.length - 1];

                promises.push(this.getReport(taskid, reportId, report.name));
            }

            Promise.all(promises)
                .then(() => resolve())
                .catch(error => reject(error));
        });

    }

    private getReport(taskid: string, reportId: string, reportName: string): Promise<void> {
        return new Promise((resolve, reject) => {

            const headers = {
                "SerFilename": reportId
            };

            this.sendRequest("GET", `/api/v1/file/${taskid}`, headers)
                .then((data) => {
                    fs.writeFile(`${this.path}\\${reportName}`, Buffer.concat(data), "binary", (error) => {
                        if (error) {
                            reject(error);
                        }
                        console.log("The file was saved!");
                        resolve();
                    });
                })
                .catch(error => reject(error));
        });
    }

    private sendRequest(methode: "GET" | "POST", path: string, headers?: any, postData?: any): Promise<any> {
        console.log("sendRequest", path);

        return new Promise((resolve, reject) => {

            let options: http.RequestOptions = {
                hostname: this.config.hostnameServer,
                port: 11271,
                path: path,
                method: methode,
            };

            if (!isNullOrUndefined(headers)) {
                options = {
                    ...options,
                    headers: headers
                };
            }

            const request = http.request(options, (response) => {
                const data = [];

                response.on("data", (chunk) => {
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

    private createSERJsonNoShared(fileId: string): Object {
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

    private createSERJsonShared(fileId: string): Object {
        return {
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
                                "output": "OnDemand"
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

    private checkPath(path: string) {

        var replacedPath = path.replace(/%([^%]+)%/g, (_, n) => {
            return process.env[n];
        });

        if (!fs.existsSync(replacedPath)) {
            fs.mkdirSync(replacedPath);
            return replacedPath;
        }

        return replacedPath;
    }
    //#endregion

}