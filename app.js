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
// Voices come from the device (they load asynchronously). The chosen one is a per-device preference,
// kept in localStorage rather than in synced progress, because each device has different voices.
const VOICE_KEY='jp-study.voice';
let voicesChecked=false;
function jaVoices(){ try{ return CAN_SPEAK?speechSynthesis.getVoices().filter(v=>/^ja\b|^ja[-_]/i.test(v.lang)):[]; }catch(e){ return []; } }
function voicePref(){ try{ return localStorage.getItem(VOICE_KEY)||''; }catch(e){ return ''; } }
function setVoicePref(uri){ try{ if(uri) localStorage.setItem(VOICE_KEY,uri); else localStorage.removeItem(VOICE_KEY); }catch(e){} }
// Gender from well-known voice names (Apple, Microsoft, Google, Amazon). Unknown names get no label.
const VOICE_MALE=/otoya|hattori|ichiro|keita|daichi|naoki|takumi/i, VOICE_FEMALE=/kyoko|o-?ren|haruka|ayumi|sayaka|nanami|mizuki|aoi|mayu|shiori|kazuha|tomoko|google/i;
function voiceGender(v){ return VOICE_MALE.test(v.name)?'male':VOICE_FEMALE.test(v.name)?'female':''; }
function speak(t,uri){ try{ if(!CAN_SPEAK) return; const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; u.rate=0.9;
  const want=uri===undefined?voicePref():uri, v=want&&jaVoices().find(x=>x.voiceURI===want); if(v){ u.voice=v; u.lang=v.lang; }
  if(speechSynthesis.speaking||speechSynthesis.pending){ speechSynthesis.cancel(); setTimeout(()=>{ try{ speechSynthesis.speak(u); }catch(e){} },25); }
  else speechSynthesis.speak(u); }catch(e){} }
// Speaker buttons hide once we know the device has no Japanese voice.
function canSpeakJa(){ return CAN_SPEAK&&(!voicesChecked||jaVoices().length>0); }
const SPK_SVG='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
function spk(t){ return canSpeakJa() ? '<button class="icon-btn" data-act="say" data-arg="'+esc(t)+'" aria-label="Play audio">'+SPK_SVG+'</button>' : ''; }

/* ---------- Japanese text ---------- */
// Sentences use {漢字|かんじ} for ruby and [..] for the highlighted word or grammar point (see data.js).
const KANJI_RE=/[\u3400-\u4dbf\u4e00-\u9fff々]/;
function jpPlain(s){ return String(s).replace(/\{([^|}]*)\|[^}]*\}/g,'$1').replace(/[\[\]]/g,''); }
// Romaji to hiragana/katakana conversion for search on mobile/desktop without switching IME.
const ROMAJI_MAP={
  kya:'きゃ',kyu:'きゅ',kyo:'きょ',sha:'しゃ',shu:'しゅ',sho:'しょ',cha:'ちゃ',chu:'ちゅ',cho:'ちょ',
  nya:'にゃ',nyu:'にゅ',nyo:'にょ',hya:'ひゃ',hyu:'ひゅ',hyo:'ひょ',mya:'みゃ',myu:'みゅ',myo:'みょ',
  rya:'りゃ',ryu:'りゅ',ryo:'りょ',gya:'ぎゃ',gyu:'ぎゅ',gyo:'ぎょ',ja:'じゃ',ju:'じゅ',jo:'じょ',
  bya:'びゃ',byu:'びゅ',byo:'びょ',pya:'ぴゃ',pyu:'ぴゅ',pyo:'ぴょ',
  shi:'し',chi:'ち',tsu:'つ',fu:'ふ',
  ka:'か',ki:'き',ku:'く',ke:'け',ko:'こ',sa:'さ',su:'す',se:'せ',so:'そ',ta:'た',te:'て',to:'と',
  na:'な',ni:'に',nu:'ぬ',ne:'ね',no:'の',ha:'は',hi:'ひ',he:'へ',ho:'ほ',ma:'ま',mi:'み',mu:'む',me:'め',mo:'も',
  ya:'や',yu:'ゆ',yo:'よ',ra:'ら',ri:'り',ru:'る',re:'れ',ro:'ろ',wa:'わ',wo:'を',
  ga:'が',gi:'ぎ',gu:'ぐ',ge:'げ',go:'ご',za:'ざ',ji:'じ',zu:'ず',ze:'ぜ',zo:'ぞ',
  da:'だ',di:'ぢ',du:'づ',de:'で',do:'ど',ba:'ば',bi:'び',bu:'ぶ',be:'べ',bo:'ぼ',
  pa:'ぱ',pi:'ぴ',pu:'ぷ',pe:'ぺ',po:'ぽ',
  a:'あ',i:'い',u:'う',e:'え',o:'お',nn:'ん','-':'ー'
};
function romajiToKana(s){
  s=String(s).toLowerCase().trim();
  let out='', i=0; const n=s.length;
  while(i<n){
    if(s[i]==='n'&&(i+1===n||(s[i+1]!=='n'&&!'aiueoy'.includes(s[i+1])))){ out+='ん'; if(s[i+1]==='n') i++; i++; continue; }
    if(i+1<n&&s[i]===s[i+1]&&'bcdfghjklmpqrstvwxyz'.includes(s[i])){ out+='っ'; i++; continue; }
    let matched=false;
    for(const len of [3,2,1]){
      const sub=s.slice(i,i+len);
      if(ROMAJI_MAP[sub]){ out+=ROMAJI_MAP[sub]; i+=len; matched=true; break; }
    }
    if(!matched){ out+=s[i]; i++; }
  }
  return out;
}
const toKata=s=>s.replace(/[\u3041-\u3096]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
// Vocab ids whose written form contains each kanji.
const WORDS_WITH={};
VOCAB.forEach(v=>{ new Set([...v.jp].filter(ch=>KANJI_RE.test(ch))).forEach(ch=>{ (WORDS_WITH[ch]=WORDS_WITH[ch]||[]).push(v.id); }); });
const wellKnown=id=>isKnown(id)||status(S.cards[id])==='mature';
// A kanji is known once a vocab word containing it is known or mature (or the kanji itself is, from the hidden Kanji tab).
function kanjiKnown(ch){ return wellKnown('k:'+ch)||(WORDS_WITH[ch]||[]).some(wellKnown); }
// Furigana setting: 'auto' shows it over kanji not yet known (see kanjiKnown), 'on' always, 'off' never.
function showFuri(base){ const m=S.settings.furi; if(m==='on') return true; if(m==='off') return false; return [...base].some(ch=>KANJI_RE.test(ch)&&!kanjiKnown(ch)); }
// Hidden furigana stays in the layout and can be tapped to show. opts.hideMark also hides it inside the highlight.
function jpHtml(s,opts){
  opts=opts||{}; let out='', inMark=false, m;
  const re=/\{([^|}]*)\|([^}]*)\}|\[|\]|[^{[\]]+/g;
  while((m=re.exec(s))){
    if(m[1]!==undefined){
      const show=!(inMark&&opts.hideMark)&&showFuri(m[1]);
      out+='<ruby'+(show?'':' class="fh" data-act="furi" title="Tap for reading"')+'>'+esc(m[1])+'<rt>'+esc(m[2])+'</rt></ruby>';
    } else if(m[0]==='['){ out+='<mark>'; inMark=true; }
    else if(m[0]===']'){ out+='</mark>'; inMark=false; }
    else out+=esc(m[0]);
  }
  return out;
}

