import * as _ from 'lodash';

import { ClientMessage, Context } from './context';
import * as Player from '../game/player';
import { Message, createEchoMessage, createGameMessage, createTalkMessage } from '../game/messaging';
import * as Character from '../game/character';
import * as Helpers from '../helpers';

export default class Lobby extends Context<Player.LobbyPlayer> {

  constructor(maxPlayers: number, players: Player.Player[]) {
    super();

    this.maxPlayers = maxPlayers;
    this.players = players.map(player => this.convertPlayer(player));
  }

  isReadyForNextContext() {
    return _.every(this.players, Player.isReady);
  }

  isReadyForUpdate() {
    return false;
  }

  update() {
    return {
      messages: [],
      log: []
    };
  }

  handleMessage(fromClient: ClientMessage<Player.LobbyPlayer>): Message[] {
    // XXX: this will need to be updated if we want flip-flopping between
    // games and lobbies
    let responses: Message[] = [ createEchoMessage(fromClient.content, fromClient.player) ];
    switch (fromClient.player.state) {
      case 'Anon': {
        const name = fromClient.content;
        const validationResult = this.validateName(name);
        if (validationResult === 'Valid') {
          this.updatePlayer(fromClient.player.id, { name, state: 'Preparing' });
          responses.push(
            createGameMessage(`Welcome to Xanadu ${name}! Enter \`ready \` to start.`, [ fromClient.player ])
          );
          responses.push(
            this.broadcastFromPlayer(`${name} has joined the game!`, fromClient.player)
          );
        } else {
          let errorMsg = '';
          if (validationResult === 'Taken') {
            errorMsg = `The name '${name}' has already been taken.`;
          } else {
            errorMsg = `The name '${name}' contains invalid characters. `
              + 'Use only alphanumeric, underscore, and hyphen characters.';
          }

          responses.push(createGameMessage(errorMsg, [ fromClient.player ]));
        }
        break;
      }
      case 'Preparing':
      // pass through (i.e. allow the player to reconfigure their character)
      case 'Ready': {
        const message = fromClient.content;
        const words = message.split(' ');

        if (words[ 0 ].toLowerCase() === 'ready') {

          const { log, primordialCharacter } = parsePrimordialCharacter(
            words, fromClient.player.primordialCharacter
          );

          if (log.length > 0) {
            const configErrStr = log.join('\n');
            responses.push(
              createGameMessage(configErrStr, [ fromClient.player ])
            );
          }

          fromClient.player.primordialCharacter = primordialCharacter;

          this.updatePlayer(fromClient.player.id, { state: 'Ready' });
          responses.push(this.broadcastFromPlayer(`${fromClient.player.name} is ready`, fromClient.player));
        } else {
          responses.push(
            createTalkMessage(fromClient.player, fromClient.content, this.playersWithout([ fromClient.player ]))
          );
        }

        break;
      }
      default: {
        // Don't do anything
        break;
      }
    }

    return responses;
  }

  convertPlayer(player: Player.Player): Player.LobbyPlayer {
    if (Player.isLobbyPlayer(player)) {
      return player;
    } else if (Player.isGamePlayer(player)) {
      return {
        id: player.id,
        name: player.name,
        state: 'Preparing',
        primordialCharacter: {
          className: player.character.characterClass.className,
          allegiance: player.character.allegiance,
          numModifiers: Character.getActiveModifierNames(player.character.modifiers).length
        }
      };
    } else {
      return {
        name: player.name,
        id: player.id,
        state: player.state,
        primordialCharacter: {
          className: 'None',
          allegiance: 'None',
          numModifiers: 0
        }
      };
    }
  }
}

export function parsePrimordialCharacter(
  splitReadyCommand: string[], previousPrimordialCharacter: Character.PrimordialCharacter
): {
    log: string[], primordialCharacter: Character.PrimordialCharacter
  } {
  const log = [];
  let primordialCharacter: Character.PrimordialCharacter = {
    className: null,
    allegiance: null,
    numModifiers: null
  };

  if (splitReadyCommand[ 0 ].toLowerCase() !== 'ready') {
    throw new Error('Unexpected parse without `ready`!');
  }

  const configComponents = splitReadyCommand.filter(component => _.includes(component, '='));

  configComponents.forEach(component => {
    const [ key, value ] = component.split('=');

    const lKey = key.toLowerCase();

    switch (lKey[ 0 ]) {
      case 'c': {
        if (_.isNull(primordialCharacter.className)) {
          const chosenCharacterClass = _.find(Character.CHARACTER_CLASS_NAMES, (name) => {
            return Helpers.isApproximateString(value, name);
          });

          if (chosenCharacterClass) {
            primordialCharacter.className = chosenCharacterClass;
          } else {
            log.push(`Unrecognized character class: ${value}`);
          }
        }

        break;
      }
      case 'a': {
        if (_.isNull(primordialCharacter.allegiance)) {
          const chosenAllegiance = _.find(Character.ALLEGIANCES, (allegiance) => {
            return Helpers.isApproximateString(value, allegiance);
          });

          if (chosenAllegiance) {
            primordialCharacter.allegiance = chosenAllegiance;
          } else {
            log.push(`Unrecognized allegiance: ${value}`);
          }
        }

        break;
      }
      case 'm': {
        if (_.isNull(primordialCharacter.numModifiers)) {
          const chosenNumModifiers = _.parseInt(value, 10);

          if (_.isFinite(chosenNumModifiers) && chosenNumModifiers >= 0) {
            primordialCharacter.numModifiers = chosenNumModifiers;
          } else {
            log.push(`Bad number of modifiers: ${value}`);
          }

          break;
        }
      }
      default: {
        log.push(`Unrecognized key: ${key}`);
        break;
      }
    }
  });

  let numModifiers: number;

  if (primordialCharacter.numModifiers && isFinite(primordialCharacter.numModifiers)) {
    numModifiers = primordialCharacter.numModifiers;
  } else {
    numModifiers = previousPrimordialCharacter.numModifiers;
  }

  numModifiers = _.clamp(numModifiers, 0, Character.MAX_NUM_MODIFIERS);

  primordialCharacter = {
    numModifiers,
    className: primordialCharacter.className || previousPrimordialCharacter.className,
    allegiance: primordialCharacter.allegiance || previousPrimordialCharacter.allegiance
  };

  return { log, primordialCharacter };
};

export function isContextLobby(context: Context<any>): context is Lobby {
  return context instanceof Lobby;
}
