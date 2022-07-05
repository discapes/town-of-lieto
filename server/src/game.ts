import { delay, getUniqueID, OneOrMany, RANDOMNAMES, shuffle, requiredNum } from "./util.js";
import { Client } from "./index.js";

export type Role = "villager" | "investigator" | "mafioso" | "none";

export type Player = {
	id: Client
	alive: boolean;
	role: Role;
	name: string;
	number: number;
	printname: string;
	onmessage?: (msg: string, p: Player) => void;
	dies: boolean;
};

export interface Game {
	uid: string;
	onmessage(id: Client, message: string): void;
	start(): void;
	disconnected(id: Client): void;
}

class DefaultMap<K, V> extends Map<K, V> {

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
class PlayerArray extends Array<Player> {
	alive() {
		return this.filter(p => p.alive);
	}
	dead() {
		return this.filter(p => !p.alive);
	}
	constructor(...args: Player[]) {
		super(...args);
	}
}

const delayTime = requiredNum(process.env.DELAY_TIME);
const nameDelayTime = requiredNum(process.env.NAME_TIME);
const nightDelayTime = requiredNum(process.env.NIGHT_TIME);
const chatTime = requiredNum(process.env.CHAT_TIME);
const voteTime = requiredNum(process.env.VOTE_TIME);
const lastWordsTime = requiredNum(process.env.LAST_WORDS_TIME);

export default class MafiaGame implements Game {
	uid = getUniqueID();


	playersByRole = new DefaultMap<Role, PlayerArray>(() => new PlayerArray());

	players: PlayerArray;
	endGame: () => void;
	send: (data: {}, players: Player[] | Player) => void;
	disconnected: (id: Client) => void;
	onmessage: (id: Client, message: any) => void;
	chatting = false;
	ended = false;
	playerIdentities = false;
	skipchatvotes = 0;
	started = false;
	discPlayers = new PlayerArray();
	gfIndex = 0;
	skipVote = (p: Player) => { };

	constructor(playerids: Client[], messageID: (msg: any, ...id: Client[]) => void, endGame: () => void) {
		this.players = new PlayerArray(...playerids.map((id) => ({
			id,
			alive: true,
			name: "anonymous",
			number: 0,
			printname: "anonymous",
			role: "none" as Role,
			dies: false,
		})));
		console.log(this.players);
		const playersByID = new WeakMap<Client, Player>(this.players.map((p) => [p.id, p]));
		this.endGame = endGame;

		this.send = function send(this: MafiaGame, data: {}, players: OneOrMany<Player> | undefined): void {
			if (players == undefined) return;
			if (!Array.isArray(players)) players = [players];
			messageID(JSON.stringify(data), ...players.map((p) => p.id));
		};
		this.onmessage = function onmessage(this, id, message): void {
			const player = playersByID.get(id);
			if (player == undefined) return;
			if (player.onmessage) {
				const f = player.onmessage;
				player.onmessage = undefined;
				f(message, player);
			} else if (this.playerIdentities) {
				this.chatMessage(message, player);
			}
		};
		this.disconnected = function disconnected(this, id): void {
			const player = playersByID.get(id);
			if (player === undefined) return;
			this.bcText(`${player.printname} disconnected.`);
			if (!this.started) {
				this.players.splice(this.players.findIndex(p => p == player, 1));
			}
			this.discPlayers.push(player);
			player.alive = false;
			this.checkWin();
		};
	}
	chatMessage(message: string, player: Player) {
		if (!player.alive) {
			this.sendText(`\t- ${player.printname}: ${message}`, this.players.dead());
		} else if (this.chatting) {
			if (message.toLowerCase() == "/skip") {
				this.skipVote?.(player);
			} else {
				this.bcText(`\t${player.printname}: ${message}`);
			}
		}
	}

	async bcWait(secs: number) {
		this.send({ type: "wait", finish: new Date(Date.now() + secs * 1000).toJSON() }, this.players);
		await delay(secs);
	}

	bcStopInput() {
		this.sendStopInput(this.players);
	}

	bcChatting() {
		this.sendChatting(this.players);
	}

	sendChatting(players: OneOrMany<Player>) {
		if (!Array.isArray(players)) players = [players];
		players.forEach((p) => p.onmessage = undefined);
		this.send({ type: "chatting" }, players);
	}

	bcText(text: string) {
		this.sendText(text, this.players);
	}

	sendStopInput(players: OneOrMany<Player>) {
		if (!Array.isArray(players)) players = [players];
		players.forEach((p) => p.onmessage = undefined);
		this.send({ type: "stopinput" }, players);
	}

	sendText(text: string, players: OneOrMany<Player>) {
		this.send({ type: "text", text }, players);
	}

