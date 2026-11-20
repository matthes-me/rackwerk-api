/*! Rack Manufaktur – Einbett-Skript (API v1). Protokoll und Beispiele: docs/api.md
 *
 *   <div id="rack" style="height: 800px"></div>
 *   <script src="https://td-media.eu/rackwerk/embed.js"></script>
 *   <script>
 *     const rw = RackWerk.embed('#rack', { lang: 'de', theme: 'auto' });
 *     rw.on('change', summary => console.log(summary.total, summary.usedHe));
 *     const orders = await rw.getOrders();
 *   </script>
 */
(function (global) {
  'use strict';
  var API_VERSION = 1;
  var script = document.currentScript;
  var DEFAULT_SRC = script && script.src ? new URL('./', script.src).href : 'https://td-media.eu/rackwerk/';

  function embed(target, opts) {
    opts = opts || {};
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error('RackWerk.embed: container not found');

    var src = new URL(opts.src || DEFAULT_SRC, location.href);
    if (opts.minimal !== false) src.searchParams.set('embed', '1');
    if (opts.lang) src.searchParams.set('lang', opts.lang);
    if (opts.theme && opts.theme !== 'auto') src.searchParams.set('theme', opts.theme);
    var origin = src.origin;

    var iframe = document.createElement('iframe');
    iframe.src = src.href;
    iframe.title = opts.title || 'Rack Manufaktur';
    iframe.setAttribute('allow', 'clipboard-write');
    iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;';
    el.appendChild(iframe);

    var seq = 0, pending = new Map(), handlers = {}, readyResolve, first = true;
    var ready = new Promise(function (r) { readyResolve = r; });

    function emit(name, data) { (handlers[name] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }
    function send(method, params) {
      return new Promise(function (resolve, reject) {
        var id = ++seq;
        var timer = setTimeout(function () { pending.delete(id); reject(Object.assign(new Error('RackWerk: "' + method + '" timed out'), { code: 'timeout' })); }, opts.timeout || 15000);
        pending.set(id, { resolve: function (v) { clearTimeout(timer); resolve(v); }, reject: function (e) { clearTimeout(timer); reject(e); } });
        iframe.contentWindow.postMessage({ rackwerk: API_VERSION, id: id, method: method, params: params || {} }, origin);
      });
    }
    function onMessage(ev) {
      if (ev.source !== iframe.contentWindow || ev.origin !== origin) return;
      var m = ev.data; if (!m || typeof m !== 'object' || m.rackwerk == null) return;
      if (m.event) {
        if (m.event === 'ready') {
          // auch nach einem Neuladen (Sprachwechsel) wieder für Ereignisse anmelden
          send('subscribe').then(function () {
            var init = first && opts.project ? send('loadProject', { project: opts.project, step: opts.step }) : first && opts.step ? send('setStep', { step: opts.step }) : Promise.resolve();
            first = false;
            return init;
          }).then(function () { readyResolve(m.data); emit('ready', m.data); }, function (e) { readyResolve(m.data); emit('error', e); });
        } else emit(m.event, m.data);
        return;
      }
      var p = pending.get(m.id); if (!p) return; pending.delete(m.id);
      if (m.error) p.reject(Object.assign(new Error(m.error.message), { code: m.error.code })); else p.resolve(m.result);
    }
    window.addEventListener('message', onMessage);

    function call(method, params) { return ready.then(function () { return send(method, params); }); }
    var api = {
      iframe: iframe,
      ready: ready,
      call: call,
      on: function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); return api; },
      off: function (name, fn) { handlers[name] = (handlers[name] || []).filter(function (f) { return f !== fn; }); return api; },
      getProject: function () { return call('getProject'); },
      getSummary: function () { return call('getSummary'); },
      getBom: function () { return call('getBom'); },
      getOrders: function (p) { return call('getOrders', p); },
      loadProject: function (project, step) { return call('loadProject', { project: project, step: step }); },
      newProject: function (info) { return call('newProject', info); },
      setProjectInfo: function (info) { return call('setProjectInfo', info); },
      setStep: function (step) { return call('setStep', { step: step }); },
      setTheme: function (theme) { return call('setTheme', { theme: theme }); },
      setLang: function (lang) { return call('setLang', { lang: lang }); },
      destroy: function () { window.removeEventListener('message', onMessage); pending.forEach(function (p) { p.reject(new Error('RackWerk: destroyed')); }); pending.clear(); iframe.remove(); }
    };
    return api;
  }

  global.RackWerk = { embed: embed, apiVersion: API_VERSION };
})(window);
