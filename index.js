import express from 'express';
import http from 'http';
import { partnerInfo } from './websocket/data/data.js';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import {generateGame, stakesInfo, checkEvents, possibleWin, socketValidationOrder} from './websocket/data/generateGame.js';

import getLangText from './websocket/data/translate.js';
import crypto from 'crypto';
import { isAbsolute } from 'path';

const app = express();
const port = 5000;

const httpServer = http.createServer(app);
const socketIO = new SocketIOServer(httpServer, {
  cors: {
    origin: 'http://localhost:5173'
  }
});

let counter = 0;
let timerInterval;
let startTime;

let isCarMoving = false;
let isExplotion = false;
let currentPlayer = null;
let isBetAllow = false;
let isBetPanding = false;
let isCancleBet = false;
let isAllowAutoBet = false;

const players = [];
const UsersList = {};
let count = [];
const balance = [];
const bet = [];
const valid = [];

function sockewtTo(socketID, emitName, data) {
    // Sending updates to a specific player
    socketIO.to(socketID).emit(emitName, data);
}

function sendExplosiveData() {
    for (const socketID in UsersList) {
        const explosiveData = {
            socketID: socketID,
            isExplotion,
            isCarMoving,
            isActiveAutoBet: UsersList[socketID].isActiveAutoBet
        }

        sockewtTo(socketID, 'explosive', explosiveData);
    }
}

function finishedGameData() {
    for (const socketID in UsersList) {
        const finishedData = {};

        finishedData[socketID] = {
            stake: {
                win: 0,
                stakeId: 1,
                bet: UsersList[socketID].bet,
                step: {
                    type: "mine",
                }
            },
            gameId: socketID,
            currentCoefficient: counter,
            balance: UsersList[socketID].balance,
            validation: UsersList[socketID].valid,
            isFinishedGame: true,
            isUsrStoped: false,
            playerdId: socketID
        }

        if (!UsersList[socketID].isBetPanding) {
            sockewtTo(socketID, 'finishGame',  finishedData[socketID]);
            cleanData(UsersList[socketID]);
        }
    }
}

function validateEventOrder(socket, next) {
    const eventName = socket.currentEvent && socket.currentEvent.name;
    console.log("eventName: ", eventName)
    let expectedOrder = checkEvents(eventName, socket.id);
    if (true === expectedOrder) {
        valid[socket.id] = 0;
        console.log('run')
        next();
    } else {
        valid[socket.id] = 1
        console.log(`Expected: ${expectedOrder}, Received: ${eventName}`);
    }
}