/* ---------- State and storage ---------- */
const KEY='jp-study.progress.v1';
function defaultState(){ return {v:1,updatedAt:0,resetAt:0,cards:{},grammar:{},known:{},log:{},flags:{},settings:{recall:false,furi:'auto',order:['pol','cas','en'],off:[],autoSpeak:false}}; }
function normalize(o){
  const d=defaultState();
  if(!o||typeof o!=='object') return d;
  return {v:1, updatedAt:+o.updatedAt||0, resetAt:+o.resetAt||0,
    cards:(o.cards&&typeof o.cards==='object')?o.cards:{},
    grammar:(o.grammar&&typeof o.grammar==='object')?o.grammar:{},
    known:(o.known&&typeof o.known==='object')?o.known:{},
    log:(o.log&&typeof o.log==='object')?o.log:{},
    flags:(o.flags&&typeof o.flags==='object')?o.flags:{},
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
      else { o.best=Math.max(o.best||0,g.best||0); o.tries=Math.max(o.tries||0,g.tries||0); o.done=!!(o.done||g.done); o.read=Math.max(o.read||0,g.read||0); o.at=Math.max(o.at||0,g.at||0); }
    });
    Object.keys(src.known).forEach(id=>{
      const k=src.known[id]; if(!k||(k.at||0)<=ra) return;
      const o=out.known[id]; if(!o||(k.at||0)>(o.at||0)) out.known[id]=k;
    });
    Object.keys(src.log).forEach(k=>{ out.log[k]=Math.max(out.log[k]||0, src.log[k]||0); });
    Object.keys(src.flags||{}).forEach(k=>{ const f=src.flags[k], o=out.flags[k]; if(f&&(!o||(f.at||0)>(o.at||0))) out.flags[k]=f; });
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
const STATUS_LABEL={new:'New',learning:'Learning',young:'Young',mature:'Mature',known:'Known'};
// Known items (vocab, kanji or grammar ids) skip the review queue; their card, if any, is kept so unmarking resumes it.
// Stored as {on, at} rather than deleted so merge() can tell an unmark from a missing entry.
function isKnown(id){ const k=S.known[id]; return !!(k&&k.on); }
function setKnown(id,on){ S.known[id]={on:!!on,at:Date.now()}; }
function stateOf(id){ return isKnown(id)?'known':status(S.cards[id]); }
function lessonDone(g){ const p=S.grammar[g.id]; return isKnown(g.id)||!!(p&&p.done); }
function itemsOf(kind){ return kind==='vocab'?VOCAB:KANJI; }
function dueIds(kind,now){
  return itemsOf(kind).filter(it=>{const c=S.cards[it.id]; return c&&c.due<=now&&!isKnown(it.id);})
    .sort((a,b)=>S.cards[a.id].due-S.cards[b.id].due).map(it=>it.id);
}
// New vocab comes most frequent first (BCCWJ rank; unranked words last). Kanji keep list order.
const byRank=(a,b)=>(a.rank||1e9)-(b.rank||1e9);
function newIds(kind,n){ let l=itemsOf(kind).filter(it=>!S.cards[it.id]&&!isKnown(it.id)); if(kind==='vocab') l=l.slice().sort(byRank); return l.slice(0,n).map(it=>it.id); }
const isTop=w=>w.rank>0&&w.rank<=1000;
const lvBadge=w=>w.lv==='N5'?'':' <span class="lvb">'+w.lv+'</span>';
const TOP_BADGE='<span class="top1k" title="Among the 1,000 most frequent words in the BCCWJ corpus">Top 1000</span>';
function counts(kind){
  const c={new:0,learning:0,young:0,mature:0,known:0};
  itemsOf(kind).forEach(it=>{c[stateOf(it.id)]++;});
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
const ui={vtop:false,vlv:'',tab:'home',session:null,quiz:null,read:null,lesson:null,kanji:null,vocab:null,preview:[],vq:'',vf:'all',gq:'',gf:'all',glv:'',mark:false,confirmReset:false};
// The Kanji tab is hidden for now; set SHOW_KANJI to true to bring it back (its code and saved progress are kept).
const SHOW_KANJI=false;
const TABS=[['home','今日','Today'],['vocab','単語','Vocab'],['kanji','漢字','Kanji'],['grammar','文法','Grammar']].filter(x=>SHOW_KANJI||x[0]!=='kanji');
function go(fn){ fn(); render(); window.scrollTo(0,0); }

function render(){
  renderChrome();
  const m=$('#main');
  let h;
  if(ui.session) h=sessionHtml();
  else if(ui.quiz) h=quizHtml();
  else if(ui.read) h=readHtml();
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
  t.hidden=!!(ui.session||ui.quiz||ui.read);
  t.innerHTML=TABS.map(x=>'<button class="tab" role="tab" aria-selected="'+(ui.tab===x[0])+'" data-act="tab" data-arg="'+x[0]+'"><span class="tj" lang="ja">'+x[1]+'</span><span class="te">'+x[2]+'</span></button>').join('');
  renderFoot();
}
function renderFoot(){
  $('#foot').textContent = syncMode==='account' ? 'Progress is saved to your account and follows you across devices.' : 'Progress is saved in this browser only.';
}

/* ---------- Home ---------- */
function stackBar(kind){
  const c=counts(kind), n=c.new+c.learning+c.young+c.mature+c.known;
  const seg=(k,v)=>'<i style="width:'+(c[k]/n*100)+'%;background:var(--'+v+')"></i>';
  return '<div class="stack" role="img" aria-label="'+(n-c.new)+' of '+n+' started or known">'+seg('known','st-known')+seg('mature','st-mature')+seg('young','st-young')+seg('learning','st-learn')+'</div>';
}
function legend(kind){
  const c=counts(kind);
  const li=(k,v)=>'<span><i style="background:var(--'+v+')"></i>'+c[k]+' '+k+'</span>';
  return '<div class="legend">'+li('mature','st-mature')+li('young','st-young')+li('learning','st-learn')+li('new','st-new')+(c.known?li('known','st-known'):'')+'</div>';
}
function studyRow(kind){
  const now=Date.now(), items=itemsOf(kind), c=counts(kind);
  const due=dueIds(kind,now).length, nn=newIds(kind,5).length, started=items.length-c.new-c.known;
  return '<section class="panel row"><div class="row-head"><span class="tag-jp" lang="ja">'+(kind==='vocab'?'単語':'漢字')+'</span><div><h2>'+(kind==='vocab'?'Vocabulary':'Kanji')+'</h2><p class="muted">'+started+' of '+items.length+' started'+(c.known?' · '+c.known+' known':'')+' · '+due+' due now</p></div></div>'
   +stackBar(kind)
   +'<div class="actions"><button class="btn primary" data-act="review" data-arg="'+kind+'"'+(due?'':' disabled')+'>'+(due?'Review '+due:'Nothing due')+'</button><button class="btn" data-act="learn" data-arg="'+kind+'"'+(nn?'':' disabled')+'>Learn '+(nn?Math.min(5,nn)+' new':'new')+'</button>'+(kind==='vocab'?'<button class="btn" data-act="readVocab">Read sentences</button>':'')+'</div></section>';
}
function homeHtml(){
  const now=Date.now();
  const due=dueIds('vocab',now).length+(SHOW_KANJI?dueIds('kanji',now).length:0);
  const started=Object.keys(S.cards).length;
  const msg = started===0 ? 'Start with five new words.' : due>0 ? due+(due===1?' card is':' cards are')+' ready to review.' : 'You are all caught up.';
  const date=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const passed=GRAMMAR.filter(lessonDone).length;
  const nextG=GRAMMAR.findIndex(g=>!lessonDone(g));
  const grammarRow='<section class="panel row"><div class="row-head"><span class="tag-jp" lang="ja">文法</span><div><h2>Grammar</h2><p class="muted">'+passed+' of '+GRAMMAR.length+' lessons done or known</p></div></div>'
    +'<div class="stack" role="img" aria-label="'+passed+' of '+GRAMMAR.length+' lessons done or known"><i style="width:'+(passed/GRAMMAR.length*100)+'%;background:var(--st-mature)"></i></div>'
    +'<div class="actions">'+(nextG>=0?'<button class="btn primary" data-act="gopen" data-arg="'+nextG+'">Next: '+esc(GRAMMAR[nextG].level+' '+GRAMMAR[nextG].title)+'</button>':'<button class="btn" data-act="tab" data-arg="grammar">Review lessons</button>')+mixBtn()+'</div></section>';
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
    +studyRow('vocab')+(SHOW_KANJI?studyRow('kanji'):'')+grammarRow
    +'<section class="panel"><h3>Last 14 days</h3><div class="bars">'+bars+'</div><div class="barlab">'+labs+'</div><p class="muted" style="margin-top:8px;font-size:13px">'+total+' cards and sentences in two weeks</p></section>'
    +'<section class="panel settings"><div><h3 style="margin-bottom:8px">Card direction</h3><div class="seg" role="group" aria-label="Card direction"><button data-act="dir" data-arg="read" aria-pressed="'+(!dir)+'">日本語 → English</button><button data-act="dir" data-arg="recall" aria-pressed="'+dir+'">English → 日本語</button></div></div>'
    +'<div><h3 style="margin-bottom:8px">Furigana</h3><div class="seg three" role="group" aria-label="Furigana">'+[['auto','Unknown kanji'],['on','Always'],['off','Off']].map(x=>'<button data-act="furiMode" data-arg="'+x[0]+'" aria-pressed="'+(S.settings.furi===x[0])+'">'+x[1]+'</button>').join('')+'</div><p class="muted" style="margin-top:6px;font-size:13px">Hidden readings have a dotted underline: tap the word to show it.</p></div>'+linesSetting()+voiceSetting()+autoSpeakSetting()+backupSetting()+reset+'</section>';
}

// The last Japanese line that is on can't be hidden, so every example still shows some Japanese.
function lineLocked(k){ return k!=='en'&&lineOn(k)&&['pol','cas'].filter(lineOn).length===1; }
function linesSetting(){
  const hint={pol:'です / ます',cas:'だ / plain form',en:'translation'}, o=lineOrder();
  return '<div><h3 style="margin-bottom:8px">Example lines</h3><div class="lineset">'+o.map((k,i)=>{ const on=lineOn(k);
    return '<div class="lrow'+(on?'':' off')+'"><span class="reg">'+LINES[k]+'</span><span class="muted lhint" lang="ja">'+hint[k]+'</span>'
      +'<button class="icon-btn" data-act="lineMove" data-arg="'+k+':-1" aria-label="Move '+LINES[k]+' up"'+(i?'':' disabled')+'>↑</button>'
      +'<button class="icon-btn" data-act="lineMove" data-arg="'+k+':1" aria-label="Move '+LINES[k]+' down"'+(i<o.length-1?'':' disabled')+'>↓</button>'
      +'<button class="btn sm" data-act="lineToggle" data-arg="'+k+'" aria-pressed="'+on+'"'+(lineLocked(k)?' disabled title="Keep at least one Japanese line"':'')+'>'+(on?'Shown':'Hidden')+'</button></div>'; }).join('')
    +'</div><p class="muted" style="margin-top:6px;font-size:13px">Order and visibility for example sentences on cards, reading feeds and lesson pages.</p></div>';
}

function autoSpeakSetting(){
  if(!CAN_SPEAK) return '';
  const on=!!S.settings.autoSpeak;
  return '<div><h3 style="margin-bottom:8px">Audio autoplay</h3>'
    +'<div class="seg" role="group" aria-label="Audio autoplay">'
    +'<button data-act="autoSpeak" data-arg="0" aria-pressed="'+(!on)+'">Off</button>'
    +'<button data-act="autoSpeak" data-arg="1" aria-pressed="'+on+'">On (reviews & feeds)</button>'
    +'</div>'
    +'<p class="muted" style="margin-top:6px;font-size:13px">Automatically plays sentence audio when revealing a review card or viewing a sentence in reading feeds.</p></div>';
}

// Backup: progress lives only in this browser's storage, so export it to a file now and then.
// Import merges the file into what's here (newest wins per card), so nothing current is lost.
function backupSetting(){
  const nf=flaggedList().length;
  return '<div><h3 style="margin-bottom:8px">Backup</h3><div class="actions"><button class="btn sm" data-act="exportData">Export progress</button>'
    +'<label class="btn sm" for="importFile">Import…</label><input type="file" id="importFile" accept=".json,application/json" hidden></div>'
    +'<p class="muted" style="margin-top:6px;font-size:13px">Progress is saved in this browser only. Export a backup file now and then; importing merges it with what\'s here.</p>'
    +'<h3 style="margin:14px 0 8px">Flagged sentences</h3><p class="muted" style="font-size:13px">'+(nf?nf+' flagged. Copy the list and paste it to Claude to get them fixed.':'Tap the flag on any sentence that sounds unnatural. They collect here.')+'</p>'
    +(nf?'<div class="actions" style="margin-top:6px"><button class="btn sm" data-act="copyFlags">Copy list</button><button class="btn sm" data-act="clearFlags">Clear list</button></div>':'')
    +(ui.backupMsg?'<p class="backup-msg">'+esc(ui.backupMsg)+'</p>':'')+'</div>';
}
async function exportData(){
  try{
    const json=JSON.stringify({app:'jp-study',exportedAt:new Date().toISOString(),state:S},null,1);
    const filename='jp-study-backup-'+dayKey()+'.json';
    const blob=new Blob([json],{type:'application/json'});
    if(typeof navigator!=='undefined'&&navigator.canShare){
      try{
        const file=new File([blob],filename,{type:'application/json'});
        if(navigator.canShare({files:[file]})){
          await navigator.share({files:[file],title:filename});
          ui.backupMsg='Saved '+filename+'.';
          render();
          return;
        }
      }catch(err){
        if(err&&err.name==='AbortError') return;
      }
    }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    ui.backupMsg='Saved '+filename+'.';
  }catch(e){ ui.backupMsg='Export failed: '+e.message; }
  render();
}
function importData(text){
  try{
    const o=JSON.parse(text), st=normalize(o&&o.state?o.state:o);
    const n=Object.keys(st.cards).length;
    if(!n&&!Object.keys(st.known).length&&!Object.keys(st.grammar).length) throw new Error('no progress found in that file');
    S=merge(S,st); commit(); ui.backupMsg='Imported '+n+' cards from the backup.';
  }catch(e){ ui.backupMsg='Import failed: '+e.message; }
  render();
}
function copyFlags(){
  const t=flagsText();
  const done=()=>{ ui.backupMsg='Copied '+flaggedList().length+' flagged sentences.'; render(); };
  try{ navigator.clipboard.writeText(t).then(done,()=>{ ui.backupMsg='Copy failed. Here they are:\n'+t; render(); }); }
  catch(e){ ui.backupMsg='Here they are:\n'+t; render(); }
}
function voiceSetting(){
  let body;
  if(!CAN_SPEAK) body='<p class="muted" style="font-size:13px">This browser has no speech support.</p>';
  else if(voicesChecked&&!jaVoices().length) body='<p class="muted" style="font-size:13px">No Japanese voice on this device, so audio buttons are hidden. Installing a Japanese voice in the system speech settings adds them back.</p>';
  else {
    const cur=voicePref(), vs=jaVoices(), n={};
    const opt=(uri,label)=>'<option value="'+esc(uri)+'"'+(uri===cur?' selected':'')+'>'+esc(label)+'</option>';
    body='<div class="voicerow"><select id="voice" aria-label="Voice">'+opt('','Device default')
      +vs.map((v,i)=>{ const g=voiceGender(v); return opt(v.voiceURI,v.name+(g?' ('+g+')':'')); }).join('')
      +'</select><button class="btn sm" data-act="voiceTest">Play sample</button></div>'
      +'<p class="muted" style="margin-top:6px;font-size:13px">Voices come from your device, so the choice is saved on this device only.'+(vs.some(v=>!voiceGender(v))?' Unlabelled voices: play a sample to hear which is which.':'')+'</p>';
  }
  return '<div><h3 style="margin-bottom:8px">Voice</h3>'+body+'</div>';
}

/* ---------- Study sessions ---------- */
function startSession(kind,mode){
  const now=Date.now();
  const ids = mode==='due' ? dueIds(kind,now).slice(0,30) : newIds(kind,5);
  if(!ids.length) return;
  go(()=>{ ui.session={kind:kind,mode:mode,queue:ids.slice(),total:ids.length,done:0,again:0,known:0,revealed:false,grades:[0,0,0,0],pick:{}}; });
}
function gradeCurrent(g){
  const s=ui.session; if(!s||!s.queue.length||!s.revealed) return;
  const id=s.queue[0], now=Date.now();
  const prev=S.cards[id]||newCard(now);
  S.cards[id]=nextState(prev,g,now);
  if(s.pick[id]!==undefined){ S.cards[id].exi=s.pick[id]; delete s.pick[id]; }
  bump(1);
  s.queue.shift(); s.grades[g]++;
  if(g===0){ s.again++; s.queue.splice(Math.min(2,s.queue.length),0,id); } else { s.done++; }
  s.revealed=false;
  commit(); render(); window.scrollTo(0,0);
}
function knowCurrent(){
  const s=ui.session; if(!s||!s.queue.length) return;
  const id=s.queue[0];
  setKnown(id,true);
  s.queue=s.queue.filter(x=>x!==id); s.total--; s.known++;
  s.revealed=false;
  commit(); render(); window.scrollTo(0,0);
}
function bigCls(t){ const n=[...t].length; return n<=2?'xl':n<=4?'lg':'md'; }
// Each example has up to three lines: formal (です/ます), casual (plain form) and English.
// Their order and which ones show are settings (S.settings.order / .off), changed on the Today tab.
const LINES={pol:'formal',cas:'casual',en:'English'};
function lineOrder(){ const o=S.settings.order; return Array.isArray(o)&&o.length===3&&['pol','cas','en'].every(k=>o.includes(k))?o:['pol','cas','en']; }
function lineOn(k){ const off=S.settings.off; return !(Array.isArray(off)&&off.includes(k)); }
// Lines for one example {jp, en, cas}. A missing casual version is skipped, and if no Japanese line would
// show, the formal one does. opts: big (card/feed size), noEn, noSpk, flag (source label: adds a flag button
// to the last row), plus jpHtml's opts.
function exLines(e,opts){
  const o=opts||{};
  let ks=lineOrder().filter(k=>lineOn(k)&&(k!=='cas'||e.cas));
  if(!ks.some(k=>k!=='en')) ks=lineOrder().filter(k=>k==='pol'||ks.includes(k));
  if(o.noEn) ks=ks.filter(k=>k!=='en');
  return ks.map((k,i)=>{
    const tag='<span class="reg">'+LINES[k]+'</span>', fl=(o.flag&&i===ks.length-1)?flagBtn(e,o.flag):'';
    if(k==='en') return '<div class="ex-row line"><span class="'+(o.big?'sent-en':'enl')+'">'+tag+'<span>'+esc(e.en)+'</span></span>'+fl+'</div>';
    const s=k==='pol'?e.jp:e.cas;
    return '<div class="ex-row line"><span class="'+(o.big?'sent':'jpl')+'" lang="ja">'+tag+'<span>'+jpHtml(s,o)+'</span></span>'+(o.noSpk?'':spk(jpPlain(s)))+fl+'</div>';
  }).join('');
}
function exBlock(jp,en,cas,src){ return '<div class="ex">'+exLines({jp:jp,en:en,cas:cas},{flag:src})+'</div>'; }
// Flagged sentences (S.flags, keyed by the polite sentence) collect ones that sound off, to fix in one pass later.
// FLAG_SRC remembers what each rendered button points at, so a tap can store the whole example.
const FLAG_SRC={};
const FLAG_SVG='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
function isFlagged(jp){ const f=S.flags[jp]; return !!(f&&f.on); }
function flagBtn(e,src){ FLAG_SRC[e.jp]={jp:e.jp,cas:e.cas||'',en:e.en,src:src};
  const on=isFlagged(e.jp);
  return '<button class="icon-btn flag" data-act="flag" data-arg="'+esc(e.jp)+'" aria-pressed="'+on+'" aria-label="'+(on?'Unflag this sentence':'Flag this sentence as unnatural')+'" title="'+(on?'Flagged':'Flag as unnatural')+'">'+FLAG_SVG+'</button>'; }
function toggleFlag(jp){ const on=!isFlagged(jp), d=FLAG_SRC[jp]||S.flags[jp]||{jp:jp};
  S.flags[jp]={jp:d.jp,cas:d.cas||'',en:d.en||'',src:d.src||'',on:on,at:Date.now()}; commit(); }
function flaggedList(){ return Object.values(S.flags).filter(f=>f.on).sort((a,b)=>a.at-b.at); }
function flagsText(){ return flaggedList().map((f,i)=>(i+1)+'. ['+f.src+'] '+jpPlain(f.jp)+(f.cas?' / '+jpPlain(f.cas):'')+' — '+f.en).join('\n'); }
// Vocab cards rotate through the word's example sentences, so the prompt changes between reviews.
// Vocab cards show a random example sentence, never the one shown at the previous review (card.exi).
// The pick is held in the session so it stays put while the card is on screen.
function cardExample(it){
  const s=ui.session, c=S.cards[it.id];
  if(!s) return it.ex[0];
  if(s.pick[it.id]===undefined){
    let idx=it.ex.map((_,i)=>i).filter(i=>!c||i!==c.exi);
    if(!idx.length) idx=[0];
    s.pick[it.id]=idx[Math.floor(Math.random()*idx.length)];
  }
  return it.ex[s.pick[it.id]];
}
function cardFaces(it,kind,recall){
  const front=[], back=[];
  if(kind==='vocab'){
    const e=cardExample(it);
    if(!recall){
      front.push('<div class="lines">'+exLines(e,{big:true,noEn:true,noSpk:true,hideMark:true})+'</div>');
      back.push('<div class="face md" lang="ja" style="padding:0">'+esc(it.jp)+'</div>');
      { const pr=pitchFor(it); if(pr||it.kana!==it.jp) back.push('<div class="reading" lang="ja"><span>'+(pr||esc(it.kana))+'</span>'+spk(it.kana.split('・')[0])+'</div>'); }
      back.push('<div class="gloss">'+esc(it.en)+'</div>');
      back.push('<div class="ex-row"><span class="sent-en">'+(lineOn('en')?'<span class="reg">English</span>'+esc(e.en):'')+'</span>'+spk(jpPlain(e.jp))+flagBtn(e,it.jp)+'</div>');
    } else {
      front.push('<div class="face en">'+esc(it.en)+'</div>');
      back.push('<div class="face '+bigCls(it.jp)+'" lang="ja" style="padding:0">'+esc(it.jp)+'</div>');
      { const pr=pitchFor(it); if(pr||it.kana!==it.jp) back.push('<div class="reading" lang="ja">'+(pr||esc(it.kana))+'</div>'); }
      back.push(exBlock(e.jp,e.en,e.cas,it.jp));
    }
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
      +'<div class="facts"><span><b>'+acc+'%</b> got it first time</span><span><b>'+s.again+'</b> repeated</span>'+(s.known?'<span><b>'+s.known+'</b> marked known</span>':'')+(nxt?'<span>Next review <b>'+nxt+'</b></span>':'')+'</div>'
      +'<div class="actions"><button class="btn primary" data-act="exit">Back</button>'+(more?'<button class="btn" data-act="learn" data-arg="'+s.kind+'">Learn 5 more</button>':'')+'</div></section>';
  }
  const id=s.queue[0], it=ITEM[id], c=S.cards[id], now=Date.now(), recall=!!S.settings.recall;
  const f=cardFaces(it,s.kind,recall);
  const top='<div class="card-top"><span>'+(s.kind==='vocab'?esc(it.tag)+(isTop(it)?' '+TOP_BADGE:'')+lvBadge(it):'Kanji')+'</span>'+(c?'<span class="stat st-'+status(c)+'">'+STATUS_LABEL[status(c)]+'</span>':'<span class="pill">New</span>')+'</div>';
  let ctrl;
  if(!s.revealed){
    ctrl='<button class="btn primary wide" data-act="reveal">Show answer</button><p class="keyhint">Space, Enter or tap card · R audio</p>';
  } else {
    const base=c||newCard(now);
    const names=['Again','Hard','Good','Easy'], cols=['again','hard','good','easy'];
    ctrl='<div class="grades">'+names.map((nm,g)=>'<button class="grade" style="--c:var(--'+cols[g]+')" data-act="grade" data-arg="'+g+'"><b>'+nm+'</b><small>'+fmtIv(base,g,now)+'</small></button>').join('')+'</div><p class="keyhint">Keys 1 to 4 · R audio</p>';
  }
  ctrl+='<button class="btn link know" data-act="knowCur">I already know this <kbd>K</kbd></button>';
  const cardAct=!s.revealed?' data-act="reveal" role="button" tabindex="0" aria-label="Show answer"':'';
  return head+'<article class="card'+(!s.revealed?' tap-reveal':'')+'"'+cardAct+'>'+top+f.front+(s.revealed?'<hr class="divider"><div class="back">'+f.back+'</div>':'')+'</article>'+ctrl;
}

/* ---------- Pitch accent ---------- */
// PITCH (pitch.js) gives each word's downstep: 0 = flat, 1 = high then low, n = drops after the n-th mora.
// Drawn as a line over the high morae, with a tick where the pitch rises or drops. The empty slot at the end
// stands for a following particle, which is what tells a flat word (particle stays high) from one that drops on its last mora.
// A phrase like 役に立つ has two accent phrases: its reading separates them with a space ('やくに たつ') and its
// downstep is a list with one number per phrase ([2,1]). The highs are joined into one line, so the rise into the
// second phrase gets a tick.
const SMALL_KANA=/[ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ]/;
function morae(s){ const out=[]; for(const ch of s){ if(SMALL_KANA.test(ch)&&out.length) out[out.length-1]+=ch; else out.push(ch); } return out; }
function pitchHtml(reading,n){
  const parts=Array.isArray(n)?reading.split(' '):[reading], ns=Array.isArray(n)?n:[n];
  const ms=[], hs=[], kinds=[];
  parts.forEach((r,j)=>{
    const pm=morae(r), M=pm.length, k=ns[j], hi=i=>k===0?i>=1:k===1?i===0:(i>=1&&i<k);
    pm.forEach((m,i)=>{ ms.push(m); hs.push(hi(i)); });
    if(j===parts.length-1) hs.push(hi(M));
    kinds.push((parts.length>1?r+' ':'')+(k===0?'flat':k===1?'drops after the first sound':k===M?'drops after the last sound':'drops after sound '+k));
  });
  const L=ms.length, cls=i=>(hs[i]?' h':'')+(hs[i]&&i>0&&!hs[i-1]?' up':'')+(hs[i]&&i<L&&!hs[i+1]?' dn':'');
  return '<span class="pitch" title="Pitch accent '+ns.join('+')+': '+kinds.join(', then ')+'">'+ms.map((m,i)=>'<span class="m'+cls(i)+'">'+esc(m)+'</span>').join('')+'<span class="m pt'+cls(L)+'"></span></span>';
}
function pitchFor(w){
  const p=typeof PITCH!=='undefined'&&PITCH[w.id]; if(!p) return '';
  return p.map(x=>x[1].slice(0,2).map(n=>pitchHtml(x[0],n)).join('<span class="psep">・</span>')).join('<span class="psep">・</span>');
}

/* ---------- Vocab tab ---------- */
function markBtn(){ return '<button class="btn'+(ui.mark?' primary':'')+'" data-act="markMode" aria-pressed="'+ui.mark+'">'+(ui.mark?'Done marking':'Mark known')+'</button>'; }
function markHint(){ return ui.mark?'<p class="markhint">Tap what you already know. Known items leave the review queue; tap again to bring one back.</p>':''; }
function knowBtn(id){ return '<button class="btn" data-act="toggleKnown" data-arg="'+esc(id)+'">'+(isKnown(id)?'Unmark known':'I know this')+'</button>'; }
function vocabRows(){
  const q=ui.vq.trim().toLowerCase(), f=ui.vf;
  const qh=q?romajiToKana(q):'', qk=qh?toKata(qh):'';
  return VOCAB.filter(w=>{
    if(f!=='all'&&stateOf(w.id)!==f) return false;
    if(ui.vtop&&!isTop(w)) return false;
    if(ui.vlv&&w.lv!==ui.vlv) return false;
    if(!q) return true;
    const hay=(w.jp+' '+w.kana+' '+w.en+' '+w.tag).toLowerCase();
    return hay.includes(q)||(qh&&hay.includes(qh))||(qk&&hay.includes(qk));
  });
}
function vocabListHtml(){
  const rows=vocabRows();
  if(!rows.length) return '<p class="muted" style="padding:12px 4px">No words match.</p>';
  if(ui.mark){
    const on=rows.filter(w=>isKnown(w.id)).length;
    return '<div class="bulk"><span class="muted">'+rows.length+' shown</span><button class="btn" data-act="markShown" data-arg="1"'+(on<rows.length?'':' disabled')+'>Mark all shown known</button><button class="btn" data-act="markShown" data-arg="0"'+(on?'':' disabled')+'>Unmark all shown</button></div>'
      +rows.map(w=>{ const st=stateOf(w.id);
        return '<button class="vrow mrow" data-act="toggleKnown" data-arg="'+esc(w.id)+'" aria-pressed="'+(st==='known')+'"><span class="vjp" lang="ja">'+esc(w.jp)+'</span><span class="vmid"><span class="vkana" lang="ja">'+(w.kana!==w.jp?esc(w.kana):'')+'</span><span class="ven">'+esc(w.en)+'</span></span><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span></button>'; }).join('');
  }
  return rows.map(w=>{
    const st=stateOf(w.id);
    return '<button class="vrow" data-act="openVocab" data-arg="'+esc(w.id)+'"><span class="vjp" lang="ja">'+esc(w.jp)+'</span><span class="vmid"><span class="vkana" lang="ja">'+((pitchFor(w)||(w.kana!==w.jp?esc(w.kana):''))+' ')+(isTop(w)?TOP_BADGE:'')+lvBadge(w)+'</span><span class="ven">'+esc(w.en)+'</span></span><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span></button>';
  }).join('');
}
function vocabDetailHtml(){
  const w=ITEM[ui.vocab];
  if(!w){ ui.vocab=null; return vocabHtml(); }
  const st=stateOf(w.id), c=S.cards[w.id];
  const rows=vocabRows();
  const list=rows.some(x=>x.id===w.id)?rows:VOCAB;
  const idx=list.indexOf(w);
  const prevW=list[(idx+list.length-1)%list.length];
  const nextW=list[(idx+1)%list.length];

  let cardStatText='';
  if(isKnown(w.id)){
    cardStatText='Marked as known · skipped in review queue';
  } else if(c){
    const now=Date.now();
    const dueIn=c.due<=now?'due now':'due in '+Math.max(1,Math.round((c.due-now)/86400000))+'d';
    cardStatText='Interval '+c.int+'d · '+c.reps+' review'+(c.reps===1?'':'s')+' · '+dueIn;
  } else {
    cardStatText='New word · not yet in review queue';
  }
  const pr=pitchFor(w);
  return '<div class="lesson-view"><div><button class="btn link" data-act="closeVocab">← All vocabulary</button></div>'
    +'<div class="titleline"><span class="ln" style="grid-row:auto">'+esc(w.lv||'N5')+'</span><div>'
    +'<p class="eyebrow">'+esc(w.tag)+(isTop(w)?' · '+TOP_BADGE:'')+(w.rank?' · BCCWJ #'+w.rank:'')+'</p>'
    +'<h1 style="font-size:clamp(28px,7vw,38px);line-height:1.2" lang="ja">'+esc(w.jp)+'</h1>'
    +(pr||w.kana!==w.jp?'<p class="reading" lang="ja" style="font-size:22px;margin-top:2px;justify-content:flex-start">'+(pr||esc(w.kana))+'</p>':'')
    +'<p style="font-size:18px;margin-top:4px">'+esc(w.en)+'</p>'
    +'</div></div>'
    +'<div class="actions">'
    +(canSpeakJa()?'<button class="btn" data-act="say" data-arg="'+esc(w.kana.split('・')[0])+'">Play audio</button>':'')
    +knowBtn(w.id)
    +(S.cards[w.id]||st==='known'?'':'<button class="btn primary" data-act="addCard" data-arg="'+esc(w.id)+'">Add to reviews</button>')
    +'<button class="btn" data-act="openVocab" data-arg="'+esc(prevW.id)+'">← Previous</button>'
    +'<button class="btn" data-act="openVocab" data-arg="'+esc(nextW.id)+'">Next →</button>'
    +'</div>'
    +'<p class="muted" style="font-size:13px"><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span> · '+esc(cardStatText)+'</p>'
    +'<section class="panel" style="display:grid;gap:10px"><h3>Example sentences ('+w.ex.length+')</h3>'
    +w.ex.map(e=>exBlock(e.jp,e.en,e.cas,w.jp)).join('')
    +'</section></div>';
}
function vocabHtml(){
  if(ui.vocab!==null) return vocabDetailHtml();
  const now=Date.now(), due=dueIds('vocab',now).length, nn=newIds('vocab',5).length;
  const chips=['all','new','learning','young','mature','known'].map(k=>'<button class="chip" data-act="filter" data-arg="'+k+'" aria-pressed="'+(ui.vf===k)+'">'+(k==='all'?'All':STATUS_LABEL[k])+'</button>').join('')+'<button class="chip" data-act="vtop" aria-pressed="'+ui.vtop+'">Top 1000</button>'+['N5','N4'].map(l=>'<button class="chip" data-act="vlv" data-arg="'+l+'" aria-pressed="'+(ui.vlv===l)+'">'+l+'</button>').join('');
  return '<section class="panel row"><div><h2>Vocabulary</h2><p class="muted">'+VOCAB.length+' words with example sentences ('+['N5','N4'].map(l=>VOCAB.filter(w=>w.lv===l).length+' '+l).join(', ')+')</p></div>'+stackBar('vocab')+legend('vocab')
    +'<div class="actions"><button class="btn primary" data-act="review" data-arg="vocab"'+(due?'':' disabled')+'>'+(due?'Review '+due:'Nothing due')+'</button><button class="btn" data-act="learn" data-arg="vocab"'+(nn?'':' disabled')+'>Learn '+(nn?Math.min(5,nn)+' new':'new')+'</button><button class="btn" data-act="readVocab">Read sentences</button><button class="btn" data-act="vquiz">Quick quiz</button>'+markBtn()+'</div>'+markHint()+'</section>'
    +'<div class="toolbar"><input class="search" id="vq" type="search" placeholder="Search words, readings or meanings" aria-label="Search words" value="'+esc(ui.vq)+'"><div class="chips">'+chips+'</div></div>'
    +'<div class="vlist" id="vlist">'+vocabListHtml()+'</div>'
    +'<p class="muted credits">Word list: JLPT lists by Jonathan Waller (<a href="https://www.tanos.co.uk/jlpt/">tanos.co.uk</a>, CC BY). Frequency: BCCWJ word frequency lists (NINJAL). Pitch accent: <a href="https://github.com/mifunetoshiro/kanjium">Kanjium</a> and <a href="https://en.wiktionary.org/">Wiktionary</a> (CC BY-SA 4.0).</p>';
}

/* ---------- Kanji tab ---------- */
function kanjiHtml(){
  if(ui.kanji){
    const k=ITEM['k:'+ui.kanji]; const i=KANJI.indexOf(k); const st=stateOf(k.id);
    return '<section class="panel kd"><div class="kd-top"><button class="btn" data-act="closeKanji">← All kanji</button><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span></div>'
      +'<div class="kd-char" lang="ja">'+esc(k.ch)+'</div><h2>'+esc(k.en)+'</h2>'
      +'<dl class="kv"><dt>On’yomi</dt><dd lang="ja">'+esc(k.on)+'</dd><dt>Kun’yomi</dt><dd lang="ja">'+esc(k.kun)+'</dd><dt>Strokes</dt><dd>'+k.st+'</dd></dl>'
      +'<div class="words">'+k.ex.map(w=>'<div class="word"><span class="w" lang="ja">'+esc(w[0])+'</span><span class="wm"><span class="wr" lang="ja">'+esc(w[1])+'</span><span>'+esc(w[2])+'</span></span>'+spk(w[1])+'</div>').join('')+'</div>'
      +'<div class="actions"><button class="btn" data-act="openKanji" data-arg="'+esc(KANJI[(i+KANJI.length-1)%KANJI.length].ch)+'">← Previous</button>'
      +knowBtn(k.id)+(S.cards[k.id]||st==='known'?'':'<button class="btn primary" data-act="addCard" data-arg="'+esc(k.id)+'">Add to reviews</button>')
      +'<button class="btn" data-act="openKanji" data-arg="'+esc(KANJI[(i+1)%KANJI.length].ch)+'">Next →</button></div></section>';
  }
  const now=Date.now(), due=dueIds('kanji',now).length, nn=newIds('kanji',5).length;
  const tiles=KANJI.map(k=>{ const st=stateOf(k.id); return '<button class="ktile st-'+st+'" '+(ui.mark?'data-act="toggleKnown" data-arg="'+esc(k.id)+'" aria-pressed="'+(st==='known')+'"':'data-act="openKanji" data-arg="'+esc(k.ch)+'"')+' aria-label="'+esc(k.ch+', '+k.en)+'"><span class="kc" lang="ja">'+esc(k.ch)+'</span><span class="km">'+esc(k.en)+'</span></button>'; }).join('');
  return '<section class="panel row"><div><h2>Kanji</h2><p class="muted">'+KANJI.length+' kanji from the N5 level, with readings and words</p></div>'+stackBar('kanji')+legend('kanji')
    +'<div class="actions"><button class="btn primary" data-act="review" data-arg="kanji"'+(due?'':' disabled')+'>'+(due?'Review '+due:'Nothing due')+'</button><button class="btn" data-act="learn" data-arg="kanji"'+(nn?'':' disabled')+'>Learn '+(nn?Math.min(5,nn)+' new':'new')+'</button><button class="btn" data-act="kquiz">Reading quiz</button>'+markBtn()+'</div>'+markHint()+'</section>'
    +'<div class="kgrid">'+tiles+'</div>';
}

/* ---------- Grammar tab ---------- */
// Each lesson feed session shows this many of the lesson's examples, picked at random.
const FEED_N=10;
function feedLen(g){ return Math.min(FEED_N,g.ex.length); }
function lessonNum(i){ const lv=GRAMMAR[i].level; return GRAMMAR.slice(0,i+1).filter(g=>g.level===lv).length; }
function lessonStatus(g){
  const p=S.grammar[g.id];
  if(isKnown(g.id)) return 'Known';
  if(p&&p.done) return 'Done';
  if(p&&p.read) return 'Read '+Math.min(p.read,feedLen(g))+'/'+feedLen(g);
  if(p&&p.tries) return 'Quiz '+p.best+'/'+g.quiz.length;
  return p?'Opened':'Not started';
}
// Opening a lesson records it, so its sentences join the mixed reading feed.
// It also picks three random examples to preview; they stay the same until the lesson is opened again.
// Opening a lesson adds it to the Mixed reading pool. Swiping between lessons only browses (browse=true): those
// lessons join the pool once their feed or quiz is used.
function openLesson(i,browse){ const g=GRAMMAR[i]; if(!browse&&!S.grammar[g.id]){ S.grammar[g.id]={best:0,tries:0,done:false,read:0,at:Date.now()}; commit(); } ui.lesson=i; ui.preview=shuffle(g.ex).slice(0,3); }
function mixLessons(){ return GRAMMAR.filter(g=>S.grammar[g.id]||isKnown(g.id)); }
function mixBtn(){ return mixLessons().length?'<button class="btn" data-act="readMix">Mixed reading</button>':''; }
function grammarHtml(){
  if(ui.lesson!==null){
    const g=GRAMMAR[ui.lesson], i=ui.lesson, p=S.grammar[g.id];
    return '<div class="lesson-view"><div><button class="btn link" data-act="closeLesson">← All lessons</button></div>'
      +'<div class="titleline"><span class="ln" style="grid-row:auto">'+lessonNum(i)+'</span><div><p class="eyebrow">'+esc(g.level)+'</p><h1 style="font-size:24px">'+esc(g.title)+'</h1><p class="muted">'+esc(g.sub)+'</p></div></div>'
      +'<div class="pattern" lang="ja">'+esc(g.pattern)+'</div>'
      +'<div class="actions"><button class="btn primary" data-act="readLesson" data-arg="'+i+'">Read '+feedLen(g)+' examples</button><button class="btn" data-act="lessonQuiz" data-arg="'+i+'">Quiz</button>'+knowBtn(g.id)+'</div>'
      +'<p class="muted" style="font-size:13px">'+esc(lessonStatus(g))+(p&&p.tries?' · best quiz '+p.best+'/'+g.quiz.length:'')+'</p>'
      +'<details class="how"><summary>How it works</summary><ul class="notes">'+g.notes.map(n=>'<li>'+n+'</li>').join('')+'</ul></details>'
      +'<section class="panel" style="display:grid;gap:10px"><h3>Examples</h3>'+ui.preview.map(e=>exBlock(e[0],e[1],e[2],GRAMMAR[ui.lesson].title)).join('')+'</section></div>';
  }
  const chips=Object.keys(GSTATE_LABEL).map(k=>'<button class="chip" data-act="gfilter" data-arg="'+k+'" aria-pressed="'+(ui.gf===k)+'">'+GSTATE_LABEL[k]+'</button>').join('')
    +['N5','N4'].map(l=>'<button class="chip" data-act="glv" data-arg="'+l+'" aria-pressed="'+(ui.glv===l)+'">'+l+'</button>').join('');
  return '<section class="glist-head"><div><h2>Grammar lessons</h2><p class="muted">Read lots of examples for each pattern. Quizzes are optional.</p></div><div class="actions">'+mixBtn()+markBtn()+'</div>'+markHint()+'</section>'
    +'<div class="toolbar"><input class="search" id="gq" type="search" placeholder="Search titles, patterns or notes" aria-label="Search lessons" value="'+esc(ui.gq)+'"><div class="chips">'+chips+'</div></div>'
    +'<div class="lessons" id="glist">'+lessonListHtml()+'</div>';
}
// Lesson list filters: search (title, description, pattern, notes; romaji works), progress, and level.
const GSTATE_LABEL={all:'All',new:'Not started',started:'In progress',done:'Done',known:'Known'};
function gstate(g){ const p=S.grammar[g.id]; return isKnown(g.id)?'known':p&&p.done?'done':p?'started':'new'; }
function lessonListHtml(){
  const q=ui.gq.trim().toLowerCase(), qh=q?romajiToKana(q):'', qk=qh?toKata(qh):'';
  let level='';
  const rows=GRAMMAR.map((g,i)=>[g,i]).filter(([g])=>{
    if(ui.gf!=='all'&&gstate(g)!==ui.gf) return false;
    if(ui.glv&&g.level!==ui.glv) return false;
    if(!q) return true;
    const hay=(g.title+' '+g.sub+' '+g.pattern+' '+g.notes.join(' ')).replace(/<[^>]+>/g,'').toLowerCase();
    return hay.includes(q)||(qh&&hay.includes(qh))||(qk&&hay.includes(qk));
  });
  if(!rows.length) return '<p class="muted" style="padding:8px 2px">No lessons match.</p>';
  return rows.map(([g,i])=>{ const kn=isKnown(g.id), done=kn||lessonDone(g);
    const head=g.level!==level?'<h3 class="lvl">'+esc(g.level)+'</h3>':''; level=g.level;
    return head+'<button class="lesson'+(kn?' known':done?' pass':'')+'" '+(ui.mark?'data-act="toggleKnown" data-arg="'+esc(g.id)+'" aria-pressed="'+kn+'"':'data-act="openLesson" data-arg="'+i+'"')+'><span class="ln">'+(done?'✓':lessonNum(i))+'</span><span class="lt"><b>'+esc(g.title)+'</b><small>'+esc(g.sub)+'</small></span><span class="lres">'+esc(lessonStatus(g))+'</span><span class="lpat" lang="ja">'+esc(g.pattern)+'</span></button>'; }).join('');
}

/* ---------- Reading feed ---------- */
// One sentence at a time: read it, optionally reveal the English, move on. No grading.
function startRead(title,items,meta){
  go(()=>{
    ui.read={title:title,items:items,i:0,shown:false,meta:meta};
    if(S.settings.autoSpeak&&items.length) speak(jpPlain(items[0].jp));
  });
}
function readLesson(i){ const g=GRAMMAR[i]; startRead(g.level+' · '+g.title, shuffle(g.ex.map(e=>({jp:e[0],en:e[1],cas:e[2]||'',g:i}))).slice(0,FEED_N), {type:'lesson',idx:i}); }
function readMix(){
  const items=[]; mixLessons().forEach(g=>{ const i=GRAMMAR.indexOf(g); g.ex.forEach(e=>items.push({jp:e[0],en:e[1],cas:e[2]||'',g:i})); });
  if(items.length) startRead('Mixed reading', shuffle(items).slice(0,20), {type:'mix'});
}
// Vocab reading: random example sentences from words you've started or marked known, topped up with the
// most frequent new words so it's useful from day one. Nothing to grade.
const VREAD_N=20;
function vocabReadPool(){
  const pool=VOCAB.filter(w=>S.cards[w.id]||isKnown(w.id));
  if(pool.length<40) VOCAB.filter(w=>!S.cards[w.id]&&!isKnown(w.id)).sort(byRank).slice(0,40-pool.length).forEach(w=>pool.push(w));
  return pool;
}
function readVocab(){
  const pairs=[]; vocabReadPool().forEach(w=>w.ex.forEach(e=>pairs.push({jp:e.jp,en:e.en,cas:e.cas,w:w.id})));
  const seen=new Set(), items=[];
  shuffle(pairs).forEach(p=>{ if(items.length<VREAD_N&&!seen.has(p.w)){ seen.add(p.w); items.push(p); } });
  startRead('Vocab reading', items, {type:'vocab'});
}
function readNext(){
  const r=ui.read; if(!r||r.i>=r.items.length) return;
  bump(1);
  if(r.meta.type==='lesson'){
    const g=GRAMMAR[r.meta.idx], p=S.grammar[g.id]||{best:0,tries:0,done:false,read:0,at:0};
    p.read=Math.max(p.read||0,r.i+1); p.at=Date.now();
    if(r.i+1>=r.items.length) p.done=true;
    S.grammar[g.id]=p;
  }
  commit();
  r.i++; r.shown=false;
  render(); window.scrollTo(0,0);
  if(S.settings.autoSpeak&&r.i<r.items.length) speak(jpPlain(r.items[r.i].jp));
}
function readHtml(){
  const r=ui.read, n=r.items.length;
  const head='<div class="sess-head"><button class="btn link" data-act="readExit">← Back</button><div class="prog"><i style="width:'+(r.i/n*100)+'%"></i></div><span class="count">'+Math.min(r.i+1,n)+' / '+n+'</span></div>';
  if(r.i>=n){
    const lesson=r.meta.type==='lesson', nx=lesson?r.meta.idx+1:-1;
    const btns=lesson
      ? '<button class="btn primary" data-act="readExit">Back to lesson</button><button class="btn" data-act="readLesson" data-arg="'+r.meta.idx+'">Read again</button>'+(nx<GRAMMAR.length?'<button class="btn" data-act="gopen" data-arg="'+nx+'">Next lesson</button>':'')
      : '<button class="btn primary" data-act="'+(r.meta.type==='vocab'?'readVocab':'readMix')+'">More sentences</button><button class="btn" data-act="readExit">Done</button>';
    return head+'<section class="panel done"><p class="eyebrow">'+esc(r.title)+'</p><div class="big">'+n+'</div><p>sentences read</p><div class="actions">'+btns+'</div></section>';
  }
  const it=r.items[r.i], w=it.w&&ITEM[it.w], g=w?null:GRAMMAR[it.g];
  const label=w?w.jp+(w.kana!==w.jp?' · '+w.kana:'')+' · '+w.en:r.meta.type==='mix'?g.level+' · '+g.title:g.pattern;
  const top='<div class="card-top"><span'+(w?' lang="ja"':'')+'>'+esc(label)+'</span>'+flagBtn(it,w?w.jp:g.title)+'</div>';
  const enOn=lineOn('en'), shown=r.shown||!enOn;
  const ctrl=shown
    ? '<button class="btn primary wide" data-act="readNext">Next</button>'
    : '<div class="grades two"><button class="btn primary" data-act="readShow">Show English</button><button class="btn" data-act="readNext">Next →</button></div>';
  return head+'<article class="card">'+top+'<div class="lines">'+exLines(it,{big:true,noEn:!r.shown})+'</div></article>'+ctrl+'<p class="keyhint">'+(enOn?'Space: English, then next':'Space: next')+' · → skip ahead · R audio</p>';
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
let vocabScroll=0, lessonScroll=0, kanjiScroll=0;
function act(a,arg){
  switch(a){
    case 'home': vocabScroll=0; lessonScroll=0; kanjiScroll=0; go(()=>{ ui.tab='home'; ui.session=null; ui.quiz=null; ui.read=null; ui.lesson=null; ui.kanji=null; ui.vocab=null; ui.mark=false; ui.confirmReset=false; }); break;
    case 'tab': vocabScroll=0; lessonScroll=0; kanjiScroll=0; go(()=>{ ui.tab=arg; ui.lesson=null; ui.kanji=null; ui.vocab=null; ui.mark=false; ui.confirmReset=false; }); break;
    case 'review': startSession(arg,'due'); break;
    case 'learn': startSession(arg,'new'); break;
    case 'reveal':
      if(ui.session){
        ui.session.revealed=true;
        render();
        if(S.settings.autoSpeak){
          const id=ui.session.queue[0], it=ITEM[id];
          if(it){
            if(ui.session.kind==='vocab'){
              const ex=cardExample(it); speak(jpPlain(ex.jp));
            } else {
              speak(it.ex&&it.ex[0]?it.ex[0][1]:(it.kun||it.on));
            }
          }
        }
      }
      break;
    case 'grade': gradeCurrent(+arg); break;
    case 'exit': go(()=>{ ui.session=null; }); break;
    case 'say': speak(arg); break;
    case 'openLesson': if(ui.lesson===null) lessonScroll=window.scrollY; go(()=>{ openLesson(+arg); }); break;
    case 'gopen': go(()=>{ ui.quiz=null; ui.read=null; ui.tab='grammar'; openLesson(+arg); }); break;
    case 'readLesson': readLesson(+arg); break;
    case 'readMix': readMix(); break;
    case 'readVocab': readVocab(); break;
    case 'flag': toggleFlag(arg); render(); break;
    case 'exportData': exportData(); break;
    case 'copyFlags': copyFlags(); break;
    case 'clearFlags': flaggedList().forEach(f=>{ f.on=false; f.at=Date.now(); }); commit(); ui.backupMsg='Cleared the flagged list.'; render(); break;
    case 'readShow': if(ui.read){ ui.read.shown=true; render(); } break;
    case 'readNext': readNext(); break;
    case 'readExit': go(()=>{ ui.read=null; }); break;
    case 'voiceTest': speak('こんにちは。日本語を勉強しましょう。'); break;
    case 'furiMode': S.settings.furi=arg; commit(); render(); break;
    case 'autoSpeak': S.settings.autoSpeak=(arg==='1'); commit(); render(); break;
    case 'lineMove': { const k=arg.split(':')[0], o=lineOrder().slice(), i=o.indexOf(k), j=i+(+arg.split(':')[1]);
      if(i>=0&&j>=0&&j<o.length){ o[i]=o[j]; o[j]=k; S.settings.order=o; commit(); render(); } } break;
    case 'lineToggle': { if(!LINES[arg]||lineLocked(arg)) break;
      const off=(Array.isArray(S.settings.off)?S.settings.off:[]).filter(x=>x!==arg); if(lineOn(arg)) off.push(arg);
      S.settings.off=off; commit(); render(); } break;
    case 'closeLesson': ui.lesson=null; render(); window.scrollTo(0,lessonScroll); break;
    case 'lessonBack': go(()=>{ ui.quiz=null; }); break;
    case 'lessonQuiz': { const i=+arg, g=GRAMMAR[i]; startQuiz(g.level+' · '+g.title, shuffle(g.quiz).map(shuffleQ), {type:'lesson',idx:i}); break; }
    case 'vquiz': startQuiz('Vocabulary quiz', vocabQuizQs(10), {type:'vocab'}); break;
    case 'kquiz': startQuiz('Kanji reading quiz', kanjiQuizQs(10), {type:'kanji'}); break;
    case 'pick': pickAnswer(+arg); break;
    case 'next': nextQuestion(); break;
    case 'quizExit': go(()=>{ ui.quiz=null; }); break;
    case 'openKanji': if(ui.kanji===null) kanjiScroll=window.scrollY; go(()=>{ ui.kanji=arg; }); break;
    case 'closeKanji': ui.kanji=null; render(); window.scrollTo(0,kanjiScroll); break;
    // The list's scroll position is kept only when leaving the list, not on Previous/Next from a detail page.
    case 'openVocab': if(ui.vocab===null) vocabScroll=window.scrollY; go(()=>{ ui.vocab=arg; }); break;
    case 'closeVocab': ui.vocab=null; render(); window.scrollTo(0,vocabScroll); break;
    case 'addCard': if(!S.cards[arg]){ S.cards[arg]=newCard(Date.now()); commit(); render(); } break;
    case 'filter': ui.vf=arg; render(); break;
    case 'vtop': ui.vtop=!ui.vtop; render(); break;
    case 'vlv': ui.vlv=ui.vlv===arg?'':arg; render(); break;
    case 'gfilter': ui.gf=arg; render(); break;
    case 'glv': ui.glv=ui.glv===arg?'':arg; render(); break;
    case 'knowCur': knowCurrent(); break;
    case 'markMode': ui.mark=!ui.mark; render(); break;
    case 'toggleKnown': setKnown(arg,!isKnown(arg)); commit(); render(); break;
    case 'markShown': { const on=arg==='1'; vocabRows().forEach(w=>{ if(isKnown(w.id)!==on) setKnown(w.id,on); }); commit(); render(); break; }
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
  if(b.dataset.act==='furi'){ b.classList.toggle('fs'); return; }
  act(b.dataset.act,b.dataset.arg);
});
document.addEventListener('change',function(e){
  if(e.target&&e.target.id==='importFile'&&e.target.files&&e.target.files[0]){ const f=e.target.files[0]; f.text().then(importData,()=>{ ui.backupMsg='Could not read that file.'; render(); }); return; }
  if(e.target&&e.target.id==='voice'){ setVoicePref(e.target.value); speak('こんにちは。日本語を勉強しましょう。'); }
});
// Offline support and home-screen install (sw.js). Only over http(s); file:// can't register workers.
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){ try{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }catch(e){} }
if(CAN_SPEAK){
  // Re-render only where it matters, so a late voice list doesn't reset a search box or a card.
  const voicesReady=()=>{ voicesChecked=true; if(!jaVoices().length||(ui.tab==='home'&&!ui.session&&!ui.quiz&&!ui.read)) render(); };
  try{ speechSynthesis.addEventListener('voiceschanged',voicesReady); }catch(e){}
  setTimeout(()=>{ if(!voicesChecked) voicesReady(); },2000);
}
document.addEventListener('input',function(e){
  if(e.target&&e.target.id==='vq'){ ui.vq=e.target.value; const l=$('#vlist'); if(l) l.innerHTML=vocabListHtml(); }
  if(e.target&&e.target.id==='gq'){ ui.gq=e.target.value; const l=$('#glist'); if(l) l.innerHTML=lessonListHtml(); }
});
document.addEventListener('keydown',function(e){
  const t=e.target; if(t&&t!==document.body&&t!==document.documentElement) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(ui.session&&ui.session.queue.length){
    if((e.key===' '||e.key==='Enter')&&!ui.session.revealed){ e.preventDefault(); act('reveal'); }
    else if(ui.session.revealed&&'1234'.indexOf(e.key)>=0&&e.key.length===1){ e.preventDefault(); gradeCurrent(+e.key-1); }
    else if(e.key==='k'||e.key==='K'){ e.preventDefault(); knowCurrent(); }
    else if(e.key==='r'||e.key==='R'||e.key==='s'||e.key==='S'){
      e.preventDefault();
      const id=ui.session.queue[0], it=ITEM[id];
      if(it){
        if(ui.session.kind==='vocab'){
          const ex=cardExample(it); speak(jpPlain(ex.jp));
        } else {
          speak(it.ex&&it.ex[0]?it.ex[0][1]:(it.kun||it.on));
        }
      }
    }
  } else if(ui.read&&ui.read.i<ui.read.items.length){
    if(e.key===' '||e.key==='Enter'){ e.preventDefault(); if(ui.read.shown||!lineOn('en')) readNext(); else act('readShow'); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); readNext(); }
    else if(e.key==='r'||e.key==='R'||e.key==='s'||e.key==='S'){ e.preventDefault(); speak(jpPlain(ui.read.items[ui.read.i].jp)); }
  } else if(ui.quiz&&!ui.quiz.finished){
    if(ui.quiz.picked===null&&'1234'.indexOf(e.key)>=0&&e.key.length===1){ const i=+e.key-1; if(i<ui.quiz.qs[ui.quiz.i].opts.length) pickAnswer(i); }
    else if(ui.quiz.picked!==null&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); nextQuestion(); }
  } else if(ui.vocab!==null&&!ui.session&&!ui.quiz&&!ui.read){
    if(e.key==='ArrowLeft'){
      e.preventDefault();
      const rows=vocabRows(), list=rows.some(w=>w.id===ui.vocab)?rows:VOCAB;
      const idx=list.findIndex(w=>w.id===ui.vocab);
      if(idx>=0) act('openVocab', list[(idx+list.length-1)%list.length].id);
    } else if(e.key==='ArrowRight'){
      e.preventDefault();
      const rows=vocabRows(), list=rows.some(w=>w.id===ui.vocab)?rows:VOCAB;
      const idx=list.findIndex(w=>w.id===ui.vocab);
      if(idx>=0) act('openVocab', list[(idx+1)%list.length].id);
    } else if(e.key==='Escape'||e.key==='Backspace'){
      e.preventDefault();
      act('closeVocab');
    } else if(e.key==='r'||e.key==='R'||e.key==='s'||e.key==='S'){
      e.preventDefault();
      const w=ITEM[ui.vocab];
      if(w) speak(w.kana.split('・')[0]);
    } else if(e.key==='k'||e.key==='K'){
      e.preventDefault();
      const w=ITEM[ui.vocab];
      if(w) act('toggleKnown', w.id);
    }
  }
});
let touchStartX=0, touchStartY=0, touchStartTime=0;
document.addEventListener('touchstart',function(e){
  if(e.touches.length===1){
    touchStartX=e.touches[0].clientX;
    touchStartY=e.touches[0].clientY;
    touchStartTime=Date.now();
  }
},{passive:true});
document.addEventListener('touchend',function(e){
  if(e.changedTouches.length!==1) return;
  const dx=e.changedTouches[0].clientX-touchStartX;
  const dy=e.changedTouches[0].clientY-touchStartY;
  const dt=Date.now()-touchStartTime;
  if(dt>600||Math.abs(dx)<48||Math.abs(dy)>Math.abs(dx)*0.75) return;
  if(ui.read&&ui.read.i<ui.read.items.length){
    if(dx<0){ if(ui.read.shown||!lineOn('en')) readNext(); else act('readShow'); }
  } else if(ui.session&&ui.session.queue.length){
    if(dx<0&&!ui.session.revealed) act('reveal');
  } else if(ui.vocab!==null&&!ui.session&&!ui.quiz&&!ui.read){
    const rows=vocabRows(), list=rows.some(w=>w.id===ui.vocab)?rows:VOCAB;
    const idx=list.findIndex(w=>w.id===ui.vocab);
    if(idx>=0){
      if(dx<0) act('openVocab', list[(idx+1)%list.length].id);
      else if(dx>0) act('openVocab', list[(idx+list.length-1)%list.length].id);
    }
  } else if(ui.lesson!==null&&!ui.session&&!ui.quiz&&!ui.read){
    const j=ui.lesson+(dx<0?1:-1);
    if(j>=0&&j<GRAMMAR.length) go(()=>{ openLesson(j,true); });
  }
},{passive:true});

/*TEST_HOOK*/
render();
initRemote();
})();
