// Stand-in for the Firebase compat SDK, used only by tests. Stores data in localStorage so several tabs share it.
(function(){
const K='fakefs';
const load=()=>JSON.parse(localStorage.getItem(K)||'{}');
const save=m=>{localStorage.setItem(K,JSON.stringify(m)); setTimeout(fire)};
const L=new Set(); const fire=()=>L.forEach(f=>f());
addEventListener('storage',e=>{if(e.key===K)fire()});
const snapOf=(p,m)=>({id:p.split('/').pop(),exists:p in m,data:()=>m[p],metadata:{fromCache:false,hasPendingWrites:false}});
const docRef=p=>({id:p.split('/').pop(),path:p,
 async get(){return snapOf(p,load())},
 async set(d){const m=load();m[p]=JSON.parse(JSON.stringify(d));save(m)},
 async update(d){const m=load();if(!(p in m))throw{code:'not-found'};m[p]={...m[p],...JSON.parse(JSON.stringify(d))};save(m)},
 async delete(){const m=load();delete m[p];save(m)},
 onSnapshot(fn){const f=()=>fn(snapOf(p,load()));L.add(f);setTimeout(f);return()=>L.delete(f)}});
const coll=(p,fl=[],ord=null,lim=1e9)=>({path:p,doc:id=>docRef(p+'/'+id),
 where(f,o,v){return coll(p,[...fl,[f,v]],ord,lim)},orderBy(f,d){return coll(p,fl,[f,d],lim)},limit(n){return coll(p,fl,ord,n)},
 _d(){const m=load();let ds=Object.keys(m).filter(k=>k.startsWith(p+'/')&&k.split('/').length===p.split('/').length+1).map(k=>snapOf(k,m)).filter(s=>fl.every(([f,v])=>s.data()[f]===v));if(ord)ds.sort((a,b)=>(a.data()[ord[0]]-b.data()[ord[0]])*(ord[1]==='desc'?-1:1));return ds.slice(0,lim)},
 async get(){const d=this._d();return{docs:d,size:d.length}},
 onSnapshot(fn){const f=()=>{const d=this._d();fn({docs:d,size:d.length})};L.add(f);setTimeout(f);return()=>L.delete(f)}});
const FS={doc:docRef,collection:p=>coll(p)};
window.firebase={initializeApp(){},auth(){return{signInAnonymously:async()=>({user:{uid:sessionStorage.uid||(sessionStorage.uid='u'+Math.random().toString(36).slice(2,8))}})}},firestore(){return FS}};
})();
