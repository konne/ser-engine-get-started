//#region IMPORTS
const schema = require("../../node_modules/enigma.js/schemas/12.170.2.json");

import * as enigmajs from "enigma.js";
import * as websocket from "ws";
//#endregion

interface IConfig {
    hostname: string;
}

export class Connection {

    sessionConfig: enigmaJS.IConfig;
    session: enigmaJS.ISession;
    url: string;

    constructor(config: IConfig) {
        console.log("constructor of Connection called");
        this.url = `${config.hostname}/identity/${this._guid()}`;
        this.sessionConfig = {
            schema: schema,
            url: this.url,
            createSocket: url => new websocket(this.url)
        };
    }

    openSession(): Promise<EngineAPI.IGlobal> {
        return new Promise((resolve, reject) => {
            this.session = enigmajs.create(this.sessionConfig);
            this.session.open()
            .then((global: EngineAPI.IGlobal) => resolve(global))
            .catch(error => reject(error));
        });
    }

    closeSession(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.session.close()
            .then(() => resolve())
            .catch(error => reject(error));
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

}