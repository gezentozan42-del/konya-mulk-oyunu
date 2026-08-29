'use strict';

const socket = io({ transports: ['websocket', 'polling'] });
const $ = id => document.getElementById(id);
const E = Object.fromEntries([
  'connectionBar','lobbyView','gameView','nameInput','codeInput','createBtn','joinBtn','loginStatus','roomCode','copyCodeBtn','voiceStatus','voiceBtn','muteBtn','shareBtn','exitBtn',
  'turnBanner','turnText','turnHint','board','tokenLayer','die1','die2','diceStage','diceTotal','pot','turnNumber','tableNotice','noticeSymbol','noticeType','noticeTitle','noticeMessage','propertyModal','propertyModalScrim','propertyCard','propertyCardClose','propertyCardType','propertyCardTitle','propertyCardMeta','propertyCardBody','tableFeedItems','tileIcon','tileName','tileInfo','startBtn','payJailBtn','rollBtn','buyBtn','auctionBtn','endBtn','skipBtn','bankruptBtn','auctionBox','incomingTrade','playerCount','players','portfolioValue','myAssets','tradeTarget','offerCash','requestCash','offerAssets','requestAssets','tradeBtn','chat','chatForm','chatInput','log','toastStack','confetti'
].map(id => [id, $(id)]));

const GROUP_COLORS = {
  'Tarihi Karatay':'#ff6b35','Akabe Çevresi':'#00b8d9','Meram Bağları':'#e5487b','Karatay Doğu':'#f5b700',
  'Selçuklu Kuzey':'#ef4444','Kampüs Çevresi':'#84cc16','Meram Güney':'#14b8a6','Selçuklu Merkez':'#6366f1',station:'#94a3b8',utility:'#c084fc'
};
const PLAYER_COLORS = ['#58a6ff','#ff6b6b','#a878ff','#f6c453','#45d483'];
const MAX_BUILDS_PER_TURN = 3;
const PIP_MAP = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const TILE_ICONS = {start:'➜',property:'⌂',station:'◆',utility:'⚡',tax:'₺',chance:'?',chest:'▣',jail:'◷',freeParking:'♨',goToJail:'!'};
const CARD_ICONS = {chance:'?',chest:'▣',winner:'♛',system:'◆',trade:'⇄',jail:'!',buy:'₺',rent:'↔',money:'₺',build:'⌂',mortgage:'₺',sell:'₺',leave:'↩',auction:'◆'};

let state = null, previousState = null, myPlayerId = null, roomCode = null, resumeToken = null;
let rolling = false, rollingTimer = null, animationVersion = 0, audioContext = null;
let noticeTimer = null;
let selectedTileIndex = null;
let localStream = null, micMuted = false, iceServers = null;
const tokenElements = new Map(), peers = new Map(), pendingCandidates = new Map(), notificationQueue = [];

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function money(value) { return `₺${Math.round(Number(value) || 0).toLocaleString('tr-TR')}`; }
function my() { return state?.players.find(player => player.id === myPlayerId); }
function player(id) { return state?.players.find(item => item.id === id); }
function ownerName(id) { return player(id)?.name || 'Banka'; }
function isBuyable(tile) { return ['property','station','utility'].includes(tile?.type); }
function playerColor(id) { const item = player(id); return PLAYER_COLORS[item?.color ?? 0]; }
function assetEntries(ownerId) { return Object.entries(state?.assets || {}).filter(([, asset]) => asset.ownerId === ownerId).map(([index, asset]) => ({ index:Number(index), asset, tile:state.board[Number(index)] })); }
function propertyCount(id) { return assetEntries(id).length; }
function tileAsset(index) { return state?.assets?.[String(index)] || null; }
function tileOwner(index) { const asset = tileAsset(index); return asset ? player(asset.ownerId) : null; }
function groupLabel(tile) { return tile.group || (tile.type === 'station' ? 'Ulaşım' : tile.type === 'utility' ? 'Altyapı' : 'Özel kare'); }
function cardMoney(value) { return `₺${Math.round(Number(value) || 0).toLocaleString('tr-TR')}`; }
function saveSession(data) { localStorage.setItem('konyaMulkSessionV2', JSON.stringify(data)); }
function loadSession() { try { return JSON.parse(localStorage.getItem('konyaMulkSessionV2') || 'null'); } catch { return null; } }
function setStatus(message, error = false) { E.loginStatus.textContent = message; E.loginStatus.classList.toggle('error', error); }
function toast(title, message = '') {
  const item = document.createElement('div'); item.className = 'toast';
  item.innerHTML = `<b>${esc(title)}</b>${message ? `<span>${esc(message)}</span>` : ''}`;
  E.toastStack.appendChild(item); setTimeout(() => item.remove(), 4200);
}
function enterRoom(code) {
  roomCode = code; E.lobbyView.classList.add('hidden'); E.gameView.classList.remove('hidden'); E.roomCode.textContent = code;
  history.replaceState(null, '', `?room=${encodeURIComponent(code)}`);
}
function authDone(result, name) {
  myPlayerId = result.playerId; resumeToken = result.resumeToken || resumeToken;
  enterRoom(result.code); saveSession({ code:result.code, resumeToken, name:name || result.name || '' });
  if (state) { render(); requestAnimationFrame(() => placeTokens(state.players)); }
}
function emitAction(event, data = {}, success) {
  socket.emit(event, data, result => {
    if (!result?.ok) { stopDiceRoll(state?.lastRoll || [1,1]); toast('İşlem yapılamadı', result?.error || 'Lütfen tekrar dene.'); return; }
    success?.(result);
  });
}

