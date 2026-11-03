const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(error ? 'Not found' : data); });
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const selectedFiles = process.argv.slice(2);
const files = selectedFiles.length ? selectedFiles : fs.readdirSync(root).filter(f => f.endsWith('.html') && f !== 'index.html' && !f.startsWith('google'));
const captures = ['about.html', 'portfolio.html', 'blog.html', 'contact.html', 'product.html', 'product-detail.html', 'Refurbished-Firewall-Rental-Services.html'];
(async () => {
  await new Promise(resolve => server.listen(8086, '127.0.0.1', resolve));
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9336', '--user-data-dir=' + path.join(__dirname, 'inner-chrome-profile'), 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let ws;
  try {
    let pages;
    for (let i = 0; i < 60; i++) { try { pages = await (await fetch('http://127.0.0.1:9336/json')).json(); break; } catch { await delay(250); } }
    if (!pages) throw Error('Chrome debugging endpoint unavailable');
    ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0, currentPage;
    const pending = new Map(), exceptions = [], results = [];
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) { const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(message.error) : request.resolve(message.result); }
      if (message.method === 'Runtime.exceptionThrown') exceptions.push({ page: currentPage, error: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text });
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    await send('Page.enable'); await send('Runtime.enable');
    for (const width of [1440, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1100, deviceScaleFactor: 1, mobile: width < 600 });
      for (const file of files) {
        currentPage = file;
        await send('Page.navigate', { url: 'http://127.0.0.1:8086/' + file });
        for (let i = 0; i < 50; i++) {
          if (await evaluate("document.body?.classList.contains('interior-imagery') && !!document.querySelector('script[src=\"js/site-refresh.js\"]')")) break;
          await delay(200);
        }
        await delay(500);
        await evaluate("Promise.all([...document.images].filter(i=>i.getAttribute('src')?.startsWith('img/')).map(async i=>{i.loading='eager';try{await i.decode()}catch{}}))");
        const result = { file, width, ...await evaluate("({overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(i=>i.getAttribute('src')?.startsWith('img/')&&(!i.complete||!i.naturalWidth)).map(i=>i.getAttribute('src')),generatedPhotos:[...document.images].filter(i=>i.getAttribute('src')?.includes('generated/')).length,banner:getComputedStyle(document.querySelector('#breadcrumb-sec')||document.querySelector('#error')).backgroundImage.includes('generated/')})") };
        if (file === 'about.html') {
          result.missionImages = await evaluate("(()=>{if(typeof Mission!=='function')return false;Mission();const mission=!!document.querySelector('.mission-cont img').naturalWidth;Value();const values=!!document.querySelector('.value-cont img').naturalWidth;Vision();return mission&&values})()");
        }
        if (width === 390 && file !== '404.html') {
          result.mobileMenu = await evaluate("(()=>{const button=document.querySelector('.navbar-toggler');button.click();const open=button.getAttribute('aria-expanded')==='true';button.click();return open})()");
        }
        results.push(result); console.log(JSON.stringify(result));
        if (captures.includes(file)) {
          const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: width === 390 ? 1800 : 1400, scale: 1 } });
          fs.writeFileSync(path.join(__dirname, file.replace('.html', '') + '-' + width + '.png'), Buffer.from(shot.data, 'base64'));
        }
      }
    }
    fs.writeFileSync(path.join(__dirname, 'interior-results.json'), JSON.stringify({ results, exceptions }, null, 2));
    console.log('Browser checks completed. Exceptions: ' + exceptions.length);
    await send('Browser.close');
  } finally { ws?.close(); browser.kill(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
