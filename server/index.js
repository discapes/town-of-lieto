import { formatHHMMSS, require, __dirname } from './util.js';
import { WebSocketServer } from 'ws';
import { Game, startGame } from './game.js';

const port = 8000;
const wss = new WebSocketServer({ port });
const clientInfo = new Map();
let games = [];
let que = [];

function sendMsg(msg, ...uids) {
    console.log("sending message '%s' to %s", msg, uids);
    for (const uid of uids) {
        clientInfo.get(uid).ws.send(JSON.stringify({ type: "msg", msg }));
    }
}

const getUniqueID = () => {
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return s4() + s4() + '-' + s4();
};

function onmessage(uid, data) {
    console.log("%s: '%s'", uid, data);
}

wss.on('connection', function connection(ws) {
    const uid = getUniqueID();
    console.log("connected " + uid);
    const info = { ws, game: null };
    clientInfo.set(uid, info);

    ws.on("message", (data) => onmessage(uid, data));
    ws.on("pong", () => ws.isAlive = true);

    sendMsg("Added you to que", uid);
    que.push(uid);
    if (que.length >= 3) {
        let game = new Game(que);
        que.forEach(uid => clientInfo.get(uid).game = game);
        games.push(game);
        que = [];
        startGame(game);
    }

    ws.on("close", () => {
        clientInfo.delete(uid);
        console.log("Client %s disconnected", uid);
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