E.codeInput.addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
E.createBtn.addEventListener('click', () => {
  const name = E.nameInput.value.trim(); if (!name) return setStatus('Önce oyuncu adını yaz.', true);
  E.createBtn.disabled = true; setStatus('Masa kuruluyor…');
  socket.emit('create-room', { name }, result => { E.createBtn.disabled = false; if (result?.ok) authDone(result, name); else setStatus(result?.error || 'Masa kurulamadı.', true); });
});
E.joinBtn.addEventListener('click', () => {
  const name = E.nameInput.value.trim(), code = E.codeInput.value.trim().toUpperCase();
  if (!name || code.length !== 5) return setStatus('Adını ve 5 haneli oda kodunu yaz.', true);
  E.joinBtn.disabled = true; setStatus('Masaya bağlanılıyor…');
  socket.emit('join-room', { name, code }, result => { E.joinBtn.disabled = false; if (result?.ok) authDone(result, name); else setStatus(result?.error || 'Odaya katılınamadı.', true); });
});

socket.on('connect', () => {
  E.connectionBar.classList.add('hidden');
  const params = new URLSearchParams(location.search), saved = loadSession(), queryRoom = params.get('room')?.toUpperCase(), freshJoin = params.get('fresh') === '1';
  if (!freshJoin && saved?.resumeToken && saved?.code && (!queryRoom || queryRoom === saved.code)) {
    resumeToken = saved.resumeToken; E.nameInput.value = saved.name || '';
    socket.emit('resume-room', { code:saved.code, resumeToken:saved.resumeToken }, result => {
      if (result?.ok) authDone(result, saved.name); else { localStorage.removeItem('konyaMulkSessionV2'); if (queryRoom) E.codeInput.value = queryRoom; }
    });
  } else if (queryRoom) E.codeInput.value = queryRoom;
});
socket.on('disconnect', () => E.connectionBar.classList.remove('hidden'));
socket.on('connect_error', () => E.connectionBar.classList.remove('hidden'));
socket.on('action-error', ({ message }) => { stopDiceRoll(state?.lastRoll || [1,1]); toast('İşlem yapılamadı', message); });
socket.on('state', nextState => {
  previousState = state; state = nextState; render();
  requestAnimationFrame(() => animateTokens(previousState, state));
  if (state.lastRoll) stopDiceRoll(state.lastRoll); else if (!rolling) { setDie(E.die1, 1); setDie(E.die2, 1); }
});
socket.on('game-notification', notification => showGameNotification(notification));

document.querySelectorAll('.panel-tabs button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.panel-tabs button').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('.panel-page').forEach(page => page.classList.remove('active'));
  $(`${button.dataset.panel}Panel`).classList.add('active');
}));

