'use strict';

const path = require('node:path');
const http = require('node:http');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const { Pool } = require('pg');
const { Server } = require('socket.io');
const game = require('./game');

const PORT = Number(process.env.PORT || 3000);
const ROOM_TTL = Number(process.env.ROOM_TTL_HOURS || 72) * 60 * 60 * 1000;
const rooms = new Map();
const voiceMembers = new Map();
const saveTimers = new Map();
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
  : null;

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size, persistence: Boolean(pool), at: new Date().toISOString() }));
app.get('/api/ice', (_req, res) => {
  let iceServers = [
    { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }
  ];
  if (process.env.ICE_SERVERS_JSON) {
    try {
      const parsed = JSON.parse(process.env.ICE_SERVERS_JSON);
      if (Array.isArray(parsed) && parsed.length) iceServers = parsed;
    } catch (error) {
      console.error('ICE_SERVERS_JSON okunamadı:', error.message);
    }
  }
  res.set('Cache-Control', 'private, max-age=300').json({ iceServers });
});
app.get(/.*/, (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const server = http.createServer(app);
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  pingInterval: 20000,
  pingTimeout: 20000,
  maxHttpBufferSize: 128 * 1024,
  cors: { origin: true, credentials: true }
});

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}
function persistedRoom(room) {
  const copy = JSON.parse(JSON.stringify(room));
  copy.players.forEach(player => { player.socketId = null; player.connected = false; });
  return copy;
}
async function initPersistence() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS konya_game_rooms (
      code VARCHAR(5) PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const cutoff = new Date(Date.now() - ROOM_TTL);
  await pool.query('DELETE FROM konya_game_rooms WHERE updated_at < $1', [cutoff]);
  const result = await pool.query('SELECT code, state FROM konya_game_rooms WHERE updated_at >= $1', [cutoff]);
  for (const row of result.rows) {
    const room = row.state;
    room.players.forEach(player => { player.connected = false; player.socketId = null; });
    room.pendingTrades = [];
    room.auction = null;
    if (room.phase === 'auction') room.phase = 'resolved';
    rooms.set(row.code, room);
  }
  console.log(`${result.rowCount} oda kalıcı depodan yüklendi.`);
}
function scheduleSave(room) {
  game.touch(room);
  if (!pool) return;
  clearTimeout(saveTimers.get(room.code));
  saveTimers.set(room.code, setTimeout(async () => {
    saveTimers.delete(room.code);
    try {
      await pool.query(
        `INSERT INTO konya_game_rooms (code, state, updated_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (code) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
        [room.code, JSON.stringify(persistedRoom(room))]
      );
    } catch (error) {
      console.error(`Oda ${room.code} kaydedilemedi:`, error.message);
    }
  }, 180));
}
function broadcast(room, notification) {
  scheduleSave(room);
  io.to(room.code).emit('state', game.publicState(room));
  const notifications = Array.isArray(notification) ? notification : notification ? [notification] : [];
  notifications.filter(Boolean).forEach(item => io.to(room.code).emit('game-notification', item));
}
function session(socket) {
  const code = socket.data.roomCode;
  const room = code && rooms.get(code);
  const player = room && game.playerById(room, socket.data.playerId);
  if (!room || !player) throw new Error('Oyun oturumu bulunamadı.');
  return { room, player };
}
function normalizeError(error) {
  const message = error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
  return message.length > 140 ? 'İşlem tamamlanamadı.' : message;
}
function action(socket, event, handler) {
  socket.on(event, async (data, ack) => {
    if (typeof data === 'function') { ack = data; data = {}; }
    try {
      const now = Date.now();
      socket.data.eventTimes ||= [];
      socket.data.eventTimes = socket.data.eventTimes.filter(t => now - t < 2000);
      if (socket.data.eventTimes.length >= 30) throw new Error('Çok hızlı işlem yapıyorsun; bir an bekle.');
      socket.data.eventTimes.push(now);
      const result = await handler(data || {});
      if (typeof ack === 'function') ack({ ok: true, ...(result || {}) });
    } catch (error) {
      const message = normalizeError(error);
      if (typeof ack === 'function') ack({ ok: false, error: message });
      else socket.emit('action-error', { message });
    }
  });
}
function attach(socket, room, player) {
  if (player.socketId && player.socketId !== socket.id) io.sockets.sockets.get(player.socketId)?.disconnect(true);
  player.socketId = socket.id;
  player.connected = true;
  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  socket.join(room.code);
}

io.on('connection', socket => {
  action(socket, 'create-room', ({ name }) => {
    const code = roomCode();
    const { room, player } = game.createRoom(code, name, socket.id);
    rooms.set(code, room);
    attach(socket, room, player);
    broadcast(room);
    return { code, playerId: player.id, resumeToken: player.resumeToken, name: player.name };
  });

  action(socket, 'join-room', ({ name, code }) => {
    code = String(code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) throw new Error('Oda bulunamadı. Kodu kontrol et.');
    const player = game.addPlayer(room, name, socket.id);
    game.log(room, `${player.name} odaya katıldı.`, 'join');
    attach(socket, room, player);
    broadcast(room);
    return { code, playerId: player.id, resumeToken: player.resumeToken, name: player.name };
  });

  action(socket, 'resume-room', ({ code, resumeToken }) => {
    code = String(code || '').toUpperCase().trim();
    const room = rooms.get(code);
    const player = room?.players.find(p => p.resumeToken === resumeToken);
    if (!room || !player) throw new Error('Kayıtlı oturum bulunamadı.');
    const currentHost = game.playerById(room, room.hostPlayerId);
    if (!currentHost?.connected) room.hostPlayerId = player.id;
    attach(socket, room, player);
    game.log(room, `${player.name} yeniden bağlandı.`, 'join');
    broadcast(room);
    return { code, playerId: player.id, resumeToken: player.resumeToken, name: player.name };
  });

  action(socket, 'start-game', () => {
    const { room, player } = session(socket);
    game.startGame(room, player.id);
    broadcast(room, room.notifications.at(-1));
  });
  action(socket, 'roll', () => {
    const { room, player } = session(socket);
    const result = game.roll(room, player.id);
    broadcast(room, result.notifications || result.notification);
    return { dice: result.values };
  });
  action(socket, 'pay-jail', () => {
    const { room, player } = session(socket); game.payJail(room, player.id); broadcast(room);
  });
  action(socket, 'buy', () => {
    const { room, player } = session(socket); const notification = game.buy(room, player.id); broadcast(room, notification);
  });
  action(socket, 'auction-start', () => {
    const { room, player } = session(socket); game.startAuction(room, player.id); broadcast(room);
  });
  action(socket, 'auction-bid', ({ amount }) => {
    const { room, player } = session(socket); game.auctionBid(room, player.id, amount); broadcast(room);
  });
  action(socket, 'auction-pass', () => {
    const { room, player } = session(socket); game.auctionPass(room, player.id); broadcast(room);
  });
  action(socket, 'end-turn', () => {
    const { room, player } = session(socket); game.endTurn(room, player.id); broadcast(room);
  });
  action(socket, 'skip-disconnected', () => {
    const { room, player } = session(socket); game.skipDisconnected(room, player.id); broadcast(room);
  });
  action(socket, 'leave-room', async () => {
    const { room, player } = session(socket);
    const result = game.leaveRoom(room, player.id);
    const code = room.code;
    socket.leave(code);
    socket.data.roomCode = null;
    socket.data.playerId = null;
    voiceMembers.get(code)?.delete(player.id);
    io.to(code).emit('voice-left', player.id);
    if (result.empty) {
      rooms.delete(code);
      clearTimeout(saveTimers.get(code));
      saveTimers.delete(code);
      if (pool) await pool.query('DELETE FROM konya_game_rooms WHERE code = $1', [code]).catch(() => {});
    } else {
      broadcast(room, result.notification);
    }
    return { left: true };
  });
  action(socket, 'build', ({ index }) => {
    const { room, player } = session(socket); const notification = game.build(room, player.id, index); broadcast(room, notification);
  });
  action(socket, 'sell-building', ({ index }) => {
    const { room, player } = session(socket); const notification = game.sellBuilding(room, player.id, index); broadcast(room, notification);
  });
  action(socket, 'mortgage', ({ index }) => {
    const { room, player } = session(socket); const notification = game.mortgage(room, player.id, index); broadcast(room, notification);
  });
  action(socket, 'sell-to-bank', ({ index }) => {
    const { room, player } = session(socket); const notification = game.sellToBank(room, player.id, index); broadcast(room, notification);
  });
  action(socket, 'unmortgage', ({ index }) => {
    const { room, player } = session(socket); const notification = game.unmortgage(room, player.id, index); broadcast(room, notification);
  });
  action(socket, 'trade-propose', data => {
    const { room, player } = session(socket);
    const trade = game.proposeTrade(room, player.id, data);
    const target = game.playerById(room, trade.toId);
    const names = indexes => indexes.map(index => game.board[index]?.name).filter(Boolean).join(', ') || 'mülk yok';
    const notification = game.notify(room, {
      kind:'trade', title:'Takas Teklifi', cardTitle:`${player.name} → ${target?.name || 'oyuncu'}`,
      message:`Veriyor: ${trade.offerCash ? `₺${trade.offerCash}` : '₺0'} + ${names(trade.offerAssets)} · İstiyor: ${trade.requestCash ? `₺${trade.requestCash}` : '₺0'} + ${names(trade.requestAssets)}.`
    });
    broadcast(room, notification);
    return trade;
  });
  action(socket, 'trade-respond', ({ tradeId, accept }) => {
    const { room, player } = session(socket); const notification = game.respondTrade(room, player.id, tradeId, Boolean(accept)); broadcast(room, notification);
  });
  action(socket, 'bankrupt', () => {
    const { room, player } = session(socket); game.bankrupt(room, player.id); broadcast(room, room.notifications.at(-1));
  });
  action(socket, 'chat', ({ text }) => {
    const { room, player } = session(socket);
    text = String(text || '').trim().slice(0, 300);
    if (!text) return;
    room.chat.push({ id: `m_${Date.now()}_${player.id}`, playerId: player.id, name: player.name, text, at: Date.now() });
    room.chat = room.chat.slice(-80);
    broadcast(room);
  });

  action(socket, 'voice-ready', () => {
    const { room, player } = session(socket);
    const set = voiceMembers.get(room.code) || new Set();
    voiceMembers.set(room.code, set);
    const existing = [...set].filter(id => id !== player.id && game.playerById(room, id)?.connected);
    set.add(player.id);
    socket.emit('voice-peers', existing);
    io.to(room.code).emit('voice-status', [...set]);
  });
  for (const event of ['webrtc-offer', 'webrtc-answer', 'webrtc-ice']) {
    action(socket, event, payload => {
      const { room, player } = session(socket);
      const target = game.playerById(room, payload.to);
      if (!target?.connected || !target.socketId) throw new Error('Ses bağlantısı hedefi çevrimdışı.');
      const safe = event === 'webrtc-ice'
        ? { from: player.id, candidate: payload.candidate }
        : { from: player.id, sdp: payload.sdp };
      io.to(target.socketId).emit(event, safe);
    });
  }

  socket.on('disconnect', () => {
    const code = socket.data.roomCode, playerId = socket.data.playerId;
    const room = rooms.get(code), player = room && game.playerById(room, playerId);
    if (!room || !player || player.socketId !== socket.id) return;
    player.connected = false; player.socketId = null;
    const set = voiceMembers.get(code);
    set?.delete(playerId);
    io.to(code).emit('voice-left', playerId);
    io.to(code).emit('voice-status', [...(set || [])]);
    if (room.hostPlayerId === playerId) {
      const nextHost = room.players.find(p => p.connected && !p.bankrupt) || room.players.find(p => !p.bankrupt);
      if (nextHost) room.hostPlayerId = nextHost.id;
    }
    broadcast(room);
  });
});

setInterval(async () => {
  const cutoff = Date.now() - ROOM_TTL;
  for (const [code, room] of rooms) {
    if (room.updatedAt < cutoff && room.players.every(p => !p.connected)) {
      rooms.delete(code); voiceMembers.delete(code); clearTimeout(saveTimers.get(code));
    }
  }
  if (pool) {
    try { await pool.query('DELETE FROM konya_game_rooms WHERE updated_at < $1', [new Date(cutoff)]); }
    catch (error) { console.error('Eski odalar temizlenemedi:', error.message); }
  }
}, 30 * 60 * 1000).unref();

async function main() {
  await initPersistence();
  server.listen(PORT, '0.0.0.0', () => console.log(`KonyaPoly :${PORT} portunda hazır.`));
}
main().catch(error => { console.error(error); process.exit(1); });

async function shutdown() {
  for (const room of rooms.values()) {
    if (pool) await pool.query(
      `INSERT INTO konya_game_rooms (code, state, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (code) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
      [room.code, JSON.stringify(persistedRoom(room))]
    ).catch(() => {});
  }
  await pool?.end().catch(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
