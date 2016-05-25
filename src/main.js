/* eslint no-console: 0 */
import process from 'process';
import Server from './server/server';

let die = (msg) => {
  console.error(msg);
  process.exit(1);
};

let parseArgs = (argv) => {
  let args = {
    maxPlayers: undefined,
    debug: undefined,
    port: undefined,
    seed: undefined
  };
  let i = 2; // skip node and filename
  while (i < argv.length) {
    if (argv[i] == '--no-debug') {
      args.debug = false;
      i++;
    } else if (argv[i] == '--debug') {
      args.debug = true;
      i++;
    } else if (argv[i] == '--port') {
      let port = parseInt(argv[i+1]);
      if (isNaN(port) || port < 1 || port > 65535) {
        die(`Invalid port "${ argv[i+1] }"`);
      } else {
        args.port = port;
      }
      i += 2;
    } else if (argv[i] == '--maxPlayers') {
      let maxPlayers = parseInt(argv[i+1]);
      if (isNaN(maxPlayers) || maxPlayers < 2) {
        die(`Invalid maxPlayers "${ argv[i+1] }"`);
      } else {
        args.maxPlayers = maxPlayers;
      }
      i += 2;
    } else if (argv[i] == '--seed') {
      let seed = parseInt(argv[i+1]);
      if (isNaN(seed)) {
        die(`Invalid seed "${ argv[i+1] }"`);
      } else {
        args.seed = seed;
      }
      i += 2;
    } else {
      die(`Unexpected arg "${ argv[i] }"`);
    }
  }
  return args;
};

let args = parseArgs(process.argv);

new Server(args.maxPlayers, args.debug, args.port, args.seed);

/* OLD CODE FROM LEO'S `mvc` BRANCH */
/*
let server  = new Server(args);
let game    = new Game(args);

server.gameNS.on('connection', (socket) => {
  // when people connect...
  if (game.isAcceptingPlayers()) {
    server.acceptSocket(socket);
    game.addPlayer(socket);
  } else {
    server.rejectSocket(socket);
  }

  // when people send _anything_ from the client
  socket.on('message', (messageObj) => {
    let responseObj = game.handleMessage(messageObj);

    if (responseObj) {
      server.sendMessage(responseObj);
    }
  });

  // when people disconnect
  socket.on('disconnect', () => {
    if (game.hasPlayer(socket.id)) {
      let player = game.getPlayer(socket.id);
      console.log(`user ${ socket.id + '--' + player.name } disconnected`);
      // FIXME: socket/player communication needs to be redone
      socket.broadcast(`${ player.name } has left the game.`);
      game.removePlayer(socket.id);
    } else {
      console.log(`anon user ${ socket.id } disconnected`);
    }
  });

});

if (server.debug) {
  server.debugNS.on('connection', (socket) => {
    socket.on('get', () => {
      socket.emit('update', game
        .players()
        .map(player => player.debugString())
        .join('\n'));
    });
  });
}

const UPDATE_WAIT_TIME = 10 * 1000; // ten seconds

let update = () => {
  let updateObj = game.performMoves();

  _.forEach(updateObj, (updateObj) => {
    server.sendMessage(updateObj);
  });
};

let updateIntervalId = setInterval(update, UPDATE_WAIT_TIME);

console.log(`Interval id: ${ updateIntervalId }`);
*/