function gridPosition(index) {
  if (index <= 10) return [11, 11 - index];
  if (index <= 20) return [21 - index, 1];
  if (index <= 30) return [1, index - 19];
  return [index - 29, 11];
}
function groupColor(tile) { return GROUP_COLORS[tile.group || tile.type] || '#60756d'; }
function tileSubtitle(tile) {
  if (isBuyable(tile)) return money(tile.price);
  if (tile.amount) return `− ${money(tile.amount)}`;
  return tile.text || '';
}
function buildings(asset) {
  if (!asset?.level) return '';
  return asset.level === 5 ? 'OTEL' : `${asset.level} EV`;
}
function renderBoard() {
  E.board.querySelectorAll('.tile').forEach(tile => tile.remove());
  const currentPosition = player(state.turnPlayerId)?.pos;
  state.board.forEach((tile, index) => {
    const el = document.createElement('div'), [row, column] = gridPosition(index), asset = state.assets[String(index)];
    const owner = asset && player(asset.ownerId);
    el.className = `tile ${[0,10,20,30].includes(index) ? 'corner' : ''} ${['chance','chest','tax','freeParking','goToJail'].includes(tile.type) ? 'special' : ''} ${asset?.mortgaged ? 'mortgaged' : ''} ${currentPosition === index && state.started ? 'current' : ''}`;
    el.style.gridRow = row; el.style.gridColumn = column; el.dataset.tileIndex = index;
    el.title = owner ? `${tile.name} · Sahibi: ${owner.name}` : tile.name;
    el.style.setProperty('--tile-accent', groupColor(tile));
    el.style.setProperty('--owner-color', owner ? PLAYER_COLORS[owner.color] : 'transparent');
    el.classList.toggle('owned', Boolean(owner));
    el.innerHTML = `${isBuyable(tile) ? `<span class="color-band" style="background:${groupColor(tile)}"></span>` : ''}<strong>${esc(tile.name)}</strong><small>${esc(tileSubtitle(tile))}</small>${owner ? `<span class="tile-owner-pawn" aria-label="${esc(owner.name)} sahibi">♟</span>` : ''}<span class="tile-icon-mini">${TILE_ICONS[tile.type] || '•'}</span>${asset?.level ? `<span class="building-row ${asset.level === 5 ? 'hotel' : ''}"><i>⌂</i><b>${buildings(asset)}</b></span>` : ''}`;
    el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
    E.board.appendChild(el);
  });
}
function renderPlayers() {
  E.playerCount.textContent = `${state.players.length} / 5`;
  E.players.innerHTML = state.players.map(item => {
    const netWorth = item.money + assetEntries(item.id).reduce((total, entry) => total + (entry.tile.price || 0) + (entry.asset.level || 0) * (entry.tile.buildCost || 0), 0);
    const protection = item.rentImmunity > 0 ? ` · 🛡️ ${item.rentImmunity} kira hakkı` : '';
    const status = item.bankrupt ? 'İflas etti' : item.inJail ? `Hapiste ${item.jailTurns}/3` : `${propertyCount(item.id)} mülk · Değer ${money(netWorth)}${protection}`;
    return `<div class="player-row ${item.id === state.turnPlayerId && state.started ? 'turn' : ''} ${item.id === myPlayerId ? 'me' : ''}" style="--player-color:${PLAYER_COLORS[item.color]}"><div class="player-main"><i class="player-orb"></i><div class="player-name"><b>${esc(item.name)}${item.id === myPlayerId ? ' · SEN' : ''}</b><small>${status}</small></div><span class="player-money">${money(item.money)}</span></div><i class="online-dot ${item.connected ? 'on' : ''}"></i></div>`;
  }).join('');
}
function renderAssets() {
  const entries = assetEntries(myPlayerId);
  const value = entries.reduce((total, entry) => total + Math.floor((entry.tile.price || 0) / 2) + (entry.asset.level || 0) * Math.floor((entry.tile.buildCost || 0) / 2), 0);
  const buildsUsed = Math.max(0, Number(state.buildsThisTurn) || 0), buildsLeft = Math.max(0, MAX_BUILDS_PER_TURN - buildsUsed);
  const canBuildThisTurn = state.started && !state.finished && state.turnPlayerId === myPlayerId;
  E.portfolioValue.textContent = money(value);
  E.myAssets.innerHTML = entries.length ? entries.map(({ index, asset, tile }) => {
    const canBuild = canBuildThisTurn && buildsLeft > 0 && asset.level < 5;
    const buildTitle = canBuildThisTurn ? (buildsLeft > 0 ? `Bu tur ${buildsLeft} bina hakkın kaldı.` : 'Bu tur 3 bina hakkını kullandın.') : 'Sadece kendi sıranda bina kurabilirsin.';
    const buildButton = tile.type === 'property' && !asset.mortgaged && asset.level < 5
      ? `<button data-action="build" data-index="${index}" ${canBuild ? '' : 'disabled'} title="${buildTitle}">+ Ev/Otel${canBuild ? ` (${buildsLeft})` : ''}</button><button data-action="sell-building" data-index="${index}">− Bina</button>`
      : '';
    return `<article class="asset-card" style="--asset-color:${groupColor(tile)}"><div class="asset-card-head"><div><h4>${esc(tile.name)}</h4><small>${esc(tile.group || (tile.type === 'station' ? 'Ulaşım' : 'Hizmet'))} · ${asset.mortgaged ? `İpotekli · Banka ${money(Math.floor(tile.price / 2))}` : asset.level === 5 ? 'Otel' : asset.level ? `${asset.level} ev` : 'Arsa'}</small></div><b>${money(tile.price)}</b></div><div class="asset-actions">${buildButton}${asset.mortgaged ? `<button data-action="unmortgage" data-index="${index}">İpoteği kaldır</button><button class="bank-sale" data-action="sell-to-bank" data-index="${index}">Bankaya sat +${money(Math.floor(tile.price / 2))}</button>` : `<button data-action="mortgage" data-index="${index}">İpotek et</button>`}</div></article>`;
  }).join('') : '<div class="empty-state">Henüz bir mülkün yok.<br>Tahtada boş bir mülke geldiğinde satın alabilirsin.</div>';
  E.myAssets.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.index);
    if (button.dataset.action === 'sell-to-bank') {
      const amount = Math.floor((state.board[index]?.price || 0) / 2);
      if (!confirm(`Tapuyu bankaya ${money(amount)} karşılığında satmak istiyor musun?`)) return;
    }
    emitAction(button.dataset.action, { index });
  }));
}
function renderTrade() {
  const others = state.players.filter(item => item.id !== myPlayerId && !item.bankrupt), old = E.tradeTarget.value;
  E.tradeTarget.innerHTML = others.map(item => `<option value="${item.id}">${esc(item.name)}</option>`).join('');
  if (others.some(item => item.id === old)) E.tradeTarget.value = old;
  const targetId = E.tradeTarget.value;
  const checks = entries => entries.map(({ index, tile }) => `<label class="trade-asset" style="--asset-color:${groupColor(tile)}"><input type="checkbox" value="${index}"><span class="trade-asset-copy"><i class="trade-swatch"></i><span><b>${esc(tile.name)}</b><small>${esc(groupLabel(tile))} · ${money(tile.price)}</small></span></span></label>`).join('') || '<span class="empty-state">Mülk yok</span>';
  E.offerAssets.innerHTML = checks(assetEntries(myPlayerId)); E.requestAssets.innerHTML = checks(assetEntries(targetId));
  E.tradeBtn.disabled = !targetId || Boolean(my()?.bankrupt);
  E.tradeBtn.title = my()?.money < 0 ? 'Eksi bakiyedeyken mülkünü takas ederek borcunu kapatabilirsin.' : 'Mülk ve nakit karşılığında teklif gönder.';
}
function renderAuction() {
  const auction = state.auction;
  E.auctionBox.classList.toggle('hidden', !auction);
  if (!auction) return;
  const tile = state.board[auction.tileIndex], passed = auction.passed.map(ownerName).join(', ') || 'Henüz yok';
  E.auctionBox.innerHTML = `<div class="auction-title">◆ ${esc(tile.name)}</div><div class="auction-meta">En yüksek teklif: <b>${money(auction.highestBid)}</b>${auction.highestBidderId ? ` · ${esc(ownerName(auction.highestBidderId))}` : ''}<br>Çekilenler: ${esc(passed)}</div><div class="auction-controls"><input id="bidAmount" type="number" min="${auction.highestBid + 10}" value="${auction.highestBid + 10}"><button id="bidBtn">Teklif</button><button id="passBtn">Çekil</button></div>`;
  $('bidBtn').addEventListener('click', () => emitAction('auction-bid', { amount:Number($('bidAmount').value) }));
  $('passBtn').addEventListener('click', () => emitAction('auction-pass'));
}
function renderIncomingTrade() {
  const trade = state.pendingTrades?.find(item => item.toId === myPlayerId);
  E.incomingTrade.classList.toggle('hidden', !trade); if (!trade) return;
  const chips = list => list.map(index => { const tile = state.board[index]; return `<span class="trade-chip" style="--asset-color:${groupColor(tile)}"><i></i>${esc(tile.name)}</span>`; }).join('') || '<span class="trade-none">—</span>';
  E.incomingTrade.innerHTML = `<div class="auction-title">⇄ ${esc(ownerName(trade.fromId))} teklif gönderdi</div><div class="trade-summary"><div><small>VERİYOR</small><b>${money(trade.offerCash)}</b><div class="trade-chip-list">${chips(trade.offerAssets)}</div></div><div><small>İSTİYOR</small><b>${money(trade.requestCash)}</b><div class="trade-chip-list">${chips(trade.requestAssets)}</div></div></div><div class="action-grid"><button class="btn btn-primary" data-answer="yes">Kabul et</button><button class="btn btn-quiet" data-answer="no">Reddet</button></div>`;
  E.incomingTrade.querySelectorAll('button').forEach(button => button.addEventListener('click', () => emitAction('trade-respond', { tradeId:trade.id, accept:button.dataset.answer === 'yes' })));
}

