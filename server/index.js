import { getUniqueID, __dirname } from './util.js';
import { WebSocketServer } from 'ws';
import { Game } from './game.js';

const port = 8000;
const wss = new WebSocketServer({ port });
const clients = new WeakSet();
let games = new WeakSet();
let que = [];

function sendTextMsg(msg, ...recipients) {
    console.log("sending msg '%s' to %s", msg, recipients.map(c => c.uid));
    for (const recipient of recipients) {
        if (clients.has(recipient)) recipient.ws.send(JSON.stringify({ type: "msg", msg }))
    }
}

function sendMessage(msg, ...recipients) {
    console.log("sending message '%s' to %s", msg, recipients.map(c => c.uid));
    for (const recipient of recipients) {
        if (clients.has(recipient)) recipient.ws.send(msg);
    }
}

function onmessage(client, data) {
    console.log("%s: '%s'", client.uid, data);
    if (client.game && games.has(client.game)) client.game.onmessage(client, data);
}

function gameEnded(game, players) {
    games.delete(game);
    const remainingClients = players.filter(p => clients.has(p));
    remainingClients.forEach(c =>



               c.ws.terminate());
}

wss.on('connection', function connection(ws) {
    const uid = getUniqueID();
    console.log("connected " + uid);
    const client = { uid, ws, game: null };
    clients.add(client);

    ws.on("message", (data) => onmessage(client, data));
    ws.on("pong", () => ws.isAlive = true);

    sendTextMsg("Added you to que.", client);
    que.push(client);
    if (que.length >= 3) {
        const players = [...que];
        que = [];
        const game = new Game(players, sendMessage, () => gameEnded(game, players));
        players.forEach(c => c.game = game);
        games.add(game);
        game.start();
    }

    ws.on("close", () => {
        if (client.game && games.has(client.game)) client.game.disconnected(client);
        clients.delete(client);
        que = que.filter(c => c !== client);
        console.log("Client %s disconnected", client.uid);
    });
});

const interval = setInterval(() => {
    for (let ws of wss.clients) {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    }
}, 10 * 1000);

wss.on('close', () => {
    clearInterval(interval);
});

console.log("Listening and initialized on port " + port);