const fs=require('fs');
const path=require('path');
const file=path.join(__dirname,'public','index.html');
const version='20260829-fix2';
let html=fs.readFileSync(file,'utf8');

const css=`<link rel="stylesheet" href="/enhancements.css?v=${version}">`;
const js=`<script src="/enhancements.js?v=${version}"></script>`;

if(/<link[^>]+enhancements\.css[^>]*>/i.test(html)){
  html=html.replace(/<link[^>]+enhancements\.css[^>]*>/i,css);
}else{
  html=html.replace('</head>',`${css}\n</head>`);
}

if(/<script[^>]+enhancements\.js[^>]*><\/script>/i.test(html)){
  html=html.replace(/<script[^>]+enhancements\.js[^>]*><\/script>/i,js);
}else{
  html=html.replace('</body>',`${js}\n</body>`);
}

fs.writeFileSync(file,html);
console.log(`Konya Mülk Oyunu görsel geliştirmeleri eklendi (${version}).`);