function rentRows(tile, asset) {
  if (tile.type === 'property') {
    const levels = ['Arsa', '1 ev', '2 ev', '3 ev', '4 ev', 'Otel'];
    const groupComplete = asset?.ownerId && tile.group && state.board.filter(item => item.group === tile.group).every(item => {
      const tileIndex = state.board.indexOf(item);
      return state.assets[String(tileIndex)]?.ownerId === asset.ownerId;
    });
    return tile.rent.map((value, index) => `<span><small>${levels[index]}${index === 0 && groupComplete ? ' · çift' : ''}</small><b>${money(index === 0 && groupComplete ? value * 2 : value)}</b></span>`).join('');
  }
  if (tile.type === 'station') return ['1 istasyon', '2 istasyon', '3 istasyon', '4 istasyon'].map((label, index) => `<span><small>${label}</small><b>${money([25,50,100,200][index])}</b></span>`).join('');
  if (tile.type === 'utility') return `<span><small>1 altyapı</small><b>4× zar</b></span><span><small>2 altyapı</small><b>10× zar</b></span>`;
  return '';
}
function renderPropertyCard(index = selectedTileIndex) {
  if (index === null || index === undefined || !state?.board[index]) return;
  const tile = state.board[index], asset = tileAsset(index), owner = tileOwner(index);
  E.propertyCard.className = `property-card ${isBuyable(tile) ? 'buyable' : 'special'}`;
  E.propertyCard.style.setProperty('--property-accent', groupColor(tile));
  E.propertyCardType.textContent = isBuyable(tile) ? (tile.type === 'property' ? 'TAPU BİLGİSİ' : tile.type === 'station' ? 'ULAŞIM BİLGİSİ' : 'ALTYAPI BİLGİSİ') : 'KARE BİLGİSİ';
  E.propertyCardTitle.textContent = tile.name;
  E.propertyCardMeta.textContent = `${groupLabel(tile)}${owner ? ` · Sahibi: ${owner.name}` : ''}`;
  if (tile.type === 'property') {
    const ownerLine = asset ? (asset.mortgaged ? 'İpotekli' : asset.level === 5 ? 'Otel kurulu' : asset.level ? `${asset.level} ev kurulu` : 'Arsa') : 'Satışta';
    E.propertyCardBody.innerHTML = `<div class="property-price"><span>Satın alma</span><b>${money(tile.price)}</b></div><div class="rent-heading"><span>KİRA TABLOSU</span><small>${esc(ownerLine)}</small></div><div class="rent-grid">${rentRows(tile, asset)}</div><div class="property-foot"><span>Ev maliyeti <b>${money(tile.buildCost)}</b></span><span>Otel maliyeti <b>${money(tile.buildCost)}</b></span><span>İpotek <b>${money(Math.floor(tile.price / 2))}</b></span></div>`;
  } else if (tile.type === 'station') {
    E.propertyCardBody.innerHTML = `<div class="property-price"><span>Satın alma</span><b>${money(tile.price)}</b></div><div class="rent-heading"><span>İSTASYON KİRASI</span><small>${owner ? `${assetEntries(owner.id).filter(entry => entry.tile.type === 'station').length} istasyon sende` : 'Sahip sayısına göre'}</small></div><div class="rent-grid">${rentRows(tile, asset)}</div>`;
  } else if (tile.type === 'utility') {
    E.propertyCardBody.innerHTML = `<div class="property-price"><span>Satın alma</span><b>${money(tile.price)}</b></div><div class="rent-heading"><span>ZAR ÇARPANI</span><small>Son zar toplamı ile hesaplanır</small></div><div class="rent-grid">${rentRows(tile, asset)}</div>`;
  } else {
    E.propertyCardBody.innerHTML = `<div class="special-copy"><span class="special-icon">${TILE_ICONS[tile.type] || '•'}</span><p>${esc(tile.text || 'Bu kare özel bir oyun alanıdır.')}</p></div>`;
  }
  E.propertyCard.classList.remove('hidden');
}
function showPropertyCard(index) {
  if (!state?.board[index]) return;
  selectedTileIndex = index;
  renderPropertyCard(index);
  E.propertyModal.classList.remove('hidden');
  requestAnimationFrame(() => E.propertyCardClose.focus({ preventScroll:true }));
}
function hidePropertyCard() {
  selectedTileIndex = null;
  E.propertyModal.classList.add('hidden');
}
function logAccent(kind) {
  return ({buy:'#f0bd55',rent:'#ff6e70',money:'#f0bd55',sell:'#f0bd55',trade:'#a878ff',build:'#44df9b',auction:'#f0bd55',leave:'#ff6e70',jail:'#ff6e70',roll:'#44df9b'})[kind] || '#9bb0a7';
}
function renderTableFeed() {
  const items = (state.log || []).slice(-3).reverse();
  E.tableFeedItems.innerHTML = items.map(item => `<div class="feed-item" style="--feed-accent:${logAccent(item.kind)}" title="${esc(item.msg)}"><i></i><span>${esc(item.msg)}</span></div>`).join('') || '<div class="feed-empty">Masa hareketleri burada görünür.</div>';
}
function renderChatAndLog() {
  E.chat.innerHTML = (state.chat || []).slice(-60).map(message => `<div class="message"><b>${esc(message.name)}</b>${esc(message.text)}</div>`).join('') || '<div class="empty-state">Masa sohbeti burada görünecek.</div>';
  E.chat.scrollTop = E.chat.scrollHeight;
  E.log.innerHTML = (state.log || []).slice().reverse().map(item => `<div class="log-item ${esc(item.kind || '')}">${esc(item.msg || item)}</div>`).join('');
}
function render() {
  if (!state) return;
  const me = my(), current = player(state.turnPlayerId), myTurn = state.started && state.turnPlayerId === myPlayerId && !me?.bankrupt;
  E.turnBanner.classList.toggle('my-turn', myTurn);
  E.turnText.textContent = state.winnerId ? `${ownerName(state.winnerId)} kazandı` : state.started ? (myTurn ? 'Sıra sende' : `Sıra ${current?.name || '—'} oyuncusunda`) : 'Oyuncular masada bekleniyor';
  E.turnHint.textContent = state.started ? (state.phase === 'roll' ? 'Zar bekleniyor' : state.phase === 'purchase' ? 'Satın al veya açık artır' : state.phase === 'auction' ? 'Açık artırma devam ediyor' : 'Hamle tamamlanıyor') : `${state.players.length}/5 oyuncu`;
  E.pot.textContent = money(state.freeParkingPot); E.turnNumber.textContent = state.started ? state.turnNumber : '—';
  const tile = me ? state.board[me.pos] : state.board[0], asset = me ? state.assets[String(me.pos)] : null;
  E.tileIcon.textContent = TILE_ICONS[tile.type] || '•'; E.tileName.textContent = tile.name;
  E.tileInfo.textContent = isBuyable(tile) ? (asset ? `${asset.ownerId === myPlayerId ? 'Sana ait' : `${ownerName(asset.ownerId)} sahibi`} · ${asset.mortgaged ? 'İpotekli' : 'Aktif'}` : `Satış fiyatı ${money(tile.price)}`) : (tile.text || (tile.amount ? `${money(tile.amount)} ödeme` : 'Özel kare'));
  const canStart = !state.started && state.hostPlayerId === myPlayerId;
  E.startBtn.classList.toggle('hidden', !canStart); E.startBtn.disabled = state.players.length < 2;
  E.rollBtn.classList.toggle('hidden', !state.started); E.rollBtn.disabled = !myTurn || state.phase !== 'roll' || Boolean(state.auction);
  const canRoll = state.started && !E.rollBtn.disabled && !rolling;
  E.diceStage.classList.toggle('can-roll', canRoll); E.diceStage.setAttribute('aria-disabled', String(!canRoll));
  E.payJailBtn.classList.toggle('hidden', !(myTurn && me?.inJail && state.phase === 'roll')); E.payJailBtn.disabled = (me?.money || 0) < 50;
  const canBuy = myTurn && state.phase === 'purchase' && isBuyable(tile) && !asset && me.money >= tile.price;
  E.buyBtn.classList.toggle('hidden', !canBuy);
  const canAuction = myTurn && state.phase === 'purchase' && isBuyable(tile) && !asset;
  E.auctionBtn.classList.toggle('hidden', !canAuction);
  const canEnd = myTurn && Boolean(state.lastRoll) && !state.auction && ['resolved','purchase'].includes(state.phase);
  E.endBtn.classList.toggle('hidden', !canEnd); E.endBtn.disabled = !canEnd;
  const canSkip = state.started && state.hostPlayerId === myPlayerId && current && !current.connected;
  E.skipBtn.classList.toggle('hidden', !canSkip);
  E.bankruptBtn.classList.toggle('hidden', !(myTurn && me?.money < 0));
  if (state.lastRoll) E.diceTotal.textContent = `${state.lastRoll[0]} + ${state.lastRoll[1]} = ${state.lastRoll[0] + state.lastRoll[1]}`; else E.diceTotal.textContent = '—';
  renderBoard(); renderPlayers(); renderAssets(); renderTrade(); renderAuction(); renderIncomingTrade(); renderChatAndLog(); renderTableFeed(); ensureTokens();
  if (selectedTileIndex !== null && !E.propertyModal.classList.contains('hidden')) renderPropertyCard(selectedTileIndex);
}

