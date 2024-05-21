const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => {
  const html = fs.readFileSync('index.html', 'utf-8');
  res.send(html);
});

let secretNumber = generateRandomNumber();
let clients = [];

wss.on('connection', (ws) => {
  generateRandomName()
    .then((name) => {
      ws.playerName = name;
      clients.push(ws);
      sendToClient(ws, `Benvenuto, ${name}! Prova a indovinare il numero segreto.`);
    })
    .catch((error) => {
      console.error('Error generating random name:', error);
    });

  ws.on('message', (message) => {
    const guess = parseInt(message);
    if (!isNaN(guess)) {
      if (guess === secretNumber) {
        broadcast(`<i>Il giocatore ${ws.playerName} ha inserito il numero: <u> ${guess} </u>  </i>`);
        broadcast(`Congratulazioni, ${ws.playerName}! Ha indovinato il numero!`);
        resetGame();
      } else {
        const comparison = guess > secretNumber ? 'più grande' : 'più piccolo';
        sendToClient(ws, `Il numero ${guess} inserito è ${comparison} del numero segreto.`);
        broadcast(`<i>Il giocatore ${ws.playerName} ha inserito il numero: <b> ${guess} </b>  </i>`);
      }
    }
  });

  ws.on('close', () => {
    clients = clients.filter((client) => client !== ws);
  });
});

function broadcast(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      sendToClient(client, message);
    }
  });
}

function sendToClient(client, message) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(message);
  }
}

function resetGame() {
  secretNumber = generateRandomNumber();
  broadcast('Nuovo gioco iniziato. Prova a indovinare il nuovo numero segreto!');
}

function generateRandomNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

function generateRandomName() {
  return new Promise((resolve, reject) => {
    https.get('https://randomuser.me/api/', (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        const parsedData = JSON.parse(data);
        const name = `${parsedData.results[0].name.first} ${parsedData.results[0].name.last}`;
        resolve(name);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening on http://localhost:${process.env.PORT || 3000}`);
});
