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
  assert.equal(game.board[39].name, 'Kule Site Caddesi');
  assert.equal(game.board.filter(tile => tile.type === 'chance').length, 3);
  assert.equal(game.board.filter(tile => tile.type === 'chest').length, 3);
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
});

test('kira sunucu tarafından hesaplanıp iki oyuncu arasında aktarılır', () => {
  const { room, first, second } = roomWithTwo();
  room.assets['3'] = { ownerId: second.id, level: 0, mortgaged: false };
  first.pos = 0;
  game.roll(room, first.id, [1, 2]);
  assert.equal(first.money, 1496);
  assert.equal(second.money, 1504);
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