E.tradeTarget.addEventListener('change', () => state && renderTrade());
E.propertyCardClose.addEventListener('click', hidePropertyCard);
E.propertyModalScrim.addEventListener('click', hidePropertyCard);
E.board.addEventListener('click', event => {
  const tile = event.target.closest('.tile');
  if (tile) showPropertyCard(Number(tile.dataset.tileIndex));
});
E.board.addEventListener('keydown', event => {
  const tile = event.target.closest('.tile');
  if (tile && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showPropertyCard(Number(tile.dataset.tileIndex)); }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') hidePropertyCard(); });
function rollFromDice() {
  if (E.rollBtn.classList.contains('hidden') || E.rollBtn.disabled || rolling) return;
  E.rollBtn.click();
}
E.diceStage.addEventListener('click', rollFromDice);
E.diceStage.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); rollFromDice(); }
});
E.tradeBtn.addEventListener('click', () => {
  const toId = E.tradeTarget.value; if (!toId) return;
  emitAction('trade-propose', {
    toId, offerCash:Number(E.offerCash.value) || 0, requestCash:Number(E.requestCash.value) || 0,
    offerAssets:[...E.offerAssets.querySelectorAll('input:checked')].map(input => Number(input.value)),
    requestAssets:[...E.requestAssets.querySelectorAll('input:checked')].map(input => Number(input.value))
  }, () => toast('Teklif gönderildi', `${ownerName(toId)} yanıtladığında burada göreceksin.`));
});
E.startBtn.addEventListener('click', () => { sound('start'); emitAction('start-game'); });
E.rollBtn.addEventListener('click', () => { if (rolling || E.rollBtn.disabled) return; sound('roll'); startDiceRoll(); emitAction('roll'); });
E.payJailBtn.addEventListener('click', () => emitAction('pay-jail'));
E.buyBtn.addEventListener('click', () => { sound('cash'); emitAction('buy'); });
E.auctionBtn.addEventListener('click', () => emitAction('auction-start'));
E.endBtn.addEventListener('click', () => emitAction('end-turn'));
E.skipBtn.addEventListener('click', () => emitAction('skip-disconnected'));
E.bankruptBtn.addEventListener('click', () => { if (confirm('İflas edip oyundan çekilmek istediğine emin misin?')) emitAction('bankrupt'); });
E.exitBtn.addEventListener('click', () => {
  const message = state?.started ? 'Masadan çıkarsan bu oyunda çekilmiş sayılacaksın. Çıkmak istiyor musun?' : 'Bu masadan çıkmak istiyor musun?';
  if (!confirm(message)) return;
  E.exitBtn.disabled = true;
  socket.emit('leave-room', {}, result => {
    localStorage.removeItem('konyaMulkSessionV2');
    if (!result?.ok) toast('Masadan çıkılamadı', result?.error || 'Lütfen tekrar dene.');
    else window.location.href = `${location.origin}/?fresh=1`;
    E.exitBtn.disabled = false;
  });
});
E.chatForm.addEventListener('submit', event => { event.preventDefault(); const text = E.chatInput.value.trim(); if (text) { emitAction('chat', { text }); E.chatInput.value = ''; } });
E.shareBtn.addEventListener('click', shareRoom); E.copyCodeBtn.addEventListener('click', shareRoom);
async function shareRoom() {
  const url = `${location.origin}?room=${encodeURIComponent(roomCode)}`, text = `KonyaPoly oda kodu: ${roomCode}`;
  try { if (navigator.share) await navigator.share({ title:'KonyaPoly', text, url }); else { await navigator.clipboard.writeText(url); toast('Davet bağlantısı kopyalandı', roomCode); } } catch {}
}

