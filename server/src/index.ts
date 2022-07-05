import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";
import { getUniqueID, requiredNum, requiredBool } from "./util.js";
import MafiaGame, { Game } from "./game.js";

const port = 8000;
const wss = new WebSocketServer({ port });
const clients = new WeakSet();
const games = new WeakSet();
let que: Client[] = [];
let gameStartTO: NodeJS.Timeout | undefined;

const START_TIME = requiredNum(process.env.START_TIME);
const MATCH_SIZE = requiredNum(process.env.MATCH_SIZE);
const DEV = requiredBool(process.env.DEV);
if (!DEV) console.log = () => {};

export interface Client {
	ws: WebSocket;
	game?: Game;
	uid: string;
}

function sendServerMsg(msg: string, ...recipients: Client[]) {
	console.log("sending msg '%s' to %s", msg, recipients.map((c) => c.uid));
	for (const recipient of recipients) {
		if (clients.has(recipient)) recipient.ws.send(JSON.stringify({ type: "msg", msg }));
	}
}

function sendMessage(msg: string, ...recipients: Client[]) {
	console.log("sending message '%s' to %s", msg, recipients.map((c) => c.uid));
	for (const recipient of recipients) {
		if (clients.has(recipient)) recipient.ws.send(msg);
	}
}

function onmessage(client: Client, data: string) {
	console.log("%s: '%s'", client.uid, data);
	if (client.game && games.has(client.game)) client.game.onmessage(client, data);
}

function gameEnded(game: Game, players: Client[]) {
	games.delete(game);
	const remainingClients = players.filter((p) => clients.has(p));
	remainingClients.forEach((c) => c.ws.terminate());
}

wss.on("connection", (ws) => {
	const uid = getUniqueID();
	console.log(`connected ${uid}`);
	const client: Client = { uid, ws, game: undefined };
	clients.add(client);

	ws.on("message", (data) => onmessage(client, String(data)));
	ws.on("pong", () => (ws as any).isAlive = true);

	sendServerMsg("Added you to que.", client);
	que.push(client);
	if (que.length < MATCH_SIZE) {
		sendServerMsg(`${que.length} players in queue, ${MATCH_SIZE} needed.`, ...que);
		gameStartTO = undefined;
	} else if (que.length > MATCH_SIZE) {
		sendServerMsg(`${que.length} players in queue.`, ...que);
	}
	if (gameStartTO) sendServerMsg("Game is starting very soon...", client);
	else if (que.length == MATCH_SIZE) {
		gameStartTO = setTimeout(() => {
			const players = [...que];
			que = [];
			const game: Game = new MafiaGame(players, sendMessage, () => gameEnded(game, players));
			players.forEach((c) => c.game = game);
			games.add(game);
			game.start();
		}, START_TIME * 1000);
		sendServerMsg(`${MATCH_SIZE} players connected.\nGame will begin in ${START_TIME} seconds.`, ...que);
		sendMessage(JSON.stringify({ type: "wait", finish: new Date(Date.now() + START_TIME * 1000).toJSON() }), ...que);
	}

	ws.on("close", () => {
		console.log("Client %s disconnected", client.uid);
		que = que.filter((c) => c !== client);
		clients.delete(client);
		if (client.game && games.has(client.game)) client.game.disconnected(client);
		else {
			if (que.length < MATCH_SIZE) {
				sendServerMsg(`${que.length} players in queue, ${MATCH_SIZE} needed.`, ...que);
				if (gameStartTO) {
					clearTimeout(gameStartTO);
					sendMessage(JSON.stringify({ type: "wait", finish: new Date().toJSON() }), ...que);
				}
				gameStartTO = undefined;
			} else if (que.length >= MATCH_SIZE) {
				sendServerMsg(`${que.length} players in queue.`, ...que);
			}
		}
	});
});

const interval = setInterval(() => {
	for (let ws of (wss.clients as Set<any>)) {
		if (ws.isAlive === false) ws.terminate();
		else {
			ws.isAlive = false;
			ws.ping();
		}
	}
}, 10 * 1000);

wss.on("close", () => {
	clearInterval(interval);
});

console.log(`Listening and initialized on port ${port}`);
