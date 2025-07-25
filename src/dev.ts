GM_xmlhttpRequest({
  method: 'GET',
  url: `http://localhost:2405/index.js?${Date.now()}`,
  timeout: 1000 * 5,
  onload(r) {
    if (r.status !== 200)
      throw new Error(`${r.finalUrl}: ${r.status} ${r.statusText}`);
    // eslint-disable-next-line no-eval
    eval(`(async () => {${r.responseText}})();`);
  },
  onerror(e) {
    if (e?.status === 0) throw new Error('dev server not running');
    throw new Error(String(e)); // eslint-disable-line @typescript-eslint/no-base-to-string
  },
});
