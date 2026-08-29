const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "rooms.json");

const BOARD = [
  {type:"start",name:"Alaaddin Meydanı",text:"Geçince +₺200"},
  {type:"property",name:"Bosna Hersek",price:120,build:50,group:"Selçuklu I",rents:[12,50,150,450,625,750]},
  {type:"chest",name:"Merve'nin Sandığı"},
  {type:"property",name:"Yazır",price:140,build:50,group:"Selçuklu I",rents:[14,60,180,500,700,900]},
  {type:"tax",name:"Konya Vergisi",amount:100},
  {type:"station",name:"Tramvay Garı",price:200},
  {type:"property",name:"Sille",price:160,build:100,group:"Selçuklu II",rents:[16,70,200,550,750,950]},
  {type:"chance",name:"Ahmet'in Şansı"},
  {type:"property",name:"Parsana",price:160,build:100,group:"Selçuklu II",rents:[16,70,200,550,750,950]},
  {type:"property",name:"Akademi",price:180,build:100,group:"Selçuklu II",rents:[18,80,220,600,800,1000]},
  {type:"jail",name:"Trafik Bekleme",text:"Ziyaret / Bekleme"},
  {type:"property",name:"Akyokuş",price:200,build:100,group:"Meram I",rents:[20,90,250,700,875,1050]},
  {type:"utility",name:"Konya Su İdaresi",price:150},
  {type:"property",name:"Havzan",price:200,build:100,group:"Meram I",rents:[20,90,250,700,875,1050]},
  {type:"property",name:"Meram Yeni Yol",price:220,build:100,group:"Meram I",rents:[22,100,300,750,925,1100]},
  {type:"station",name:"YHT Garı",price:200},
  {type:"property",name:"Fetih",price:240,build:150,group:"Karatay I",rents:[24,110,330,800,975,1150]},
  {type:"chest",name:"Tuğba'nın Sandığı"},
  {type:"property",name:"Akabe",price:240,build:150,group:"Karatay I",rents:[24,110,330,800,975,1150]},
  {type:"property",name:"Şems",price:260,build:150,group:"Karatay I",rents:[26,120,360,850,1025,1200]},
  {type:"free",name:"Seher'in Çay Bahçesi",text:"Ortadaki kasayı al"},
  {type:"property",name:"Nalçacı",price:280,build:150,group:"Merkez I",rents:[28,130,390,900,1100,1275]},
  {type:"chance",name:"Murat'ın Şansı"},
  {type:"property",name:"Nişantaş",price:280,build:150,group:"Merkez I",rents:[28,130,390,900,1100,1275]},
  {type:"property",name:"Kule Site Çevresi",price:300,build:150,group:"Merkez I",rents:[30,140,420,950,1150,1325]},
  {type:"station",name:"Konya Otogarı",price:200},
  {type:"property",name:"Karatay Yeni Mahalle",price:320,build:200,group:"Karatay II",rents:[32,150,450,1000,1200,1400]},
  {type:"property",name:"Mengene",price:320,build:200,group:"Karatay II",rents:[32,150,450,1000,1200,1400]},
  {type:"utility",name:"MEDAŞ",price:150},
  {type:"property",name:"Erenler",price:340,build:200,group:"Karatay II",rents:[34,160,480,1050,1250,1450]},
  {type:"gotojail",name:"Seher'in Kestirmesi",text:"Trafik Bekleme'ye git"},
  {type:"property",name:"Zafer",price:350,build:200,group:"Merkez II",rents:[35,175,500,1100,1300,1500]},
  {type:"property",name:"Ferhuniye",price:350,build:200,group:"Merkez II",rents:[35,175,500,1100,1300,1500]},
  {type:"chest",name:"Merve'nin Sandığı"},
  {type:"property",name:"Kültürpark",price:370,build:200,group:"Merkez II",rents:[37,185,525,1150,1350,1550]},
  {type:"station",name:"Konya Havaalanı",price:200},
  {type:"chance",name:"Konya Şansı"},
  {type:"property",name:"Ardıçlı",price:400,build:250,group:"Prestij",rents:[40,200,600,1400,1700,2000]},
  {type:"tax",name:"Büyükşehir Payı",amount:150},
  {type:"property",name:"Meram Bağları",price:450,build:250,group:"Prestij",rents:[45,225,650,1500,1800,2200]}
];

