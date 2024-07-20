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
let isUsrStoped = false;
let isAllowAutoBet = false;

const players = [];
const usersId = {};
let count = [];
const balance = [];
const bet = [];
const autoCashoutState = [];
const isActiveAutoBet = [];
const userGameState = [];

const valid = [];

function sendUpdatesToPlayers() {
    for (const socketId in usersId) {
        const playerData = {
            data: socketId
        };

        // Sending updates to a specific player
        socketIO.to(socketId).emit('gameUpdate', playerData);
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
    const randomStopTime = Math.floor(randomTime + 2); // Random time between 5 to 10 seconds
    console.log('Timer will stop after', randomStopTime - 2, 'seconds');

    startTime = Date.now();

    isCarMoving = true;
    isBetAllow = false;
    isBetPanding = false;
    isExplotion = false;
    isAllowAutoBet = false;

    console.log('Is ready to bet', isBetPanding);

    timerInterval = setInterval(() => {
        if (isCarMoving) {
            let result = ++counter;

            console.log("ALLL USERSSSSSSSSSSSS", usersId);

            socketIO.emit('isBetPanding', isBetPanding);

            console.log('isBetPanding', isBetPanding);
            
            socketIO.emit('carMoving', {
                isCarMoving,
                isExplotion
            });

            socketIO.emit('updateCounter', result); // Broadcast current value to all connected clients
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);

    // Stop the timer after randomStopTime seconds
    setTimeout(() => {
        // const elapsedTime = Date.now() - startTime;
        // const remainingTime = randomStopTime * 1000 - elapsedTime;

        console.log('Timer stopped');

        clearInterval(timerInterval);

        counter = 0;

        isCarMoving = false;
        isExplotion = true;
        isAllowAutoBet = true;
        
        socketIO.emit('explosive', {
            isExplotion,
            isCarMoving,
            isActiveAutoBet: isActiveAutoBet[currentPlayer]
        });

        sendUpdatesToPlayers();

        if (!isBetPanding) {
            finishGame();
        }

        restartTimer();
    }, randomStopTime * 1000);
}

// Function to restart the timer after 3 seconds
function restartTimer() {
    let backCount = 3;

    let interval = setInterval(() => {
        if (backCount >= 0) {
           socketIO.emit('backCount', backCount);
    
            backCount--;
        } else {
            clearInterval(interval);

            isBetAllow = true;

            socketIO.emit('isBetAllow', isBetAllow);

            console.log('Timer restarted');

            startTimer();

            backCount = 3;
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
        const partnerId = data.partnerId;
        const isDemo = data.isDemo;
         
        bet[currentPlayer] = data.bet;
        // const token = data.token;
        const betType = data.betType;

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

// Start the timer initially
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

    // currentPlayer = null;

    delete players[gameId];
    // delete mineIndexes[gameId];
    delete count[gameId];
    // delete minesCount[gameId];
    // delete boxNumber[gameId];
    delete bet[gameId];
    delete valid[gameId];
    // socketValidationOrder.delete(gameId);
}

socketIO.on('connection', (socket) => {
    console.log(`${socket.id} user connected`);
    const gameId = socket.id;

    // Test Part
    usersId[socket.id] = socket.id;
    
    currentPlayer = gameId;

    // startTimer();
    // My custom pasted cod
    socket.currentEvent = null;

    /*socket.use((packet, next) => {
        console.log('Hesaaaaaaaaaaaaaaaaaaaaaa eti', packet);
        const [eventName] = packet;
        socket.currentEvent = {name: eventName};
        validateEventOrder(socket, next);
    });*/

    socket.on('getInitialState', data => {
       // console.log('data', data);

        const langText = getLangText(data, partnerInfo);
        // mineIndexes[gameId] = generateGame(defaultMiensCount);

        currentPlayer = gameId;

        balance[usersId[socket.id]] = 100000;

        isActiveAutoBet[usersId[socket.id]] = data.isActiveAutoBet;

        const players = [];

        players[usersId[socket.id]] = {
            gameInfo: {
                hash: null,
                stake: null,
            },
            partnerInfo,
            token: data.token,
            balance: balance[usersId[socket.id]],
            validation: 0,
            partnerInstanceName: "TotoGaming",
            playerId: 0,
            langText,
            isActiveAutoBet: isActiveAutoBet[usersId[socket.id]]
        }

        socket.emit("getInitialState", players[usersId[socket.id]]);
       // console.log("Received: ", JSON.stringify(players[gameId]));

    });

    socket.on('isActiveAutoBet', (data) => {
        isActiveAutoBet[usersId[socket.id]] = data;
    });
    
    // Send the current counter value to the newly connected client
    // Do not delete yet
    // socket.emit('updateCounter', counter);

    socket.on("startGame", data => {
       // console.log(data);
        // const partnerId = data.partnerId;
        const token = data.token;
        const isDemo = data.isDemo;
        const betAmount = data.amount;

        autoCashoutState[usersId[socket.id]] = data.autoCashoutState;

        if (data.autoBetTabe) {
            isActiveAutoBet[usersId[socket.id]] = true;
        }

        isBetPanding = true;

        // data.playerId;
        const players = [];

        players[usersId[socket.id]] = {
            validation: 0,
            hash: crypto.createHash('sha256').update(token + isDemo).digest('hex'),
            betAmount,
            isPlayerReady: true,
            balance: balance[usersId[socket.id]] - betAmount,
            autoCashout: autoCashoutState[usersId[socket.id]],
            isFinishedGame: false,
            isUsrStoped: false,
            isActiveAutoBet: isActiveAutoBet[usersId[socket.id]]
        };

        function toActiveBet (data) {
            if (data) {
                if (isCancleBet) {
                    console.log('You have cancaled bet ', isCancleBet);

                    socket.off('makeBet', toActiveBet);

                    isCancleBet = false;

                    return;
                }

                balance[usersId[socket.id]] -= players[usersId[socket.id]].betAmount;
    
                bet[usersId[socket.id]] = betAmount;
    
                console.log(`Now Your Balance is: ${balance[usersId[socket.id]]}, and your Bet is ${bet[usersId[socket.id]]}`);

                socket.off('makeBet', toActiveBet);
            }
        }

        if (isBetPanding) {
            // It will work when panding state is true
            socketIO.emit('isBetPanding', isBetPanding);
            
            socket.on('makeBet', toActiveBet);
        }
        
        socket.emit("startGame", players[gameId]);
    });

   // socket.emit('cancleBet', {balance: balance[gameId], isGameStarted: false});
   socket.on('cancleBet', (data) => {
        isCancleBet = data;
   });
    
    socket.on("cashOut", data => {
        if (isBetPanding) {
            socket.emit('cancleBet', {balance: balance[usersId[socket.id]], isGameStarted: false, isFinishedGame: true, isUsrStoped: true, isActiveAutoBet: false});

            return;
        }

        // const stakeId = data.stakeId;
        // const token = data.token;
        const currentCoefficient = counter;

        const win = parseInt(Math.round(bet[usersId[socket.id]] * currentCoefficient).toFixed(2));
        balance[usersId[socket.id]] += win;
        /*if (!balance[gameId]) valid[gameId] = 1;*/
        valid[usersId[socket.id]] = 0;
       // console.log('win',typeof balance[gameId], balance[gameId])

       console.log(`Win is: ${win}, Balance is: ${balance[usersId[socket.id]]}`);
       
        const players = [];

        players[gameId] = {
            stake: {
                win,
                stakeId: 1,
                bet: bet[usersId[socket.id]],
            },
            gameId,
            currentCoefficient: currentCoefficient,
            balance: balance[usersId[socket.id]],
            validation: valid[usersId[socket.id]],
            isFinishedGame: true,
            isUsrStoped: false
        }; 

        
        socket.emit("finishGame", players[usersId[socket.id]]);

        cleanData(usersId[socket.id]);

        console.log("cashout: ", JSON.stringify(players[usersId[socket.id]]));
    });

    socket.on('disconnect', () => {
        console.log(`${socket.id} user disconnected`);

        delete usersId[socket.id];
    });
});  

httpServer.listen(port, () => {
    console.log('Server is working');
});