function createDieFace(el) {
  if (el.dataset.ready) return;
  for (let i = 1; i <= 9; i += 1) { const pip = document.createElement('span'); pip.className = 'pip'; pip.dataset.index = i; el.appendChild(pip); }
  el.dataset.ready = '1';
}
function setDie(el, value) {
  createDieFace(el); el.querySelectorAll('.pip').forEach(pip => { pip.style.opacity = '0'; });
  (PIP_MAP[value] || []).forEach(index => { const pip = el.querySelector(`[data-index="${index}"]`); if (pip) pip.style.opacity = '1'; });
}
function startDiceRoll() {
  if (rolling) return; rolling = true;
  [E.die1,E.die2].forEach(die => { die.classList.add('rolling'); die.classList.remove('settle'); });
  rollingTimer = setInterval(() => { setDie(E.die1, 1 + Math.floor(Math.random() * 6)); setDie(E.die2, 1 + Math.floor(Math.random() * 6)); }, 75);
}
function stopDiceRoll(values) {
  clearInterval(rollingTimer); rollingTimer = null; rolling = false;
  [E.die1,E.die2].forEach(die => die.classList.remove('rolling'));
  setDie(E.die1, values?.[0] || 1); setDie(E.die2, values?.[1] || 1);
  [E.die1,E.die2].forEach(die => { die.classList.remove('settle'); void die.offsetWidth; die.classList.add('settle'); });
}

