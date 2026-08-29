(()=>{
  if(window.__konyaFxLoaded)return; window.__konyaFxLoaded=true;
  const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
  const TYPE_ICON={property:'🏠',station:'🚉',utility:'💡',chance:'❓',chest:'🎁',tax:'💸',jail:'🚦',gotojail:'🚓',free:'☕',start:'🏁'};
  const tokens=new Map(); let prev=null,rollTimer=null,animSeq=0,audioCtx=null,isAnimating=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function beep(freq=440,dur=.05,vol=.025){
    try{
      audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.frequency.value=freq;o.type='sine';g.gain.value=vol;o.connect(g);g.connect(audioCtx.destination);o.start();
      g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur);
    }catch(e){}
  }
  function escapeFx(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function toast(title,text){
    let l=document.getElementById('fxToastLayer');
    if(!l){l=document.createElement('div');l.id='fxToastLayer';document.body.appendChild(l)}
    const d=document.createElement('div');d.className='fx-toast';
    d.innerHTML=`<strong>${escapeFx(title)}</strong><span>${escapeFx(text)}</span>`;l.appendChild(d);
    setTimeout(()=>d.classList.add('fx-out'),2600);setTimeout(()=>d.remove(),2900);
  }
  function playerById(id,s=state){return s?.players?.find(p=>p.id===id)}

  function ensureDice(){
    const old=document.getElementById('dice');if(!old)return null;
    if(!document.getElementById('fxDie1')){
      old.innerHTML='<div class="fx-dice-wrap"><div class="fx-die" id="fxDie1"></div><div class="fx-die" id="fxDie2"></div></div>';
      ['fxDie1','fxDie2'].forEach(id=>{const e=document.getElementById(id);for(let i=1;i<=9;i++){const p=document.createElement('span');p.className='fx-pip';p.dataset.i=i;e.appendChild(p)}});
    }
    return [document.getElementById('fxDie1'),document.getElementById('fxDie2')];
  }
  function face(el,n){if(!el)return;el.querySelectorAll('.fx-pip').forEach(p=>p.style.opacity='0');(PIPS[n]||[]).forEach(i=>{const p=el.querySelector(`.fx-pip[data-i="${i}"]`);if(p)p.style.opacity='1'})}
  function startRoll(){
    const ds=ensureDice();if(!ds)return;clearInterval(rollTimer);
    ds.forEach(d=>{d.classList.add('fx-rolling');d.classList.remove('fx-settle')});
    rollTimer=setInterval(()=>{face(ds[0],1+Math.floor(Math.random()*6));face(ds[1],1+Math.floor(Math.random()*6))},80);beep(160,.08,.018);
  }
  function stopRoll(vals){
    const ds=ensureDice();if(!ds)return;clearInterval(rollTimer);rollTimer=null;
    ds.forEach(d=>d.classList.remove('fx-rolling'));face(ds[0],vals?.[0]||1);face(ds[1],vals?.[1]||1);
    ds.forEach(d=>{d.classList.remove('fx-settle');void d.offsetWidth;d.classList.add('fx-settle')});beep(520,.06,.02);
  }

  function ensureLayer(){
    const b=document.getElementById('board');if(!b)return null;
    let l=document.getElementById('fxTokenLayer');
    if(!l){l=document.createElement('div');l.id='fxTokenLayer';b.appendChild(l)}
    return l;
  }
  function ensureTokens(s){
    const layer=ensureLayer();if(!layer||!s)return;
    const ids=new Set(s.players.map(p=>p.id));
    for(const [id,e]of tokens){if(!ids.has(id)){e.remove();tokens.delete(id)}}
    s.players.forEach(p=>{
      let e=tokens.get(p.id);
      if(!e){
        e=document.createElement('div');
        e.innerHTML=`<span class="fx-token-letter">${escapeFx(p.name.slice(0,1).toUpperCase())}</span><span class="fx-token-label">${escapeFx(p.name)}</span>`;
        layer.appendChild(e);tokens.set(p.id,e);
      }
      e.className=`fx-token p${p.color}${s.turnPlayerId===p.id&&s.started?' fx-active':''}`;
      e.style.display=p.bankrupt?'none':'block';
    });
  }
  function groups(players){const g={};players.filter(p=>!p.bankrupt).forEach(p=>(g[p.pos]||(g[p.pos]=[])).push(p.id));return g}
  function offsets(n){return({1:[[0,0]],2:[[-12,-10],[12,10]],3:[[0,-14],[-13,10],[13,10]],4:[[-13,-12],[13,-12],[-13,12],[13,12]],5:[[0,0],[-15,-14],[15,-14],[-15,14],[15,14]]}[n]||[[0,0]])}

  // ÖNEMLİ: Kareleri sadece .tile koleksiyonundan okuyoruz. Token katmanı ayrı bir div olduğu için
  // nth-of-type kullanmak kareleri 1 kaydırıyordu ve piyon ekranda yanlış karede görünüyordu.
  function tileEl(i){
    const tiles=[...document.querySelectorAll('#board .tile')];
    return tiles[i]||null;
  }
  function posFor(i,idx=0,count=1){
    const b=document.getElementById('board'),t=tileEl(i);if(!b||!t)return{x:20,y:20};
    const br=b.getBoundingClientRect(),r=t.getBoundingClientRect(),o=offsets(count)[idx]||[0,0];
    return{x:r.left-br.left+r.width/2+o[0],y:r.top-br.top+r.height/2+o[1]};
  }
  function place(players){
    const g=groups(players);
    players.filter(p=>!p.bankrupt).forEach(p=>{
      const list=g[p.pos]||[p.id],pt=posFor(p.pos,list.indexOf(p.id),list.length),e=tokens.get(p.id);
      if(e){e.style.left=pt.x+'px';e.style.top=pt.y+'px'}
    });
  }
  function path(a,b){
    if(a==null||b==null||a===b)return[b];
    const d=(b-a+40)%40;
    if(d>0&&d<=12)return Array.from({length:d},(_,k)=>(a+k+1)%40);
    return[b];
  }
  function lockMoveActions(on){
    ['buyBtn','auctionBtn','endBtn'].forEach(id=>{const b=document.getElementById(id);if(b)b.classList.toggle('fx-moving-lock',on)});
  }
  async function animate(oldS,newS){
    const seq=++animSeq;ensureTokens(newS);
    if(!oldS){place(newS.players);return}
    const moved=newS.players.filter(np=>{const op=oldS.players.find(p=>p.id===np.id);return op&&op.pos!==np.pos&&!np.bankrupt});
    if(!moved.length){place(newS.players);return}

    isAnimating=true;lockMoveActions(true);
    const staged=JSON.parse(JSON.stringify(newS.players));
    moved.forEach(np=>{const op=oldS.players.find(p=>p.id===np.id),sp=staged.find(p=>p.id===np.id);if(op&&sp)sp.pos=op.pos});
    place(staged);await sleep(80);

    let max=0;const paths=new Map();
    moved.forEach(np=>{const op=oldS.players.find(p=>p.id===np.id),p=path(op?.pos,np.pos);paths.set(np.id,p);max=Math.max(max,p.length)});
    for(let k=0;k<max;k++){
      if(seq!==animSeq){isAnimating=false;lockMoveActions(false);return}
      moved.forEach(np=>{const p=paths.get(np.id),sp=staged.find(x=>x.id===np.id);if(sp&&p[k]!=null)sp.pos=p[k]});
      place(staged);beep(250+k*18,.035,.012);await sleep(235);
    }
    if(seq===animSeq)place(newS.players);
    isAnimating=false;lockMoveActions(false);pulseActions();
  }

  function decorateTiles(s){
    const tiles=[...document.querySelectorAll('#board .tile')];
    tiles.forEach((t,i)=>{
      t.querySelectorAll('.fx-owner-mark,.fx-type-icon').forEach(x=>x.remove());
      t.classList.remove('fx-buyable');
      const bt=s.board?.[i],a=s.assets?.[String(i)];
      if(bt){const ic=document.createElement('span');ic.className='fx-type-icon';ic.textContent=TYPE_ICON[bt.type]||'';t.appendChild(ic)}
      if(a){const p=playerById(a.ownerId,s);if(p){const m=document.createElement('span');m.className=`fx-owner-mark p${p.color}`;m.textContent=p.name.slice(0,1).toUpperCase();m.title=`Sahibi: ${p.name}`;t.appendChild(m)}}
    });
    const me=s.players.find(p=>p.id===myPlayerId);
    if(me){
      const t=tiles[me.pos],a=s.assets?.[String(me.pos)],bt=s.board?.[me.pos];
      if(t&&s.turnPlayerId===me.id&&s.lastRoll&&bt&&['property','station','utility'].includes(bt.type)&&!a)t.classList.add('fx-buyable');
    }
  }
  function pulseActions(){
    ['rollBtn','buyBtn','auctionBtn','payJailBtn','endBtn'].forEach(id=>{
      const b=document.getElementById(id);if(b)b.classList.toggle('fx-pulse',!isAnimating&&!b.classList.contains('hidden')&&!b.disabled);
    });
  }
  async function process(s){
    ensureDice();decorateTiles(s);ensureTokens(s);
    const before=prev?JSON.parse(JSON.stringify(prev)):null;
    prev=JSON.parse(JSON.stringify(s));
    if(s.lastRoll)stopRoll(s.lastRoll);else{const ds=ensureDice();if(ds&&!rollTimer){face(ds[0],1);face(ds[1],1)}}
    await animate(before,s);pulseActions();
    const oldLen=before?.log?.length||0,newLen=s.log?.length||0;
    if(before&&newLen>oldLen){const it=s.log[newLen-1],msg=it?.msg||it;if(msg){toast('Oyun bildirimi',msg);if(/satın|aldı|kazandı|ödedi/i.test(msg))beep(650,.07,.018)}}
  }

  document.addEventListener('click',e=>{if(e.target?.id==='rollBtn')startRoll();if(e.target?.id==='buyBtn')beep(700,.08,.02)},true);
  window.addEventListener('resize',()=>state&&place(state.players));
  if(typeof socket!=='undefined')socket.on('state',s=>setTimeout(()=>process(s),0));
  const boot=setInterval(()=>{if(typeof state!=='undefined'&&state){clearInterval(boot);process(state)}},300);
})();
