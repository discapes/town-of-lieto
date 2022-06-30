import { require, __dirname } from './util.js';
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const https = require('https')
const app = express();
import db, { pingDB } from './database.js';
import { formatDate, PingCounter } from './util.js';
import accountRouter from './account.js';

const DEV = process.env.NODE_ENV == 'dev';

app.use(cors);

app.use('/account', accountRouter);

app.get('/hello', async (req, res) => {
    res.json({
        greeting: 'Server operating normally\n'
    });
})

let highscores = [];
setInterval(async () => {
    highscores = (await db.aggregate([{ $sort: { score: -1 } }, { $limit: 30 }]).toArray()).map(p => ({ name: p.name, score: p.score }));
}, 1000);


app.get('/highscores', async (req, res) => {
    res.json(highscores);
});

app.get('/info', async (req, res) => {
    res.sendFile('info.html', { root: __dirname });
});

app.get('/ilmoitukset', async (req, res) => {
    res.set('version', 10);
    res.sendFile('ilmoitukset.html', { root: __dirname });
});



app.use(errorHandler);
let port = 8888;

// let privateKey = await fs.readFile( 'privkey.pem' );
// let certificate = await fs.readFile('cert.pem' );
// https.createServer({
//     key: privateKey,
//     cert: certificate
// }, app).listen(port, () => console.log(`Server listening on port ${port}`));
app.listen(port, () => console.log(`Server listening on port ${port}`));



function cors(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Expose-Headers', '*');
    next();
}

function errorHandler(err, req, res, next) {
    console.error(err);
    if (DEV) res.send(err.stack);
    else res.sendStatus(500);
}

