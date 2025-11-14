const maskRegex = /(SECRET|PASSWORD|TOKEN|KEY|CLIENT_SECRET|CLIENTSECRET|CLIENT_ID|CLIENTID|CLIENT_SECRET|PASSWORD|PASS|PRIVATE|AZURE|MSAL|CLIENT)/i;
const env = Object.keys(process.env).sort().reduce((o, k) => {
  let v = process.env[k];
  if (maskRegex.test(k)) v = '***MASKED***';
  o[k] = v;
  return o;
}, {});
console.log(JSON.stringify(env, null, 2));
