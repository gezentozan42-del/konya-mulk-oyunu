'use strict';

const crypto = require('node:crypto');

const COLORS = ['#58a6ff', '#ff6b6b', '#a878ff', '#f6c453', '#45d483'];
const START_MONEY = 1500;
const START_BONUS = 200;

const board = [
  { type: 'start', name: "Konya'ya Hoşgeldin", text: 'Geçerken ₺200 al' },
  { type: 'property', name: 'Aziziye', group: 'Tarihi Karatay', price: 60, rent: [2, 10, 30, 90, 160, 250], buildCost: 50 },
  { type: 'chest', name: 'Şehir Sandığı', text: 'Sandığı aç' },
  { type: 'property', name: 'Akçeşme', group: 'Tarihi Karatay', price: 60, rent: [4, 20, 60, 180, 320, 450], buildCost: 50 },
  { type: 'tax', name: 'Belediye Vergisi', amount: 200 },
  { type: 'station', name: 'Konya Garı', price: 200 },
  { type: 'property', name: 'Yenimahalle', group: 'Akabe Çevresi', price: 100, rent: [6, 30, 90, 270, 400, 550], buildCost: 50 },
  { type: 'chance', name: 'Şans', text: 'Kart çek' },
  { type: 'property', name: 'Akabe', group: 'Akabe Çevresi', price: 100, rent: [6, 30, 90, 270, 400, 550], buildCost: 50 },
  { type: 'property', name: 'Çimenlik', group: 'Akabe Çevresi', price: 120, rent: [8, 40, 100, 300, 450, 600], buildCost: 50 },
  { type: 'jail', name: 'Hapis / Ziyaret', text: 'Hapis Ziyareti' },
  { type: 'property', name: 'Lalebahçe', group: 'Meram Bağları', price: 140, rent: [10, 50, 150, 450, 625, 750], buildCost: 100 },
  { type: 'utility', name: 'KOSKİ', price: 150 },
  { type: 'property', name: 'Alavardı', group: 'Meram Bağları', price: 140, rent: [10, 50, 150, 450, 625, 750], buildCost: 100 },
  { type: 'property', name: 'Havzan', group: 'Meram Bağları', price: 160, rent: [12, 60, 180, 500, 700, 900], buildCost: 100 },
  { type: 'station', name: 'Konya Otogarı', price: 200 },
  { type: 'property', name: 'Fetih', group: 'Karatay Doğu', price: 180, rent: [14, 70, 200, 550, 750, 950], buildCost: 100 },
  { type: 'chest', name: 'Şehir Sandığı', text: 'Sandığı aç' },
  { type: 'property', name: 'Ulubatlıhasan', group: 'Karatay Doğu', price: 180, rent: [14, 70, 200, 550, 750, 950], buildCost: 100 },
  { type: 'property', name: 'Erenler', group: 'Karatay Doğu', price: 200, rent: [16, 80, 220, 600, 800, 1000], buildCost: 100 },
  { type: 'freeParking', name: 'Kültür Parkı', text: 'Ortadaki kasayı al' },
  { type: 'property', name: 'Yazır', group: 'Selçuklu Kuzey', price: 220, rent: [18, 90, 250, 700, 875, 1050], buildCost: 150 },
  { type: 'chance', name: 'Şans', text: 'Kart çek' },
  { type: 'property', name: 'Sancak', group: 'Selçuklu Kuzey', price: 220, rent: [18, 90, 250, 700, 875, 1050], buildCost: 150 },
  { type: 'property', name: 'Parsana', group: 'Selçuklu Kuzey', price: 240, rent: [20, 100, 300, 750, 925, 1100], buildCost: 150 },
  { type: 'station', name: 'YHT Garı', price: 200 },
  { type: 'property', name: 'Bosna Hersek', group: 'Kampüs Çevresi', price: 260, rent: [22, 110, 330, 800, 975, 1150], buildCost: 150 },
  { type: 'property', name: 'Kosova', group: 'Kampüs Çevresi', price: 260, rent: [22, 110, 330, 800, 975, 1150], buildCost: 150 },
  { type: 'utility', name: 'MEDAŞ', price: 150 },
  { type: 'property', name: 'Ardıçlı', group: 'Kampüs Çevresi', price: 280, rent: [24, 120, 360, 850, 1025, 1200], buildCost: 150 },
  { type: 'goToJail', name: 'Kekolarla Kavga Ettin', text: 'Hapse Git' },
  { type: 'property', name: 'Yaka', group: 'Meram Güney', price: 300, rent: [26, 130, 390, 900, 1100, 1275], buildCost: 200 },
  { type: 'property', name: 'Akyokuş', group: 'Meram Güney', price: 300, rent: [26, 130, 390, 900, 1100, 1275], buildCost: 200 },
  { type: 'chest', name: 'Şehir Sandığı', text: 'Sandığı aç' },
  { type: 'property', name: 'Dere', group: 'Meram Güney', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], buildCost: 200 },
  { type: 'station', name: 'Konya Havalimanı', price: 200 },
  { type: 'chance', name: 'Şans', text: 'Kart çek' },
  { type: 'property', name: 'Kılınçarslan', group: 'Selçuklu Merkez', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], buildCost: 200 },
  { type: 'tax', name: 'Emlak Vergisi', amount: 100 },
  { type: 'property', name: 'Işıklar', group: 'Selçuklu Merkez', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], buildCost: 200 }
];

