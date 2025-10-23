import { GameBoard } from "./gameObjects/gameBoard.js";
import { io } from "./index.js"
import {timeStart, endGame, forfeit, saveStats, deleteGameFromDB, getPlayerName} from "./Game2Database.js";
import { playedCard } from "./gameObjects/gameBoard.js";
import { Socket } from "socket.io";
import { getUsernameFromToken } from './socketManagement.js'
import { calculMmr } from './mmr.js'
import { IaManager } from "./ia/iaManager.js";

export interface Player {
    Id : number;
    Point : number;
    Card : playedCard | null;
    usedCoin : boolean;
    IsOnline : boolean;
    Forfeit: boolean;
}

export async function clearRoom(room: string)
{
    const sockets = await io.in(room).fetchSockets();
    for (const socket of sockets) {
        socket.leave(room);
    }
    return ;
}

export class game
{
    private gameId: number;
    private status: number;
    private playerOne : Player;
    private playerTwo : Player;

    /*
    * pour tout les temps, 1s = 4 donc 60 = 15s
    */

    private PlayerOneTime : number = 60;
    private PlayerTwoTime : number = 60;

    private gameTime : number = 0; // temp total de la partie
    private playTime : number = 0; // temps pour un round
    private round_nmb : number = 0; // nombre de round

    private gameBoard :GameBoard = new GameBoard();
    private delay = 1000;

    constructor(playerOneInfo :Player, playerTwoInfo :Player, gameId: number)
    {
        this.playerOne = playerOneInfo;
        this.playerTwo = playerTwoInfo;
        this.gameId = gameId;
        this.status = 1;
    }

    public async spectate(player: number, socket)
    {
        await this.sleep(this.delay / 20);
        if (player == 1)
        {
            io.to(socket.id).emit('started-game', this.gameId, this.playerTwo.Id);
            await this.sleep(this.delay / 20);
            io.to(socket.id).emit('card', this.gameBoard.getPlayerCard(1));
            io.to(socket.id).emit('score', this.playerOne.Point, this.playerTwo.Point);
            socket.to(`${this.gameId}.1`).emit('roomInfo', `${socket.data.userName} spectate`)
        }
        else if (player == 2)
        {
            io.to(socket.id).emit('started-game', this.gameId, this.playerOne.Id);
            await this.sleep(this.delay / 20);
            io.to(socket.id).emit('card', this.gameBoard.getPlayerCard(2));
            io.to(socket.id).emit('score', this.playerTwo.Point, this.playerOne.Point);
            socket.to(`${this.gameId}.2`).emit('roomInfo', `${socket.data.userName} spectate`)
        }
    }

    public start(token: string)
    {
        io.to(`${this.gameId}.1`).emit('started-game', this.gameId, this.playerTwo.Id);
        io.to(`${this.gameId}.2`).emit('started-game', this.gameId ,this.playerOne.Id);
        timeStart(this.gameId);
        this.gameBoard.startGame();

        io.to(`${this.gameId}.1`).emit('card', this.gameBoard.getPlayerCard(1));
        io.to(`${this.gameId}.2`).emit('card', this.gameBoard.getPlayerCard(2));

        const loop = async () => {
        
            if (!this.playerOne.IsOnline || !this.playerTwo.IsOnline) {
                if (await this.playerIsOffline()) {
                    saveStats(this.gameId, token, await calculMmr(this.gameId, this.playerOne, this.playerTwo, token), await calculMmr(this.gameId, this.playerTwo, this.playerOne, token));
                    await clearRoom(`${this.gameId}.1`);
                    await clearRoom(`${this.gameId}.2`);
                    IaManager.getInstance().deleteIaByGameId(this.gameId);
                    return deleteGameFromDB(this.gameId);
                }
            }

            if (this.playTime == 120) {
                io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('end-time');
            }

            if (this.playerOne.Card && this.playerTwo.Card) { // faire une fonction/plusieurs a mettre a cote
                
                io.to(`${this.gameId}.1`).emit('opponent-played-card', [this.playerTwo.Card.cardId, this.playerTwo.Card.cardNumber]);
                io.to(`${this.gameId}.1`).emit('played-card', [this.playerOne.Card.cardId, this.playerOne.Card.cardNumber]);

                io.to(`${this.gameId}.2`).emit('opponent-played-card', [this.playerOne.Card.cardId, this.playerOne.Card.cardNumber]);
                io.to(`${this.gameId}.2`).emit('played-card', [this.playerTwo.Card.cardId, this.playerTwo.Card.cardNumber]);

                await this.sleep(2500); // pause de 2,5s pour laisser le temps au joueurs de voir les carte jouer

                this.gameTime += 10; // ajout des 2.5s au temps de jeu
                this.playTime = 0;
                this.round_nmb ++ ;

                this.playedCards(this.playerOne.Card, this.playerTwo.Card);
                
                this.gameBoard.discardCard(this.playerOne.Card);
                this.gameBoard.discardCard(this.playerTwo.Card);
                
                this.gameBoard.drawCard(1);
                this.gameBoard.drawCard(2);
                
                io.to(`${this.gameId}.1`).emit('card', this.gameBoard.getPlayerCard(1));
                io.to(`${this.gameId}.2`).emit('card', this.gameBoard.getPlayerCard(2));

                this.playerOne.Card = null;
                this.playerTwo.Card = null;
            }

            if (this.playerOne.Point == 3 || this.playerTwo.Point == 3 || !this.gameBoard.getPlayerCard(1).length || !this.gameBoard.getPlayerCard(2).length) // faire une fonction a mettre a cote
            {
                this.checkWinGame();
                endGame(this.gameId, this.gameTime, this.playerOne.Point, this.playerTwo.Point, this.round_nmb);
                io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('game-ended');
                await clearRoom(`${this.gameId}.1`);
                await clearRoom(`${this.gameId}.2`);
                saveStats(this.gameId, token, await calculMmr(this.gameId, this.playerOne, this.playerTwo, token), await calculMmr(this.gameId, this.playerTwo, this.playerOne, token));
                deleteGameFromDB(this.gameId);
                IaManager.getInstance().deleteIaByGameId(this.gameId);
                return ;
            }

            if (!this.status)
                return;
            this.playTime++;
            this.gameTime++;
            setTimeout(loop, this.delay / 4);
        }
        return loop();
    }

