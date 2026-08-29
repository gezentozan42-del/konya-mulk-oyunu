'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../game');

function roomWithTwo() {
  const { room, player: first } = game.createRoom('KNY42', 'Ahmet', 'socket-a');
  const second = game.addPlayer(room, 'Tuğba', 'socket-b');
  game.startGame(room, first.id);
  return { room, first, second };
}

test('tahta profesyonel 40 kare düzenini korur', () => {
  assert.equal(game.board.length, 40);
  assert.equal(game.board[0].type, 'start');
  assert.equal(game.board[0].name, "Konya'ya Hoşgeldin");
  assert.equal(game.board[10].name, 'Hapis / Ziyaret');
  assert.equal(game.board[30].name, 'Kekolarla Kavga Ettin');
  assert.equal(game.board[39].name, 'Işıklar');
  assert.equal(game.board.filter(tile => tile.type === 'chance').length, 3);
  assert.equal(game.board.filter(tile => tile.type === 'chest').length, 3);
});

test('yakın mahalleler aynı renk grubunda yer alır', () => {
  const requestedGroup = game.board.filter(tile => tile.group === 'Akabe Çevresi').map(tile => tile.name);
  assert.deepEqual(requestedGroup, ['Yenimahalle', 'Akabe', 'Çimenlik']);
  assert.deepEqual(game.board.filter(tile => tile.group === 'Meram Bağları').map(tile => tile.name), ['Lalebahçe', 'Alavardı', 'Havzan']);
});

test('oda 2 oyuncuyla başlar ve zar sunucu tarafında hareket ettirir', () => {
  const { room, first } = roomWithTwo();
  const result = game.roll(room, first.id, [1, 2]);
  assert.deepEqual(result.values, [1, 2]);
  assert.equal(first.pos, 3);
  assert.equal(room.phase, 'purchase');
  assert.equal(room.lastRoll.reduce((a, b) => a + b), 3);
});

test('satın alma parayı düşürür ve mülkü oyuncuya bağlar', () => {
  const { room, first } = roomWithTwo();
  game.roll(room, first.id, [1, 2]);
  game.buy(room, first.id);
  assert.equal(first.money, 1440);
  assert.equal(room.assets['3'].ownerId, first.id);
  assert.equal(room.phase, 'resolved');
  assert.equal(room.notifications.at(-1).kind, 'buy');
});

test('kira sunucu tarafından hesaplanıp iki oyuncu arasında aktarılır', () => {
  const { room, first, second } = roomWithTwo();
  room.assets['3'] = { ownerId: second.id, level: 0, mortgaged: false };
  first.pos = 0;
  game.roll(room, first.id, [1, 2]);
  assert.equal(first.money, 1496);
  assert.equal(second.money, 1504);
  assert.equal(first.inJail, false);
  assert.equal(first.pos, 3);
  assert.equal(room.notifications.at(-1).kind, 'rent');
});

test('yalnızca açık bir hapis olayı oyuncuyu hapse gönderir', () => {
  const { room, first } = roomWithTwo();
  first.pos = 27;
  const notification = game.resolveLanding(room, first);
  assert.equal(first.inJail, false);
  assert.equal(notification, null);
  first.pos = 30;
  const jailNotification = game.resolveLanding(room, first);
  assert.equal(first.inJail, true);
  assert.equal(first.pos, 10);
  assert.equal(jailNotification.kind, 'jail');
  assert.equal(jailNotification.cardTitle, 'Kekolarla Kavga Ettin');
});

test('Şans kartı bütün ekranlar için ortak bildirim üretir', () => {
  const { room, first } = roomWithTwo();
  first.pos = 7;
  const notification = game.applyCard(room, first, 'chance', () => 0);
  assert.equal(notification.kind, 'chance');
  assert.match(notification.message, /Ahmet/);
  assert.equal(room.notifications.at(-1).id, notification.id);
  assert.equal(first.pos, 0);
  assert.equal(first.money, 1700);
  assert.deepEqual(room.lastMovement, { ...room.lastMovement, from:7, to:0, steps:33, direction:'forward', reason:'card', pace:'fast' });
});

