import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";
import { getUniqueID, requiredNum, requiredBool } from "./util.js";
import MafiaGame, { Game } from "./game.js";

const port = 8000;
const wss = new WebSocketServer({ port });
const clients = new WeakSet(); // redundancy so we never get "shadow" clients or games
const games = new WeakSet();
let que: Client[] = [];
let gameStartTO: NodeJS.Timeout | undefined; // when que.length >= MATH_SIZE, start timeout, if disconnect, cancel it

const START_TIME = requiredNum(process.env.START_TIME);
const MATCH_SIZE = requiredNum(process.env.MATCH_SIZE);
const DEV = requiredBool(process.env.DEV);
if (!DEV) console.log = () => { };

export interface Client {
	ws: WebSocket;
	game?: Game;
	uid: string;
}

function serverMessage(msg: string, ...recipients: Client[]) {
	console.log("sending msg '%s' to %s", msg, recipients.map((c) => c.uid));
	for (const recipient of recipients) {
		if (clients.has(recipient)) recipient.ws.send(JSON.stringify({ type: "msg", msg }));
	}
}

function sendString(msg: string, ...recipients: Client[]) {
	console.log("sending string '%s' to %s", msg, recipients.map((c) => c.uid));
	for (const recipient of recipients) {
		if (clients.has(recipient)) recipient.ws.send(msg);
	}
}

function onmessage(client: Client, data: string) {
	console.log("%s: '%s'", client.uid, data); // forward to game \/
	if (client.game && games.has(client.game)) client.game.onmessage(client, data);
}

function gameEnded(game: Game, players: Client[]) {
	games.delete(game);
	const remainingClients = players.filter((p) => clients.has(p));
	remainingClients.forEach((c) => c.ws.terminate());
}

wss.on("connection", (ws) => {
	const client: Client = { uid: getUniqueID(), ws, game: undefined };
	clients.add(client);
	console.log(`connected ${client.uid}`);

	ws.on("message", (data) => onmessage(client, String(data)));
	ws.on("pong", () => (ws as any).isAlive = true);

	que.push(client);
	serverMessage("Added you to que.", client);

	if (que.length < MATCH_SIZE) {
		serverMessage(`${que.length} players in queue, ${MATCH_SIZE} needed.`, ...que);
	} else if (que.length > MATCH_SIZE) {
		// gameStartTO should be always set here so this is unnecessary
		if (!gameStartTO) serverMessage("More players in queue than needed, but match isn't starting?");
		serverMessage(`${que.length} players in queue.`, ...que);
		serverMessage("Game is starting very soon...", client);
	} else if (que.length == MATCH_SIZE) {
		gameStartTO = setTimeout(() => {
			const players = que;
			que = [];
			const game: Game = new MafiaGame(players, sendString, () => gameEnded(game, players));
			players.forEach((c) => c.game = game);
			games.add(game);
			game.start();
		}, START_TIME * 1000);
		serverMessage(`${MATCH_SIZE} players connected.\nGame will begin in ${START_TIME} seconds.`, ...que);
		sendString(JSON.stringify({ type: "wait", finish: new Date(Date.now() + START_TIME * 1000).toJSON() }), ...que);
	}

	ws.on("close", () => {
		console.log("Client %s disconnected", client.uid);
		que = que.filter((c) => c !== client);
		clients.delete(client);
		if (client.game && games.has(client.game)) client.game.ondisconnect(client);
		else {
			if (que.length < MATCH_SIZE) {
				serverMessage(`${que.length} players in queue, ${MATCH_SIZE} needed.`, ...que);
				if (gameStartTO) {
					clearTimeout(gameStartTO);
					sendString(JSON.stringify({ type: "wait", finish: new Date().toJSON() }), ...que);
					gameStartTO = undefined;
				}
			} else if (que.length >= MATCH_SIZE) {
				serverMessage(`${que.length} players in queue.`, ...que);
			}
		}
	});
});

const interval = setInterval(() => { // heartbeat
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