const CHANCE = [
  {text:"Ahmet herkese çay söyledi. Kasadan ₺120 al.",kind:"cash",value:120},
  {text:"Murat kestirmeyi buldu. 3 kare ilerle.",kind:"move",value:3},
  {text:"Seher uğurlu gününde. ₺150 al.",kind:"cash",value:150},
  {text:"Tuğba pazarlığı kazandı. ₺100 al.",kind:"cash",value:100},
  {text:"Etli ekmek hesabı sana kaldı. ₺80 öde.",kind:"cash",value:-80},
  {text:"Alaaddin'e dön. Başlangıç parasını al.",kind:"moveTo",value:0,collect:true},
  {text:"YHT Garı'na git.",kind:"moveTo",value:15,collect:true},
  {text:"Trafik yoğunlaştı. Bekleme alanına git.",kind:"jail"}
];

const CHEST = [
  {text:"Merve tatlı getirdi. ₺100 al.",kind:"cash",value:100},
  {text:"Tuğba doğum günü kasası: Her oyuncudan ₺30 al.",kind:"collectEach",value:30},
  {text:"Ahmet'in hesap makinesi şaşmadı. ₺75 al.",kind:"cash",value:75},
  {text:"Murat otopark cezasını gördü. ₺50 öde.",kind:"cash",value:-50},
  {text:"Seher çayı demledi. ₺60 al.",kind:"cash",value:60},
  {text:"Ev bakım masrafı: Her bina seviyesi için ₺25 öde.",kind:"repairs",value:25},
  {text:"Alaaddin Meydanı'na dön.",kind:"moveTo",value:0,collect:true},
  {text:"Arkadaş grubu seni kurtardı. ₺100 al.",kind:"cash",value:100}
];

const rooms = new Map();
let saveTimer = null;

function randId(prefix="p") { return prefix + "_" + crypto.randomBytes(7).toString("hex"); }
function makeToken() { return crypto.randomBytes(24).toString("hex"); }
function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c="";
  for(let i=0;i<5;i++) c += chars[Math.floor(Math.random()*chars.length)];
  return rooms.has(c) ? makeRoomCode() : c;
}
function cleanName(v){ return String(v||"").trim().slice(0,18) || "Oyuncu"; }
function log(room,msg){
  room.log.push({t:Date.now(),msg});
  if(room.log.length>120) room.log.shift();
}
function activePlayers(room){ return room.players.filter(p=>!p.bankrupt); }
function playerById(room,id){ return room.players.find(p=>p.id===id); }
function assetAt(room,idx){ return room.assets[String(idx)] || null; }
function isBuyable(tile){ return ["property","station","utility"].includes(tile?.type); }

function safeRoom(room){
  return {
    code:room.code, hostPlayerId:room.hostPlayerId, started:room.started,
    turnIndex:room.turnIndex, turnPlayerId:room.players[room.turnIndex]?.id || null,
    lastRoll:room.lastRoll, extraTurn:room.extraTurn, freeParkingPot:room.freeParkingPot,
    winnerId:room.winnerId || null, board:BOARD, assets:room.assets, auction:room.auction,
    pendingTrades:room.pendingTrades, log:room.log, chat:room.chat,
    players:room.players.map(p=>({
      id:p.id,name:p.name,money:p.money,pos:p.pos,color:p.color,connected:!!p.connected,
      bankrupt:!!p.bankrupt,inJail:!!p.inJail,jailTurns:p.jailTurns||0,doublesStreak:p.doublesStreak||0
    }))
  };
}
function emitState(room){ io.to(room.code).emit("state",safeRoom(room)); }
function persistSoon(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{
      fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});
      const data=[...rooms.values()].map(r=>({
        ...r,
        voiceReady:undefined,
        players:r.players.map(p=>({...p,connected:false,socketId:null}))
      }));
      fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2));
    }catch(e){ console.error("save:",e.message); }
  },150);
}
function changed(room){ emitState(room); persistSoon(); }