test('kartla hapse gidiş sunucuya hareket rotası olarak yazılır', () => {
  const { room, first } = roomWithTwo();
  first.pos = 7;
  const cardIndex = game.chanceCards.findIndex(card => card.action === 'jail');
  const notification = game.applyCard(room, first, 'chance', () => (cardIndex + 0.1) / game.chanceCards.length);
  assert.equal(notification.cardTitle, 'Mahkeme Kararı');
  assert.equal(first.pos, 10);
  assert.deepEqual(room.lastMovement, { ...room.lastMovement, from:7, to:10, steps:3, direction:'forward', reason:'card', pace:'fast' });
});

test('kişisel kartın ödül veya cezası kartı açan oyuncuya uygulanır', () => {
  const { room, first, second } = roomWithTwo();
  const ahmetCard = game.chanceCards.findIndex(card => card.title === 'Ahmet Tatlı Ismarladı');
  const reward = game.applyCard(room, second, 'chance', () => (ahmetCard + 0.1) / game.chanceCards.length);
  assert.equal(first.money, 1500);
  assert.equal(second.money, 1600);
  assert.match(reward.message, /Ahmet/);

  const muratCard = game.chanceCards.findIndex(card => card.title === 'Murat Arabana Çarptı');
  const penalty = game.applyCard(room, second, 'chance', () => (muratCard + 0.1) / game.chanceCards.length);
  assert.equal(second.money, 1550);
  assert.equal(first.money, 1500);
  assert.match(penalty.message, /Murat/);
});

test('beş arkadaşın tamamı için kişisel kart bulunur', () => {
  const titles = [...game.chanceCards, ...game.chestCards].map(card => card.title).join(' ');
  for (const name of ['Ahmet', 'Tuğba', 'Merve', 'Murat', 'Seher']) assert.match(titles, new RegExp(name));
});

test('renk grubu tamamlanmadan bina kurulamaz', () => {
  const { room, first } = roomWithTwo();
  room.assets['1'] = { ownerId: first.id, level: 0, mortgaged: false };
  assert.throws(() => game.build(room, first.id, 1), /renk grubunun tamamına/);
  room.assets['3'] = { ownerId: first.id, level: 0, mortgaged: false };
  game.build(room, first.id, 1);
  assert.equal(room.assets['1'].level, 1);
  assert.equal(first.money, 1450);
});

test('ipotekli tapu bankaya satılır ve ipotek bedeli ödenir', () => {
  const { room, first } = roomWithTwo();
  room.assets['3'] = { ownerId: first.id, level: 0, mortgaged: false };
  game.mortgage(room, first.id, 3);
  assert.equal(first.money, 1530);
  const notification = game.sellToBank(room, first.id, 3);
  assert.equal(first.money, 1560);
  assert.equal(room.assets['3'], undefined);
  assert.equal(notification.kind, 'sell');
  assert.match(notification.message, /₺30/);
  assert.throws(() => game.sellToBank(room, first.id, 3), /ipotekli olmalı/);
});

test('iflas eden oyuncunun mülkleri temizlenir ve kazanan belirlenir', () => {
  const { room, first, second } = roomWithTwo();
  room.assets['1'] = { ownerId: first.id, level: 0, mortgaged: false };
  first.money = -10;
  game.bankrupt(room, first.id);
  assert.equal(room.assets['1'], undefined);
  assert.equal(room.finished, true);
  assert.equal(room.winnerId, second.id);
  assert.equal(room.notifications.at(-1).kind, 'winner');
});

test('oda sahibi bağlantısı kopan oyuncunun sırasını güvenle geçebilir', () => {
  const { room, first, second } = roomWithTwo();
  first.connected = false;
  game.skipDisconnected(room, first.id);
  assert.equal(room.turnPlayerId, second.id);
  assert.equal(room.phase, 'roll');
  assert.match(room.log.at(-1).msg, /çevrimdışı/);
});

test('masadan çıkış lobi oyuncusunu temizler ve oyun oyuncusunu güvenle çeker', () => {
  const lobby = game.createRoom('LOBBY', 'Ahmet', 'socket-a');
  const lobbyResult = game.leaveRoom(lobby.room, lobby.player.id);
  assert.equal(lobbyResult.empty, true);
  assert.equal(lobby.room.players.length, 0);
  const active = roomWithTwo();
  const leaveResult = game.leaveRoom(active.room, active.first.id);
  assert.equal(active.first.left, true);
  assert.equal(active.first.bankrupt, true);
  assert.equal(active.room.turnPlayerId, active.second.id);
  assert.equal(leaveResult.notification.kind, 'winner');
});
