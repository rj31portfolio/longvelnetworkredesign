const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream' });
    res.end(error ? 'Not found' : data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(8087, '127.0.0.1', resolve));
  let ws;
  try {
    const pages = await (await fetch('http://127.0.0.1:9337/json')).json();
    ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const pending = new Map(), errors = [];
    let id = 0, currentPage = '';
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = pending.get(message.id); pending.delete(message.id);
        message.error ? request.reject(message.error) : request.resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') errors.push({ file: currentPage, error: message.params.exceptionDetails.exception?.description });
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async expression => {
      const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
      return response.result.value;
    };
    await send('Page.enable'); await send('Runtime.enable');
    const results = [];
    const files = process.argv.length > 2 ? process.argv.slice(2) : JSON.parse(fs.readFileSync(path.join(__dirname, 'reference-pages-before.json'), 'utf8')).map(x=>x.file).concat(['index.html','about.html']);
    for (const file of files) {
      for (const width of (['product.html','product-detail.html'].includes(file) ? [1440,768,390,320] : [1440,390])) {
        currentPage = file;
        await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
        await send('Page.navigate', { url: 'http://127.0.0.1:8087/' + file });
        await delay(650);
        await evaluate("new Promise(resolve=>{const start=Date.now();const check=()=>{if(document.readyState==='complete'||Date.now()-start>12000)resolve();else setTimeout(check,100)};check()})");
        await evaluate("document.querySelectorAll('img').forEach(x=>x.loading='eager');Promise.race([Promise.all([...document.images].map(x=>x.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,5000))])");
        const result = { file, width, ...await evaluate(`({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          overflowElements: [...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.left < -2 || r.right>innerWidth+2)&&!e.closest('.swiper-wrapper')}).slice(0,5).map(e=>e.tagName+'.'+e.className),
          brokenImages: [...document.images].filter(x=>!x.naturalWidth&&x.getAttribute('src')?.startsWith('img/')).map(x=>x.getAttribute('src')),
          header: getComputedStyle(document.querySelector('#header')).backgroundColor,
          footer: getComputedStyle(document.querySelector('#footer')).backgroundColor,
          imageStageWidth: document.querySelector('.product-media')?.getBoundingClientRect().width,
          imageStyles: (()=>{const img=document.querySelector('.product-media img');if(!img)return null;const c=getComputedStyle(img);return {width:c.width,height:c.height,fit:c.objectFit}})(),
          slides: (()=>{const t=document.querySelector('.fleet-swiper .swiper-wrapper'),s=t?.querySelector('.swiper-slide');if(!s)return null;return {track:t.getBoundingClientRect().width,slide:s.getBoundingClientRect().width,basis:getComputedStyle(s).flexBasis,card:s.querySelector('.card').getBoundingClientRect().width}})(),
          productPreview: (()=>{const t=document.querySelector('[data-product-preview]');if(!t)return null;t.click();const d=document.querySelector('.product-image-dialog');const ok=d.open&&d.querySelector('img').src===t.querySelector('img').src;d.querySelector('button').click();return ok&&!d.open})(),
          form: (()=>{const f=document.querySelector('form');return f?{action:f.getAttribute('action'),method:f.method,fields:[...f.querySelectorAll('input,textarea')].map(x=>x.name)}:null})()
        })`) };
        if (width < 992 && !['index.html','about.html'].includes(file)) result.mobileMenu = await evaluate("(()=>{const t=document.querySelector('.menu-toggle');t.click();const n=document.querySelector('.nav-content');const ok=t.getAttribute('aria-expanded')==='true'&&getComputedStyle(n).display==='flex';document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));t.blur();return ok&&t.getAttribute('aria-expanded')==='false'})()");
        if (file === 'portfolio.html') result.profileTabs = await evaluate("(()=>{const t=document.querySelectorAll('.tab-btn')[1];if(!t)return null;t.click();return document.getElementById(t.dataset.tab).classList.contains('active')})()");
        if (file === 'product-detail.html') {
          await evaluate("document.querySelector('.fleet-swiper .swiper-button-next').click()"); await delay(450);
          result.carousel = await evaluate("document.querySelector('.fleet-swiper .swiper-wrapper').scrollLeft>0");
        }
        await evaluate("document.activeElement.blur();scrollTo(0,0)");
        await delay(100);
        results.push(result); console.log(JSON.stringify(result));
        if (['product.html','product-detail.html','contact.html','blog.html','privacy-policy.html','portfolio.html','about-us.html','Refurbished-Firewall-Rental-Services.html'].includes(file) && [1440,390].includes(width)) {
          const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: width===1440?1900:2200, scale: 1 } });
          fs.writeFileSync(path.join(__dirname, `matched-${file.replace('.html','')}-${width}.png`), Buffer.from(shot.data, 'base64'));
        }
        if(file==='index.html') {
          const y=await evaluate("document.querySelector('#product-sec').getBoundingClientRect().top+scrollY");
          const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y,width,height:1100,scale:1}});
          fs.writeFileSync(path.join(__dirname,`matched-home-products-${width}.png`),Buffer.from(shot.data,'base64'));
        }
        if(file==='product.html') {
          const y=await evaluate("document.querySelector('#footer').getBoundingClientRect().top+scrollY");
          const height=await evaluate("document.querySelector('#footer').offsetHeight");
          const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y,width,height,scale:1}});
          fs.writeFileSync(path.join(__dirname,`matched-footer-${width}.png`),Buffer.from(shot.data,'base64'));
        }
      }
    }
    fs.writeFileSync(path.join(__dirname, process.argv.length>2?'reference-pages-followup.json':'reference-pages-results.json'), JSON.stringify({ results, errors }, null, 2));
    console.log(JSON.stringify({ errors }));
    if (errors.length || results.some(r => r.overflow || r.brokenImages.length || r.productPreview === false || r.mobileMenu === false || r.profileTabs === false || r.carousel === false)) process.exitCode = 1;
  } finally { ws?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
