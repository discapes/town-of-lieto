# Town of Lieto

This is a monorepo for both the website and the server. The client is part of the website, which runs on NextJS, and the server is just a node app that runs websockets. You can edit the address of the server that the client connects to in `site/pages/play.js`.

### Run client:

```
cd site
npm i
npm run dev
```

### Run server:

```
cd server
npm i
npm run start
```
Configure in `server/.env`
