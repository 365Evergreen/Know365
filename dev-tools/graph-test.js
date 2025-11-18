(function(){
  const $ = (id)=>document.getElementById(id);
  const send = $("send");
  const clear = $("clear");
  const statusEl = $("status");
  const headersEl = $("headers");
  const resultEl = $("result");

  function showHeaders(h) {
    try { return JSON.stringify(Object.fromEntries(Array.from(h.entries())), null, 2); } catch(e) { return String(h); }
  }

  send.addEventListener('click', async ()=>{
    statusEl.textContent = '...';
    headersEl.textContent = '-';
    resultEl.textContent = '-';
    try {
      const proxyUrl = $("proxyUrl").value.trim() || 'http://localhost:4000/api/graph';
      const method = $("method").value || 'GET';
      const path = $("path").value || '/';
      const query = $("query").value || '';
      let body = $("body").value || '';
      const secret = $("secret").value || '';

      let parsedBody = null;
      if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        try { parsedBody = JSON.parse(body); } catch(e) { alert('Request body is not valid JSON'); return; }
      }

      const payload = { method, path, query, body: parsedBody };
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-proxy-secret': secret },
        body: JSON.stringify(payload)
      });

      statusEl.textContent = `${res.status} ${res.statusText}`;
      headersEl.textContent = showHeaders(res.headers);

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await res.json();
        resultEl.textContent = JSON.stringify(json, null, 2);
      } else {
        const text = await res.text();
        resultEl.textContent = text;
      }
    } catch (e) {
      statusEl.textContent = 'Error';
      headersEl.textContent = '-';
      resultEl.textContent = String(e);
    }
  });

  clear.addEventListener('click', ()=>{
    statusEl.textContent = '-';
    headersEl.textContent = '-';
    resultEl.textContent = '-';
  });
})();