// Function to start the timer
function startTimer() {
    let randomTime = Math.random() * 6 + 5;
    console.log('randomStopTime is: ', randomTime);
    const randomStopTime = Math.floor(randomTime + 2);
    console.log('Timer will stop after', randomStopTime - 2, 'seconds');

    startTime = Date.now();

    isCarMoving = true;
    isBetAllow = false;
    isBetPanding = false;

    for (const userId in UsersList) {
        UsersList[userId].isBetPanding = false;
    }

    isExplotion = false;
    isAllowAutoBet = false;

    console.log('Is ready to bet', isBetPanding);

    timerInterval = setInterval(() => {
        if (isCarMoving) {
            let result = ++counter;

            // socketIO.emit('isBetPanding', isBetPanding);
            for (const gameID in UsersList) {
                
                socketIO.to(gameID).emit('isBetPanding', UsersList[gameID].isBetPanding);
            }

            socketIO.emit('usersData', UsersList);    

            console.log('isBetPanding', isBetPanding);

            socketIO.emit('carMoving', {
                isCarMoving,
                isExplotion
            });

            socketIO.emit('updateCounter', result);
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);

    // Stop the timer after randomStopTime seconds
    setTimeout(() => {

        clearInterval(timerInterval);

        counter = 0;

        isCarMoving = false;
        isExplotion = true;
        isAllowAutoBet = true;
        
       /* socketIO.emit('explosive', {
            isExplotion,
            isCarMoving,
            isActiveAutoBet: isActiveAutoBet[currentPlayer]
        }); */

        sendExplosiveData();

       /* if (!isBetPanding) {
            // finishGame();
            console.log('XUJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN');
            finishedGameData();
        }*/

            finishedGameData();

        restartTimer();
    }, randomStopTime * 1000);
}

// Function to restart the timer after 3 seconds
function restartTimer() {
    let backCount = 5;

    let interval = setInterval(() => {
        if (backCount >= 0) {
           socketIO.emit('backCount', {backCount, status: true});
    
            backCount--;
        } else {
            clearInterval(interval);
            isBetAllow = true;
            socketIO.emit('isBetAllow', isBetAllow);
            socketIO.emit('updateCounter', 0);
            socketIO.emit('backCount', {backCount, status: false});
            startTimer();
            backCount = 5;
        }
    }, 1000);
     /* setTimeout(() => {
        isBetAllow = true;
        
        socketIO.emit('isBetAllow', isBetAllow);

        console.log('Timer restarted');
        
        startTimer();
    }, 3000); */
}

function activeStake() {
    socketIO.on("addStake", data => {
         
        bet[currentPlayer] = data.bet;
        balance[currentPlayer] -= bet[currentPlayer];

        if (!balance[currentPlayer]) valid[currentPlayer] = 1;

        
        /*
        if (mineIndexes[gameId]?.includes(boxNumber[gameId])) {
            players[gameId] = {
                stake: {
                    win: 0,
                    gameBoard: stakesInfo(mineIndexes[gameId]),
                    stakeId: 1,
                    bet: bet[gameId],
                    step: {
                        type: "mine",
                        boxNumber: boxNumber[gameId]
                    }
                },
                gameId,
                currentCoefficient: coefficients[minesCount[gameId] - 1][count[gameId] - 1],
                balance: balance[gameId],
                validation: valid[gameId]
            }
            cleanData(gameId);
            socket.emit("finishGame", players[gameId]);
        } else {
            players[gameId] = {
                stake: {
                    possibleWin: possibleWin(minesCount[gameId], count[gameId]),
                    stakeId: 1,
                    bet: bet[gameId],
                    step: {
                        type: "diamond",
                        boxNumber: boxNumber[gameId]
                    }
                },
                nextCoefficient: coefficients[minesCount[gameId] - 1][count[gameId]],
                playerId: 0,
                remainingBet: 0,
                remainingCount: 0,
                betType,
                balance: balance[gameId],
                validation: valid[gameId]
            };
            socket.emit("openCard", players[gameId])
        }*/
        
        console.log('addStake players: ', JSON.stringify(players[gameId]), mineIndexes[gameId])
       // ++count[gameId];
    })
}

startTimer();

function finishGame() {
    const players = [];

    players[currentPlayer] = {
        stake: {
            win: 0,
            stakeId: 1,
            bet: bet[currentPlayer],
            step: {
                type: "mine",
            }
        },
        gameId: currentPlayer,
        currentCoefficient: counter,
        balance: balance[currentPlayer],
        validation: valid[currentPlayer],
        isFinishedGame: true,
        isUsrStoped: false
    }
        socketIO.emit("finishGame", players[currentPlayer]);
        
        cleanData(currentPlayer);
}

function cleanData(gameId) {
    console.log('GAMEID IS:   ', gameId);

    delete players[gameId];
    delete count[gameId];
    delete bet[gameId];
    delete valid[gameId];
    delete[UsersList[gameId]];
}

socketIO.on('connection', (socket) => {
    console.log(`${socket.id} user connected`);
    const gameId = socket.id;

    UsersList[gameId] = {gameID: socket.id};
    
    currentPlayer = gameId;

    socket.currentEvent = null;

    socket.on('getInitialState', data => {
        socketIO.emit('usersData', UsersList);    
        const langText = getLangText(data, partnerInfo);

        currentPlayer = gameId;

        UsersList[gameId].balance = 100000;

        UsersList[gameId].isActiveAutoBet = data.isActiveAutoBet;

        const players = [];

        players[UsersList[gameId]] = {
            gameInfo: {
                hash: null,
                stake: null,
            },
            partnerInfo,
            token: data.token,
            balance: UsersList[gameId].balance,
            validation: 0,
            partnerInstanceName: "TotoGaming",
            playerId: gameId,
            langText,
            isActiveAutoBet: UsersList[gameId].isActiveAutoBet
        }

        socket.emit("getInitialState", players[UsersList[gameId]]);
    });

    socket.on('isActiveAutoBet', (data) => {
        UsersList[gameId].isActiveAutoBet = data;
    });
    
    // Send the current counter value to the newly connected client
    // Do not delete yet
    // socket.emit('updateCounter', counter);

    socket.on("startGame", data => {
        const token = data.token;
        const isDemo = data.isDemo;
        const betAmount = data.amount;

        UsersList[gameId].autoCashoutState = data.autoCashoutState;

        if (data.autoBetTabe) {
            UsersList[gameId].isActiveAutoBet = true;
        }

        isBetPanding = true;
       
        UsersList[gameId].isBetPanding = true;

        // data.playerId;
        const players = [];

        players[UsersList[gameId]] = {
            validation: 0,
            hash: crypto.createHash('sha256').update(token + isDemo).digest('hex'),
            betAmount,
            isPlayerReady: true,
            balance: UsersList[gameId].balance - betAmount,
            autoCashout: UsersList[gameId].autoCashoutState,
            isFinishedGame: false,
            isUsrStoped: false,
            isActiveAutoBet: UsersList[gameId].isActiveAutoBet
        };

        function toActiveBet (data) {
            if (data) {
                if (UsersList[gameId].isCancleBet) {
                    console.log('You have cancaled bet ', isCancleBet);

                    socket.off('makeBet', toActiveBet);

                    UsersList[gameId].isCancleBet = false;

                    return;
                }

                UsersList[gameId].balance -= players[UsersList[gameId]].betAmount;
    
                UsersList[gameId].bet = betAmount;
    
                console.log(`Now Your Balance is: ${UsersList[gameId].balance}, and your Bet is ${UsersList[gameId].bet}`);

                socket.off('makeBet', toActiveBet);
            }
        }

        if (UsersList[gameId].isBetPanding) {
            socketIO.emit('isBetPanding', UsersList[gameId].isBetPanding);

            socket.on('makeBet', toActiveBet);
        }

        /*if (isBetPanding) {
            // It will work when panding state is true
            socketIO.emit('isBetPanding', isBetPanding);
            
            socket.on('makeBet', toActiveBet);
        }*/
        
        socket.emit("startGame", players[UsersList[gameId]]);
    });

   socket.on('cancleBet', (data) => {
        UsersList[gameId].isCancleBet = data;

        // isCancleBet = data;
   });
    
    socket.on("cashOut", data => {
        /*if (isBetPanding) {
            socket.emit('cancleBet', {balance: UsersList[gameId].balance, isGameStarted: false, isFinishedGame: true, isUsrStoped: true, isActiveAutoBet: false});

            return;
        } */

        if (UsersList[gameId].isBetPanding) {
            socket.emit('cancleBet', {balance: UsersList[gameId].balance, isGameStarted: false, isFinishedGame: true, isUsrStoped: true, isActiveAutoBet: false});

            return;
        }    

        const currentCoefficient = counter;

        const win = parseInt(Math.round(UsersList[gameId].bet * currentCoefficient).toFixed(2));
        UsersList[gameId].balance += win;

        UsersList[gameId].valid = 0;

       console.log(`Win is: ${win}, Balance is: ${UsersList[gameId].balance}`);
       
        const players = [];

        players[UsersList[gameId]] = {
            stake: {
                win,
                stakeId: 1,
                bet: UsersList[gameId].bet,
            },
            gameId,
            currentCoefficient: currentCoefficient,
            balance: UsersList[gameId].balance,
            validation: UsersList[gameId].valid,
            isFinishedGame: true,
            isUsrStoped: false,
            playerId: gameId
        }; 

        socket.emit("finishGame", players[UsersList[gameId]]);

        cleanData(UsersList[gameId]);

        console.log("cashout: ", JSON.stringify(players[UsersList[gameId]]));
    });

    socket.on('disconnect', () => {
        console.log(`${gameId} user disconnected`);

        delete UsersList[gameId];
        socketIO.emit('usersData', UsersList); 
    });
});  

httpServer.listen(port, () => {
    console.log('Server is working');
});