    public disconnect(playerId: number, socket)
    {
        if (playerId == this.playerOne.Id)
        {
            if (this.playerTwo.Id < 0)
            {
                IaManager.getInstance().deleteIaByGameId(this.gameId);
                this.playerTwo.IsOnline = false;
                this.PlayerOneTime = 0;
                this.PlayerTwoTime = 0;
            }
            this.playerOne.IsOnline = false;
        }
        else if (playerId == this.playerTwo.Id)
            this.playerTwo.IsOnline = false;
        else
            return io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('roomInfo', `${socket.data.userName} stop spectate`);

        io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('wait-opponent', getUsernameFromToken(socket.handshake.auth.token));
    }

    public async reconnect(userId: number, socket: Socket)
    {
        let player: Player;
        let opponent: Player;

        if (userId == this.playerOne.Id) {
            socket.data.player = 1;
            player = this.playerOne;
            opponent = this.playerTwo;
        } else {
            socket.data.player = 2;
            player = this.playerTwo;
            opponent = this.playerOne;
        }

        const roomName = `${this.gameId}.${socket.data.player}`;

        player.IsOnline = true;
        socket.join(roomName);
        io.to(socket.id).emit('reconnect', player.usedCoin);
        socket.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('opponent-reconnected', getUsernameFromToken(socket.handshake.auth.token));
        await this.sleep(this.delay / 20);
        io.to(socket.id).emit('started-game', this.gameId);
        await this.sleep(this.delay / 20);
        io.to(socket.id).emit('card', this.gameBoard.getPlayerCard(socket.data.player));
        io.to(socket.id).emit('score', player.Point, opponent.Point);
    }

    public chooseCard(card: playedCard)
    {
        if (card.userId == this.playerOne.Id) {
            card.userId = 1;
            this.playerOne.Card = card;
        }
        else if (card.userId == this.playerTwo.Id) {
            card.userId = 2;
            this.playerTwo.Card = card;
        }
    }

    public useCoin(player:number, card: [number, number], replaceBy: number, socket)
    {
        this.gameBoard.coinUsed(player, card, replaceBy);
        if (player == 1)
            this.playerOne.usedCoin = true;
        else
            this.playerTwo.usedCoin = true;
        io.to(socket.id).emit('card', this.gameBoard.getPlayerCard(socket.data.player));
    }

    private whoWinRound(userIdWinner: number)
    {
        if (userIdWinner == 1) {
            this.playerOne.Point++;
            io.to(`${this.gameId}.1`).emit('winRound', this.playerOne.Point, this.playerTwo.Point);
            io.to(`${this.gameId}.2`).emit('loseRound', this.playerTwo.Point, this.playerOne.Point);
        }
        else if (userIdWinner == 2)
        {
            this.playerTwo.Point++;
            io.to(`${this.gameId}.1`).emit('loseRound', this.playerOne.Point, this.playerTwo.Point);
            io.to(`${this.gameId}.2`).emit('winRound', this.playerTwo.Point, this.playerOne.Point);
        }
    }

    private checkWinGame()
    {
        if (this.playerOne.Point == 3)
        {
            io.to(`${this.gameId}.1`).emit('win-game');
            io.to(`${this.gameId}.2`).emit('lose-game');
        }
        else if (this.playerTwo.Point == 3)
        {
            io.to(`${this.gameId}.2`).emit('win-game');
            io.to(`${this.gameId}.1`).emit('lose-game');
        }
        else
            io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('draw-game');
    }

