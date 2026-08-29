'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { io } = require('socket.io-client');

const PORT = 31947;
const ORIGIN = `http://127.0.0.1:${PORT}`;

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(`${ORIGIN}/health`); if (response.ok) return response.json(); } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Sunucu sağlık kontrolü başlamadı.');
}
function emitAck(client, event, data = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} yanıt vermedi`)), 2500);
    client.emit(event, data, result => { clearTimeout(timer); result?.ok ? resolve(result) : reject(new Error(result?.error || `${event} başarısız`)); });
  });
}
function nextState(client, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { client.off('state', listener); reject(new Error('Durum senkronizasyonu gelmedi')); }, 2500);
    const listener = state => { if (predicate(state)) { clearTimeout(timer); client.off('state', listener); resolve(state); } };
    client.on('state', listener);
  });
}

test('iki gerçek istemci oda kurar, katılır ve aynı oyun durumunu görür', async () => {
  const child = spawn(process.execPath, ['server.js'], { cwd:process.cwd(), env:{ ...process.env, PORT:String(PORT), DATABASE_URL:'' }, stdio:['ignore','pipe','pipe'] });
  const clients = [];
  try {
    const health = await waitForHealth(); assert.equal(health.ok, true);
    const host = io(ORIGIN, { transports:['websocket'], forceNew:true });
    const guest = io(ORIGIN, { transports:['websocket'], forceNew:true });
    clients.push(host, guest);
    await Promise.all(clients.map(client => new Promise((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); })));

    const created = await emitAck(host, 'create-room', { name:'Ahmet' });
    assert.match(created.code, /^[A-Z2-9]{5}$/);
    const hostJoined = nextState(host, state => state.players.length === 2);
    await emitAck(guest, 'join-room', { name:'Tuğba', code:created.code });
    const joinedState = await hostJoined;
    assert.deepEqual(joinedState.players.map(player => player.name), ['Ahmet','Tuğba']);

    const hostStarted = nextState(host, state => state.started);
    const guestStarted = nextState(guest, state => state.started);
    await emitAck(host, 'start-game');
    const [hostState, guestState] = await Promise.all([hostStarted, guestStarted]);
    assert.equal(hostState.turnPlayerId, guestState.turnPlayerId);
    assert.equal(hostState.board.length, 40);

    const hostRolled = nextState(host, state => Array.isArray(state.lastRoll));
    const guestRolled = nextState(guest, state => Array.isArray(state.lastRoll));
    await emitAck(host, 'roll');
    const [rolledA, rolledB] = await Promise.all([hostRolled, guestRolled]);
    assert.deepEqual(rolledA.lastRoll, rolledB.lastRoll);
    assert.equal(rolledA.players[0].pos, rolledB.players[0].pos);
  } finally {
    clients.forEach(client => client.close());
    child.kill('SIGTERM');
    await new Promise(resolve => child.once('exit', resolve)).catch(() => {});
  }
});
