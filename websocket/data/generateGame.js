const minesLevel = 25;

export function generateGame(minesCount) {
    const randomNumbers = [];
    do {
        let randomNumber = Math.floor(Math.random() * minesLevel);
        if (!randomNumbers.includes(randomNumber)) {
            randomNumbers.push(randomNumber);
        }
    } while (randomNumbers.length !== minesCount);

    return randomNumbers;
}


export function stakesInfo(mines) {
    const info = [];
    for (let i = 0; i < 25; ++i)
        if (mines?.includes(i))
            info[i] = 'mine';
        else
            info[i] = 'diamond';
    return info;
}

export const socketValidationOrder = new Map();

export function checkEvents(eventName, socketId) {
    //getInitialState, getCoefficients, startGame, addStake, openCard, cashOut
    const eventOrder = socketValidationOrder.get(socketId) || [];
    console.log("testttt", eventOrder);

    if (eventOrder.length === 0) {
        if (eventName === 'getInitialState' || eventName === 'getCoefficients' || eventName === 'startGame') {
            // First event can be 'getInitialState,' 'getCoefficients,' or 'startGame'
            eventOrder.push(eventName);
            socketValidationOrder.set(socketId, eventOrder);
            return true;
        } else {
            return 'getInitialState, getCoefficients, or startGame required first';
        }
    } else if (eventOrder.length > 0) {
        if (eventOrder.includes('startGame')) {
            if (eventName === 'addStake' && !eventOrder.includes('addStake')) {
                // After 'startGame,' only one 'addStake' is allowed
                eventOrder.push(eventName);
                socketValidationOrder.set(socketId, eventOrder);
                return true;
            } else if (eventOrder.includes('addStake') && (eventName === 'openCard' || eventName === 'cashOut')) {
                // After 'addStake,' only 'openCard' and 'cashOut' are allowed
                eventOrder.push(eventName);
                socketValidationOrder.set(socketId, eventOrder);
                return true;
            } else {
                return 'Invalid event order. Check allowed events for this stage.';
            }
        } else if (eventName === 'getCoefficients' || eventName === 'startGame') {
            // After 'getInitialState,' you can call 'getCoefficients' or 'startGame'
            eventOrder.push(eventName);
            socketValidationOrder.set(socketId, eventOrder);
            return true;
        }
    }
    if (eventOrder.length !== 0) {
        if (eventOrder.includes('startGame') && (eventName === 'goldgym')) {
            eventOrder.push(eventName);
            socketValidationOrder.set(socketId, eventOrder);
            return true;
        }
        else {
            return 'Hop Hop Chexav ee';
        }
    }

    return 'Invalid event order';
}

export function possibleWin(minesCount, count) {
    const diamonds = minesLevel - minesCount - count;
    const allBoxes = minesLevel - count;
    return Math.round(diamonds / allBoxes * 100);
}