    private playedCards(playerOneCard: playedCard, playerTwoCard: playedCard)
    {
       if (playerOneCard.cardId == playerTwoCard.cardId) {
           io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('equal');
            return ;
        }

       if (playerOneCard.cardId == 0 || playerTwoCard.cardId == 0)
       {
           io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('drawRound');
           return ;
       }
       switch (playerOneCard.cardId)
       {
            case (1): 
                if (playerTwoCard.cardId == 2) {
                    this.whoWinRound(playerTwoCard.userId);
                }
                else
                    this.whoWinRound(playerOneCard.userId);
                break ;
            case (2): 
                if (playerTwoCard.cardId == 3) {
                    this.whoWinRound(playerTwoCard.userId);
                }
                else
                    this.whoWinRound(playerOneCard.userId);
                break ;
            case (3): 
                if (playerTwoCard.cardId == 1) {
                    this.whoWinRound(playerTwoCard.userId);
                }
                else
                    this.whoWinRound(playerOneCard.userId);
                break ;
       }

    }

    private playerIsOffline(): Promise<boolean>
    {
        return new Promise(playerOffline => {
            const interval= setInterval(() => {

                if (this.playerOne.IsOnline && this.playerTwo.IsOnline)
                {
                    this.PlayerOneTime = 15;
                    this.PlayerTwoTime = 15;
                    clearInterval(interval);
                    playerOffline(false);
                }

                if (!this.playerOne.IsOnline && this.PlayerOneTime > 0)
                    this.PlayerOneTime--;
                if (!this.playerTwo.IsOnline && this.PlayerTwoTime > 0)
                    this.PlayerTwoTime--;

                if (this.PlayerOneTime == 0 && this.PlayerTwoTime == 0)
                {
                    this.playerOne.Forfeit = true;
                    this.playerTwo.Forfeit = true;
                    io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('forfeit', 'all player');
                    forfeit(this.gameId, 0, 0, this.gameTime, this.round_nmb);
                    clearInterval(interval);
                    this.sleep(5000);
                    io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('game-ended');
                    playerOffline(true);
                }
                else if (this.PlayerOneTime == 0 && this.playerTwo.IsOnline)
                {
                    this.playerOne.Forfeit = true;
                    io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('forfeit', getPlayerName(this.gameId)?.playerOneName);
                    forfeit(this.gameId, 1, this.playerTwo.Point, this.gameTime, this.round_nmb);
                    clearInterval(interval);
                    this.sleep(5000);
                    io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('game-ended');
                    playerOffline(true);
                }
                else if (this.PlayerTwoTime == 0 && this.playerOne.IsOnline)
                {
                    this.playerTwo.Forfeit = true;
                    forfeit(this.gameId, 2, this.playerOne.Point, this.gameTime, this.round_nmb);
                    io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('forfeit', getPlayerName(this.gameId)?.playerTwoName);
                    clearInterval(interval);
                    this.sleep(5000);
                    io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('game-ended');
                    playerOffline(true);
                }
            }, this.delay / 4);
        });
    }

    public async Playerforfeit(userId: number, token: string) {
        if (userId == this.playerOne.Id) {
            this.playerOne.Forfeit = true;
            forfeit(this.gameId, 1, this.playerTwo.Point, this.gameTime, this.round_nmb);
            io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('forfeit', getPlayerName(this.gameId)?.playerOneName);
            io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('game-ended');
            await clearRoom(`${this.gameId}.1`);
            await clearRoom(`${this.gameId}.2`);
            saveStats(this.gameId, token, await calculMmr(this.gameId, this.playerOne, this.playerTwo, token), await calculMmr(this.gameId, this.playerTwo, this.playerOne, token));
            deleteGameFromDB(this.gameId);
            IaManager.getInstance().deleteIaByGameId(this.gameId);
        } else if (userId == this.playerTwo.Id) {
            this.playerTwo.Forfeit = true;
            forfeit(this.gameId, 2, this.playerOne.Point, this.gameTime, this.round_nmb);
            io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('forfeit', getPlayerName(this.gameId)?.playerTwoName);
            io.to(`${this.gameId}.1`).to(`${this.gameId}.2`).emit('game-ended');
            await clearRoom(`${this.gameId}.1`);
            await clearRoom(`${this.gameId}.2`);
            saveStats(this.gameId, token, await calculMmr(this.gameId, this.playerOne, this.playerTwo, token), await calculMmr(this.gameId, this.playerTwo, this.playerOne, token));
            deleteGameFromDB(this.gameId);
            IaManager.getInstance().deleteIaByGameId(this.gameId);
        }
        this.status = 0
    }

    private sleep(ms: number): Promise<void>
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

}