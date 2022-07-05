export type OneOrMany<T> = T | T[];
export const delay = (s: number) => new Promise((resolve) => { setTimeout(resolve, s * 1000); });

export function requiredNum(val: string | undefined) {
	if (val == undefined || isNaN(+val))
		throw new Error(".env value is undefined or NaN");
	else return +val;
}

export function requiredBool(val: string | undefined) {
	if (val == undefined || (val !== "true" && val !== "false"))
		throw new Error(".env value is undefined or not a boolean");
	else return val == "true";
}

export const getUniqueID = () => {
	const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	return `${s4() + s4()}-${s4()}`;
};

export function shuffle(array: unknown[]) { // Fisher-Yates (aka Knuth) shuffle
	let currentIndex = array.length, randomIndex;
	while (currentIndex != 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]];
	}
	return array;
}

export class MapWithDefault<K, V> extends Map<K, V> {
	getDefaultValue: () => V;

	constructor(getDefaultValue: () => V) {
		super();
		this.getDefaultValue = getDefaultValue;
	}

	get(key: K): V {
		let val = super.get(key);
		return val ?? this.getDefaultValue();
	}
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
