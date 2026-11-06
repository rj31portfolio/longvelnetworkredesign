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
  let ws, send;
  try {
    let pages;
    for (let i = 0; i < 30; i++) {
      try { pages = await (await fetch('http://127.0.0.1:9337/json')).json(); break; } catch { await delay(250); }
    }
    if (!pages) throw Error('Chrome debugging endpoint unavailable');
    ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const pending = new Map(), errors = [], failures = [];
    let id = 0;
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = pending.get(message.id); pending.delete(message.id);
        message.error ? request.reject(message.error) : request.resolve(message.result);
      }
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description);
      if (message.method === 'Network.loadingFailed' && message.params.errorText !== 'net::ERR_ABORTED') failures.push(message.params.errorText);
    };
    send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async expression => {
      const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) throw Error(response.exceptionDetails.text);
      return response.result.value;
    };
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
    const results = [];
    for (const width of [1440, 1024, 768, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      await send('Page.navigate', { url: 'http://127.0.0.1:8087/about.html' });
      await delay(1600);
      await evaluate("document.querySelectorAll('img').forEach(x=>x.loading='eager');Promise.all([...document.images].map(x=>x.decode().catch(()=>{})))");
      const result = { width, ...await evaluate(`({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        brokenImages: [...document.images].filter(x=>!x.naturalWidth).map(x=>x.getAttribute('src')),
        h1Count: document.querySelectorAll('h1').length,
        missingLinks: [...document.querySelectorAll('a[href]')].filter(x=>x.getAttribute('href')==='').length,
        tabs: (()=>{const ts=[...document.querySelectorAll('[role=tab]')];ts[1].click();const ok=!document.querySelector('#purpose-1').hidden&&document.querySelector('#purpose-0').hidden;ts[0].click();return ok})(),
        review: (()=>{document.querySelector('[data-review-step="1"]').click();const ok=!document.querySelectorAll('[data-review]')[1].hidden;document.querySelector('[data-review-step="-1"]').click();return ok})(),
        accordion: (()=>{const d=document.querySelectorAll('details')[1];d.querySelector('summary').click();const ok=d.open;d.open=false;return ok})(),
        pageHeight: document.documentElement.scrollHeight
      })`) };
      if (width < 992) result.mobileMenu = await evaluate("(()=>{const t=document.querySelector('.menu-toggle');t.click();const ok=t.getAttribute('aria-expanded')==='true'&&getComputedStyle(document.querySelector('.nav-content')).display==='flex';t.click();return ok})()");
      result.keyboardTabs = await evaluate("(()=>{const t=document.querySelector('[role=tab]');t.focus();t.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));const ok=document.activeElement.id==='purpose-tab-1'&&!document.querySelector('#purpose-1').hidden;document.querySelector('#purpose-tab-0').click();document.activeElement.blur();return ok})()");
      results.push(result); console.log(JSON.stringify(result));
      if ([1440, 390].includes(width)) {
        await evaluate('scrollTo(0,0)');
        await delay(100);
        const height = await evaluate('document.documentElement.scrollHeight');
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
        fs.writeFileSync(path.join(__dirname, `reference-about-${width}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
    fs.writeFileSync(path.join(__dirname, 'reference-about-results.json'), JSON.stringify({ results, errors, failures }, null, 2));
    console.log(JSON.stringify({ errors, failures }));
    if (errors.length || results.some(r => r.overflow || r.brokenImages.length || !r.tabs || !r.review || !r.accordion || !r.keyboardTabs || r.mobileMenu === false)) process.exitCode = 1;
  } finally {
    if (send) await send('Browser.close').catch(() => {});
    ws?.close(); server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
