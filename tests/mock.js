(function(){
  const store = {};
  const subs = [];
  function fire(){ subs.forEach(s=>{ if(s.doc){ const e=s.path in store; s.next({exists:e,data:()=>store[s.path]}); }
    else { const docs = Object.keys(store).filter(k=>k.startsWith(s.path+'/')).map(k=>({id:k.split('/').pop(),data:()=>store[k]})); s.next({docs}); } }); }
  function ref(path){ return { id: path.split('/').pop(), path,
    async get(){ return { exists: path in store, data: () => store[path] }; },
    async set(d){ store[path] = JSON.parse(JSON.stringify(d)); fire(); },
    async update(d){ if(!(path in store)) throw {code:'invalid_argument'}; Object.assign(store[path], JSON.parse(JSON.stringify(d))); fire(); },
    async delete(){ delete store[path]; fire(); },
    onSnapshot(next){ subs.push({path, next, doc:true}); setTimeout(()=>fire(),0); return ()=>{}; } }; }
  const db = { doc: ref, collection(p){ return { limit(){ return this; }, onSnapshot(next){ subs.push({path:p,next}); setTimeout(()=>fire(),0); return ()=>{}; } }; } };
  window.__store = store; window.__saved = [];
  window.claude = { async use(n){ if(n==='db') return db; if(n==='user') return { canEdit: async()=>true, isOwner: async()=>true };
    if(n==='downloads') return { save: async (r)=>{ window.__saved.push(r); return {status:'saved'}; } }; return null; } };
})();
