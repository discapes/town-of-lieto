import { createRequire } from "module";
import { fileURLToPath } from "url";
export const require = createRequire(import.meta.url);
const path = require("path");
export const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
export const delay = (s) => new Promise((resolve) => { setTimeout(resolve, s * 1000); });
export function requiredNum(val) {
    if (val == undefined || isNaN(+val))
        throw new Error(".env value is undefined or NaN");
    else
        return +val;
}
export function requiredBool(val) {
    if (val == undefined || (val !== "true" && val !== "false"))
        throw new Error(".env value is undefined or not a boolean");
    else
        return val == "true";
}
export function formatDate(date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    const hh = date.getHours();
    const mm = date.getMinutes();
    const ss = date.getSeconds();
    return `${[hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":")} on ${[d, m, y].join(".")}`;
}
export function formatHHMMSS(date) {
    const hh = date.getHours();
    const mm = date.getMinutes();
    const ss = date.getSeconds();
    return [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":");
}
// export class PingCounter {
// 	get avgPingsPerSec() {
// 		return this.#avgPingsPerSec;
// 	}
// 	ping() {
// 		this.pingsLastNSecs++;
// 	}
// 	pingsLastNSecs = 0;
// 	#avgPingsPerSec = 0;
// 	constructor(updateInterval) {
// 		this.updateInterval = updateInterval;
// 		setInterval(() => {
// 			this.#avgPingsPerSec = Math.round(this.pingsLastNSecs / this.updateInterval);
// 			this.pingsLastNSecs = 0;
// 		}, this.updateInterval * 1000);
// 	}
// }
export const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4() + s4()}-${s4()}`;
};
export function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}
export const RANDOMNAMES = [
    "linkdeny",
    "eventuallynumber",
    "dinosaurjuggle",
    "sessionwall",
    "abrasiveshortstop",
    "doyltsassy",
    "cordialtell",
    "causticfinding",
    "transomvolatile",
    "locationpatch",
    "roachmainstay",
    "guestabsent",
    "practicalvisor",
    "vaulterbishop",
    "stainedlie",
    "walrusworthless",
    "relaxspiffy",
    "therapyjoiner",
    "motorpeevish",
    "constantlywedge",
    "targetbrand",
    "reductionabiding",
    "xebeclevel",
    "handletomatoes",
    "transhipshowers",
    "writheicerink",
    "rosemaryboots",
    "collectiongucci",
    "bankerworse",
    "paceallium",
    "labcreature",
    "wrotebargain",
    "creepytranslator",
    "lousecyclonic",
    "giganticproposal",
    "recommendlost",
    "aboardtwenty",
    "commitkarate",
    "deficitsleep",
    "jocularpilchard",
    "burritopussface",
    "cavequalified",
    "ploveramuse",
    "sentshot",
    "wellmadespruce",
    "sunbonnetrent",
    "subtlebananas",
    "netheritefossil",
    "enragedcaught",
    "abjectunwilling",
];
//# sourceMappingURL=util.js.map