export class Game {
    roles = new Map();
    uid = getUniqueID();
    constructor(players) {
        this.players = players;
    }
}

const delay = s => new Promise(resolve => setTimeout(resolve, s*1000))

export async function startGame(game) {
    console.log("Game is starting with clients " + game.players);
    sendMsg("Game is starting...", ...game.players);
    
    await delay(3);

    game.roles.set("mafioso", [game.players[0]]);
    game.roles.set("villager", [game.players[1]]);
    game.roles.set("detective", [game.players[2]]);

    for (const [role, players] of game.roles) {
        sendMsg(`Your role is ${role}`, ...players);
    }

    await delay(3);

    sendMsg("Night one begins...", ...game.players);

    sendMsg(`Mafioso: who would you like to kill?`, ...game.roles.get("mafioso"));
    sendMsg(`Detective: who would you like to investigate?`, ...game.roles.get("mafioso"));

    
}