const chanceCards = [
  { title: 'Konya’ya Dönüş', message: "Konya'ya Hoşgeldin karesine ilerle ve ₺200 al.", action: 'move', position: 0, collectStart: true },
  { title: 'Karatay Gezisi', message: 'Ulubatlıhasan’a ilerle. Başlangıcı geçersen ₺200 al.', action: 'move', position: 18, collectStart: true },
  { title: 'Yanlış Dönüş', message: 'Üç kare geri git.', action: 'moveRelative', amount: -3 },
  { title: 'Trafik Cezası', message: 'Kasaya ₺50 öde.', action: 'money', amount: -50, toPot: true },
  { title: 'Festival Ödülü', message: 'Şehir festivalinden ₺100 kazandın.', action: 'money', amount: 100 },
  { title: 'Mahkeme Kararı', message: 'Doğrudan hapse git.', action: 'jail' },
  { title: 'Yol Bakım Gideri', message: 'Her ev için ₺25, her otel için ₺100 öde.', action: 'repairs', house: 25, hotel: 100 },
  { title: 'İstasyon Ekspresi', message: 'En yakın istasyona ilerle.', action: 'nearest', type: 'station' },
  { title: 'Ahmet’in Emlak Hamlesi', message: 'Ahmet iyi bir anlaşma yaptı; bankadan ₺100 alıyor.', action: 'namedMoney', targetName: 'Ahmet', amount: 100 },
  { title: 'Tuğba’nın Kahve Buluşması', message: 'Tuğba masa buluşmasını düzenledi; bankadan ₺75 alıyor.', action: 'namedMoney', targetName: 'Tuğba', amount: 75 },
  { title: 'Murat Tatlı Ismarlıyor', message: 'Murat herkese tatlı ısmarlıyor; diğer oyunculara ₺25’er ödüyor.', action: 'namedPayAll', targetName: 'Murat', amount: 25 }
];

const chestCards = [
  { title: 'Kira Desteği', message: 'Bankadan ₺200 ödeme al.', action: 'money', amount: 200 },
  { title: 'Hastane Masrafı', message: '₺100 sağlık gideri öde.', action: 'money', amount: -100, toPot: true },
  { title: 'Doğum Günü', message: 'Her oyuncudan ₺25 hediye al.', action: 'birthday', amount: 25 },
  { title: 'Vergi İadesi', message: '₺50 vergi iadesi al.', action: 'money', amount: 50 },
  { title: 'Hapse Git', message: 'Doğrudan hapse git.', action: 'jail' },
  { title: 'Aile Mirası', message: '₺100 miras aldın.', action: 'money', amount: 100 },
  { title: 'Okul Gideri', message: '₺50 eğitim masrafı öde.', action: 'money', amount: -50, toPot: true },
  { title: 'Banka Hatası', message: 'Hesabına yanlışlıkla ₺200 yatırıldı.', action: 'money', amount: 200 },
  { title: 'Merve’nin Şanslı Günü', message: 'Merve’nin yüzü güldü; bankadan ₺100 alıyor.', action: 'namedMoney', targetName: 'Merve', amount: 100 },
  { title: 'Seher’in Bereket Sofrası', message: 'Seher’in bereketi masaya yayıldı; bütün oyuncular ₺50 alıyor.', action: 'allMoney', targetName: 'Seher', amount: 50 }
];

