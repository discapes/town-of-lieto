import { delay, getUniqueID, OneOrMany, RANDOMNAMES, shuffle, requiredNum, MapWithDefault } from "./util.js";
import { Client } from "./index.js";

const DELAY_TIME = requiredNum(process.env.DELAY_TIME);
const NAME_TIME = requiredNum(process.env.NAME_TIME);
const NIGHT_TIME = requiredNum(process.env.NIGHT_TIME);
const CHAT_TIME = requiredNum(process.env.CHAT_TIME);
const VOTE_TIME = requiredNum(process.env.VOTE_TIME);
const LAST_WORDS_TIME = requiredNum(process.env.LAST_WORDS_TIME);

export type Role = "villager" | "investigator" | "mafioso" | "none";

export type Player = {
	id: Client
	alive: boolean;
	role: Role;
	name: string;
	number: number;
	printname: string; // "(number) name"
	onmessage?: (msg: string, p: Player) => void;
	dies: boolean; // players actually die in the morning
};

export interface Game {
	uid: string; // useful later
	onmessage(id: Client, message: string): void;
	start(): void;
	ondisconnect(id: Client): void;
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

export default class MafiaGame implements Game {
	uid = getUniqueID();
	// so map.get() is guaranteed to return something, so we dont need to check for undefined
	playersByRole = new MapWithDefault<Role, PlayerArray>(() => new PlayerArray());

	players: PlayerArray;
	disconnected = new PlayerArray();
	endGame: () => void;
	send: (data: {}, players: Player[] | Player) => void;
	ondisconnect: (id: Client) => void;
	onmessage: (id: Client, message: any) => void;
	state = {
		chatting: false,
		ended: false,
		playersInitialized: false,
		started: false,
	}

	gfIndex = 0; // godfather is the one who chooses who to kill
	skipVote = (p: Player) => { };


	async start() {
		console.log(`Game starting with players ${this.players.map((p) => p.id.uid)}`);
		this.bcText("Game is starting...");
		await delay(DELAY_TIME);
		this.state.started = true; // players can no longer be kicked, they just die

		this.fillRoleMap(); // we need to do this first since it shuffles
		await this.dealNames(); // players now sorted by number
		this.bcText(`All players:\n\t${this.players.map((p) => p.printname).join("\n\t")}.`);
		this.setRoles(); // according to this.playersByRole

		try {
			this.sanityCheck();
		} catch (e: any) {
			console.error(e.message);
			this.bcText("Sorry, an internal error has happened.");
			this.state.ended = true;
			this.endGame();
			return;
		}

		this.state.playersInitialized = true;
		await delay(DELAY_TIME);
		this.loop();
	}

	async loop() {
		let night = 1;
		while (!this.state.ended) {
			this.bcText(`Night ${night} begins...`);
			if (night == 1) this.bcText("Remember, you can refer to players by their name or number.");
			await delay(DELAY_TIME);
			await this.night();
			await delay(DELAY_TIME);
			this.bcText(`Day ${night} begins...`);
			await delay(DELAY_TIME);
			await this.day();
			await delay(DELAY_TIME);
			night++;
		}
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
		if (this.state.ended) {
			return;
		}

		this.state.chatting = true;
		let skipchat = new Promise<void>((resolve, reject) => {
			let votes = 0;
			this.skipVote = (p: Player) => {
				this.sendText(`${votes} voted to skip.`, p);
				if (votes >= this.players.alive().length) resolve();
			}
		})
		this.bcText("You can now chat. /skip from all to skip chatting.");
		this.bcChatting();
		await Promise.any([this.bcWait(CHAT_TIME), skipchat]);
		this.bcStopInput();
		this.bcStopWait();
		this.state.chatting = false;

		this.bcText("Let the voting begin.");
		await delay(DELAY_TIME);
		const votes = new MapWithDefault<Player, number>(() => 0);
		const lynchVote = (msg: string, p: Player) => {
			let player = this.findPlayer(msg);
			if (!player) this.sendQuestion("sorry?", lynchVote, p);
			else if (player == p) this.sendQuestion("sorry? (vote for someone else)", lynchVote, p);
			else votes.set(player, votes.get(player) + 1);
		};
		this.sendQuestion("Who would you like to lynch? (optional)", lynchVote, this.players.alive());
		await this.bcWait(VOTE_TIME);
		this.bcStopInput();
		let votesArr = [...votes.entries()];
		votesArr.sort((a, b) => b[1] - a[1]); // highest to lowest
		const tie = votes.size >= 2 && votesArr[0][1] === votesArr[1][1];
		const highestVotes: [Player, number] = votesArr[0];
		const nNoVotes = this.players.alive().length - votesArr.reduce((p: number, c) => p + c[1], 0); // players - total votes
		this.bcText(`Vote results:\n${votesArr.map(([p, n]) => `${p.printname}: ${n}`).join('\n')}\nNo vote: ${nNoVotes}`);

		if (!highestVotes || nNoVotes > highestVotes[1]) {
			this.bcText("Nobody is lynched.");
		} else if (tie || nNoVotes == highestVotes[1]) {
			this.bcText("It's a tie.");
		} else {
			let lynched = highestVotes[0];
			this.bcText(lynched.printname + " was voted out.\nAny last words?");
			this.sendChatting(lynched);
			lynched.onmessage = (msg) => {
				this.bcText(`"${msg}" -${lynched.name} (${new Date().getFullYear()})`);
				this.sendStopInput(lynched);
			};
			await this.bcWait(LAST_WORDS_TIME);
			this.sendStopInput(lynched);
			lynched.alive = false;

			this.checkWin();
			if (this.state.ended) {
				return;
			}
		}
	}

