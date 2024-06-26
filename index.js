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
let currentPlayer = null;
let isBetAllow = false;
let isBetPanding = false;
let isCancleBet = false;
let isUsrStoped = false;

const players = [];
let count = [];
const balance = [];
const bet = [];
const autoCashoutState = [];
const autoBetTabe = [];
const autoBetRoundCount = [];
const userGameState = [];

const valid = [];


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

    console.log('Is ready to bet', isBetPanding);
/*
    if (players[currentPlayer].isPlayerReady) {
        if (!isCarMoving && isBetAllow) {
            bet[currentPlayer] = players[currentPlayer].betAmount;
            balance[currentPlayer] -= bet[currentPlayer];
    
            if (!balance[gameId]) valid[gameId] = 1;
        }

        socketIO.emit('test', 'stacvec');
    } */

    timerInterval = setInterval(() => {
        if (isCarMoving) {
            let result = counter++;

            
            socketIO.emit('isBetPanding', isBetPanding);

            console.log('isBetPanding', isBetPanding);
            
            socketIO.emit('timerStart', isCarMoving);

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
        isBetAllow = false;
        
        socketIO.emit('boom', isCarMoving);

        if (!isBetPanding) {
            finishGame();
        }

        if (autoBetTabe[currentPlayer]) {
            console.log('aaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
            console.log('autoBetRoundCount', autoBetRoundCount[currentPlayer]);
            socketIO.emit('startAutobet', true);
        }

        restartTimer();
    }, randomStopTime * 1000);
}

// Function to restart the timer after 3 seconds
function restartTimer() {
    setTimeout(() => {
        isBetAllow = true;
        
        socketIO.emit('isBetAllow', isBetAllow);

        console.log('Timer restarted');
        
        startTimer();
    }, 3000);
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
    console.log("Nayi hesa esxac@", autoBetRoundCount[currentPlayer]);
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
        isUsrStoped: false,
        autoBetRoundCount: autoBetRoundCount[currentPlayer]
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
    socketValidationOrder.delete(gameId);
}


socketIO.on('connection', (socket) => {
    console.log(`${socket.id} user connected`);
    const gameId = socket.id;
    
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

    socket.on('setNewAutoBetRoundCount', (data) => {
        if (Number(data)) {
            autoBetRoundCount[gameId] = data;
        } else {
            autoBetRoundCount[gameId] = 8;
        }
    });

    socket.on('autoBetTabe', (data) => {
        autoBetTabe[gameId] = data;
    
        console.log('autoBetTabe result is: ', autoBetTabe);
    });

    socket.on('getInitialState', data => {
       // console.log('data', data);

        const langText = getLangText(data, partnerInfo);
        // mineIndexes[gameId] = generateGame(defaultMiensCount);

        currentPlayer = gameId;

        balance[gameId] = 100000;

        if (!autoBetRoundCount[gameId]) {
            autoBetRoundCount[gameId] = 999999999;

            console.log('YandeeeeeeexYYYYYYYYYYYYYYYYYYYY', autoBetRoundCount[gameId]);

        }

        const players = [];

        players[gameId] = {
            gameInfo: {
                hash: null,
                stake: null,
            },
            partnerInfo,
            token: data.token,
            balance: balance[gameId],
            validation: 0,
            partnerInstanceName: "TotoGaming",
            playerId: 0,
            langText,
            autoBetRoundCount: autoBetRoundCount[gameId]
        }
        socket.emit("getInitialState", players[gameId]);
       // console.log("Received: ", JSON.stringify(players[gameId]));

    });
    
    // Send the current counter value to the newly connected client
    socket.emit('updateCounter', counter);

    socket.on("startGame", data => {
       // console.log(data);
        // const partnerId = data.partnerId;
        const token = data.token;
        const isDemo = data.isDemo;
        const betAmount = data.amount;

        autoBetTabe[gameId] = data.autoBetTabe;

        autoCashoutState[gameId] = data.autoCashoutState;
        autoBetRoundCount[gameId] = data.autoBetRoundCount;

        isBetPanding = true;

        // data.playerId;
        const players = [];

        players[gameId] = {
            validation: 0,
            hash: crypto.createHash('sha256').update(token + isDemo).digest('hex'),
            betAmount,
            isPlayerReady: true,
            balance: balance[gameId] - betAmount,
            autoCashout: autoCashoutState[gameId],
            isFinishedGame: false,
            isUsrStoped: false,
        };

        function toActiveBet (data) {
            if (data) {
                if (isCancleBet) {
                    console.log('isCanclleBet: ', isCancleBet);

                    socket.off('makeBet', toActiveBet);

                    isCancleBet = false;

                    return;
                }

                balance[gameId] -= players[gameId].betAmount;
    
                bet[gameId] = betAmount;
    
                console.log(`Balance is: ${balance[gameId]}, your Bet is ${bet[gameId]}`);

                socket.off('makeBet', toActiveBet);
            }
        }

        if (isBetPanding) {
            console.log('Es mta stex', isBetPanding);
            
            socketIO.emit('isBetPanding', isBetPanding);
            
            socket.on('makeBet', toActiveBet);
        }
        
        socket.emit("startGame", players[gameId]);
        //console.log('startGame players: ', JSON.stringify(players[gameId]));
    });

   // socket.emit('cancleBet', {balance: balance[gameId], isGameStarted: false});
   socket.on('cancleBet', (data) => {
        isCancleBet = data;
   });
    
    socket.on("cashOut", data => {
        if (isBetPanding) {
            socket.emit('cancleBet', {balance: balance[gameId], isGameStarted: false, isFinishedGame: true, isUsrStoped: true});

            console.log('mmmmmmmm');

            return;
        }

        // const stakeId = data.stakeId;
        // const token = data.token;
        const currentCoefficient = counter;

        const win = parseInt(Math.round(bet[gameId] * currentCoefficient).toFixed(2));
        balance[gameId] += win;
        /*if (!balance[gameId]) valid[gameId] = 1;*/
        valid[gameId] = 0;
       // console.log('win',typeof balance[gameId], balance[gameId])

       console.log(`Win is: ${win}, Balance is: ${balance[gameId]}`);
       
        const players = [];
        players[gameId] = {
            stake: {
                win,
                stakeId: 1,
                bet: bet[gameId],
            },
            gameId,
            currentCoefficient: currentCoefficient,
            balance: balance[gameId],
            validation: valid[gameId],
            isFinishedGame: true,
            isUsrStoped: false,
            autoBetRoundCount: autoBetRoundCount[gameId]
        }; 

        cleanData(gameId);

        socket.emit("finishGame", players[gameId]);

        console.log("cashout: ", JSON.stringify(players[gameId]));
    });


    socket.on('disconnect', () => {
        console.log(`${socket.id} user disconnected`);
    });
});  

httpServer.listen(port, () => {
    console.log('Server is working');
});
