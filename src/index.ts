import * as fs from "fs";
import * as request from "request";

async function run() {
    let uploadFile = fs.readFileSync(`./src/assets/Sales.xlsx`);
    console.log("file read in");

    console.log("post file to ser service");
    const fileId = await postFile(uploadFile);
    console.log("file uploaded, received fileId:", fileId);

    console.log("post task to ser service");
    const taskId = await postTask(fileId);
    console.log("file uploaded, received taskId  taskId", taskId);

    await (async () => {
        while (true) {
            await delay();
            const status = await getTask(taskId);
            if (status === "SUCCESS" || status === "ERROR" || status === "RETRYERROR") {
                console.log("Task Status: ", status);
                break;
            }
        }
    })();
    console.log("task has finished");

    const fileBuffer = await getFile(taskId);
    fs.writeFileSync(`result.zip`, fileBuffer);
    console.log("File saved in root folder");
}

async function delay(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 1000)
    });
}

async function postFile(data): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let options = {
            headers: {
                "serfilename": "Sales.xlsx",
                "serunzip": false,
                "Content-Type": "application/octet-stream"
            }
        }
        let req = request.post("http://localhost:15485/api/v1/file", options, (err, res, body) => {
            if (err) {
                console.error("error", err)
            }
            resolve(JSON.parse(body).operationId);
        });
        req.body = data;
    });
}

async function postTask(fileId): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const serJson = {
            "tasks": [
                {
                    "reports": [
                        {
                            "general": {},
                            "template": {
                                "input": "Sales.xlsx",
                                "output": "output.pdf"
                            },
                            "distribute": {},
                            "connections": [
                                {
                                    "serverUri": "ws://engine:9076",
                                    "app": "/apps/Sales.qvf",
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
            headers: {
                "Content-Type": "application/json"
            }
        };
        let req = request.post("http://localhost:15485/api/v1/task", options, (err, res, body) => {
            if (err) {
                console.error("error", err)
            }
            resolve(JSON.parse(body).operationId);
        });
        req.body = JSON.stringify(serJson);
    });
}

async function getTask(id) {
    return new Promise((resolve, reject) => {
        let req = request.get(`http://localhost:15485/api/v1/task/${id}`, (err, res, body) => {
            if (err) {
                console.error("error", err)
            }
            resolve(JSON.parse(body).results[0].status);
        });
    });
}

async function getFile(id): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        let req = request.get(`http://localhost:15485/api/v1/file/${id}`);
        let bufferArray = [];
        req.on("data", (res: Buffer) => {
            bufferArray.push(res);
        })
        req.on("complete", () => {
            resolve(Buffer.concat(bufferArray));
        })
        req.on("error", (err) => {
            console.error("error", err)
        })
        req.end();
    });
}

async function runSync() {
    console.log("*****************************************")
    console.log("*     Start running SER Get Started     *")
    console.log("*****************************************")

    await run();

    console.log("*****************************************")
    console.log("*               Finished                *")
    console.log("*****************************************")

    process.exit();
}
runSync();