	checkWin() {
		const aliveMafia = this.playersByRole.get("mafioso").alive().length;
		const alivePlayers = this.players.alive().length;
		if (aliveMafia === 0) {
			this.bcText(`Villagers win. Mafia were ${this.playersByRole.get("mafioso").join(', ')}`);
			this.state.ended = true;
		} else if (aliveMafia >= (alivePlayers - aliveMafia)) {
			this.bcText(`Mafia wins (${this.playersByRole.get("mafioso").join(', ')}.`);
			this.state.ended = true;
		}
		if (this.state.ended) {
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
				this.sendText(`You will kill  ${victim.printname}.`, mafioso);
				victim.dies = true;
			}
		};
		const investigatorChecks = (targetName: string, investigator: Player) => {
			const target = this.findPlayer(targetName);
			if (!target) this.sendQuestion(`sorry?`, investigatorChecks, investigator);
			else if (target === investigator) this.sendQuestion(`You're an investigator, select someone else:`, investigatorChecks, investigator);
			else if (!target.alive) this.sendQuestion(`You can't investigate a dead person.`, investigatorChecks, investigator);
			else this.sendText(`${target.printname}'s role is ${target.role}.`, investigator);

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
		await this.bcWait(NIGHT_TIME);
		this.bcStopInput();
	}

	fillRoleMap() {
		shuffle(this.players);
		let nMafia = this.players.length >= 7 ? 2 : 1;
		this.playersByRole.set("investigator", new PlayerArray(this.players[0]));
		this.playersByRole.set("mafioso", new PlayerArray(...this.players.slice(1, 1 + nMafia)));
		this.playersByRole.set("villager", new PlayerArray(...this.players.slice(1 + nMafia,)));
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
		await this.bcWait(NAME_TIME);
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
				const f = player.onmessage; // in case onmessage sets a new onmessage
				player.onmessage = undefined;
				f(message, player);
			} else if (this.state.playersInitialized) {
				this.chatMessage(message, player);
			}
		};
		this.ondisconnect = function disconnected(this, id): void {
			const player = playersByID.get(id);
			if (player === undefined) return;
			this.bcText(`${player.printname} disconnected.`);
			if (!this.state.started) // if game hasnt started we can kick player out of role pool
				this.players = new PlayerArray(...this.players.filter(p => p != player));
			else
				player.alive = false;
			this.disconnected.push(player);
			this.checkWin();
		};
	}

	chatMessage(message: string, player: Player) {
		if (!player.alive) {
			this.sendText(`\t- ${player.printname}: ${message}`, this.players.dead());
		} else if (this.state.chatting) {
			if (message.toLowerCase() == "/skip") {
				this.skipVote?.(player);
			} else {
				this.bcText(`\t${player.printname}: ${message}`);
			}
		}
	}

	async bcWait(secs: number) { // bc = broadcasts
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
		players.forEach((p) => p.onmessage = undefined); // should be redundant
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

	bcStopWait() {
		this.bcWait(0);
	}

	announceDeath(player: Player) {
		this.bcText(`Last night someone poisoned ${player.printname}.`);
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
			assert(p.alive == !this.disconnected.includes(p), "alive");
			assert(p.id != undefined, "id");
			assert(p.role != "none", "role");
			assert(p.name != "anonymous", "name");
			assert(p.number != 0, "number");
			assert(p.printname != "anonymous", "printname");
			assert(p.dies == false, "dies");
		}
	}
}