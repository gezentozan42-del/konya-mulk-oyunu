const fs=require('fs');
const path=require('path');

function patchFile(file,replacements){
  let s=fs.readFileSync(file,'utf8');
  let changed=false;
  for(const [from,to] of replacements){
    if(s.includes(from)){s=s.replaceAll(from,to);changed=true;}
  }
  if(changed)fs.writeFileSync(file,s);
  return changed;
}

const root=__dirname;
const server=path.join(root,'server.js');
const index=path.join(root,'public','index.html');

patchFile(server,[
  ['{type:"start",name:"Alaaddin Meydanı",text:"Geçince +₺200"}','{type:"start",name:"Konya\'ya Hoşgeldin",text:"Üzerinden geçince +₺200"}'],
  ['{type:"jail",name:"Trafik Bekleme",text:"Ziyaret / Bekleme"}','{type:"jail",name:"Hapis",text:"Hapis Ziyareti"}'],
  ['{type:"gotojail",name:"Seher\'in Kestirmesi",text:"Trafik Bekleme\'ye git"}','{type:"gotojail",name:"Kekolarla kavga ettin, hapse git",text:"Doğrudan Hapis karesine git"}'],
  ['Alaaddin Meydanı\'na dön.','Konya\'ya Hoşgeldin karesine dön.'],
  ['Trafik yoğunlaştı. Bekleme alanına git.','Polis çevirdi. Hapse git.'],
  ['başlangıçtan geçti, ₺200 aldı.','Konya\'ya Hoşgeldin karesinden geçti, ₺200 aldı.'],
  ['Trafik Bekleme alanına gönderildi.','Hapse gönderildi.'],
  ['çift atarak beklemeden çıktı.','çift atarak hapisten çıktı.'],
  ['beklemeden çıkış','hapisten çıkış'],
  ['beklemede ${p.jailTurns}. tur.','hapiste ${p.jailTurns}. tur.'],
  ['₺50 ödeyip beklemeden çıktı.','₺50 ödeyip hapisten çıktı.']
]);

let html=fs.readFileSync(index,'utf8');
const css='<link rel="stylesheet" href="/enhancements.css?v=3">';
const js='<script src="/enhancements.js?v=3"></script>';
html=html.replace(/<link rel="stylesheet" href="\/enhancements\.css(?:\?v=\d+)?">\s*/g,'');
html=html.replace(/<script src="\/enhancements\.js(?:\?v=\d+)?"><\/script>\s*/g,'');
html=html.replace('</head>',`${css}\n</head>`);
html=html.replace('</body>',`${js}\n</body>`);
html=html.replaceAll('Trafik beklemesindesin','Hapistesin');
html=html.replaceAll('Trafik bekleme (${p.jailTurns}/3)','Hapis (${p.jailTurns}/3)');
fs.writeFileSync(index,html);
console.log('Konya Mülk Oyunu v3 düzeltmeleri uygulandı.');