function loadRooms(){
  try{
    if(!fs.existsSync(DATA_FILE)) return;
    const data=JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
    for(const raw of data){
      raw.voiceReady=new Set();
      raw.auction=null;
      raw.pendingTrades=[];
      raw.players=(raw.players||[]).map(p=>({...p,connected:false,socketId:null}));
      raw.chat=raw.chat||[];
      raw.log=raw.log||[];
      raw.assets=raw.assets||{};
      raw.freeParkingPot=raw.freeParkingPot||0;
      rooms.set(raw.code,raw);
    }
    console.log(`Restored ${rooms.size} room(s)`);
  }catch(e){ console.error("load:",e.message); }
}
loadRooms();

function groupIndexes(group){
  return BOARD.map((t,i)=>t.group===group?i:-1).filter(i=>i>=0);
}
function ownsGroup(room,playerId,group){
  const idxs=groupIndexes(group);
  return idxs.length>0 && idxs.every(i=>assetAt(room,i)?.ownerId===playerId);
}
function buildingCount(room,playerId){
  return Object.values(room.assets).filter(a=>a.ownerId===playerId).reduce((n,a)=>n+(a.level||0),0);
}
function stationCount(room,playerId){
  return Object.entries(room.assets).filter(([i,a])=>a.ownerId===playerId && BOARD[Number(i)]?.type==="station" && !a.mortgaged).length;
}
function utilityCount(room,playerId){
  return Object.entries(room.assets).filter(([i,a])=>a.ownerId===playerId && BOARD[Number(i)]?.type==="utility" && !a.mortgaged).length;
}
function rentFor(room,idx,diceTotal){
  const tile=BOARD[idx], a=assetAt(room,idx);
  if(!a || a.mortgaged) return 0;
  if(tile.type==="station") return 25 * Math.pow(2,Math.max(0,stationCount(room,a.ownerId)-1));
  if(tile.type==="utility") return (utilityCount(room,a.ownerId)>=2?10:4) * Math.max(1,diceTotal||7);
  if(tile.type==="property"){
    if((a.level||0)>0) return tile.rents[Math.min(5,a.level)];
    return tile.rents[0] * (ownsGroup(room,a.ownerId,tile.group)?2:1);
  }
  return 0;
}
function charge(room,p,amount,toId,label){
  amount=Math.max(0,Math.round(amount));
  if(!amount) return;
  p.money -= amount;
  if(toId){
    const other=playerById(room,toId);
    if(other && !other.bankrupt) other.money += amount;
  }else{
    room.freeParkingPot += amount;
  }
  log(room,`${p.name} ${label} için ₺${amount} ödedi.`);
}
function goJail(room,p){
  p.pos=10;p.inJail=true;p.jailTurns=0;p.doublesStreak=0;room.extraTurn=false;
  log(room,`${p.name} Trafik Bekleme alanına gönderildi.`);
}
function moveTo(room,p,target,collect=true){
  const old=p.pos;
  if(collect && target<old){ p.money+=200; log(room,`${p.name} başlangıçtan geçti, ₺200 aldı.`); }
  p.pos=target;
}
function moveBy(room,p,steps){
  const old=p.pos;
  let next=(p.pos+steps)%BOARD.length;
  if(next<0) next+=BOARD.length;
  if(steps>0 && next<old){ p.money+=200; log(room,`${p.name} başlangıçtan geçti, ₺200 aldı.`); }
  p.pos=next;
}
function applyCard(room,p,card,diceTotal){
  log(room,`${p.name}: ${card.text}`);
  if(card.kind==="cash"){
    if(card.value>=0) p.money += card.value;
    else charge(room,p,-card.value,null,"kart");
  }else if(card.kind==="move"){
    moveBy(room,p,card.value); land(room,p,diceTotal);
  }else if(card.kind==="moveTo"){
    moveTo(room,p,card.value,card.collect!==false); land(room,p,diceTotal);
  }else if(card.kind==="jail"){
    goJail(room,p);
  }else if(card.kind==="collectEach"){
    for(const o of room.players){
      if(o.id!==p.id && !o.bankrupt){ o.money-=card.value; p.money+=card.value; }
    }
  }else if(card.kind==="repairs"){
    const n=buildingCount(room,p.id), cost=n*card.value;
    if(cost) charge(room,p,cost,null,"bakım");
  }
}
function land(room,p,diceTotal){
  const tile=BOARD[p.pos];
  if(!tile) return;
  if(isBuyable(tile)){
    const a=assetAt(room,p.pos);
    if(!a){
      log(room,`${p.name}, ${tile.name} üzerine geldi. Satın alabilir veya açık artırmaya çıkarabilir.`);
    }else if(a.ownerId!==p.id && !a.mortgaged){
      const owner=playerById(room,a.ownerId), rent=rentFor(room,p.pos,diceTotal);
      if(owner && !owner.bankrupt && rent>0) charge(room,p,rent,owner.id,`${tile.name} kirası`);
    }
  }else if(tile.type==="tax"){
    charge(room,p,tile.amount,null,tile.name);
  }else if(tile.type==="chance"){
    applyCard(room,p,CHANCE[Math.floor(Math.random()*CHANCE.length)],diceTotal);
  }else if(tile.type==="chest"){
    applyCard(room,p,CHEST[Math.floor(Math.random()*CHEST.length)],diceTotal);
  }else if(tile.type==="gotojail"){
    goJail(room,p);
  }else if(tile.type==="free"){
    if(room.freeParkingPot>0){
      const n=room.freeParkingPot; p.money+=n; room.freeParkingPot=0;
      log(room,`${p.name}, çay bahçesi kasasından ₺${n} aldı.`);
    }else log(room,`${p.name} Seher'in Çay Bahçesi'nde dinleniyor.`);
  }
}
function current(room){ return room.players[room.turnIndex] || null; }
function advance(room){
  if(!room.players.length) return;
  let tries=0;
  do{ room.turnIndex=(room.turnIndex+1)%room.players.length; tries++; }
  while(current(room)?.bankrupt && tries<=room.players.length);
  room.lastRoll=null; room.extraTurn=false;
  const p=current(room); if(p) log(room,`Sıra ${p.name}.`);
}
function checkWinner(room){
  if(!room.started) return;
  const a=activePlayers(room);
  if(a.length===1){
    room.winnerId=a[0].id;
    room.started=false;
    log(room,`🏆 ${a[0].name} Konya'nın emlak kralı/kraliçesi oldu!`);
  }
}
function startAuction(room,idx){
  if(room.auction || !isBuyable(BOARD[idx]) || assetAt(room,idx)) return false;
  room.auction={tileIndex:idx,highestBid:0,highestBidderId:null,passed:[]};
  log(room,`${BOARD[idx].name} açık artırmaya çıktı.`);
  return true;
}
function finishAuctionIfReady(room){
  const a=room.auction; if(!a) return false;
  const eligible=activePlayers(room).map(p=>p.id);
  const canStillBid=eligible.filter(id=>!a.passed.includes(id) && id!==a.highestBidderId);
  if(a.highestBidderId && canStillBid.length===0){
    const w=playerById(room,a.highestBidderId);
    if(w && w.money>=a.highestBid){
      w.money-=a.highestBid;
      room.assets[String(a.tileIndex)]={ownerId:w.id,level:0,mortgaged:false};
      log(room,`${w.name}, ${BOARD[a.tileIndex].name} ihalesini ₺${a.highestBid} ile kazandı.`);
    }
    room.auction=null; return true;
  }
  if(!a.highestBidderId && eligible.every(id=>a.passed.includes(id))){
    log(room,`Açık artırmada teklif gelmedi.`);
    room.auction=null; return true;
  }
  return false;
}
function tradableAsset(room,ownerId,idx){
  const a=assetAt(room,idx), tile=BOARD[idx];
  if(!a || a.ownerId!==ownerId || !isBuyable(tile)) return false;
  if(tile.group){
    const hasBuildings=groupIndexes(tile.group).some(i=>(assetAt(room,i)?.level||0)>0);
    if(hasBuildings) return false;
  }
  return true;
}

