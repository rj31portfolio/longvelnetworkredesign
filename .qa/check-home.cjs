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
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9336', '--user-data-dir=' + path.join(__dirname, 'chrome-profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
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
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
    await send('Page.enable'); await send('Runtime.enable');
    for (const width of [1440, 768, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      await send('Page.navigate', { url: 'http://127.0.0.1:8086/' }); await delay(4000);
      await evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-visible')); document.querySelectorAll('img').forEach(e=>e.loading='eager')"); await delay(800);
      console.log(JSON.stringify({ width, ...await evaluate("({overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(x=>x.getAttribute('src')?.startsWith('img/')&&(!x.complete||!x.naturalWidth)).map(x=>x.getAttribute('src')),heroColor:getComputedStyle(document.querySelector('h1')).color})") }));
      await evaluate("document.querySelector('[data-bs-target=\"#faq2\"]').click()");
      console.log('FAQ opens: ' + await evaluate("document.querySelector('#faq2').classList.contains('show')"));
      if (width === 390) {
        await evaluate("document.querySelector('.navbar-toggler').click()");
        console.log('Mobile menu opens: ' + await evaluate("document.querySelector('.navbar-toggler').getAttribute('aria-expanded')==='true' && document.querySelector('#navbarSupportedContent').classList.contains('show')"));
        await evaluate("document.querySelector('.navbar-toggler').click()");
      }
      await evaluate('window.scrollTo(0,0)'); await delay(150);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: await evaluate('document.documentElement.scrollHeight'), scale: 1 } });
      fs.writeFileSync(path.join(__dirname, 'home-' + width + '.png'), Buffer.from(shot.data, 'base64'));
    }
    console.log('Browser exceptions: ' + JSON.stringify(errors));
    await send('Browser.close');
  } finally { ws?.close(); browser.kill(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
