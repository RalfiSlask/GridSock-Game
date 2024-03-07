import './styles/style.css';
import { swapClassBetweenTwoElements, getRandomColor } from './utils/helperfunctions';
import { io } from 'socket.io-client';
import { initializeDrawing } from './utils/drawingCanvas';

const socket = io('http://localhost:3000/');

const usernameInput = document.getElementById('loginInput');
const loginButton = document.getElementById('loginButton');
const loginSection = document.getElementById('loginSection');
const gameLobbySection = document.getElementById('gameLobbySection');
const gameLobbyList = document.getElementById('gameLobbySectionUl');
const playersReadyContainer = document.getElementById('playersReady');
const startGameButton = document.getElementById('startGameButton');
const usernameDisplay = document.getElementById('usernameDisplay');
const userThatIsDrawing = document.getElementById('user');
const gameSection = document.getElementById('gameSection');

/**
 * Handles login for user
 * Picket username is set in localstorage
 * Displays error message if input is not filled
 * Emits username to server using socket
 * @param {Element | null} input
 * @param {Element | null} loginSection
 * @returns void
 */
function handleLoginOnClick(input: Element | null, loginSection: Element | null, gameLobbySection: Element | null) {
  if (!input || !loginSection) {
    return;
  }
  const inputValue = (input as HTMLInputElement).value;
  if (inputValue.trim().length <= 0) {
    // we can change this later if we want to add a red text etc
    alert('you have to fill in input');
  } else {
    localStorage.setItem('user', inputValue);
    emitUserInfoToServer(inputValue);
    if (usernameDisplay) {
      usernameDisplay.textContent = inputValue;
    }
    swapClassBetweenTwoElements(loginSection, gameLobbySection, 'hidden');
  }
}

function emitUserInfoToServer(username: string) {
  const randomColor = getRandomColor();
  socket.emit('newUser', { username: username, color: randomColor });
}

loginButton?.addEventListener('click', () => {
  handleLoginOnClick(usernameInput, loginSection, gameLobbySection);
});

/**
 * Adds a user to the lobby list with a ready button. Each user's name is displayed
 * with a specific color defined by the user's `color` property.
 * sets button id to user id
 * @param {object} user - The user object that contains username, ID and color.
 * @param {string} user.username - The users name.
 * * @param {string} user.color - The CSS color code (as a string) for the user's name.
 * @param {string} user.id - The users socket-id.
 */

function appendUserToList(user: { username: string; color: string; id: string; isReady: boolean }) {
  if (!gameLobbyList) return;
  const { username, color, id, isReady } = user;
  const userElement = document.createElement('div');
  userElement.innerText = username;
  userElement.style.color = color;
  const readyButton = document.createElement('button');
  readyButton.id = id;
  readyButton.innerText = isReady ? 'ready' : 'waiting';
  userElement.appendChild(readyButton);
  const listItem = document.createElement('li');
  listItem.appendChild(userElement);
  checkNumberOfPlayers(listItem);
}

function checkNumberOfPlayers(player: HTMLElement) {
  if (gameLobbyList !== null) {
    let liElements = gameLobbyList.getElementsByTagName('li');
    const amountLiElements = liElements.length;
    if (amountLiElements >= 5) {
      alert('Spelet är fullt!');
    } else {
      gameLobbyList.appendChild(player);
    }
  }
}

/**
 * With event delegation checks if target is button
 * If target is button, change player status and send to server together with button id
 * @param {Event} e - click event
 * @returns void
 */
function handleClickOnButtons(e: Event) {
  const target = e.target as HTMLElement;
  const storedId = localStorage.getItem('userId');
  if (target.tagName !== 'BUTTON' || target.id !== storedId) return;
  const currentStatus = target.textContent === 'waiting' ? 'ready' : 'waiting';
  socket.emit('userStatus', { statusText: currentStatus, statusId: target.id });
}

function updatePlayersReadyAndWhenFullDisplayStartGameButton(
  startGameButton: Element | null,
  playersReadyContainer: Element | null,
  players: number
) {
  if (!playersReadyContainer) return;
  playersReadyContainer.textContent = `${players}/5`;
  if (players === 5) {
    startGameButton?.classList.remove('hidden');
  } else {
    startGameButton?.classList.add('hidden');
  }
}

// ---------------------- SOCKET FUNCTIONS ---------------------- //

/**
 * Initializes a listener for the 'updateUserList' event from the server. Upon receiving the event,
 * the user list in the interface is updated with the received list of users.
 * Each user is displayed as a list item with their name in the specified color and their socket ID.
 */

function initializeUserList(gameLobbyList: Element | null): void {
  socket.on('updateUserList', (users: Array<{ username: string; color: string; id: string; isReady: boolean }>) => {
    if (!gameLobbyList) return;
    gameLobbyList.innerHTML = '';
    users.forEach(user => appendUserToList(user));
  });
}

/**
 * Recieves users info from server, user id and how many players are ready
 * Sets userid in localstorage
 * Updates UI for how many players are ready when logging in
 * @param {Element | null} startGameButton
 * @param {Element | null} playersReadyContainer
 */
function recieveSocketForNewUser(startGameButton: Element | null, playersReadyContainer: Element | null) {
  socket.on('newUser', usersInfo => {
    const { userId, playersReady } = usersInfo;
    localStorage.setItem('userId', userId);
    updatePlayersReadyAndWhenFullDisplayStartGameButton(startGameButton, playersReadyContainer, playersReady);
  });
}

/**
 * Socket on from which status the user has, catches io.emit
 * Changes the button text to the status
 */
function recieveSocketUserStatus(gameLobbyList: Element | null) {
  socket.on('userStatus', status => {
    if (!gameLobbyList) return;
    const buttons = gameLobbyList.querySelectorAll('button');
    const { statusId, statusText } = status;
    buttons.forEach(button => {
      if (button.id !== statusId) return;
      button.textContent = statusText;
    });
  });
}

/**
 * Updates how many players are currently ready
 */
function recieveSocketPlayersReady(startGameButton: Element | null, playersReadyContainer: Element | null) {
  socket.on('playersReady', players => {
    updatePlayersReadyAndWhenFullDisplayStartGameButton(startGameButton, playersReadyContainer, players);
  });
}

function displayRandomUser(userThatIsDrawing: Element | null) {
  socket.on('randomUser', user => {
    if (!userThatIsDrawing) return;
    userThatIsDrawing.textContent = user;
  });
}

function initialFunctionsOnLoad() {
  initializeUserList(gameLobbyList);
  recieveSocketUserStatus(gameLobbyList);
  recieveSocketPlayersReady(startGameButton, playersReadyContainer);
  recieveSocketForNewUser(startGameButton, playersReadyContainer);
  displayRandomUser(userThatIsDrawing);
}

document.addEventListener('DOMContentLoaded', initialFunctionsOnLoad);

gameLobbyList?.addEventListener('click', e => {
  handleClickOnButtons(e);
});

function StartGame() {
  // add functions here when starting game, when done move to proper place in our code
  // socket.emit('startGame', true); uncommenct later
  // swapClassBetweenTwoElements(gameLobbySection, gameSection, 'hidden');
}

startGameButton?.addEventListener('click', StartGame);

// this is only a placeholder for current game logic
document.getElementById('click')?.addEventListener('click', () => {
  // this will go in StartGame function later
  socket.emit('startGame', true);
  swapClassBetweenTwoElements(gameLobbySection, gameSection, 'hidden');
});

window.onload = () => {
  initializeDrawing(socket);
};
