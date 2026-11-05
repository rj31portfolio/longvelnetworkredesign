const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(error ? 'Not found' : data);
  });
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  await new Promise(resolve => server.listen(8086, '127.0.0.1', resolve));
  const browser = {kill() {}};
  let ws;
  try {
    let pages;
    for (let i = 0; i < 60; i++) {
      try { pages = await (await fetch('http://127.0.0.1:9336/json')).json(); break; } catch { await delay(250); }
    }
    if (!pages) throw Error('Chrome debugging endpoint unavailable');
    ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map(), errors = [];
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = pending.get(message.id); pending.delete(message.id);
        message.error ? request.reject(message.error) : request.resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || JSON.stringify(message.params.exceptionDetails));
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
    await send('Page.enable'); await send('Runtime.enable');

    const results=[];
    for(const file of ['index.html','about.html','portfolio.html']) {
      for(const width of [1440,768,390]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600});
        await send('Page.navigate',{url:'http://127.0.0.1:8086/'+file}); await delay(1800);
        await evaluate("document.querySelectorAll('img').forEach(e=>e.loading='eager')");
        await evaluate("Promise.all([...document.images].filter(e=>e.getAttribute('src')?.startsWith('img/')).map(e=>e.decode().catch(()=>{})))");
        const result={file,width,...await evaluate("({overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(x=>x.getAttribute('src')?.startsWith('img/')&&!x.naturalWidth).map(x=>x.getAttribute('src')),hero:document.querySelector('.hero-visual')?{photoWidth:document.querySelector('.hero-visual').getBoundingClientRect().width,textWidth:document.querySelector('.carousel-caption').getBoundingClientRect().width}:null})")};
        if(width===390) result.mobileMenu=await evaluate("(()=>{const t=document.querySelector('.navbar-toggler'); t.click(); const open=t.getAttribute('aria-expanded')==='true'; t.click();return open})()");
        if(file==='index.html') result.faq=await evaluate("(()=>{const t=document.querySelector('[data-bs-target=\"#faq2\"]');t.click();return document.querySelector('#faq2').classList.contains('show')})()");
        results.push(result); console.log(JSON.stringify(result));
        if(['index.html','about.html','product-detail.html'].includes(file)) {
          const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height:1300,scale:1}});
          fs.writeFileSync(path.join(__dirname,'polish-'+file.replace('.html','')+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
        }
      }
    }
    fs.writeFileSync(path.join(__dirname,'polish-results.json'),JSON.stringify({results,errors},null,2));
    console.log('Browser exceptions: ' + JSON.stringify(errors));
    await send('Browser.close');
  } finally { ws?.close(); browser.kill(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
