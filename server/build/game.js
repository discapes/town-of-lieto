import { delay, getUniqueID } from "./util";
;
const delayTime = 1;
const nameDelayTime = 1;
const nightDelayTime = 1;
const chatTime = 30;
export default class MafiaGame {
    uid = getUniqueID();
    started = false;
    playersByRole = new Map();
    players;
    endGame;
    send;
    onmessage;
    disconnected;
    chatting;
    ended;
    constructor(playerids, messageID, endGame) {
        this.players = playerids.map((id) => ({ id }));
        const playersByID = new WeakMap(this.players.map((p) => [p.id, p]));
        this.endGame = endGame;
        this.send = function send(data, ...players) {
            messageID(JSON.stringify(data), ...players.map((p) => p.id));
        };
        this.onmessage = function onmessage(id, message) {
            const player = playersByID.get(id);
            if (player.onmessage) {
                const f = player.onmessage;
                player.onmessage = null;
                f(String(message), player);
            }
            else if (this.chatting) {
                this.bcText(`\t${player.name}: ${message}`);
            }
            else if (!player.alive) {
                this.sendText(`\t- ${player.name}: ${message}`, this.players.filter((p) => !p.alive));
            }
        };
        this.disconnected = function disconnected(id) {
            const player = playersByID.get(id);
            this.bcText(`${player.name || "anonymous"} disconnected.`);
            player.alive = false;
        };
    }
    bcStopInput() {
        this.sendStopInput(...this.players);
    }
    bcChatting() {
        this.send({ type: "chatting" }, ...this.players);
    }
    bcText(text) {
        this.sendText(text, ...this.players);
    }
    sendStopInput(...players) {
        players.forEach((p) => p.onmessage = null);
        this.send({ type: "stopinput" }, ...players);
    }
    sendText(text, ...players) {
        this.send({ type: "text", text }, ...players);
    }
    sendQuestion(text, cb, ...players) {
        players.forEach((p) => p.onmessage = cb);
        this.send({ type: "question", text }, ...players);
    }
    dealRoles() {
        this.playersByRole.set("mafioso", [this.players[0]]);
        this.playersByRole.set("villager", [this.players[1]]);
        this.playersByRole.set("detective", [this.players[2]]);
    }
    async start() {
        await delay(delayTime);
        console.log(`Game starting with players ${this.players.map((p) => p.id.uid)}`);
        this.bcText("Game is starting...");
        await delay(delayTime);
        this.started = true;
        let usedNames = 0;
        const nameIs = (msg, p) => {
            if (msg.length >= 20)
                this.sendQuestion("sorry? (must have <=20 characters)", nameIs, ...this.players);
            p.name = msg;
        };
        this.sendQuestion("What is your name?", nameIs, ...this.players);
        await delay(nameDelayTime);
        this.bcStopInput();
        for (const p of this.players) {
            if (!p.name) {
                p.name = `Player${usedNames++}`;
                this.sendText(`Your name is ${p.name}`, p);
            }
        }
        this.bcText(`All players: ${this.players.map((p) => p.name).join(", ")}.`);
        this.dealRoles();
        for (const [role, players] of this.playersByRole) {
            players.forEach((p) => {
                p.role = role;
                p.alive = true;
            });
            this.sendText(`Your role is ${role}.`, ...players);
        }
        await delay(delayTime);
        let night = 1;
        while (!this.ended) {
            this.bcText(`Night ${night} begins...`);
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
    announceDeath(player) {
        this.bcText(`Last night someone poisoned ${player.name}.`);
    }
    async day() {
        const deaths = this.players.filter((p) => p.dies);
        deaths.forEach((p) => {
            this.announceDeath(p);
            p.dies = false;
            p.alive = false;
        });
        this.sendText("You are dead. You can only talk with dead people now.", ...deaths);
        const aliveMafia = this.playersByRole.get("mafioso").filter((m) => m.alive).length;
        const alivePlayers = this.players.filter((p) => p.alive).length;
        if (aliveMafia === 0) {
            this.bcText("All of the mafia are dead. Villagers win.");
            this.ended = true;
        }
        else if (aliveMafia >= (alivePlayers - aliveMafia)) {
            this.bcText("Mafia wins.");
            this.ended = true;
        }
        if (this.ended) {
            this.endGame();
            return;
        }
        this.chatting = true;
        this.bcChatting();
        await delay(chatTime);
        this.bcStopInput();
        this.chatting = false;
    }
    async night() {
        const mafiaKills = (victimName, mafioso) => {
            const victim = this.players.find((p) => victimName === p.name);
            if (!victim)
                this.sendQuestion(`sorry?`, mafiaKills, ...this.playersByRole.get("mafioso"));
            else if (victim.role === "mafioso")
                this.sendQuestion(`You can't kill a mafioso, select someone else:`, mafiaKills, mafioso);
            else if (!victim.alive)
                this.sendQuestion(`You can't kill a dead person.`, mafiaKills, mafioso);
            else {
                this.sendStopInput(mafioso);
                this.sendText(`You will kill ${victimName}.`, mafioso);
                victim.dies = true;
            }
        };
        const investigatorChecks = (targetName, investigator) => {
            const target = this.players.find((p) => targetName === p.name);
            if (!target)
                this.sendQuestion(`sorry?`, investigatorChecks, investigator);
            else if (target === investigator)
                this.sendQuestion(`You're an investigator, select someone else:`, investigatorChecks, investigator);
            else if (!target.alive)
                this.sendQuestion(`You can't investigate a dead person.`, investigatorChecks, investigator);
            else {
                this.sendStopInput(investigator);
                this.sendText(`${targetName}'s role is ${target.role}.`, investigator);
            }
        };
        this.sendQuestion(`Mafioso, who would you like to kill?`, mafiaKills, ...this.playersByRole.get("mafioso").filter((p) => p.alive));
        this.sendQuestion(`Detective, who would you like to investigate?`, investigatorChecks, ...this.playersByRole.get("detective").filter((p) => p.alive));
        await delay(nightDelayTime);
        this.bcStopInput();
    }
}
