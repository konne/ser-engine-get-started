const config = require("./config.json");
import { Connection } from "./model/connection";
import { App } from "./model/app";

function run() {
    console.log("example started", config.hostnameQlik);

    let connection = new Connection({ hostname: config.hostnameQlik });
    let app: App;

    connection.openSession()
        .then(global => {
            console.log("session opened");
            app = new App(
                {
                    hostnameQlik: config.hostnameQlik,
                    hostnameServer: config.hostnameServer,
                    appname: config.appname,
                    templateName: config.templateName,
                    outputPath: config.outputPath
                },
                global,
                config.appname,
                connection.url
            );
            console.log("open document");
            return app.openDoc();
        })
        .then(() => {
            console.log("document opened");
            console.log(" ");
            console.log("select value");
            return app.selectValue(config.firstSelection.field, config.firstSelection.value);
        })
        .then(() => {
            console.log("values selected");
            console.log(" ");
            console.log("create shared report on demand");
            return app.createReport("shared");
        })
        .then(() => {
            console.log("shared report created");
            console.log(" ");
            console.log("create file loop report");
            return app.createReport("notShared");
        })
        .then(() => {
            console.log("Report created");
            return connection.closeSession();
        })
        .then(() => {
            console.log(" ");
            console.log("example finished");
            process.exit();
        })
        .catch(error => {
            console.error(error);
            connection.closeSession()
            .then(() => process.exit())
            .catch(error => process.exit());
        });
}

run();