function id(prefix = '') { return prefix + crypto.randomBytes(8).toString('hex'); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function cleanName(name) { return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 18); }
function log(room, msg, kind = 'info') {
  room.log.push({ id: id('l_'), msg, kind, at: Date.now() });
  room.log = room.log.slice(-120);
}
function notify(room, payload) {
  const item = { id: id('n_'), at: Date.now(), ...payload };
  room.notifications.push(item);
  room.notifications = room.notifications.slice(-20);
  return item;
}
function createRoom(code, playerName, socketId) {
  const playerId = id('p_');
  const resumeToken = id('r_') + id();
  const room = {
    code,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    started: false,
    finished: false,
    winnerId: null,
    hostPlayerId: playerId,
    turnPlayerId: null,
    turnNumber: 0,
    phase: 'lobby',
    lastRoll: null,
    doublesCount: 0,
    freeParkingPot: 0,
    board: clone(board),
    assets: {},
    players: [],
    auction: null,
    pendingTrades: [],
    chat: [],
    log: [],
    notifications: []
  };
  const player = addPlayer(room, playerName, socketId, playerId, resumeToken);
  log(room, `${player.name} odayı kurdu.`, 'join');
  return { room, player };
}
function addPlayer(room, playerName, socketId, playerId = id('p_'), resumeToken = id('r_') + id()) {
  if (room.players.length >= 5) throw new Error('Oda dolu.');
  if (room.started) throw new Error('Oyun başladı; yeni oyuncu alınmıyor.');
  const name = cleanName(playerName);
  if (!name) throw new Error('Geçerli bir ad yaz.');
  if (room.players.some(p => p.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'))) throw new Error('Bu ad odada kullanılıyor.');
  const player = {
    id: playerId, resumeToken, socketId, name, color: room.players.length % COLORS.length,
    money: START_MONEY, pos: 0, connected: true, bankrupt: false, inJail: false,
    jailTurns: 0, getOutCards: 0, joinedAt: Date.now()
  };
  room.players.push(player);
  touch(room);
  return player;
}
function publicState(room) {
  const state = clone(room);
  state.board = clone(board);
  state.players.forEach(p => { delete p.resumeToken; delete p.socketId; });
  return state;
}
function touch(room) { room.updatedAt = Date.now(); }
function playerById(room, playerId) { return room.players.find(p => p.id === playerId); }
function activePlayers(room) { return room.players.filter(p => !p.bankrupt); }
function assertTurn(room, playerId) {
  if (!room.started || room.finished) throw new Error('Oyun aktif değil.');
  if (room.turnPlayerId !== playerId) throw new Error('Sıra sende değil.');
  const player = playerById(room, playerId);
  if (!player || player.bankrupt) throw new Error('Oyuncu aktif değil.');
  return player;
}
function ownsGroup(room, playerId, group) {
  const indices = board.map((t, i) => t.group === group ? i : -1).filter(i => i >= 0);
  return indices.length > 0 && indices.every(i => room.assets[String(i)]?.ownerId === playerId);
}
function ownedAssets(room, playerId) {
  return Object.entries(room.assets).filter(([, a]) => a.ownerId === playerId);
}
function assetValue(tile, asset) {
  return Math.floor((tile.price || 0) / 2) + (asset.level || 0) * Math.floor((tile.buildCost || 0) / 2);
}
function calculateRent(room, tileIndex, diceTotal = 0) {
  const tile = board[tileIndex], asset = room.assets[String(tileIndex)];
  if (!asset || asset.mortgaged) return 0;
  if (tile.type === 'property') {
    const level = asset.level || 0;
    const base = tile.rent[level] || tile.rent[0];
    return level === 0 && ownsGroup(room, asset.ownerId, tile.group) ? base * 2 : base;
  }
  if (tile.type === 'station') {
    const count = ownedAssets(room, asset.ownerId).filter(([i]) => board[Number(i)].type === 'station').length;
    return [0, 25, 50, 100, 200][count] || 25;
  }
  if (tile.type === 'utility') {
    const count = ownedAssets(room, asset.ownerId).filter(([i]) => board[Number(i)].type === 'utility').length;
    return diceTotal * (count >= 2 ? 10 : 4);
  }
  return 0;
}
function transfer(from, to, amount) {
  const safe = Math.max(0, Math.round(Number(amount) || 0));
  from.money -= safe;
  if (to) to.money += safe;
  return safe;
}
function movePlayer(room, player, steps) {
  const old = player.pos;
  const next = ((old + steps) % board.length + board.length) % board.length;
  if (steps > 0 && old + steps >= board.length) {
    player.money += START_BONUS;
    log(room, `${player.name} Konya'ya Hoşgeldin karesinden geçti ve ₺${START_BONUS} aldı.`, 'money');
  }
  player.pos = next;
  return next;
}
function moveTo(room, player, position, collectStart = false) {
  if (collectStart && position <= player.pos && position !== player.pos) {
    player.money += START_BONUS;
    log(room, `${player.name} Konya'ya Hoşgeldin karesinden geçti ve ₺${START_BONUS} aldı.`, 'money');
  }
  player.pos = position;
}
function sendToJail(room, player, options = {}) {
  player.pos = 10;
  player.inJail = true;
  player.jailTurns = 0;
  room.extraTurn = false;
  room.doublesCount = 0;
  room.phase = 'resolved';
  log(room, `${player.name} hapse gitti.`, 'jail');
  if (options.notify === false) return null;
  return notify(room, {
    kind: 'jail',
    title: options.title || 'Hapis',
    cardTitle: options.cardTitle || 'Hapse Git',
    message: options.message || `${player.name} hapse gönderildi.`,
    playerId: player.id,
    playerName: player.name
  });
}
function applyCard(room, player, kind, random = Math.random) {
  const deck = kind === 'chance' ? chanceCards : chestCards;
  const card = deck[Math.floor(random() * deck.length) % deck.length];
  const title = kind === 'chance' ? 'Şans Kartı' : 'Şehir Sandığı';
  const notification = notify(room, {
    kind,
    title,
    cardTitle: card.title,
    message: `${player.name}: ${card.message}`,
    playerId: player.id,
    playerName: player.name
  });
  log(room, `${player.name} — ${title}: ${card.cardTitle || card.title}. ${card.message}`, kind);

  if (card.action === 'money') {
    player.money += card.amount;
    if (card.amount < 0 && card.toPot) room.freeParkingPot += Math.abs(card.amount);
  } else if (card.action === 'move') {
    moveTo(room, player, card.position, card.collectStart);
    resolveLanding(room, player, { fromCard: true });
  } else if (card.action === 'moveRelative') {
    movePlayer(room, player, card.amount);
    resolveLanding(room, player, { fromCard: true });
  } else if (card.action === 'jail') {
    sendToJail(room, player, { notify: false });
  } else if (card.action === 'repairs') {
    let amount = 0;
    for (const [i, asset] of ownedAssets(room, player.id)) {
      if (asset.level === 5) amount += card.hotel;
      else amount += (asset.level || 0) * card.house;
    }
    player.money -= amount;
    room.freeParkingPot += amount;
  } else if (card.action === 'birthday') {
    for (const other of activePlayers(room)) {
      if (other.id !== player.id) transfer(other, player, Math.min(card.amount, Math.max(0, other.money)));
    }
  } else if (card.action === 'namedMoney') {
    const target = room.players.find(item => item.name.toLocaleLowerCase('tr') === card.targetName.toLocaleLowerCase('tr')) || player;
    target.money += card.amount;
  } else if (card.action === 'namedPayAll') {
    const target = room.players.find(item => item.name.toLocaleLowerCase('tr') === card.targetName.toLocaleLowerCase('tr')) || player;
    for (const other of activePlayers(room)) {
      if (other.id !== target.id) transfer(target, other, Math.min(card.amount, Math.max(0, target.money)));
    }
  } else if (card.action === 'allMoney') {
    for (const participant of activePlayers(room)) participant.money += card.amount;
  } else if (card.action === 'nearest') {
    const targets = board.map((t, i) => t.type === card.type ? i : -1).filter(i => i >= 0);
    const target = targets.find(i => i > player.pos) ?? targets[0];
    moveTo(room, player, target, target < player.pos);
    resolveLanding(room, player, { fromCard: true });
  }
  return notification;
}
function resolveLanding(room, player, options = {}) {
  const tile = board[player.pos];
  room.phase = 'resolved';
  if (tile.type === 'tax') {
    transfer(player, null, tile.amount);
    room.freeParkingPot += tile.amount;
    log(room, `${player.name}, ${tile.name} için ₺${tile.amount} ödedi.`, 'money');
  } else if (tile.type === 'freeParking') {
    const amount = room.freeParkingPot;
    player.money += amount;
    room.freeParkingPot = 0;
    log(room, `${player.name}, Kültür Parkı kasasından ₺${amount} aldı.`, 'money');
  } else if (tile.type === 'goToJail') {
    return sendToJail(room, player, {
      title: 'Hapse Git',
      cardTitle: 'Kekolarla Kavga Ettin',
      message: `${player.name}, kavga sonrası doğruca hapse gönderildi.`
    });
  } else if (tile.type === 'chance' || tile.type === 'chest') {
    if (!options.fromCard) return applyCard(room, player, tile.type);
  } else if (['property', 'station', 'utility'].includes(tile.type)) {
    const asset = room.assets[String(player.pos)];
    if (!asset) room.phase = 'purchase';
    else if (asset.ownerId !== player.id && !asset.mortgaged) {
      const owner = playerById(room, asset.ownerId);
      if (owner && !owner.bankrupt) {
        const rent = calculateRent(room, player.pos, (room.lastRoll || []).reduce((a, b) => a + b, 0));
        transfer(player, owner, rent);
        log(room, `${player.name}, ${owner.name} oyuncusuna ₺${rent} kira ödedi.`, 'rent');
      }
    }
  }
  return null;
}
function startGame(room, playerId) {
  if (room.hostPlayerId !== playerId) throw new Error('Oyunu yalnızca oda sahibi başlatabilir.');
  if (room.started) throw new Error('Oyun zaten başladı.');
  if (room.players.length < 2) throw new Error('En az 2 oyuncu gerekli.');
  room.started = true;
  room.phase = 'roll';
  room.turnPlayerId = room.players[0].id;
  room.turnNumber = 1;
  log(room, 'Oyun başladı. Bol şans!', 'system');
  notify(room, { kind: 'system', title: 'Oyun Başladı', cardTitle: 'Konya’da yatırım zamanı', message: `İlk sıra ${room.players[0].name} oyuncusunda.` });
  touch(room);
}
function roll(room, playerId, dice) {
  const player = assertTurn(room, playerId);
  if (room.phase !== 'roll' || room.auction) throw new Error('Şu anda zar atılamaz.');
  const values = dice || [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  const isDouble = values[0] === values[1];
  room.lastRoll = values;
  room.doublesCount = isDouble ? room.doublesCount + 1 : 0;
  if (room.doublesCount >= 3) {
    const notification = sendToJail(room, player, {
      title: 'Üç Çift Zar',
      cardTitle: 'Hapse Git',
      message: `${player.name} art arda üç çift attığı için hapse gönderildi.`
    });
    return { values, notification };
  }
  let leftJailWithDouble = false;
  if (player.inJail) {
    if (isDouble) {
      player.inJail = false;
      player.jailTurns = 0;
      leftJailWithDouble = true;
      log(room, `${player.name} çift zarla hapisten çıktı.`, 'jail');
    } else {
      player.jailTurns += 1;
      if (player.jailTurns < 3) {
        room.phase = 'resolved';
        log(room, `${player.name} hapiste kaldı (${player.jailTurns}/3).`, 'jail');
        return { values };
      }
      transfer(player, null, 50);
      room.freeParkingPot += 50;
      player.inJail = false;
      player.jailTurns = 0;
      log(room, `${player.name} üçüncü turda ₺50 ödeyip hapisten çıktı.`, 'jail');
    }
  }
  movePlayer(room, player, values[0] + values[1]);
  log(room, `${player.name} ${values[0]} + ${values[1]} attı ve ${board[player.pos].name} karesine geldi.`, 'roll');
  const notification = resolveLanding(room, player);
  room.extraTurn = isDouble && !leftJailWithDouble && !player.inJail;
  touch(room);
  return { values, notification };
}
function payJail(room, playerId) {
  const player = assertTurn(room, playerId);
  if (!player.inJail || room.phase !== 'roll') throw new Error('Şu anda hapis çıkış bedeli ödenemez.');
  if (player.money < 50) throw new Error('Yeterli paran yok.');
  player.money -= 50;
  room.freeParkingPot += 50;
  player.inJail = false;
  player.jailTurns = 0;
  log(room, `${player.name} ₺50 ödeyip hapisten çıktı.`, 'jail');
  touch(room);
}
function buy(room, playerId) {
  const player = assertTurn(room, playerId), tile = board[player.pos];
  if (room.phase !== 'purchase' || room.auction) throw new Error('Bu mülk şu anda satın alınamaz.');
  if (!['property', 'station', 'utility'].includes(tile.type)) throw new Error('Bu kare satın alınamaz.');
  if (room.assets[String(player.pos)]) throw new Error('Mülkün zaten sahibi var.');
  if (player.money < tile.price) throw new Error('Yeterli paran yok.');
  player.money -= tile.price;
  room.assets[String(player.pos)] = { ownerId: player.id, level: 0, mortgaged: false };
  room.phase = 'resolved';
  log(room, `${player.name}, ${tile.name} mülkünü ₺${tile.price} karşılığında aldı.`, 'buy');
  touch(room);
}
function startAuction(room, playerId) {
  const player = assertTurn(room, playerId), tile = board[player.pos];
  if (room.phase !== 'purchase' || room.assets[String(player.pos)]) throw new Error('Açık artırma başlatılamaz.');
  room.auction = { tileIndex: player.pos, highestBid: 0, highestBidderId: null, passed: [], startedAt: Date.now() };
  room.phase = 'auction';
  log(room, `${tile.name} için açık artırma başladı.`, 'auction');
  touch(room);
}
function auctionBid(room, playerId, amount) {
  const player = playerById(room, playerId), auction = room.auction;
  amount = Math.round(Number(amount));
  if (!player || player.bankrupt || !auction) throw new Error('Aktif açık artırma yok.');
  if (auction.passed.includes(playerId)) throw new Error('Açık artırmadan çekildin.');
  if (!Number.isFinite(amount) || amount < auction.highestBid + 10) throw new Error('Teklif en az ₺10 artırılmalı.');
  if (player.money < amount) throw new Error('Bu teklif için paran yetersiz.');
  auction.highestBid = amount;
  auction.highestBidderId = playerId;
  log(room, `${player.name} ₺${amount} teklif verdi.`, 'auction');
  touch(room);
}
function finishAuctionIfReady(room) {
  const auction = room.auction;
  if (!auction) return false;
  const eligible = activePlayers(room).filter(p => !auction.passed.includes(p.id));
  if (eligible.length > 1) return false;
  if (auction.highestBidderId) {
    const winner = playerById(room, auction.highestBidderId);
    if (winner && winner.money >= auction.highestBid) {
      winner.money -= auction.highestBid;
      room.assets[String(auction.tileIndex)] = { ownerId: winner.id, level: 0, mortgaged: false };
      log(room, `${winner.name}, ${board[auction.tileIndex].name} mülkünü ₺${auction.highestBid} teklifle aldı.`, 'auction');
    }
  } else log(room, `${board[auction.tileIndex].name} için teklif verilmedi.`, 'auction');
  room.auction = null;
  room.phase = 'resolved';
  touch(room);
  return true;
}
function auctionPass(room, playerId) {
  const player = playerById(room, playerId), auction = room.auction;
  if (!player || !auction) throw new Error('Aktif açık artırma yok.');
  const remainingOpponents = activePlayers(room).filter(p => p.id !== playerId && !auction.passed.includes(p.id));
  if (auction.highestBidderId === playerId && remainingOpponents.length) throw new Error('En yüksek teklif sende; diğer oyuncuların yanıtını bekle.');
  if (!auction.passed.includes(playerId)) auction.passed.push(playerId);
  log(room, `${player.name} açık artırmadan çekildi.`, 'auction');
  finishAuctionIfReady(room);
  touch(room);
}
function endTurn(room, playerId) {
  const player = assertTurn(room, playerId);
  if (!room.lastRoll || room.auction || !['resolved', 'purchase'].includes(room.phase)) throw new Error('Sıra henüz bitirilemez.');
  if (player.money < 0) throw new Error('Önce borcunu kapat veya iflas et.');
  if (room.phase === 'purchase') room.phase = 'resolved';
  if (room.extraTurn && !player.inJail && !player.bankrupt) {
    room.phase = 'roll'; room.lastRoll = null; room.extraTurn = false;
    log(room, `${player.name} çift zar attığı için yeniden oynuyor.`, 'turn');
  } else {
    const players = activePlayers(room);
    const idx = players.findIndex(p => p.id === playerId);
    const next = players[(idx + 1) % players.length];
    room.turnPlayerId = next.id;
    room.turnNumber += 1;
    room.phase = 'roll'; room.lastRoll = null; room.extraTurn = false; room.doublesCount = 0;
    log(room, `Sıra ${next.name} oyuncusunda.`, 'turn');
  }
  touch(room);
}
function skipDisconnected(room, hostPlayerId) {
  if (room.hostPlayerId !== hostPlayerId) throw new Error('Bu işlemi yalnızca oda sahibi yapabilir.');
  if (!room.started || room.finished) throw new Error('Oyun aktif değil.');
  const current = playerById(room, room.turnPlayerId);
  if (!current || current.connected) throw new Error('Sıradaki oyuncu hâlâ bağlı.');
  const players = activePlayers(room);
  const index = players.findIndex(player => player.id === current.id);
  const next = players[(index + 1) % players.length];
  room.turnPlayerId = next.id; room.turnNumber += 1; room.phase = 'roll';
  room.lastRoll = null; room.extraTurn = false; room.doublesCount = 0; room.auction = null;
  log(room, `${current.name} çevrimdışı olduğu için sıra ${next.name} oyuncusuna geçti.`, 'turn');
  touch(room);
}
function validateBuild(room, player, index, selling = false) {
  const tile = board[index], asset = room.assets[String(index)];
  if (!tile || tile.type !== 'property' || !asset || asset.ownerId !== player.id) throw new Error('Bu mülkte işlem yapamazsın.');
  if (asset.mortgaged) throw new Error('İpotekli mülke bina yapılamaz.');
  if (!ownsGroup(room, player.id, tile.group)) throw new Error('Bu renk grubunun tamamına sahip olmalısın.');
  const groupAssets = board.map((t, i) => t.group === tile.group ? room.assets[String(i)] : null).filter(Boolean);
  const levels = groupAssets.map(a => a.level || 0);
  if (!selling && (asset.level >= 5 || asset.level > Math.min(...levels))) throw new Error('Binalar gruba dengeli kurulmalı.');
  if (selling && (asset.level <= 0 || asset.level < Math.max(...levels))) throw new Error('Binalar gruptan dengeli satılmalı.');
  return { tile, asset };
}
function build(room, playerId, index) {
  const player = playerById(room, playerId), { tile, asset } = validateBuild(room, player, Number(index));
  if (player.money < tile.buildCost) throw new Error('Yeterli paran yok.');
  player.money -= tile.buildCost; asset.level += 1;
  log(room, `${player.name}, ${tile.name} üzerine ${asset.level === 5 ? 'otel' : `${asset.level}. evi`} kurdu.`, 'build'); touch(room);
}
function sellBuilding(room, playerId, index) {
  const player = playerById(room, playerId), { tile, asset } = validateBuild(room, player, Number(index), true);
  asset.level -= 1; player.money += Math.floor(tile.buildCost / 2);
  log(room, `${player.name}, ${tile.name} üzerindeki bir binayı sattı.`, 'build'); touch(room);
}
function mortgage(room, playerId, index) {
  const player = playerById(room, playerId), tile = board[Number(index)], asset = room.assets[String(index)];
  if (!player || !tile || !asset || asset.ownerId !== playerId || asset.mortgaged) throw new Error('Bu mülk ipotek edilemez.');
  const groupHasBuildings = tile.group && board.some((t, i) => t.group === tile.group && (room.assets[String(i)]?.level || 0) > 0);
  if (groupHasBuildings) throw new Error('Önce renk grubundaki binaları satmalısın.');
  asset.mortgaged = true; player.money += Math.floor(tile.price / 2);
  log(room, `${player.name}, ${tile.name} mülkünü ipotek etti.`, 'mortgage'); touch(room);
}
function unmortgage(room, playerId, index) {
  const player = playerById(room, playerId), tile = board[Number(index)], asset = room.assets[String(index)];
  if (!player || !tile || !asset || asset.ownerId !== playerId || !asset.mortgaged) throw new Error('Bu mülkün ipoteği kaldırılamaz.');
  const cost = Math.ceil((tile.price / 2) * 1.1);
  if (player.money < cost) throw new Error('Yeterli paran yok.');
  asset.mortgaged = false; player.money -= cost;
  log(room, `${player.name}, ${tile.name} ipoteğini ₺${cost} karşılığında kaldırdı.`, 'mortgage'); touch(room);
}
function proposeTrade(room, playerId, data) {
  const from = playerById(room, playerId), to = playerById(room, data.toId);
  if (!from || !to || from.bankrupt || to.bankrupt || from.id === to.id) throw new Error('Geçersiz takas hedefi.');
  const offerCash = Math.max(0, Math.round(Number(data.offerCash) || 0));
  const requestCash = Math.max(0, Math.round(Number(data.requestCash) || 0));
  if (from.money < offerCash) throw new Error('Teklif ettiğin nakit yetersiz.');
  if (to.money < requestCash) throw new Error('Karşı oyuncunun nakdi yetersiz.');
  const offerAssets = [...new Set((data.offerAssets || []).map(Number))];
  const requestAssets = [...new Set((data.requestAssets || []).map(Number))];
  if (!offerAssets.every(i => room.assets[String(i)]?.ownerId === from.id) || !requestAssets.every(i => room.assets[String(i)]?.ownerId === to.id)) throw new Error('Takas mülkleri artık geçerli değil.');
  if ([...offerAssets, ...requestAssets].some(i => (room.assets[String(i)]?.level || 0) > 0)) throw new Error('Üzerinde bina bulunan mülk takas edilemez.');
  const trade = { id: id('t_'), fromId: from.id, toId: to.id, offerCash, requestCash, offerAssets, requestAssets, createdAt: Date.now() };
  room.pendingTrades = room.pendingTrades.filter(t => t.toId !== to.id);
  room.pendingTrades.push(trade);
  log(room, `${from.name}, ${to.name} oyuncusuna takas teklif etti.`, 'trade'); touch(room);
  return trade;
}
function respondTrade(room, playerId, tradeId, accept) {
  const trade = room.pendingTrades.find(t => t.id === tradeId && t.toId === playerId);
  if (!trade) throw new Error('Takas teklifi bulunamadı.');
  const from = playerById(room, trade.fromId), to = playerById(room, trade.toId);
  room.pendingTrades = room.pendingTrades.filter(t => t.id !== trade.id);
  if (!accept) { log(room, `${to.name}, ${from.name} oyuncusunun teklifini reddetti.`, 'trade'); touch(room); return; }
  if (!from || !to || from.money < trade.offerCash || to.money < trade.requestCash) throw new Error('Takas koşulları artık geçerli değil.');
  if (!trade.offerAssets.every(i => room.assets[String(i)]?.ownerId === from.id) || !trade.requestAssets.every(i => room.assets[String(i)]?.ownerId === to.id)) throw new Error('Takas mülkleri artık geçerli değil.');
  transfer(from, to, trade.offerCash); transfer(to, from, trade.requestCash);
  trade.offerAssets.forEach(i => { room.assets[String(i)].ownerId = to.id; });
  trade.requestAssets.forEach(i => { room.assets[String(i)].ownerId = from.id; });
  log(room, `${from.name} ile ${to.name} arasındaki takas tamamlandı.`, 'trade');
  notify(room, { kind: 'trade', title: 'Takas Tamamlandı', cardTitle: `${from.name} ↔ ${to.name}`, message: 'Mülk ve nakit değişimi başarıyla gerçekleşti.' }); touch(room);
}
function eliminatePlayer(room, player, reason = 'bankrupt') {
  player.bankrupt = true; player.money = 0;
  if (reason === 'left') player.left = true;
  for (const [index] of ownedAssets(room, player.id)) delete room.assets[String(index)];
  room.pendingTrades = room.pendingTrades.filter(t => t.fromId !== player.id && t.toId !== player.id);
  log(room, reason === 'left' ? `${player.name} masadan ayrıldı.` : `${player.name} iflas etti.`, reason === 'left' ? 'leave' : 'bankrupt');
  const left = activePlayers(room);
  if (left.length === 1) {
    room.finished = true; room.winnerId = left[0].id; room.turnPlayerId = left[0].id; room.phase = 'finished';
    notify(room, { kind: 'winner', title: 'Oyun Bitti', cardTitle: `${left[0].name} kazandı!`, message: 'Konya’nın yeni mülk ustası belli oldu.' });
  } else if (room.turnPlayerId === player.id) {
    const allPlayers = room.players;
    const currentIndex = allPlayers.findIndex(item => item.id === player.id);
    let next = null;
    for (let offset = 1; offset <= allPlayers.length; offset += 1) {
      const candidate = allPlayers[(currentIndex + offset) % allPlayers.length];
      if (!candidate.bankrupt) { next = candidate; break; }
    }
    room.turnPlayerId = next.id; room.turnNumber += 1; room.lastRoll = null;
    room.phase = 'roll'; room.extraTurn = false; room.doublesCount = 0;
    log(room, `Sıra ${next.name} oyuncusunda.`, 'turn');
  }
  touch(room);
  return room.notifications.at(-1);
}
function bankrupt(room, playerId) {
  const player = assertTurn(room, playerId);
  return eliminatePlayer(room, player, 'bankrupt');
}
function leaveRoom(room, playerId) {
  const player = playerById(room, playerId);
  if (!player) throw new Error('Oyuncu bulunamadı.');
  if (!room.started) {
    room.players = room.players.filter(item => item.id !== player.id);
    room.pendingTrades = room.pendingTrades.filter(item => item.fromId !== player.id && item.toId !== player.id);
    if (room.hostPlayerId === player.id) room.hostPlayerId = room.players[0]?.id || null;
    log(room, `${player.name} masadan ayrıldı.`, 'leave');
    touch(room);
    return { empty: room.players.length === 0, notification: null };
  }
  if (!player.bankrupt) eliminatePlayer(room, player, 'left');
  if (room.hostPlayerId === player.id) {
    room.hostPlayerId = room.players.find(item => item.connected && !item.bankrupt)?.id
      || room.players.find(item => !item.bankrupt)?.id
      || null;
  }
  const notification = room.finished
    ? room.notifications.at(-1)
    : notify(room, { kind: 'system', title: 'Masa', cardTitle: `${player.name} ayrıldı`, message: 'Oyun kalan oyuncularla devam ediyor.' });
  touch(room);
  return { empty: false, notification };
}

module.exports = {
  COLORS, START_MONEY, board, chanceCards, chestCards, cleanName, createRoom, addPlayer,
  publicState, playerById, activePlayers, ownsGroup, calculateRent, startGame, roll,
  payJail, buy, startAuction, auctionBid, auctionPass, finishAuctionIfReady, endTurn,
  skipDisconnected,
  build, sellBuilding, mortgage, unmortgage, proposeTrade, respondTrade, bankrupt, leaveRoom,
  applyCard, resolveLanding, log, notify, touch, assetValue
};