	sendQuestion(text: string, cb: (msg: string, p: Player) => void, players: OneOrMany<Player>) {
		if (!Array.isArray(players)) players = [players];
		players.forEach((p) => p.onmessage = cb);
		this.send({ type: "question", text }, players);
	}

	fillRoleMap() {
		shuffle(this.players);
		let nMafioso = this.players.length >= 7 ? 2 : 1;
		this.playersByRole.set("investigator", new PlayerArray(this.players[0]));
		this.playersByRole.set("mafioso", new PlayerArray(...this.players.slice(1, 1 + nMafioso)));
		this.playersByRole.set("villager", new PlayerArray(...this.players.slice(1 + nMafioso,)));
	}
	setRoles() {
		for (const [role, players] of this.playersByRole) {
			players.forEach((p) => p.role = role);
			if (role == "mafioso") {
				this.sendText(`Your role is ${role}. Other mafia: ${players.map(p => p.printname).join(", ")}.`, players);
			} else {
				this.sendText(`Your role is ${role}.`, players);
			}
		}
	}

	async start() {
		console.log(`Game starting with players ${this.players.map((p) => p.id.uid)}`);
		this.bcText("Game is starting...");
		await delay(delayTime);
		this.started = true;

		this.fillRoleMap();
		await this.dealNames(); // players now sorted by number
		this.bcText(`All players:\n\t${this.players.map((p) => p.printname).join("\n\t")}.`);
		this.setRoles();

		try {
			this.sanityCheck();
		} catch (e: any) {
			console.error(e.message);
			this.bcText("Sorry, an internal error has happened.");
			this.ended = true;
			this.endGame();
			return;
		}

		this.playerIdentities = true;
		await delay(delayTime);
		this.loop();
	}

	async dealNames() {
		shuffle(this.players);
		let usedNames = ["anonymous"];
		const nameIs = (msg: string, p: Player) => {
			if (msg.length > 20 || msg.length < 3) this.sendQuestion("sorry? (name must have 3-20 characters)", nameIs, p);
			else if (usedNames.includes(msg.toLowerCase())) this.sendQuestion("sorry? (name unavailable)", nameIs, p);
			else {
				p.name = msg;
				usedNames.push(msg.toLowerCase());
			}
		};
		this.sendQuestion("What is your name?", nameIs, this.players);
		await this.bcWait(nameDelayTime);
		this.bcStopInput();

		let pNumber = 1;
		for (const p of this.players) {
			while (p.name == "anonymous") {
				let generated = RANDOMNAMES[Math.floor(Math.random() * RANDOMNAMES.length)];
				if (!usedNames.includes(generated.toLowerCase())) {
					p.name = generated;
					usedNames.push(generated.toLowerCase());
				}
			}
			p.number = pNumber++;
			p.printname = `(${p.number}) ${p.name}`;
			this.sendText(`Your name is ${p.printname}.`, p);
		}
	}

	findPlayer(name: string) {
		return this.players.find(p =>
			p.name.toLowerCase() == name.toLowerCase()
			|| +name == p.number);
	}

	sanityCheck() {
		for (let p of this.players) {
			const assert = (x: boolean, str: string) => {
				if (!x) {
					throw new Error(`Error validating players: ${str} is undefined`);
				}
			}
			/*
				id: Client
				alive: boolean;
				role: Role;
				name: string;
				number: number;
				printname: string;
				onmessage?: (msg: string, p: Player) => void;
				dies: boolean;
			*/
			assert(p.alive == !this.discPlayers.includes(p), "alive");
			assert(p.id != undefined, "id");
			assert(p.role != "none", "role");
			assert(p.name != "anonymous", "name");
			assert(p.number != 0, "number");
			assert(p.printname != "anonymous", "printname");
			assert(p.dies == false, "dies");
		}
	}

	async loop() {
		let night = 1;
		while (!this.ended) {
			this.bcText(`Night ${night} begins...`);
			if (night == 1) this.bcText("Remember, you can refer to players by their name or number.");
			await delay(delayTime);
			await this.night();
			await delay(delayTime);
			this.bcText(`Day ${night} begins...`);
			await delay(delayTime);
			await this.day();
			await delay(delayTime);
			night++;
		}
	}

	bcStopWait() {
		this.bcWait(0);
	}

	announceDeath(player: Player) {
		this.bcText(`Last night someone poisoned ${player.printname}.`);
	}

