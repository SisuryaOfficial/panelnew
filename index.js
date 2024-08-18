const express = require("express"),
  app = express(),
  server = require("http").createServer(app),
  IO = require("socket.io")(server),
  path = require("path"),
  geoip = require("geoip-lite"),
  CONST = require(path.join(__dirname, "/includes/const")),
  db = require(path.join(__dirname, "/includes/databaseGateway")),
  logManager = require(path.join(__dirname, "/includes/logManager")),
  clientManager = new (require(path.join(
    __dirname,
    "/includes/clientManager"
  )))(db);

const port = 5008;  // Sesuaikan Port Lu
global.CONST = CONST;
global.db = db;
global.logManager = logManager;
global.app = app;
global.clientManager = clientManager;

IO.sockets.pingInterval = 30000;
IO.on("connection", (socket) => {
  socket.emit("welcome");

  let clientIP = socket.handshake.headers["x-forwarded-for"];
  if (clientIP == undefined) {
    clientIP = "0.0.0.0";
  }
  let clientParams = socket.handshake.query;
  let clientAddress = socket.request.connection;

  let clientGeo = geoip.lookup(clientIP);
  if (!clientGeo) clientGeo = {};

  clientManager.clientConnect(socket, clientParams.id, {
    clientIP,
    clientGeo,
    device: {
      model: clientParams.model,
      manufacture: clientParams.manf,
      version: clientParams.release,
    },
  });

  if (CONST.debug) {
    var onevent = socket.onevent;
    socket.onevent = function (packet) {
      var args = packet.data || [];
      onevent.call(this, packet); // original call
      packet.data = ["*"].concat(args);
      onevent.call(this, packet); // additional call to catch-all
    };

    socket.on("*", function (event, data) {
      console.log(event);
      console.log(data);
    });
  }
});

// get the admin interface online
server.listen(port, () => console.log(`listening on port ${port}`));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/assets/views"));
app.use(express.static(__dirname + "/assets/webpublic"));
app.use(require(path.join(__dirname, "/includes/expressRoutes")));