function ensureTokens() {
  const ids = new Set(state.players.map(item => item.id));
  for (const [id, element] of tokenElements) if (!ids.has(id)) { element.remove(); tokenElements.delete(id); }
  state.players.forEach(item => {
    let element = tokenElements.get(item.id);
    if (!element) {
      element = document.createElement('div'); element.className = 'player-piece';
      element.innerHTML = `<i class="pawn-head"></i><i class="pawn-body"></i><i class="pawn-base"></i><span class="piece-name">${esc(item.name)}</span>`;
      E.tokenLayer.appendChild(element); tokenElements.set(item.id, element);
    }
    element.style.setProperty('--player-color', PLAYER_COLORS[item.color]);
    element.classList.toggle('active', state.started && state.turnPlayerId === item.id);
    element.style.display = item.bankrupt ? 'none' : 'block';
  });
}
function stackOffsets(count) {
  return ({1:[[0,0]],2:[[-10,-8],[10,8]],3:[[0,-11],[-11,9],[11,9]],4:[[-10,-10],[10,-10],[-10,10],[10,10]],5:[[0,0],[-13,-12],[13,-12],[-13,12],[13,12]]})[count] || [[0,0]];
}
function tileCenter(index, stackIndex = 0, count = 1) {
  const tile = E.board.querySelector(`[data-tile-index="${index}"]`); if (!tile) return { x:20, y:20 };
  const boardRect = E.board.getBoundingClientRect(), rect = tile.getBoundingClientRect(), offset = stackOffsets(count)[stackIndex] || [0,0];
  return { x:rect.left - boardRect.left + rect.width / 2 + offset[0], y:rect.top - boardRect.top + rect.height / 2 + offset[1] };
}
function grouped(players) { const groups = {}; players.filter(item => !item.bankrupt).forEach(item => (groups[item.pos] ||= []).push(item.id)); return groups; }
function placeTokens(players) {
  const groups = grouped(players);
  players.filter(item => !item.bankrupt).forEach(item => { const group = groups[item.pos], pos = tileCenter(item.pos, group.indexOf(item.id), group.length), el = tokenElements.get(item.id); if (el) { el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`; } });
}
function movementPath(oldPosition, newPosition) {
  if (oldPosition === undefined || newPosition === undefined || oldPosition === newPosition) return [newPosition];
  const distance = (newPosition - oldPosition + 40) % 40;
  if (distance > 0) return Array.from({ length:distance }, (_, index) => (oldPosition + index + 1) % 40);
  return [newPosition];
}
function explicitMovementPath(movement) {
  const steps = Math.min(40, Math.max(0, Number(movement.steps) || 0));
  if (!steps) return [movement.to];
  const delta = movement.direction === 'backward' ? -1 : 1;
  return Array.from({ length:steps }, (_, index) => (movement.from + delta * (index + 1) + 400) % 40);
}
async function animateTokens(oldState, newState) {
  animationVersion += 1; const version = animationVersion; ensureTokens();
  if (!oldState) return placeTokens(newState.players);
  const changed = newState.players.filter(item => { const old = oldState.players.find(candidate => candidate.id === item.id); return old && old.pos !== item.pos && !item.bankrupt; });
  if (!changed.length) return placeTokens(newState.players);
  const movement = newState.lastMovement && newState.lastMovement.id !== oldState.lastMovement?.id ? newState.lastMovement : null;
  const staged = JSON.parse(JSON.stringify(newState.players));
  changed.forEach(item => { const old = oldState.players.find(candidate => candidate.id === item.id), current = staged.find(candidate => candidate.id === item.id); current.pos = old.pos; });
  placeTokens(staged); await new Promise(resolve => setTimeout(resolve, 35));
  const paths = new Map(changed.map(item => {
    const old = oldState.players.find(candidate => candidate.id === item.id);
    const explicit = movement?.playerId === item.id ? explicitMovementPath(movement) : null;
    return [item.id, explicit || movementPath(old.pos, item.pos)];
  }));
  const maxSteps = Math.max(...[...paths.values()].map(path => path.length));
  const pace = movement?.pace === 'fast' ? 105 : 235;
  for (let step = 0; step < maxSteps; step += 1) {
    if (version !== animationVersion) return; let moved = false;
    changed.forEach(item => { const path = paths.get(item.id), current = staged.find(candidate => candidate.id === item.id); if (step < path.length) { current.pos = path[step]; moved = true; } });
    if (!moved) break; sound('step'); placeTokens(staged); await new Promise(resolve => setTimeout(resolve, pace));
  }
  if (version === animationVersion) placeTokens(newState.players);
}
window.addEventListener('resize', () => state && placeTokens(state.players));

function showGameNotification(notification) {
  if (!notification) return;
  notificationQueue.push(notification);
  if (!E.tableNotice.classList.contains('hidden')) return;
  showNextCard();
}
function showNextCard() {
  const notification = notificationQueue.shift(); if (!notification) return;
  const duration = notification.kind === 'winner' ? 8000 : 5200;
  E.tableNotice.className = `table-notice ${notification.kind || 'system'}`;
  E.tableNotice.style.setProperty('--notice-duration', `${duration}ms`);
  E.noticeSymbol.textContent = CARD_ICONS[notification.kind] || '◆';
  E.noticeType.textContent = String(notification.title || 'OYUN BİLDİRİMİ').toUpperCase();
  E.noticeTitle.textContent = notification.cardTitle || notification.title || 'Yeni olay';
  E.noticeMessage.textContent = notification.message || '';
  sound(notification.kind === 'winner' ? 'win' : ['buy','rent','money','build','mortgage','sell'].includes(notification.kind) ? 'cash' : 'card');
  if (notification.kind === 'winner') launchConfetti();
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(hideTableNotice, duration);
}
function hideTableNotice() {
  E.tableNotice.classList.add('leaving');
  setTimeout(() => {
    E.tableNotice.className = 'table-notice hidden';
    showNextCard();
  }, 260);
}
function launchConfetti() {
  E.confetti.innerHTML = '';
  const colors = ['#44df9b','#f0bd55','#58a6ff','#ff6b6b','#f5f0e6'];
  for (let i = 0; i < 85; i += 1) { const piece = document.createElement('i'); piece.style.left = `${Math.random() * 100}%`; piece.style.setProperty('--c', colors[i % colors.length]); piece.style.setProperty('--x', `${(Math.random() - .5) * 300}px`); piece.style.setProperty('--d', `${2.5 + Math.random() * 2.5}s`); piece.style.animationDelay = `${Math.random() * .7}s`; E.confetti.appendChild(piece); }
  setTimeout(() => { E.confetti.innerHTML = ''; }, 6000);
}

function sound(kind) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContext, now = ctx.currentTime;
    const patterns = { roll:[[130,.05],[190,.07]],step:[[320,.025]],cash:[[520,.06],[780,.08]],card:[[330,.09],[440,.11],[660,.15]],start:[[260,.07],[390,.1],[520,.15]],win:[[392,.12],[523,.15],[659,.18],[784,.3]] };
    (patterns[kind] || []).forEach(([frequency,duration], index) => { const oscillator = ctx.createOscillator(), gain = ctx.createGain(); oscillator.type = kind === 'roll' ? 'square' : 'sine'; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(kind === 'step' ? .018 : .045, now + index * .08); gain.gain.exponentialRampToValueAtTime(.0001, now + index * .08 + duration); oscillator.connect(gain).connect(ctx.destination); oscillator.start(now + index * .08); oscillator.stop(now + index * .08 + duration); });
  } catch {}
}

async function getIceServers() {
  if (iceServers) return iceServers;
  try { const response = await fetch('/api/ice'); const data = await response.json(); iceServers = data.iceServers || []; }
  catch { iceServers = [{ urls:'stun:stun.cloudflare.com:3478' }]; }
  return iceServers;
}
async function startVoice() {
  if (!navigator.mediaDevices?.getUserMedia) return toast('Sesli masa desteklenmiyor', 'Tarayıcını güncelleyip HTTPS bağlantısı kullan.');
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:1 }, video:false });
    await getIceServers(); E.voiceBtn.classList.add('hidden'); E.muteBtn.classList.remove('hidden');
    E.voiceStatus.classList.add('live'); E.voiceStatus.innerHTML = '<i></i> Sesli masadasın'; socket.emit('voice-ready', {}, response => { if (!response?.ok) toast('Ses bağlantısı kurulamadı', response?.error); });
  } catch { toast('Mikrofon açılamadı', 'Tarayıcı ayarlarından mikrofon iznini kontrol et.'); }
}
E.voiceBtn.addEventListener('click', startVoice);
E.muteBtn.addEventListener('click', () => {
  if (!localStream) return; micMuted = !micMuted; localStream.getAudioTracks().forEach(track => { track.enabled = !micMuted; });
  E.muteBtn.textContent = micMuted ? '🎙️' : '🔇'; E.muteBtn.title = micMuted ? 'Mikrofonu aç' : 'Mikrofonu kapat';
  E.voiceStatus.innerHTML = micMuted ? '<i></i> Mikrofon kapalı' : '<i></i> Sesli masadasın';
});
async function makePeer(id) {
  if (peers.has(id)) return peers.get(id);
  const pc = new RTCPeerConnection({ iceServers:await getIceServers() });
  localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));
  pc.onicecandidate = event => { if (event.candidate) socket.emit('webrtc-ice', { to:id, candidate:event.candidate }); };
  pc.ontrack = event => {
    let audio = document.getElementById(`voice-${id}`); if (!audio) { audio = document.createElement('audio'); audio.id = `voice-${id}`; audio.autoplay = true; audio.playsInline = true; document.body.appendChild(audio); }
    audio.srcObject = event.streams[0]; audio.play().catch(() => toast('Sesi başlatmak için ekrana dokun', ownerName(id)));
  };
  pc.onconnectionstatechange = () => { if (['failed','closed'].includes(pc.connectionState)) closePeer(id); };
  peers.set(id, pc); return pc;
}
function closePeer(id) { peers.get(id)?.close(); peers.delete(id); pendingCandidates.delete(id); document.getElementById(`voice-${id}`)?.remove(); }
async function addPendingIce(id, pc) { const list = pendingCandidates.get(id) || []; for (const candidate of list) { try { await pc.addIceCandidate(candidate); } catch {} } pendingCandidates.delete(id); }
socket.on('voice-peers', async ids => {
  for (const id of ids) { const pc = await makePeer(id); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); socket.emit('webrtc-offer', { to:id, sdp:pc.localDescription }); }
});
socket.on('webrtc-offer', async ({ from, sdp }) => {
  const pc = await makePeer(from); await pc.setRemoteDescription(sdp); await addPendingIce(from, pc); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); socket.emit('webrtc-answer', { to:from, sdp:pc.localDescription });
});
socket.on('webrtc-answer', async ({ from, sdp }) => { const pc = peers.get(from); if (pc) { await pc.setRemoteDescription(sdp); await addPendingIce(from, pc); } });
socket.on('webrtc-ice', async ({ from, candidate }) => {
  const pc = await makePeer(from); if (pc.remoteDescription) { try { await pc.addIceCandidate(candidate); } catch {} } else { const list = pendingCandidates.get(from) || []; list.push(candidate); pendingCandidates.set(from, list); }
});
socket.on('voice-left', closePeer);
socket.on('voice-status', ids => { if (!localStream) return; E.voiceStatus.innerHTML = `<i></i> Sesli masa · ${ids.length}`; });

createDieFace(E.die1); createDieFace(E.die2); setDie(E.die1, 1); setDie(E.die2, 1);