	async day() {
		const deaths = this.players.filter((p) => p.dies);
		deaths.forEach((p) => {
			this.announceDeath(p);
			p.dies = false;
			p.alive = false;
		});
		this.sendText("You are dead. You can only talk with dead people now.", deaths);

		this.checkWin();
		if (this.ended) {
			return;
		}

		this.chatting = true;
		let skipchat = new Promise<void>((resolve, reject) => {
			let votes = 0;
			this.skipVote = (p: Player) => {
				console.log("Skip votes: " + ++votes);
				this.sendText(`${votes} voted to skip.`, p);
				if (votes >= this.players.alive().length) resolve();
			}
		})
		this.bcText("You can now chat. /skip from all to skip chatting.");
		this.bcChatting();
		await Promise.any([this.bcWait(chatTime), skipchat]);
		this.bcStopInput();
		this.bcStopWait();
		this.chatting = false;

		this.bcText("Let the voting begin.");
		await delay(delayTime);
		const votes = new DefaultMap<Player, number>(() => 0);
		const lynchVote = (msg: string, p: Player) => {
			let player = this.findPlayer(msg);
			if (!player) this.sendQuestion("sorry?", lynchVote, p);
			else if (player == p) this.sendQuestion("sorry? (vote for someone else)", lynchVote, p);
			else votes.set(player, votes.get(player) + 1);
		};
		this.sendQuestion("Who would you like to lynch? (optional)", lynchVote, this.players.alive());
		await this.bcWait(voteTime);
		this.bcStopInput();
		let votesArr = [...votes.entries()];
		votesArr.sort((a, b) => b[1] - a[1])
		const tie = votes.size >= 2 && votesArr[0][1] === votesArr[1][1];
		const highestVotes: [Player, number] = votesArr[0];
		const noVotes = this.players.alive().length - votesArr.reduce((p: number, c) => p + c[1], 0);
		this.bcText(`Vote results:\n${votesArr.map(([p, n]) => `${p.printname}: ${n}`).join('\n')}\nNo vote: ${noVotes}`);

		if (!highestVotes || noVotes > highestVotes[1]) {
			this.bcText("Nobody is lynched.");
		} else if (tie || noVotes == highestVotes[1]) {
			this.bcText("It's a tie.");
		} else {
			let lynched = highestVotes[0];
			this.bcText(lynched.printname + " was voted out.\nAny last words?");
			this.sendChatting(lynched);
			lynched.onmessage = (msg) => {
				this.bcText(`"${msg}" -${lynched.name} (${new Date().getFullYear()})`);
				this.sendStopInput(lynched);
			};
			await this.bcWait(lastWordsTime);
			this.sendStopInput(lynched);
			lynched.alive = false;

			this.checkWin();
			if (this.ended) {
				return;
			}
		}
	}

	checkWin() {
		const aliveMafia = this.playersByRole.get("mafioso").alive().length;
		const alivePlayers = this.players.alive().length;
		if (aliveMafia === 0) {
			this.bcText("All of the mafia are dead. Villagers win.");
			this.ended = true;
		} else if (aliveMafia >= (alivePlayers - aliveMafia)) {
			this.bcText("Mafia wins.");
			this.ended = true;
		}
		if (this.ended) {
			this.endGame();
		}
	}

	async night() {
		const mafiaKills = (victimName: string, mafioso: Player) => {
			const victim = this.findPlayer(victimName);
			if (!victim) this.sendQuestion(`sorry?`, mafiaKills, mafioso);
			else if (victim.role === "mafioso") this.sendQuestion(`You can't kill a mafioso, select someone else:`, mafiaKills, mafioso);
			else if (!victim.alive) this.sendQuestion(`You can't kill a dead person.`, mafiaKills, mafioso);
			else {
				this.sendStopInput(mafioso);
				this.sendText(`You will kill ${victim.printname}.`, mafioso);
				victim.dies = true;
			}
		};
		const investigatorChecks = (targetName: string, investigator: Player) => {
			const target = this.findPlayer(targetName);
			if (!target) this.sendQuestion(`sorry?`, investigatorChecks, investigator);
			else if (target === investigator) this.sendQuestion(`You're an investigator, select someone else:`, investigatorChecks, investigator);
			else if (!target.alive) this.sendQuestion(`You can't investigate a dead person.`, investigatorChecks, investigator);
			else {
				this.sendStopInput(investigator);
				this.sendText(`${target.printname}'s role is ${target.role}.`, investigator);
			}
		};

		let remainingMafia = this.playersByRole.get("mafioso").alive();
		if (remainingMafia) {
			this.gfIndex++;
			if (this.gfIndex >= remainingMafia.length) this.gfIndex = 0;
			let killingMafioso = remainingMafia.splice(this.gfIndex, 1)[0];

			this.sendQuestion(`Mafioso, who would you like to kill?`, mafiaKills, killingMafioso);
			this.sendText(`The killing mafioso for tonight is ${killingMafioso.printname}.`, remainingMafia);
		}
		this.sendQuestion(`Detective, who would you like to investigate?`, investigatorChecks, this.playersByRole.get("investigator").alive());
		await this.bcWait(nightDelayTime);
		this.bcStopInput();
	}
}