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
            return app.openDoc();
        })
        .then(() => {
            console.log("doc opened");
            return app.selectValue(config.firstSelection.field, config.firstSelection.value);
        })
        .then(() => {
            console.log("values selected");
            return app.createReport("shared");
        })
        .then(() => {
            console.log("values selected");
            return app.createReport("notShared");
        })
        .then(() => {
            console.log("Report created selected");
            return connection.closeSession();
        })
        .then(() => {
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