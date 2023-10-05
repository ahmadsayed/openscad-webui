const express = require('express');
var livereload = require("livereload");
var connectLiveReload = require("connect-livereload");

const app = express();
const PORT = 3000;

const liveReloadServer = livereload.createServer();
liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});


app.use(connectLiveReload());

app.use(express.static('public'));
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));