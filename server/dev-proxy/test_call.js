(async ()=>{
  try{
    const body = { method: 'GET', path: '/sites', query: '?$top=1' };
    const res = await fetch('http://localhost:4000/api/graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dev-proxy-secret': process.env.DEV_PROXY_SECRET || 'dev-secret' },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
  } catch(e){
    console.error('CALL ERROR', e);
    process.exit(1);
  }
})();
