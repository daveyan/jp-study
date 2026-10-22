(function(){
'use strict';

const ITEM = {};
VOCAB.forEach(v=>{ITEM[v.id]=v;});
KANJI.forEach(k=>{ITEM[k.id]=k;});

/* ---------- Helpers ---------- */
const $ = (s,r)=>(r||document).querySelector(s);
const esc = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dayKey(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dayStartPlus(now,n){ const d=new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate()+n); return d.getTime(); }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
const CAN_SPEAK = typeof window!=='undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance!=='undefined';
function speak(t){ try{ if(!CAN_SPEAK) return; const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; u.rate=0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){} }
const SPK_SVG='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
function spk(t){ return CAN_SPEAK ? '<button class="icon-btn" data-act="say" data-arg="'+esc(t)+'" aria-label="Play audio">'+SPK_SVG+'</button>' : ''; }

/* ---------- State and storage ---------- */
const KEY='manabi.progress.v1';
function defaultState(){ return {v:1,updatedAt:0,resetAt:0,cards:{},grammar:{},log:{},settings:{recall:false}}; }
function normalize(o){
  const d=defaultState();
  if(!o||typeof o!=='object') return d;
  return {v:1, updatedAt:+o.updatedAt||0, resetAt:+o.resetAt||0,
    cards:(o.cards&&typeof o.cards==='object')?o.cards:{},
    grammar:(o.grammar&&typeof o.grammar==='object')?o.grammar:{},
    log:(o.log&&typeof o.log==='object')?o.log:{},
    settings:Object.assign(d.settings,(o.settings&&typeof o.settings==='object')?o.settings:{})};
}
function loadLocal(){ try{ const r=localStorage.getItem(KEY); if(r) return JSON.parse(r); }catch(e){} return null; }
function saveLocal(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
let S = normalize(loadLocal());

function merge(a,b){
  const ra=Math.max(a.resetAt||0,b.resetAt||0);
  const out=defaultState(); out.resetAt=ra;
  const newer=(a.updatedAt||0)>=(b.updatedAt||0)?a:b;
  out.settings=Object.assign(out.settings,newer.settings);
  [a,b].forEach(src=>{
    Object.keys(src.cards).forEach(id=>{
      const c=src.cards[id]; if(!c||(c.last||0)<=ra) return;
      const o=out.cards[id]; if(!o||(c.last||0)>(o.last||0)) out.cards[id]=c;
    });
    Object.keys(src.grammar).forEach(id=>{
      const g=src.grammar[id]; if(!g||(g.at||0)<=ra) return;
      const o=out.grammar[id];
      if(!o) out.grammar[id]=Object.assign({},g);
      else { o.best=Math.max(o.best||0,g.best||0); o.tries=Math.max(o.tries||0,g.tries||0); o.done=!!(o.done||g.done); o.at=Math.max(o.at||0,g.at||0); }
    });
    Object.keys(src.log).forEach(k=>{ out.log[k]=Math.max(out.log[k]||0, src.log[k]||0); });
  });
  if(ra){ const rd=dayKey(new Date(ra)); Object.keys(out.log).forEach(k=>{ if(k<rd) delete out.log[k]; }); }
  out.updatedAt=Math.max(a.updatedAt||0,b.updatedAt||0);
  return out;
}

let remote=null, remoteTimer=null, writing=false, pendingWrite=false, syncMode='device';
function scheduleRemote(){ if(!remote) return; pendingWrite=true; clearTimeout(remoteTimer); remoteTimer=setTimeout(flushRemote,900); }
async function flushRemote(){
  if(!remote||writing||!pendingWrite) return;
  writing=true; pendingWrite=false;
  try{ await remote.set({state:S}); }
  catch(e){ remote=null; syncMode='device'; renderFoot(); }
  writing=false;
  if(pendingWrite) scheduleRemote();
}
function commit(){
  S.updatedAt=Date.now();
  const keys=Object.keys(S.log);
  if(keys.length>150){ keys.sort(); keys.slice(0,keys.length-120).forEach(k=>{delete S.log[k];}); }
  saveLocal(); scheduleRemote();
}
async function initRemote(){
  try{
    if(!window.claude||typeof window.claude.use!=='function') return;
    const dbp=window.claude.use('db'), usp=window.claude.use('user');
    const db=await dbp, user=await usp;
    if(!db||!user) return;
    const id=await user.id();
    if(!id) return;
    const ref=db.doc('data/users/'+id+'/progress');
    const snap=await ref.get();
    if(snap.exists){
      const d=snap.data();
      if(d&&d.state){ S=merge(S, normalize(d.state)); saveLocal(); }
    }
    remote=ref; syncMode='account';
    pendingWrite=true; flushRemote();
    render();
  }catch(e){ /* stay on this-browser storage */ }
}

/* ---------- Spaced repetition ---------- */
function newCard(now){ return {ef:2.5,int:0,reps:0,due:now,lapses:0,last:now}; }
function nextState(c,g,now){
  const n=Object.assign({},c); n.last=now;
  if(g===0){ n.lapses=(c.lapses||0)+1; n.reps=0; n.int=0; n.ef=Math.max(1.3,c.ef-0.2); n.due=now+10*60000; return n; }
  let iv;
  if(c.reps===0) iv=[0,1,2,4][g];
  else if(c.reps===1) iv=[0,2,4,7][g];
  else { const base=c.int||1; iv = g===1 ? Math.max(base+1,Math.round(base*1.2)) : g===2 ? Math.round(base*c.ef) : Math.round(base*c.ef*1.3); }
  iv=Math.max(1,iv);
  n.ef = g===1 ? Math.max(1.3,c.ef-0.15) : g===3 ? c.ef+0.15 : c.ef;
  n.reps=c.reps+1; n.int=iv; n.due=dayStartPlus(now,iv);
  return n;
}
function fmtIv(c,g,now){
  if(g===0) return '10 min';
  const iv=nextState(c,g,now).int;
  if(iv<30) return iv+' d';
  if(iv<365) return Math.round(iv/30)+' mo';
  return (iv/365).toFixed(1)+' y';
}
function status(c){ if(!c) return 'new'; if(c.reps<2) return 'learning'; if(c.int<21) return 'young'; return 'mature'; }
const STATUS_LABEL={new:'New',learning:'Learning',young:'Young',mature:'Mature'};
function itemsOf(kind){ return kind==='vocab'?VOCAB:KANJI; }
function dueIds(kind,now){
  return itemsOf(kind).filter(it=>{const c=S.cards[it.id]; return c&&c.due<=now;})
    .sort((a,b)=>S.cards[a.id].due-S.cards[b.id].due).map(it=>it.id);
}
function newIds(kind,n){ return itemsOf(kind).filter(it=>!S.cards[it.id]).slice(0,n).map(it=>it.id); }
function counts(kind){
  const c={new:0,learning:0,young:0,mature:0};
  itemsOf(kind).forEach(it=>{c[status(S.cards[it.id])]++;});
  return c;
}
function bump(n){ const k=dayKey(); S.log[k]=(S.log[k]||0)+(n||1); }
function streak(){
  let n=0; const d=new Date();
  if(!(S.log[dayKey(d)]>0)) d.setDate(d.getDate()-1);
  while(S.log[dayKey(d)]>0){ n++; d.setDate(d.getDate()-1); }
  return n;
}

/* ---------- UI state ---------- */
const ui={tab:'home',session:null,quiz:null,lesson:null,kanji:null,vq:'',vf:'all',confirmReset:false};
const TABS=[['home','今日','Today'],['vocab','単語','Vocab'],['kanji','漢字','Kanji'],['grammar','文法','Grammar']];
function go(fn){ fn(); render(); window.scrollTo(0,0); }

function render(){
  renderChrome();
  const m=$('#main');
  let h;
  if(ui.session) h=sessionHtml();
  else if(ui.quiz) h=quizHtml();
  else if(ui.tab==='home') h=homeHtml();
  else if(ui.tab==='vocab') h=vocabHtml();
  else if(ui.tab==='kanji') h=kanjiHtml();
  else h=grammarHtml();
  m.innerHTML=h;
}
function renderChrome(){
  const n=streak();
  $('#streak').innerHTML = n>0 ? '<b>'+n+'</b>-day streak' : 'No streak yet';
  const t=$('#tabs');
  t.hidden=!!(ui.session||ui.quiz);
  t.innerHTML=TABS.map(x=>'<button class="tab" role="tab" aria-selected="'+(ui.tab===x[0])+'" data-act="tab" data-arg="'+x[0]+'"><span class="tj" lang="ja">'+x[1]+'</span><span class="te">'+x[2]+'</span></button>').join('');
  renderFoot();
}
function renderFoot(){
  $('#foot').textContent = syncMode==='account' ? 'Progress is saved to your account and follows you across devices.' : 'Progress is saved in this browser only.';
}

/* ---------- Home ---------- */
function stackBar(kind){
  const c=counts(kind), n=c.new+c.learning+c.young+c.mature;
  const seg=(k,v)=>'<i style="width:'+(c[k]/n*100)+'%;background:var(--'+v+')"></i>';
  return '<div class="stack" role="img" aria-label="'+(n-c.new)+' of '+n+' started">'+seg('mature','st-mature')+seg('young','st-young')+seg('learning','st-learn')+'</div>';
}
function legend(kind){
  const c=counts(kind);
  const li=(k,v)=>'<span><i style="background:var(--'+v+')"></i>'+c[k]+' '+k+'</span>';
  return '<div class="legend">'+li('mature','st-mature')+li('young','st-young')+li('learning','st-learn')+li('new','st-new')+'</div>';
}
function studyRow(kind){
  const now=Date.now(), items=itemsOf(kind), c=counts(kind);
  const due=dueIds(kind,now).length, nn=newIds(kind,5).length, started=items.length-c.new;
  return '<section class="panel row"><div class="row-head"><span class="tag-jp" lang="ja">'+(kind==='vocab'?'単語':'漢字')+'</span><div><h2>'+(kind==='vocab'?'Vocabulary':'Kanji')+'</h2><p class="muted">'+started+' of '+items.length+' started · '+due+' due now</p></div></div>'
   +stackBar(kind)
   +'<div class="actions"><button class="btn primary" data-act="review" data-arg="'+kind+'"'+(due?'':' disabled')+'>'+(due?'Review '+due:'Nothing due')+'</button><button class="btn" data-act="learn" data-arg="'+kind+'"'+(nn?'':' disabled')+'>Learn '+(nn?Math.min(5,nn)+' new':'new')+'</button></div></section>';
}
function homeHtml(){
  const now=Date.now();
  const due=dueIds('vocab',now).length+dueIds('kanji',now).length;
  const started=Object.keys(S.cards).length;
  const msg = started===0 ? 'Start with five new words.' : due>0 ? due+(due===1?' card is':' cards are')+' ready to review.' : 'You are all caught up.';
  const date=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const passed=GRAMMAR.filter(g=>S.grammar[g.id]&&S.grammar[g.id].done).length;
  const nextG=GRAMMAR.findIndex(g=>!(S.grammar[g.id]&&S.grammar[g.id].done));
  const grammarRow='<section class="panel row"><div class="row-head"><span class="tag-jp" lang="ja">文法</span><div><h2>Grammar</h2><p class="muted">'+passed+' of '+GRAMMAR.length+' lessons passed</p></div></div>'
    +'<div class="stack" role="img" aria-label="'+passed+' of '+GRAMMAR.length+' lessons passed"><i style="width:'+(passed/GRAMMAR.length*100)+'%;background:var(--st-mature)"></i></div>'
    +'<div class="actions">'+(nextG>=0?'<button class="btn primary" data-act="gopen" data-arg="'+nextG+'">Lesson '+(nextG+1)+': '+esc(GRAMMAR[nextG].title)+'</button>':'<button class="btn" data-act="tab" data-arg="grammar">Review lessons</button>')+'</div></section>';
  // activity, last 14 days
  const days=[]; for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push({d:d,n:S.log[dayKey(d)]||0}); }
  const max=Math.max(1,...days.map(x=>x.n));
  const total=days.reduce((a,x)=>a+x.n,0);
  const bars=days.map((x,i)=>'<div class="bar'+(i===13?' today':'')+'" style="height:'+Math.max(2,Math.round(x.n/max*100))+'%" title="'+esc(x.d.toLocaleDateString(undefined,{month:'short',day:'numeric'}))+': '+x.n+'"></div>').join('');
  const labs=days.map(x=>'<span>'+esc(x.d.toLocaleDateString(undefined,{weekday:'narrow'}))+'</span>').join('');
  const dir=S.settings.recall;
  const reset=ui.confirmReset
    ? '<div class="confirm"><span>Erase all progress on every device?</span><button class="btn danger" data-act="resetGo">Erase</button><button class="btn" data-act="resetNo">Cancel</button></div>'
    : '<div><button class="btn" data-act="resetAsk">Reset progress</button></div>';
  return '<section class="hero"><p class="eyebrow">'+esc(date)+'</p><h1>'+msg+'</h1></section>'
    +studyRow('vocab')+studyRow('kanji')+grammarRow
    +'<section class="panel"><h3>Last 14 days</h3><div class="bars">'+bars+'</div><div class="barlab">'+labs+'</div><p class="muted" style="margin-top:8px;font-size:13px">'+total+' answers in two weeks</p></section>'
    +'<section class="panel settings"><div><h3 style="margin-bottom:8px">Card direction</h3><div class="seg" role="group" aria-label="Card direction"><button data-act="dir" data-arg="read" aria-pressed="'+(!dir)+'">日本語 → English</button><button data-act="dir" data-arg="recall" aria-pressed="'+dir+'">English → 日本語</button></div></div>'+reset+'</section>';
}

/* ---------- Study sessions ---------- */
function startSession(kind,mode){
  const now=Date.now();
  const ids = mode==='due' ? dueIds(kind,now).slice(0,30) : newIds(kind,5);
  if(!ids.length) return;
  go(()=>{ ui.session={kind:kind,mode:mode,queue:ids.slice(),total:ids.length,done:0,again:0,revealed:false,grades:[0,0,0,0]}; });
}
function gradeCurrent(g){
  const s=ui.session; if(!s||!s.queue.length||!s.revealed) return;
  const id=s.queue[0], now=Date.now();
  const prev=S.cards[id]||newCard(now);
  S.cards[id]=nextState(prev,g,now);
  bump(1);
  s.queue.shift(); s.grades[g]++;
  if(g===0){ s.again++; s.queue.splice(Math.min(2,s.queue.length),0,id); } else { s.done++; }
  s.revealed=false;
  commit(); render(); window.scrollTo(0,0);
}
function bigCls(t){ const n=[...t].length; return n<=2?'xl':n<=4?'lg':'md'; }
function exBlock(jp,en){ return '<div class="ex"><div class="ex-row"><span class="jpl" lang="ja">'+esc(jp)+'</span>'+spk(jp)+'</div><span class="muted">'+esc(en)+'</span></div>'; }
function cardFaces(it,kind,recall){
  const front=[], back=[];
  if(kind==='vocab'){
    if(!recall){
      front.push('<div class="face '+bigCls(it.jp)+'" lang="ja">'+esc(it.jp)+'</div>');
      if(it.kana!==it.jp) back.push('<div class="reading" lang="ja">'+esc(it.kana)+'</div>');
      back.push('<div class="gloss">'+esc(it.en)+'</div>');
    } else {
      front.push('<div class="face en">'+esc(it.en)+'</div>');
      back.push('<div class="face '+bigCls(it.jp)+'" lang="ja" style="padding:0">'+esc(it.jp)+'</div>');
      if(it.kana!==it.jp) back.push('<div class="reading" lang="ja">'+esc(it.kana)+'</div>');
    }
    back.push(exBlock(it.ex,it.exEn));
  } else {
    const info='<dl class="kv"><dt>On’yomi</dt><dd lang="ja">'+esc(it.on)+'</dd><dt>Kun’yomi</dt><dd lang="ja">'+esc(it.kun)+'</dd><dt>Strokes</dt><dd>'+it.st+'</dd></dl>';
    const words='<div class="words">'+it.ex.map(w=>'<div class="word"><span class="w" lang="ja">'+esc(w[0])+'</span><span class="wm"><span class="wr" lang="ja">'+esc(w[1])+'</span><span>'+esc(w[2])+'</span></span>'+spk(w[1])+'</div>').join('')+'</div>';
    if(!recall){
      front.push('<div class="face xl" lang="ja">'+esc(it.ch)+'</div>');
      back.push('<div class="gloss">'+esc(it.en)+'</div>',info,words);
    } else {
      front.push('<div class="face en">'+esc(it.en)+'</div>');
      back.push('<div class="face xl" lang="ja" style="padding:0">'+esc(it.ch)+'</div>',info,words);
    }
  }
  return {front:front.join(''),back:back.join('')};
}
function sessionHtml(){
  const s=ui.session;
  const head='<div class="sess-head"><button class="btn link" data-act="exit">← Back</button><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="'+s.total+'" aria-valuenow="'+s.done+'"><i style="width:'+(s.done/s.total*100)+'%"></i></div><span class="count">'+s.done+' / '+s.total+'</span></div>';
  if(!s.queue.length){
    const all=s.done+s.again;
    const acc=all? Math.round(s.done/all*100):100;
    let nextDue=Infinity; const now=Date.now();
    Object.keys(S.cards).forEach(id=>{ const d=S.cards[id].due; if(d>now&&d<nextDue) nextDue=d; });
    let nxt='';
    if(nextDue<Infinity){ const mins=Math.round((nextDue-now)/60000); nxt = mins<60? 'in '+mins+' min' : mins<60*24 ? 'later today' : mins<60*48 ? 'tomorrow' : 'in '+Math.round(mins/1440)+' days'; }
    const more=newIds(s.kind,5).length;
    return head+'<section class="panel done"><p class="eyebrow">Session complete</p><div class="big">'+s.done+'</div><p>'+(s.kind==='vocab'?'words':'kanji')+' finished</p>'
      +'<div class="facts"><span><b>'+acc+'%</b> got it first time</span><span><b>'+s.again+'</b> repeated</span>'+(nxt?'<span>Next review <b>'+nxt+'</b></span>':'')+'</div>'
      +'<div class="actions"><button class="btn primary" data-act="exit">Back</button>'+(more?'<button class="btn" data-act="learn" data-arg="'+s.kind+'">Learn 5 more</button>':'')+'</div></section>';
  }
  const id=s.queue[0], it=ITEM[id], c=S.cards[id], now=Date.now(), recall=!!S.settings.recall;
  const f=cardFaces(it,s.kind,recall);
  const top='<div class="card-top"><span>'+(s.kind==='vocab'?it.tag:'Kanji')+'</span>'+(c?'<span class="stat st-'+status(c)+'">'+STATUS_LABEL[status(c)]+'</span>':'<span class="pill">New</span>')+'</div>';
  let ctrl;
  if(!s.revealed){
    ctrl='<button class="btn primary wide" data-act="reveal">Show answer</button><p class="keyhint">Space or Enter</p>';
  } else {
    const base=c||newCard(now);
    const names=['Again','Hard','Good','Easy'], cols=['again','hard','good','easy'];
    ctrl='<div class="grades">'+names.map((nm,g)=>'<button class="grade" style="--c:var(--'+cols[g]+')" data-act="grade" data-arg="'+g+'"><b>'+nm+'</b><small>'+fmtIv(base,g,now)+'</small></button>').join('')+'</div><p class="keyhint">Keys 1 to 4</p>';
  }
  return head+'<article class="card">'+top+f.front+(s.revealed?'<hr class="divider"><div class="back">'+f.back+'</div>':'')+'</article>'+ctrl;
}

/* ---------- Vocab tab ---------- */
function vocabListHtml(){
  const q=ui.vq.trim().toLowerCase(), f=ui.vf;
  const rows=VOCAB.filter(w=>{
    const st=status(S.cards[w.id]);
    if(f!=='all'&&st!==f) return false;
    return !q || (w.jp+' '+w.kana+' '+w.en+' '+w.tag).toLowerCase().includes(q);
  });
  if(!rows.length) return '<p class="muted" style="padding:12px 4px">No words match.</p>';
  return rows.map(w=>{
    const st=status(S.cards[w.id]);
    return '<details class="vrow"><summary><span class="vjp" lang="ja">'+esc(w.jp)+'</span><span class="vmid"><span class="vkana" lang="ja">'+(w.kana!==w.jp?esc(w.kana):'')+'</span><span class="ven">'+esc(w.en)+'</span></span><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span></summary>'
      +'<div class="vbody">'+exBlock(w.ex,w.exEn)+'<div class="ex-row"><span class="tagline">'+esc(w.tag)+'</span><span class="actions">'+spk(w.kana)+(S.cards[w.id]?'':'<button class="btn" data-act="addCard" data-arg="'+esc(w.id)+'">Add to reviews</button>')+'</span></div></div></details>';
  }).join('');
}
function vocabHtml(){
  const now=Date.now(), due=dueIds('vocab',now).length, nn=newIds('vocab',5).length;
  const chips=['all','new','learning','young','mature'].map(k=>'<button class="chip" data-act="filter" data-arg="'+k+'" aria-pressed="'+(ui.vf===k)+'">'+(k==='all'?'All':STATUS_LABEL[k])+'</button>').join('');
  return '<section class="panel row"><div><h2>Vocabulary</h2><p class="muted">'+VOCAB.length+' everyday words with example sentences</p></div>'+stackBar('vocab')+legend('vocab')
    +'<div class="actions"><button class="btn primary" data-act="review" data-arg="vocab"'+(due?'':' disabled')+'>'+(due?'Review '+due:'Nothing due')+'</button><button class="btn" data-act="learn" data-arg="vocab"'+(nn?'':' disabled')+'>Learn '+(nn?Math.min(5,nn)+' new':'new')+'</button><button class="btn" data-act="vquiz">Quick quiz</button></div></section>'
    +'<div class="toolbar"><input class="search" id="vq" type="search" placeholder="Search words, readings or meanings" aria-label="Search words" value="'+esc(ui.vq)+'"><div class="chips">'+chips+'</div></div>'
    +'<div class="vlist" id="vlist">'+vocabListHtml()+'</div>';
}

/* ---------- Kanji tab ---------- */
function kanjiHtml(){
  if(ui.kanji){
    const k=ITEM['k:'+ui.kanji]; const i=KANJI.indexOf(k); const st=status(S.cards[k.id]);
    return '<section class="panel kd"><div class="kd-top"><button class="btn" data-act="closeKanji">← All kanji</button><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span></div>'
      +'<div class="kd-char" lang="ja">'+esc(k.ch)+'</div><h2>'+esc(k.en)+'</h2>'
      +'<dl class="kv"><dt>On’yomi</dt><dd lang="ja">'+esc(k.on)+'</dd><dt>Kun’yomi</dt><dd lang="ja">'+esc(k.kun)+'</dd><dt>Strokes</dt><dd>'+k.st+'</dd></dl>'
      +'<div class="words">'+k.ex.map(w=>'<div class="word"><span class="w" lang="ja">'+esc(w[0])+'</span><span class="wm"><span class="wr" lang="ja">'+esc(w[1])+'</span><span>'+esc(w[2])+'</span></span>'+spk(w[1])+'</div>').join('')+'</div>'
      +'<div class="actions"><button class="btn" data-act="openKanji" data-arg="'+esc(KANJI[(i+KANJI.length-1)%KANJI.length].ch)+'">← Previous</button>'
      +(S.cards[k.id]?'':'<button class="btn primary" data-act="addCard" data-arg="'+esc(k.id)+'">Add to reviews</button>')
      +'<button class="btn" data-act="openKanji" data-arg="'+esc(KANJI[(i+1)%KANJI.length].ch)+'">Next →</button></div></section>';
  }
  const now=Date.now(), due=dueIds('kanji',now).length, nn=newIds('kanji',5).length;
  const tiles=KANJI.map(k=>'<button class="ktile st-'+status(S.cards[k.id])+'" data-act="openKanji" data-arg="'+esc(k.ch)+'" aria-label="'+esc(k.ch+', '+k.en)+'"><span class="kc" lang="ja">'+esc(k.ch)+'</span><span class="km">'+esc(k.en)+'</span></button>').join('');
  return '<section class="panel row"><div><h2>Kanji</h2><p class="muted">'+KANJI.length+' kanji from the N5 level, with readings and words</p></div>'+stackBar('kanji')+legend('kanji')
    +'<div class="actions"><button class="btn primary" data-act="review" data-arg="kanji"'+(due?'':' disabled')+'>'+(due?'Review '+due:'Nothing due')+'</button><button class="btn" data-act="learn" data-arg="kanji"'+(nn?'':' disabled')+'>Learn '+(nn?Math.min(5,nn)+' new':'new')+'</button><button class="btn" data-act="kquiz">Reading quiz</button></div></section>'
    +'<div class="kgrid">'+tiles+'</div>';
}

/* ---------- Grammar tab ---------- */
function grammarHtml(){
  if(ui.lesson!==null){
    const g=GRAMMAR[ui.lesson], i=ui.lesson, p=S.grammar[g.id];
    return '<div class="lesson-view"><div><button class="btn link" data-act="closeLesson">← All lessons</button></div>'
      +'<div class="titleline"><span class="ln" style="grid-row:auto">'+(i+1)+'</span><div><h1 style="font-size:24px">'+esc(g.title)+'</h1><p class="muted">'+esc(g.sub)+'</p></div></div>'
      +'<div class="pattern" lang="ja">'+esc(g.pattern)+'</div>'
      +'<ul class="notes">'+g.notes.map(n=>'<li>'+n+'</li>').join('')+'</ul>'
      +'<section class="panel" style="display:grid;gap:10px"><h3>Examples</h3>'+g.ex.map(e=>exBlock(e[0],e[1])).join('')+'</section>'
      +'<div class="actions"><button class="btn primary" data-act="lessonQuiz" data-arg="'+i+'">Take the quiz</button>'+(p?'<span class="muted" style="align-self:center">Best score '+p.best+'/'+g.quiz.length+'</span>':'')+'</div></div>';
  }
  return '<section><h2>Grammar lessons</h2><p class="muted">Thirteen short lessons. Pass each quiz with 3 of 4 correct.</p></section><div class="lessons">'
    +GRAMMAR.map((g,i)=>{ const p=S.grammar[g.id];
      return '<button class="lesson'+(p&&p.done?' pass':'')+'" data-act="openLesson" data-arg="'+i+'"><span class="ln">'+(p&&p.done?'✓':i+1)+'</span><span class="lt"><b>'+esc(g.title)+'</b><small>'+esc(g.sub)+'</small></span><span class="lres">'+(p?(p.done?'Passed · ':'')+p.best+'/'+g.quiz.length:'Not started')+'</span><span class="lpat" lang="ja">'+esc(g.pattern)+'</span></button>'; }).join('')+'</div>';
}

/* ---------- Quizzes ---------- */
function shuffleQ(x){
  const order=shuffle(x.o.map((_,i)=>i));
  return {q:x.q, big:x.big||'', opts:order.map(i=>x.o[i]), a:order.indexOf(x.a), why:x.why};
}
function startQuiz(title,qs,meta){
  go(()=>{ ui.quiz={title:title,qs:qs,i:0,picked:null,score:0,finished:false,meta:meta}; });
}
function vocabQuizQs(n){
  return shuffle(VOCAB).slice(0,n).map(w=>{
    const same=VOCAB.filter(x=>x.id!==w.id&&x.tag===w.tag&&x.en!==w.en);
    const pool=same.length>=3?same:VOCAB.filter(x=>x.id!==w.id&&x.en!==w.en);
    const seen={}; seen[w.en]=1; const others=[];
    shuffle(pool).forEach(x=>{ if(others.length<3&&!seen[x.en]){ seen[x.en]=1; others.push(x.en); } });
    return shuffleQ({q:'What does this mean?', big:w.jp, o:[w.en].concat(others), a:0, why:w.jp+(w.kana!==w.jp?' ('+w.kana+')':'')+' means “'+w.en+'”.'});
  });
}
function kanjiQuizQs(n){
  const words=[]; KANJI.forEach(k=>k.ex.forEach(e=>words.push({w:e[0],r:e[1],g:e[2]})));
  const seenW={}; const uniq=words.filter(x=>seenW[x.w]?false:(seenW[x.w]=1));
  return shuffle(uniq).slice(0,n).map(p=>{
    const cand=uniq.filter(x=>x.r!==p.r).map(x=>({x:x,s:Math.abs(x.r.length-p.r.length)+Math.random()*1.5})).sort((a,b)=>a.s-b.s);
    const seen={}; seen[p.r]=1; const others=[];
    cand.forEach(c=>{ if(others.length<3&&!seen[c.x.r]){ seen[c.x.r]=1; others.push(c.x.r); } });
    return shuffleQ({q:'How do you read this word?', big:p.w, o:[p.r].concat(others), a:0, why:p.w+' is read '+p.r+' and means “'+p.g+'”.'});
  });
}
function pickAnswer(i){
  const q=ui.quiz; if(!q||q.finished||q.picked!==null) return;
  q.picked=i;
  if(i===q.qs[q.i].a) q.score++;
  bump(1); commit(); render();
}
function nextQuestion(){
  const q=ui.quiz; if(!q||q.picked===null) return;
  if(q.i+1<q.qs.length){ q.i++; q.picked=null; }
  else {
    q.finished=true;
    if(q.meta.type==='lesson'){
      const g=GRAMMAR[q.meta.idx], p=S.grammar[g.id]||{best:0,tries:0,done:false,at:0};
      p.best=Math.max(p.best,q.score); p.tries++; p.at=Date.now();
      if(q.score>=3) p.done=true;
      S.grammar[g.id]=p; commit();
    }
  }
  render(); window.scrollTo(0,0);
}
function quizHtml(){
  const q=ui.quiz;
  const head='<div class="sess-head"><button class="btn link" data-act="quizExit">← Exit</button><div class="prog"><i style="width:'+((q.finished?q.qs.length:q.i)/q.qs.length*100)+'%"></i></div><span class="count">'+Math.min(q.i+1,q.qs.length)+' / '+q.qs.length+'</span></div>';
  if(q.finished){
    const n=q.qs.length, lesson=q.meta.type==='lesson', pass=q.score>=3;
    let msg='';
    if(lesson) msg = pass ? 'Passed. This lesson is marked complete.' : 'Not yet. Read the lesson again and retry.';
    else msg = q.score===n ? 'Perfect score.' : q.score>=n*0.7 ? 'Solid work.' : 'Keep practicing, it comes with repetition.';
    let btns='';
    if(lesson){
      btns='<button class="btn primary" data-act="lessonBack">Back to lesson</button><button class="btn" data-act="lessonQuiz" data-arg="'+q.meta.idx+'">Retake</button>'+(pass&&q.meta.idx+1<GRAMMAR.length?'<button class="btn" data-act="gopen" data-arg="'+(q.meta.idx+1)+'">Next lesson</button>':'');
    } else {
      btns='<button class="btn primary" data-act="'+(q.meta.type==='vocab'?'vquiz':'kquiz')+'">New quiz</button><button class="btn" data-act="quizExit">Done</button>';
    }
    return head+'<section class="panel done"><p class="eyebrow">'+esc(q.title)+'</p><div class="big">'+q.score+'/'+n+'</div><p>'+msg+'</p><div class="actions">'+btns+'</div></section>';
  }
  const qq=q.qs[q.i], answered=q.picked!==null;
  const opts=qq.opts.map((o,i)=>{
    let cls='opt'; if(answered){ if(i===qq.a) cls+=' ok'; else if(i===q.picked) cls+=' bad'; }
    return '<button class="'+cls+'" data-act="pick" data-arg="'+i+'"'+(answered?' disabled':'')+'><span class="l">'+'ABCD'[i]+'</span><span class="t" lang="ja">'+esc(o)+'</span></button>';
  }).join('');
  const ok=answered&&q.picked===qq.a;
  const fb=answered?'<div class="fb '+(ok?'good':'bad')+'"><b>'+(ok?'Correct.':'Not quite.')+'</b> '+esc(qq.why)+'</div><button class="btn primary wide" data-act="next">'+(q.i+1<q.qs.length?'Next question':'See result')+'</button>':'';
  return head+'<section class="panel" style="display:grid;gap:14px"><p class="q-label">'+esc(q.title)+'</p>'
    +(qq.big?'<div class="q-big" lang="ja">'+esc(qq.big)+'</div>':'')
    +'<p class="q-text'+(qq.big?'':' lg')+'">'+esc(qq.q)+'</p><div class="opts">'+opts+'</div>'+fb+'</section>';
}

/* ---------- Events ---------- */
function act(a,arg){
  switch(a){
    case 'tab': go(()=>{ ui.tab=arg; ui.lesson=null; ui.kanji=null; ui.confirmReset=false; }); break;
    case 'review': startSession(arg,'due'); break;
    case 'learn': startSession(arg,'new'); break;
    case 'reveal': if(ui.session){ ui.session.revealed=true; render(); } break;
    case 'grade': gradeCurrent(+arg); break;
    case 'exit': go(()=>{ ui.session=null; }); break;
    case 'say': speak(arg); break;
    case 'openLesson': go(()=>{ ui.lesson=+arg; }); break;
    case 'gopen': go(()=>{ ui.quiz=null; ui.tab='grammar'; ui.lesson=+arg; }); break;
    case 'closeLesson': go(()=>{ ui.lesson=null; }); break;
    case 'lessonBack': go(()=>{ ui.quiz=null; }); break;
    case 'lessonQuiz': { const i=+arg, g=GRAMMAR[i]; startQuiz('Lesson '+(i+1)+': '+g.title, shuffle(g.quiz).map(shuffleQ), {type:'lesson',idx:i}); break; }
    case 'vquiz': startQuiz('Vocabulary quiz', vocabQuizQs(10), {type:'vocab'}); break;
    case 'kquiz': startQuiz('Kanji reading quiz', kanjiQuizQs(10), {type:'kanji'}); break;
    case 'pick': pickAnswer(+arg); break;
    case 'next': nextQuestion(); break;
    case 'quizExit': go(()=>{ ui.quiz=null; }); break;
    case 'openKanji': go(()=>{ ui.kanji=arg; }); break;
    case 'closeKanji': go(()=>{ ui.kanji=null; }); break;
    case 'addCard': if(!S.cards[arg]){ S.cards[arg]=newCard(Date.now()); commit(); render(); } break;
    case 'filter': ui.vf=arg; render(); break;
    case 'dir': S.settings.recall=(arg==='recall'); commit(); render(); break;
    case 'resetAsk': ui.confirmReset=true; render(); break;
    case 'resetNo': ui.confirmReset=false; render(); break;
    case 'resetGo': {
      const keep=Date.now();
      S=defaultState(); S.resetAt=keep; ui.confirmReset=false; commit(); render(); break; }
  }
}
document.addEventListener('click',function(e){
  const b=e.target.closest('[data-act]'); if(!b) return;
  act(b.dataset.act,b.dataset.arg);
});
document.addEventListener('input',function(e){
  if(e.target&&e.target.id==='vq'){ ui.vq=e.target.value; const l=$('#vlist'); if(l) l.innerHTML=vocabListHtml(); }
});
document.addEventListener('keydown',function(e){
  const t=e.target; if(t&&t!==document.body&&t!==document.documentElement) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(ui.session&&ui.session.queue.length){
    if((e.key===' '||e.key==='Enter')&&!ui.session.revealed){ e.preventDefault(); act('reveal'); }
    else if(ui.session.revealed&&'1234'.indexOf(e.key)>=0&&e.key.length===1){ e.preventDefault(); gradeCurrent(+e.key-1); }
  } else if(ui.quiz&&!ui.quiz.finished){
    if(ui.quiz.picked===null&&'1234'.indexOf(e.key)>=0&&e.key.length===1){ const i=+e.key-1; if(i<ui.quiz.qs[ui.quiz.i].opts.length) pickAnswer(i); }
    else if(ui.quiz.picked!==null&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); nextQuestion(); }
  }
});

/*TEST_HOOK*/
render();
initRemote();
})();