io.on("connection",socket=>{
  socket.on("create-room",({name},cb)=>{
    const code=makeRoomCode(), token=makeToken();
    const p={id:randId(),resumeToken:token,socketId:socket.id,name:cleanName(name),money:1500,pos:0,color:0,connected:true,bankrupt:false,inJail:false,jailTurns:0,doublesStreak:0};
    const room={code,hostPlayerId:p.id,players:[p],assets:{},started:false,turnIndex:0,lastRoll:null,extraTurn:false,freeParkingPot:0,winnerId:null,auction:null,pendingTrades:[],log:[],chat:[],voiceReady:new Set()};
    rooms.set(code,room); socket.join(code); socket.data={roomCode:code,playerId:p.id};
    log(room,`${p.name} özel odayı kurdu.`); changed(room);
    cb?.({ok:true,code,playerId:p.id,resumeToken:token});
  });

  socket.on("join-room",({code,name},cb)=>{
    code=String(code||"").trim().toUpperCase();
    const room=rooms.get(code);
    if(!room) return cb?.({ok:false,error:"Oda bulunamadı."});
    if(room.started) return cb?.({ok:false,error:"Oyun başladı. Eski oyuncuysan aynı cihazdan yeniden bağlanabilirsin."});
    if(room.players.length>=5) return cb?.({ok:false,error:"Oda dolu (en fazla 5 oyuncu)."});
    const token=makeToken();
    const p={id:randId(),resumeToken:token,socketId:socket.id,name:cleanName(name),money:1500,pos:0,color:room.players.length,connected:true,bankrupt:false,inJail:false,jailTurns:0,doublesStreak:0};
    room.players.push(p); socket.join(code); socket.data={roomCode:code,playerId:p.id};
    log(room,`${p.name} odaya katıldı.`); changed(room);
    cb?.({ok:true,code,playerId:p.id,resumeToken:token});
  });

  socket.on("resume-room",({code,resumeToken},cb)=>{
    code=String(code||"").trim().toUpperCase();
    const room=rooms.get(code); if(!room) return cb?.({ok:false,error:"Oda artık mevcut değil."});
    const p=room.players.find(x=>x.resumeToken===resumeToken);
    if(!p) return cb?.({ok:false,error:"Bu cihaz için kayıtlı oyuncu bulunamadı."});
    p.socketId=socket.id;p.connected=true;
    socket.join(code);socket.data={roomCode:code,playerId:p.id};
    log(room,`${p.name} yeniden bağlandı.`); changed(room);
    cb?.({ok:true,code,playerId:p.id,name:p.name});
  });

  socket.on("start-game",()=>{
    const room=rooms.get(socket.data.roomCode);
    if(!room || room.hostPlayerId!==socket.data.playerId || room.started || room.players.length<2) return;
    room.started=true;room.winnerId=null;room.turnIndex=0;room.lastRoll=null;room.extraTurn=false;
    log(room,`Oyun başladı. İlk sıra ${current(room).name}.`);changed(room);
  });

  socket.on("roll",()=>{
    const room=rooms.get(socket.data.roomCode), p=room&&current(room);
    if(!room||!room.started||room.auction||!p||p.id!==socket.data.playerId||room.lastRoll) return;
    const d1=1+Math.floor(Math.random()*6),d2=1+Math.floor(Math.random()*6),sum=d1+d2,doubles=d1===d2;
    room.lastRoll=[d1,d2];room.extraTurn=false;

    if(p.inJail){
      if(doubles){
        p.inJail=false;p.jailTurns=0;log(room,`${p.name} çift atarak beklemeden çıktı.`);
        moveBy(room,p,sum);land(room,p,sum);
      }else{
        p.jailTurns=(p.jailTurns||0)+1;
        log(room,`${p.name} ${d1}+${d2} attı; beklemede ${p.jailTurns}. tur.`);
        if(p.jailTurns>=3){
          charge(room,p,50,null,"beklemeden çıkış");
          p.inJail=false;p.jailTurns=0;moveBy(room,p,sum);land(room,p,sum);
        }
      }
    }else{
      p.doublesStreak=doubles?(p.doublesStreak||0)+1:0;
      if(p.doublesStreak>=3){
        room.lastRoll=[d1,d2];goJail(room,p);
      }else{
        moveBy(room,p,sum);
        log(room,`${p.name} ${d1}+${d2}=${sum} attı ve ${BOARD[p.pos].name} karesine geldi.`);
        land(room,p,sum);
        room.extraTurn=doubles && !p.inJail;
        if(room.extraTurn) log(room,`${p.name} çift attı; tur sonunda bir kez daha zar atabilir.`);
      }
    }
    changed(room);
  });

  socket.on("pay-jail",()=>{
    const room=rooms.get(socket.data.roomCode),p=room&&current(room);
    if(!room||!room.started||!p||p.id!==socket.data.playerId||!p.inJail||room.lastRoll||p.money<50) return;
    charge(room,p,50,null,"beklemeden çıkış");p.inJail=false;p.jailTurns=0;
    log(room,`${p.name} ₺50 ödeyip beklemeden çıktı.`);changed(room);
  });

  socket.on("buy",()=>{
    const room=rooms.get(socket.data.roomCode),p=room&&current(room);
    if(!room||!p||p.id!==socket.data.playerId||!room.lastRoll||room.auction) return;
    const idx=p.pos,t=BOARD[idx];
    if(!isBuyable(t)||assetAt(room,idx)||p.money<t.price) return;
    p.money-=t.price;room.assets[String(idx)]={ownerId:p.id,level:0,mortgaged:false};
    log(room,`${p.name}, ${t.name} bölgesini ₺${t.price} karşılığında aldı.`);changed(room);
  });

  socket.on("auction-start",()=>{
    const room=rooms.get(socket.data.roomCode),p=room&&current(room);
    if(!room||!p||p.id!==socket.data.playerId||!room.lastRoll) return;
    if(startAuction(room,p.pos)) changed(room);
  });

  socket.on("auction-bid",({amount})=>{
    const room=rooms.get(socket.data.roomCode),p=room&&playerById(room,socket.data.playerId),a=room?.auction;
    amount=Math.floor(Number(amount));
    if(!room||!p||p.bankrupt||!a||a.passed.includes(p.id)||!Number.isFinite(amount)||amount<a.highestBid+10||amount>p.money) return;
    a.highestBid=amount;a.highestBidderId=p.id;
    log(room,`${p.name} açık artırmada ₺${amount} teklif verdi.`);
    finishAuctionIfReady(room);changed(room);
  });

  socket.on("auction-pass",()=>{
    const room=rooms.get(socket.data.roomCode),p=room&&playerById(room,socket.data.playerId),a=room?.auction;
    if(!room||!p||!a||a.passed.includes(p.id)) return;
    a.passed.push(p.id);log(room,`${p.name} ihaleden çekildi.`);
    finishAuctionIfReady(room);changed(room);
  });

  socket.on("end-turn",()=>{
    const room=rooms.get(socket.data.roomCode),p=room&&current(room);
    if(!room||!room.started||room.auction||!p||p.id!==socket.data.playerId||!room.lastRoll) return;
    const t=BOARD[p.pos];
    if(isBuyable(t)&&!assetAt(room,p.pos)){
      startAuction(room,p.pos);changed(room);return;
    }
    if(room.extraTurn && !p.bankrupt){
      room.lastRoll=null;room.extraTurn=false;
      log(room,`${p.name} çift nedeniyle tekrar zar atacak.`);
    }else advance(room);
    checkWinner(room);changed(room);
  });

  socket.on("build",({index})=>{
    const room=rooms.get(socket.data.roomCode),p=room&&playerById(room,socket.data.playerId);
    index=Number(index);const t=BOARD[index],a=room&&assetAt(room,index);
    if(!room||!p||!t||t.type!=="property"||!a||a.ownerId!==p.id||a.mortgaged||a.level>=5||!ownsGroup(room,p.id,t.group)||p.money<t.build) return;
    const idxs=groupIndexes(t.group),assets=idxs.map(i=>assetAt(room,i));
    if(assets.some(x=>x?.mortgaged)) return;
    const min=Math.min(...assets.map(x=>x?.level||0));
    if((a.level||0)>min) return;
    p.money-=t.build;a.level=(a.level||0)+1;
    log(room,`${p.name}, ${t.name} üzerine ${a.level===5?"otel":"ev"} yaptı (₺${t.build}).`);changed(room);
  });

  socket.on("sell-building",({index})=>{
    const room=rooms.get(socket.data.roomCode),p=room&&playerById(room,socket.data.playerId);
    index=Number(index);const t=BOARD[index],a=room&&assetAt(room,index);
    if(!room||!p||!t||t.type!=="property"||!a||a.ownerId!==p.id||(a.level||0)<=0) return;
    const idxs=groupIndexes(t.group),max=Math.max(...idxs.map(i=>assetAt(room,i)?.level||0));
    if(a.level!==max) return;
    const old=a.level;a.level--;p.money+=Math.floor(t.build/2);
    log(room,`${p.name}, ${t.name} üzerindeki ${old===5?"oteli":"bir evi"} sattı.`);changed(room);
  });

  socket.on("mortgage",({index})=>{
    const room=rooms.get(socket.data.roomCode),p=room&&playerById(room,socket.data.playerId);
    index=Number(index);const t=BOARD[index],a=room&&assetAt(room,index);
    if(!room||!p||!t||!isBuyable(t)||!a||a.ownerId!==p.id||a.mortgaged) return;
    if(t.group && groupIndexes(t.group).some(i=>(assetAt(room,i)?.level||0)>0)) return;
    a.mortgaged=true;const value=Math.floor(t.price/2);p.money+=value;
    log(room,`${p.name}, ${t.name} için ipotekten ₺${value} aldı.`);changed(room);
  });

  socket.on("unmortgage",({index})=>{
    const room=rooms.get(socket.data.roomCode),p=room&&playerById(room,socket.data.playerId);
    index=Number(index);const t=BOARD[index],a=room&&assetAt(room,index);
    if(!room||!p||!t||!a||a.ownerId!==p.id||!a.mortgaged) return;
    const cost=Math.ceil((t.price/2)*1.10);if(p.money<cost)return;
    p.money-=cost;a.mortgaged=false;log(room,`${p.name}, ${t.name} ipoteğini ₺${cost} ile kaldırdı.`);changed(room);
  });

  socket.on("trade-propose",({toId,offerCash,requestCash,offerAssets,requestAssets})=>{
    const room=rooms.get(socket.data.roomCode),from=room&&playerById(room,socket.data.playerId),to=room&&playerById(room,toId);
    offerCash=Math.max(0,Math.floor(Number(offerCash)||0));requestCash=Math.max(0,Math.floor(Number(requestCash)||0));
    offerAssets=(offerAssets||[]).map(Number);requestAssets=(requestAssets||[]).map(Number);
    if(!room||!from||!to||from.id===to.id||from.bankrupt||to.bankrupt||offerCash>from.money||requestCash>to.money) return;
    if(!offerAssets.every(i=>tradableAsset(room,from.id,i))||!requestAssets.every(i=>tradableAsset(room,to.id,i))) return;
    const tr={id:randId("tr"),fromId:from.id,toId:to.id,offerCash,requestCash,offerAssets,requestAssets,created:Date.now()};
    room.pendingTrades=room.pendingTrades.filter(x=>x.toId!==to.id);
    room.pendingTrades.push(tr);log(room,`${from.name}, ${to.name}'a takas teklifi gönderdi.`);changed(room);
  });

  socket.on("trade-respond",({tradeId,accept})=>{
    const room=rooms.get(socket.data.roomCode);if(!room)return;
    const tr=room.pendingTrades.find(x=>x.id===tradeId);
    if(!tr||tr.toId!==socket.data.playerId)return;
    const from=playerById(room,tr.fromId),to=playerById(room,tr.toId);
    if(accept&&from&&to&&from.money>=tr.offerCash&&to.money>=tr.requestCash
      &&tr.offerAssets.every(i=>tradableAsset(room,from.id,i))
      &&tr.requestAssets.every(i=>tradableAsset(room,to.id,i))){
      from.money += tr.requestCash-tr.offerCash;to.money += tr.offerCash-tr.requestCash;
      tr.offerAssets.forEach(i=>room.assets[String(i)].ownerId=to.id);
      tr.requestAssets.forEach(i=>room.assets[String(i)].ownerId=from.id);
      log(room,`${from.name} ile ${to.name} takası tamamladı.`);
    }else log(room,`${to?.name||"Oyuncu"} takas teklifini reddetti.`);
    room.pendingTrades=room.pendingTrades.filter(x=>x.id!==tradeId);changed(room);
  });

  socket.on("bankrupt",()=>{
    const room=rooms.get(socket.data.roomCode),p=room&&playerById(room,socket.data.playerId);
    if(!room||!p||p.money>=0||p.bankrupt)return;
    p.bankrupt=true;
    for(const [i,a] of Object.entries(room.assets)) if(a.ownerId===p.id) delete room.assets[i];
    room.pendingTrades=room.pendingTrades.filter(t=>t.fromId!==p.id&&t.toId!==p.id);
    log(room,`${p.name} iflas etti ve oyundan çekildi.`);
    if(current(room)?.id===p.id) advance(room);
    checkWinner(room);changed(room);
  });

  socket.on("chat",({text})=>{
    const room=rooms.get(socket.data.roomCode),p=room&&playerById(room,socket.data.playerId);
    text=String(text||"").trim().slice(0,300);
    if(!room||!p||!text)return;
    room.chat.push({id:randId("m"),playerId:p.id,name:p.name,text,t:Date.now()});
    if(room.chat.length>80)room.chat.shift();
    changed(room);
  });

  socket.on("voice-ready",()=>{
    const room=rooms.get(socket.data.roomCode);if(!room)return;
    const existing=[...room.voiceReady].filter(id=>id!==socket.id);
    room.voiceReady.add(socket.id);socket.emit("voice-peers",existing);
  });
  socket.on("webrtc-offer",({to,sdp})=>io.to(to).emit("webrtc-offer",{from:socket.id,sdp}));
  socket.on("webrtc-answer",({to,sdp})=>io.to(to).emit("webrtc-answer",{from:socket.id,sdp}));
  socket.on("webrtc-ice",({to,candidate})=>io.to(to).emit("webrtc-ice",{from:socket.id,candidate}));

  socket.on("disconnect",()=>{
    const room=rooms.get(socket.data.roomCode);if(!room)return;
    room.voiceReady.delete(socket.id);socket.to(room.code).emit("voice-left",socket.id);
    const p=playerById(room,socket.data.playerId);
    if(p&&p.socketId===socket.id){p.connected=false;p.socketId=null;log(room,`${p.name} bağlantıyı kaybetti; geri dönebilir.`);}
    if(room.auction&&p&&!room.auction.passed.includes(p.id)){room.auction.passed.push(p.id);finishAuctionIfReady(room);}
    changed(room);
  });
});

let iceCache={expires:0,data:null};
app.get("/api/ice",async(req,res)=>{
  try{
    if(iceCache.data&&Date.now()<iceCache.expires)return res.json(iceCache.data);
    const key=process.env.CF_TURN_KEY_ID,token=process.env.CF_TURN_API_TOKEN;
    if(key&&token){
      const r=await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(key)}/credentials/generate-ice-servers`,{
        method:"POST",headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({ttl:86400})
      });
      if(r.ok){
        const data=await r.json();
        if(Array.isArray(data.iceServers)){
          data.iceServers=data.iceServers.map(s=>({...s,urls:(Array.isArray(s.urls)?s.urls:[s.urls]).filter(u=>!String(u).includes(":53"))}));
          iceCache={data,expires:Date.now()+12*60*60*1000};return res.json(data);
        }
      }
    }
  }catch(e){console.error("TURN:",e.message);}
  res.json({iceServers:[{urls:["stun:stun.cloudflare.com:3478","stun:stun.l.google.com:19302"]}]});
});

server.listen(PORT,()=>console.log(`Konya Mülk Oyunu 40: http://localhost:${PORT}`));
