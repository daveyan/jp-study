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
function speak(t,uri){ try{ if(!CAN_SPEAK) return; const u=new SpeechSynthesisUtterance(t); u.lang='ja-JP'; u.rate=+S.settings.rate||0.9;
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
// Hidden furigana stays in the layout and can be tapped to show.
// Words found in VOCAB are wrapped in <span class="lk" data-lk=id> so a tap opens the lookup sheet; a word split
// by the highlight gets one span per piece, sharing data-g.
let LKG=0;
function jpHtml(s,opts){
  opts=opts||{};
  const atoms=[], re=/\{([^|}]*)\|([^}]*)\}|\[|\]|[^{[\]]/g; let m, plain='';
  while((m=re.exec(s))){
    if(m[1]!==undefined) atoms.push({b:m[1],r:m[2]});
    else if(m[0]==='[') atoms.push({o:1});
    else if(m[0]===']') atoms.push({x:1});
    else atoms.push({b:m[0]});
  }
  const starts=[];
  atoms.forEach(a=>{ if(a.b!==undefined){ a.p=plain.length; starts.push(a.p); plain+=a.b; } });
  const at={}; lookupSegs(plain,starts).forEach(g=>{ g.g=++LKG; at[g.s]=g; });
  let out='', cur=null, open=false;
  atoms.forEach(a=>{
    if(a.o||a.x){ if(open){ out+='</span>'; open=false; } out+=a.o?'<mark>':'</mark>'; return; }
    if(cur&&a.p>=cur.e){ if(open) out+='</span>'; open=false; cur=null; }
    if(!cur&&at[a.p]) cur=at[a.p];
    if(cur&&!open){ out+='<span class="lk" tabindex="0" role="button" aria-haspopup="dialog" data-lk="'+esc(cur.id)+'" data-g="'+cur.g+'">'; open=true; }
    if(a.r!==undefined){
      const show=showFuri(a.b);
      out+='<ruby'+(show?'':' class="fh" data-act="furi" title="Tap for reading"')+'>'+esc(a.b)+'<rt>'+esc(a.r)+'</rt></ruby>';
    } else out+=esc(a.b);
  });
  if(open) out+='</span>';
  return out;
}

/* ---------- Word lookup ---------- */
// Finds vocab words in a sentence's plain text. Matches start and end on ruby/character boundaries, longest first.
// exact: written forms with kanji, all-katakana words, and the noun part of する verbs. stem: verbs and い-adjectives
// minus their last kana, which match only when followed by kana an inflection can start with (飲 + み/ま/ん…).
// Hiragana keys (kana-only words, and the kana spelling of non-verbs like おいしい) need 4+ characters; shorter ones
// turn up inside too many other words. A ます-stem noun (休み, 帰り) followed by a verb ending reads as the verb.
let LK=null;
const KATA_RE=/^[\u30a1-\u30fa\u30fc]+$/, HIRA_RE=/[\u3041-\u3096]/;
const GODAN_NEXT={'う':'わいうえおっ','く':'かきくけこいっ','ぐ':'がぎぐげごい','す':'さしすせそ','つ':'たちつてとっ','ぬ':'なにぬねのん','ぶ':'ばびぶべぼん','む':'まみむめもん'};
function lookupIndex(){
  if(LK) return LK;
  const exact=new Map(), stem=new Map(), ws=VOCAB.slice().sort(byRank), hasK=t=>KANJI_RE.test(t);
  const HIRA_ONLY=/^[\u3041-\u3096ー]+$/;
  ws.forEach(w=>{ if(w.jp[0]!=='～'&&(hasK(w.jp)||KATA_RE.test(w.jp))&&!exact.has(w.jp)) exact.set(w.jp,w.id); });
  ws.forEach(w=>{
    if(w.jp[0]==='～'||w.tag==='Verbs') return;
    w.kana.split('・').forEach(k=>{
      if(k.length<4||!HIRA_ONLY.test(k)) return;
      if(!exact.has(k)) exact.set(k,w.id);
      if(w.tag==='Adjectives'&&k.slice(-1)==='い'&&!stem.has(k.slice(0,-1))) stem.set(k.slice(0,-1),{id:w.id,nx:'いくかけさそす'});
    });
  });
  ws.forEach(w=>{
    const jp=w.jp, last=jp.slice(-1), base=jp.slice(0,-1);
    if(jp[0]==='～') return;
    if(jp.length>2&&jp.endsWith('する')){ const n=jp.slice(0,-2); if((hasK(n)||KATA_RE.test(n))&&!exact.has(n)) exact.set(n,w.id); return; }
    if(!hasK(base)) return;
    const nx=w.tag==='Adjectives'&&last==='い'?'いくかけさそす':last==='る'?'*':GODAN_NEXT[last];
    if(nx&&!stem.has(base)) stem.set(base,{id:w.id,nx:nx});
  });
  let max=1; exact.forEach((v,k)=>{ max=Math.max(max,k.length); }); stem.forEach((v,k)=>{ max=Math.max(max,k.length); });
  return LK={exact:exact,stem:stem,max:max};
}
function lookupSegs(plain,starts){
  const ix=lookupIndex(), n=plain.length, B=new Set(starts.concat([n])), out=[];
  const isKata=c=>!!c&&KATA_RE.test(c);
  for(let k=0;k<starts.length;k++){
    const i=starts[k]; if(out.length&&i<out[out.length-1].e) continue;
    for(let L=Math.min(ix.max,n-i);L>0;L--){
      const e=i+L; if(!B.has(e)) continue;
      const sub=plain.slice(i,e), st=ix.stem.get(sub), ex=ix.exact.get(sub);
      if(st&&e<n&&(st.nx==='*'?HIRA_RE.test(plain[e]):st.nx.indexOf(plain[e])>=0)){ out.push({s:i,e:e,id:st.id}); break; }
      if(ex&&HIRA_RE.test(sub[0])&&'てで'.indexOf(plain[i-1]||'')>=0) continue;  // てください etc. are auxiliaries
      if(ex&&!(KATA_RE.test(sub)&&(isKata(plain[i-1])||isKata(plain[e])))){
        const vs=L>1&&HIRA_RE.test(sub.slice(-1))&&'まなそやすた'.indexOf(plain[e]||'')>=0?ix.stem.get(sub.slice(0,-1)):null;
        if(vs&&vs.nx!=='*'&&vs.nx.indexOf(sub.slice(-1))>=0) out.push({s:i,e:e-1,id:vs.id});
        else if(vs&&vs.nx==='*') out.push({s:i,e:e-1,id:vs.id});
        else out.push({s:i,e:e,id:ex});
        break;
      }
    }
  }
  return out;
}
// The lookup sheet: a panel fixed to the bottom of the screen, outside #main so re-renders don't touch it.
let LKOPEN=null, LKFROM=null;
function lookupHtml(id){
  const w=ITEM[id], st=stateOf(id), pr=pitchFor(w);
  return '<div class="lk-sheet-in"><div class="lk-head"><div><div class="lk-jp" lang="ja">'+esc(w.jp)+'</div>'
    +(pr||w.kana!==w.jp?'<div class="reading lk-rd" lang="ja">'+(pr||esc(w.kana))+'</div>':'')+'</div>'
    +'<button class="icon-btn" data-act="lkClose" aria-label="Close">✕</button></div>'
    +'<p class="lk-en">'+esc(w.en)+'</p>'
    +'<p class="lk-meta"><span class="lvb">'+esc(w.lv||'N5')+'</span><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span>'+(S.cards[id]&&S.cards[id].tap&&st!=='known'?'<span>Looked up: comes back sooner</span>':'')+'</p>'
    +lookupExamples(w)
    +'<div class="actions">'+(canSpeakJa()?'<button class="btn" data-act="say" data-arg="'+esc(w.kana.split('・')[0])+'">Play audio</button>':'')
    +(!S.cards[id]&&st!=='known'?'<button class="btn" data-act="lkAdd" data-arg="'+esc(id)+'">Add to reviews</button>':'')
    +(ui.session||ui.quiz?'':'<button class="btn primary" data-act="lkOpen" data-arg="'+esc(id)+'">Open word</button>')+'</div></div>';
}
// Two of the word's other sentences (not the one on screen), so a lookup shows the word in more than one context.
function lookupExamples(w){
  const cur=ui.read&&ui.read.items[ui.read.i], ex=shuffle(w.ex.filter(e=>!cur||e.jp!==cur.jp)).slice(0,2);
  return ex.map(e=>'<div class="lk-ex"><p class="lk-exj" lang="ja">'+jpHtml(e.jp)+'</p><p class="lk-exe">'+esc(e.en)+'</p></div>').join('');
}
// Looking a word up in a reading feed means it isn't solid yet. If it's in your reviews (and not known), its next
// pass counts as Hard instead of Good (card.tap, cleared by reviewPass), and if it was due after tomorrow it now
// comes back tomorrow. Words without a card are left alone; the sheet offers Add to reviews.
function noteTap(id){
  const c=S.cards[id]; if(!ui.read||!c||c.tap||isKnown(id)) return;
  const t=dayStartPlus(Date.now(),1); c.tap=Date.now(); if(c.due>t) c.due=t; commit();
}
function openLookup(id,el){
  if(!ITEM[id]) return;
  let sh=$('#lk-sheet');
  if(!sh){ sh=document.createElement('div'); sh.id='lk-sheet'; sh.setAttribute('role','dialog'); sh.setAttribute('aria-label','Word lookup'); document.body.appendChild(sh); }
  sh.innerHTML=lookupHtml(id); sh.classList.add('open'); LKOPEN=id;
  document.querySelectorAll('.lk.on').forEach(x=>x.classList.remove('on'));
  if(el) document.querySelectorAll('.lk[data-g="'+el.dataset.g+'"]').forEach(x=>x.classList.add('on'));
  // Keyboard users land on the sheet's close button and return to the word they came from.
  LKFROM=el||null;
  const close=sh.querySelector('.lk-head button'); if(close) close.focus({preventScroll:true});
}
function closeLookup(){
  const sh=$('#lk-sheet'); if(sh) sh.classList.remove('open');
  LKOPEN=null; document.querySelectorAll('.lk.on').forEach(x=>x.classList.remove('on'));
  if(LKFROM&&document.contains(LKFROM)) LKFROM.focus({preventScroll:true});
  LKFROM=null;
}

/* ---------- State and storage ---------- */
const KEY='jp-study.progress.v1';
function defaultState(){ return {v:1,updatedAt:0,resetAt:0,cards:{},grammar:{},known:{},log:{},flags:{},settings:{recall:false,furi:'auto',order:['pol','cas','en'],off:[],autoSpeak:false,spread:true,listen:false,rate:0.9,goal:60}}; }
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
// New vocab comes N5 first, then N4; within a level most frequent first (BCCWJ rank; unranked words last).
// Kanji keep list order.
const byRank=(a,b)=>(a.rank||1e9)-(b.rank||1e9);
const LEVEL_ORDER={N5:0,N4:1,N3:2};
const byLearnOrder=(a,b)=>((LEVEL_ORDER[a.lv||'N5'])-(LEVEL_ORDER[b.lv||'N5']))||byRank(a,b);
// Grammar lessons go on the same schedule (S.cards[lesson id]) once one of their feeds is finished. A lesson
// finished before reviews existed has no card yet: it counts as due until its first review creates one.
function gCard(g){ const c=S.cards[g.id]; if(c) return c; const p=S.grammar[g.id]; return p&&p.done?newCard(p.at||0):null; }
function dueLessons(now){ return GRAMMAR.filter(g=>{ const c=gCard(g); return c&&c.due<=now&&!isKnown(g.id); }).sort((a,b)=>gCard(a).due-gCard(b).due); }
// Whole calendar days from now until t (cards fall due at the start of a day).
function daysUntil(t,now){ return Math.round((dayStartPlus(t,0)-dayStartPlus(now,0))/86400000); }
function schedText(c,now){ if(!c) return ''; const d=daysUntil(c.due,now); return c.due<=now?'due for reading now':d<1?'next reading later today':d===1?'next reading tomorrow':'next reading in '+d+' days'; }
function newIds(kind,n){ let l=itemsOf(kind).filter(it=>!S.cards[it.id]&&!isKnown(it.id)); if(kind==='vocab') l=l.slice().sort(byLearnOrder); return l.slice(0,n).map(it=>it.id); }
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
const ui={vtop:false,vlv:'',tab:'home',session:null,quiz:null,read:null,lesson:null,kanji:null,vocab:null,preview:[],vq:'',vf:'all',kq:'',kf:'all',klv:'',gq:'',gf:'all',glv:'',back:null,mark:false,confirmReset:false,settingsOpen:false};
// The Kanji tab is hidden for now; set SHOW_KANJI to true to bring it back (its code and saved progress are kept).
const SHOW_KANJI=true;
const TABS=[['home','今日','Today'],['vocab','単語','Vocab'],['kanji','漢字','Kanji'],['grammar','文法','Grammar']].filter(x=>SHOW_KANJI||x[0]!=='kanji');
function go(fn){ fn(); render(); window.scrollTo(0,0); }

function render(){
  closeLookup();
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
  t.innerHTML=TABS.map(x=>'<button class="tab" role="tab" aria-selected="'+(ui.tab===x[0])+'" tabindex="'+(ui.tab===x[0]?0:-1)+'" data-act="tab" data-arg="'+x[0]+'"><span class="tj" lang="ja">'+x[1]+'</span><span class="te">'+x[2]+'</span></button>').join('');
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
// Grammar progress: not started, in progress (opened, read or quizzed), done, known.
const GSTATE_LABEL={all:'All',new:'Not started',started:'In progress',done:'Done',known:'Known'};
const GSTATE_CLS={new:'st-new',started:'st-learning',done:'st-mature',known:'st-known'};
function gstate(g){ const p=S.grammar[g.id]; return isKnown(g.id)?'known':p&&p.done?'done':p?'started':'new'; }
function gcounts(){ const c={new:0,started:0,done:0,known:0}; GRAMMAR.forEach(g=>{c[gstate(g)]++;}); return c; }
function gStackBar(){
  const c=gcounts(), n=GRAMMAR.length, seg=(k,v)=>'<i style="width:'+(c[k]/n*100)+'%;background:var(--'+v+')"></i>';
  return '<div class="stack" role="img" aria-label="'+(c.done+c.known)+' of '+n+' lessons done or known">'+seg('known','st-known')+seg('done','st-mature')+seg('started','st-learn')+'</div>';
}
function gLegend(){
  const c=gcounts(), li=(k,v)=>'<span><i style="background:var(--'+v+')"></i>'+c[k]+' '+GSTATE_LABEL[k].toLowerCase()+'</span>';
  return '<div class="legend">'+li('done','st-mature')+li('started','st-learn')+li('new','st-new')+(c.known?li('known','st-known'):'')+'</div>';
}
function gReviewBtn(n){ return '<button class="btn primary" data-act="review" data-arg="grammar"'+(n?'':' disabled')+'>'+(n?'Read '+n+' due':'Nothing due')+'</button>'; }
// The first lesson not started yet, as a Learn button (the New group on Today and the Grammar tab); falls back to the next unfinished lesson.
function learnGrammarBtn(quiet){
  const i=GRAMMAR.findIndex(g=>gstate(g)==='new');
  return i>=0?'<button class="btn'+(quiet?'':' primary')+'" data-act="learnGrammar" data-arg="'+i+'">Learn '+esc(GRAMMAR[i].level+' '+GRAMMAR[i].title)+'</button>':nextLessonBtn(quiet);
}
function nextLessonBtn(quiet){
  const i=GRAMMAR.findIndex(g=>!lessonDone(g));
  return i>=0?'<button class="btn'+(quiet?'':' primary')+'" data-act="gopen" data-arg="'+i+'">Next: '+esc(GRAMMAR[i].level+' '+GRAMMAR[i].title)+'</button>':'';
}
// Daily goal (settings.goal sentences, from the activity log) and a rough load forecast: sentences the reviews due by
// the end of tomorrow will take (REVIEW_WPER per word, REVIEW_GPER per lesson). When that reaches the goal, Learn new
// steps back (quiet button, a note) so new words don't pile onto a heavy day.
function goal(){ return +S.settings.goal||60; }
function todayCount(){ return S.log[dayKey()]||0; }
function loadSoon(){
  const t=dayStartPlus(Date.now(),2);
  return VOCAB.filter(w=>{ const c=S.cards[w.id]; return c&&c.due<t&&!isKnown(w.id); }).length*REVIEW_WPER
    +GRAMMAR.filter(g=>{ const c=gCard(g); return c&&c.due<t&&!isKnown(g.id); }).length*REVIEW_GPER;
}
function heavy(){ return loadSoon()>=goal(); }
// The next word or kanji to learn (most frequent N5 first) and the button that opens its page, where Start learning is.
function nextNew(kind='vocab'){ const id=newIds(kind,1)[0]; return id?ITEM[id]:null; }
function learnBtn(primary,kind='vocab'){ const w=nextNew(kind), h=kind==='vocab'&&heavy();
  return '<button class="btn'+(primary&&!h?' primary':'')+'" data-act="openNew" data-arg="'+kind+'"'+(w?'':' disabled')+'>'+(w?(h?'Learn anyway: ':'Learn ')+esc(w.jp||w.ch):'Nothing new to learn')+'</button>'; }
function heavyNote(){ return heavy()?'<p class="muted note">Today and tomorrow already hold about '+loadSoon()+' sentences of reviews, at or over your daily goal of '+goal()+'. New words can wait a day.</p>':''; }
function goalHtml(){
  const n=todayCount(), g=goal();
  return '<div class="goal"><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="'+g+'" aria-valuenow="'+Math.min(n,g)+'"><i style="width:'+Math.min(100,n/g*100)+'%"></i></div><span class="muted">'+(n>=g?'Daily goal reached: '+n+' sentences today':n+' of '+g+' sentences today')+'</span></div>';
}
// Per-row switch for the Random known button (settings.hideKnown[kind] = true hides it). Pressed means shown.
function knownHidden(key){ return !!(S.settings.hideKnown&&S.settings.hideKnown[key]); }
function knownSetting(){
  const kinds=[['vocab','Vocab'],['grammar','Grammar']].concat(SHOW_KANJI?[['kanji','Kanji']]:[]);
  return '<div><h3 style="margin-bottom:8px">Random known</h3><div class="seg" role="group" aria-label="Random known buttons">'
    +kinds.map(x=>'<button data-act="knownToggle" data-arg="'+x[0]+'" aria-pressed="'+(!knownHidden(x[0]))+'">'+x[1]+'</button>').join('')+'</div>'
    +'<p class="muted note">Shows or hides Random known on each Today row.</p></div>';
}
function goalSetting(){
  return '<div><h3 style="margin-bottom:8px">Daily goal</h3><div class="seg three" role="group" aria-label="Daily goal">'+[30,60,100].map(x=>'<button data-act="goal" data-arg="'+x+'" aria-pressed="'+(goal()===x)+'">'+x+' sentences</button>').join('')+'</div>'
    +'<p class="muted note">Learn new steps back when upcoming reviews already fill the goal.</p></div>';
}
function studyRow(kind){
  const now=Date.now(), items=itemsOf(kind), c=counts(kind);
  const due=dueIds(kind,now).length, started=items.length-c.new-c.known;
  return '<section class="panel row"><div class="row-head"><span class="tag-jp" lang="ja">'+(kind==='vocab'?'単語':'漢字')+'</span><div><h2>'+(kind==='vocab'?'Vocabulary':'Kanji')+'</h2><p class="muted">'+started+' of '+items.length+' started'+(c.known?' · '+c.known+' known':'')+' · '+due+' due now</p></div></div>'
   +stackBar(kind)
   +actionGroups('<button class="btn primary" data-act="review" data-arg="'+kind+'"'+(due?'':' disabled')+'>'+(due?(kind==='vocab'?'Read ':'Review ')+due+' due':'Nothing due')+'</button>'+extraBtns(kind),learnBtn(!due,kind))+(kind==='vocab'?heavyNote():'')+'</section>';
}
// Buttons on a Today row, in two labelled groups: reviews, then new items.
function actionGroups(review,learn){
  const grp=(label,btns)=>btns?'<div class="grp"><span class="grp-label">'+label+'</span><div class="grp-btns">'+btns+'</div></div>':'';
  return '<div class="groups">'+grp('Review',review)+grp('New',learn)+'</div>';
}
function totalsHtml(){
  const all=Object.values(S.log).reduce((a,n)=>a+(n||0),0), words=VOCAB.filter(w=>S.cards[w.id]||isKnown(w.id)).length, gc=gcounts();
  return '<div class="facts totals"><span><b>'+all.toLocaleString('en-US')+'</b> sentences read in all</span><span><b>'+words+'</b> words met</span><span><b>'+(gc.started+gc.done+gc.known)+'</b> lessons opened</span></div>';
}
function homeHtml(){
  const now=Date.now();
  const dw=dueIds('vocab',now).length, dl=dueLessons(now).length, due=dw+dl+(SHOW_KANJI?dueIds('kanji',now).length:0);
  const started=Object.keys(S.cards).length;
  const what=[dw?dw+(dw===1?' word':' words'):'',dl?dl+(dl===1?' lesson':' lessons'):''].filter(Boolean).join(' and ');
  const msg = started===0&&!dl ? 'Start with your first word.' : dw+dl>0 ? 'Time to read: '+what+'.' : due>0 ? due+' kanji ready to review.' : 'You are all caught up.';
  const date=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const gc=gcounts();
  const grammarRow='<section class="panel row"><div class="row-head"><span class="tag-jp" lang="ja">文法</span><div><h2>Grammar</h2><p class="muted">'+(gc.started+gc.done)+' of '+GRAMMAR.length+' lessons started · '+gc.done+' done'+(gc.known?' · '+gc.known+' known':'')+' · '+dl+' due now</p></div></div>'
    +gStackBar()
    +actionGroups(gReviewBtn(dl)+extraBtns('grammar'),learnGrammarBtn(dl>0)||'<button class="btn" data-act="tab" data-arg="grammar">All lessons</button>')+'</section>';
  // activity, last 14 days
  const days=[]; for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push({d:d,n:S.log[dayKey(d)]||0}); }
  const max=Math.max(1,...days.map(x=>x.n));
  const total=days.reduce((a,x)=>a+x.n,0);
  const bars=days.map((x,i)=>'<div class="bar'+(i===13?' today':'')+'" style="height:'+Math.max(2,Math.round(x.n/max*100))+'%" title="'+esc(x.d.toLocaleDateString(undefined,{month:'short',day:'numeric'}))+': '+x.n+'"></div>').join('');
  const labs=days.map(x=>'<span>'+esc(x.d.toLocaleDateString(undefined,{weekday:'narrow'}))+'</span>').join('');
  const reset=ui.confirmReset
    ? '<div class="confirm"><span>Erase all progress on every device?</span><button class="btn danger" data-act="resetGo">Erase</button><button class="btn" data-act="resetNo">Cancel</button></div>'
    : '<div><button class="btn" data-act="resetAsk">Reset progress</button></div>';
  return '<section class="hero"><p class="eyebrow">'+esc(date)+'</p><h1>'+msg+'</h1>'+goalHtml()+(dw&&dl?'<div class="actions"><button class="btn primary" data-act="review" data-arg="all">Read everything due</button></div>':'')+'</section>'
    +studyRow('vocab')+(SHOW_KANJI?studyRow('kanji'):'')+grammarRow
    +'<section class="panel"><h3>Progress by level</h3>'
    +'<p class="muted note">Started or known, out of the items at each level.</p>'
    +lvGroup(['N5','N4','N3'],vocabLvStat,null,null,'Vocabulary')
    +(SHOW_KANJI?lvGroup(KANJI_LEVELS,kanjiLvStat,null,null,'Kanji'):'')
    +lvGroup(['N5','N4','N3'],grammarLvStat,null,null,'Grammar')+'</section>'
    +'<section class="panel"><h3>Last 14 days</h3><div class="bars">'+bars+'</div><div class="barlab">'+labs+'</div><p class="muted note">'+total+' sentences in two weeks</p>'+totalsHtml()+'</section>'
    +'<details class="panel settings"'+(ui.settingsOpen?' open':'')+'><summary>Settings</summary><div class="settings-body">'+'<div><h3 style="margin-bottom:8px">Furigana</h3><div class="seg three" role="group" aria-label="Furigana">'+[['auto','Unknown kanji'],['on','Always'],['off','Off']].map(x=>'<button data-act="furiMode" data-arg="'+x[0]+'" aria-pressed="'+(S.settings.furi===x[0])+'">'+x[1]+'</button>').join('')+'</div><p class="muted note">Hidden readings have a dotted underline: tap the word to show it.</p></div>'+linesSetting()+spreadSetting()+goalSetting()+knownSetting()+listenSetting()+voiceSetting()+autoSpeakSetting()+backupSetting()+reset+'</div></details>';
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
    +'</div><p class="muted note">Order and visibility for example sentences on cards, reading feeds and lesson pages.</p></div>';
}

function listenSetting(){
  if(!canSpeakJa()) return '';
  const on=!!S.settings.listen;
  return '<div><h3 style="margin-bottom:8px">Listen first</h3><div class="seg" role="group" aria-label="Listen first"><button data-act="listen" data-arg="0" aria-pressed="'+(!on)+'">Off</button><button data-act="listen" data-arg="1" aria-pressed="'+on+'">On</button></div>'
    +'<p class="muted note">In reviews and reading feeds, each sentence plays first with the text hidden; tap to see the Japanese, then the English. Also toggled in a feed with L.</p></div>';
}
function spreadSetting(){
  const on=S.settings.spread!==false;
  return '<div><h3 style="margin-bottom:8px">Review order</h3><div class="seg" role="group" aria-label="Review order">'
    +'<button data-act="spread" data-arg="1" aria-pressed="'+on+'">Mixed</button><button data-act="spread" data-arg="0" aria-pressed="'+(!on)+'">Grouped</button></div>'
    +'<p class="muted note">'+(on?'Sentences for each word and lesson are spread through the review instead of coming one after another.':'Each word\'s or lesson\'s sentences come one after another.')+'</p></div>';
}
function autoSpeakSetting(){
  if(!CAN_SPEAK) return '';
  const on=!!S.settings.autoSpeak;
  return '<div><h3 style="margin-bottom:8px">Audio autoplay</h3>'
    +'<div class="seg" role="group" aria-label="Audio autoplay">'
    +'<button data-act="autoSpeak" data-arg="0" aria-pressed="'+(!on)+'">Off</button>'
    +'<button data-act="autoSpeak" data-arg="1" aria-pressed="'+on+'">On (reviews & feeds)</button>'
    +'</div>'
    +'<p class="muted note">Plays each sentence\'s audio as it appears in reviews and reading feeds.</p></div>';
}

// Backup: progress lives only in this browser's storage, so export it to a file now and then.
// Import merges the file into what's here (newest wins per card), so nothing current is lost.
function backupSetting(){
  const nf=flaggedList().length;
  return '<div><h3 style="margin-bottom:8px">Backup</h3><div class="actions"><button class="btn sm" data-act="exportData">Export progress</button>'
    +'<label class="btn sm" for="importFile">Import…</label><input type="file" id="importFile" accept=".json,application/json" hidden></div>'
    +'<p class="muted note">Progress is saved in this browser only. Export a backup file now and then; importing merges it with what\'s here.</p>'
    +'<h3 style="margin:14px 0 8px">Flagged sentences</h3><p class="muted note">'+(nf?nf+' flagged. Copy the list and paste it to Claude to get them fixed.':'Tap the flag on any sentence that sounds unnatural. They collect here.')+'</p>'
    +(nf?'<div class="actions" style="margin-top:6px"><button class="btn sm" data-act="copyFlags">Copy list</button><button class="btn sm" data-act="clearFlags">Clear list</button></div>':'')
    +(ui.backupMsg?'<p class="backup-msg">'+esc(ui.backupMsg)+'</p>':'')+'</div>';
}
async function exportData(){
  ui.settingsOpen=true;
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
  ui.settingsOpen=true;
  try{
    const o=JSON.parse(text), st=normalize(o&&o.state?o.state:o);
    const n=Object.keys(st.cards).length;
    if(!n&&!Object.keys(st.known).length&&!Object.keys(st.grammar).length) throw new Error('no progress found in that file');
    S=merge(S,st); commit(); ui.backupMsg='Imported '+n+' cards from the backup.';
  }catch(e){ ui.backupMsg='Import failed: '+e.message; }
  render();
}
function copyFlags(){
  ui.settingsOpen=true;
  const t=flagsText();
  const done=()=>{ ui.backupMsg='Copied '+flaggedList().length+' flagged sentences.'; render(); };
  try{ navigator.clipboard.writeText(t).then(done,()=>{ ui.backupMsg='Copy failed. Here they are:\n'+t; render(); }); }
  catch(e){ ui.backupMsg='Here they are:\n'+t; render(); }
}
function voiceSetting(){
  let body;
  if(!CAN_SPEAK) body='<p class="muted note">This browser has no speech support.</p>';
  else if(voicesChecked&&!jaVoices().length) body='<p class="muted note">No Japanese voice on this device, so audio buttons are hidden. Installing a Japanese voice in the system speech settings adds them back.</p>';
  else {
    const cur=voicePref(), vs=jaVoices(), n={};
    const opt=(uri,label)=>'<option value="'+esc(uri)+'"'+(uri===cur?' selected':'')+'>'+esc(label)+'</option>';
    body='<div class="voicerow"><select id="voice" aria-label="Voice">'+opt('','Device default')
      +vs.map((v,i)=>{ const g=voiceGender(v); return opt(v.voiceURI,v.name+(g?' ('+g+')':'')); }).join('')
      +'</select><button class="btn sm" data-act="voiceTest">Play sample</button></div>'
      +'<div class="seg three" role="group" aria-label="Speed" style="margin-top:8px">'+[[0.7,'Slow'],[0.9,'Normal'],[1.1,'Fast']].map(x=>'<button data-act="rate" data-arg="'+x[0]+'" aria-pressed="'+((+S.settings.rate||0.9)===x[0])+'">'+x[1]+'</button>').join('')+'</div>'
      +'<p class="muted note">Voices come from your device, so the choice is saved on this device only.'+(vs.some(v=>!voiceGender(v))?' Unlabelled voices: play a sample to hear which is which.':'')+'</p>';
  }
  return '<div><h3 style="margin-bottom:8px">Voice</h3>'+body+'</div>';
}

/* ---------- Study sessions ---------- */
// Kanji are read, not graded: each one shows its readings and words, and Done counts as a good review.
function startKanjiReads(ids,known,learn){
  if(!ids.length) return;
  go(()=>{ ui.session={kind:'kanji',known:!!known,learn:!!learn,queue:ids.slice(),total:ids.length,done:0}; });
}
function finishRead(){
  const s=ui.session; if(!s||!s.queue.length) return;
  const id=s.queue.shift(), now=Date.now();
  if(!s.known) S.cards[id]=nextState(S.cards[id]||newCard(now),2,now);
  bump(1); s.done++;
  commit();
  if(s.learn){ act('home'); return; }
  render(); window.scrollTo(0,0);
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
function sessionHtml(){
  const s=ui.session;
  const head='<div class="sess-head"><button class="btn link" data-act="exit">← Back</button><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="'+s.total+'" aria-valuenow="'+s.done+'"><i style="width:'+(s.done/s.total*100)+'%"></i></div><span class="count">'+s.done+' / '+s.total+'</span></div>';
  if(!s.queue.length){
    let nextDue=Infinity; const now=Date.now();
    Object.keys(S.cards).forEach(id=>{ const d=S.cards[id].due; if(d>now&&d<nextDue) nextDue=d; });
    let nxt='';
    if(nextDue<Infinity){ const mins=Math.round((nextDue-now)/60000); nxt = mins<60? 'in '+mins+' min' : mins<60*24 ? 'later today' : mins<60*48 ? 'tomorrow' : 'in '+Math.round(mins/1440)+' days'; }
    return head+'<section class="panel done"><p class="eyebrow">Session complete</p><div class="big">'+s.done+'</div><p>kanji read</p>'
      +'<div class="facts">'+(nxt?'<span>Next review <b>'+nxt+'</b></span>':'')+'</div>'
      +'<div class="actions"><button class="btn primary" data-act="home">Back</button></div></section>';
  }
  return kanjiReadHtml(s,head);
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
    cardStatText='Skipped in reviews';
  } else if(c){
    const now=Date.now(), st=schedText(c,now);
    cardStatText=st[0].toUpperCase()+st.slice(1)+' · read in '+c.reps+' review'+(c.reps===1?'':'s')+' so far';
  } else {
    cardStatText='Not in your reviews yet';
  }
  const pr=pitchFor(w);
  return '<div class="lesson-view"><div>'+backBtn('closeVocab','All vocabulary')+'</div>'
    +'<div class="titleline"><span class="ln" style="grid-row:auto">'+esc(w.lv||'N5')+'</span><div>'
    +'<p class="eyebrow">'+esc(w.tag)+(isTop(w)?' · '+TOP_BADGE:'')+(w.rank?' · frequency rank '+w.rank.toLocaleString('en-US'):'')+'</p>'
    +'<h1 style="font-size:clamp(28px,7vw,38px);line-height:1.2" lang="ja">'+esc(w.jp)+'</h1>'
    +(pr||w.kana!==w.jp?'<p class="reading" lang="ja" style="font-size:22px;margin-top:2px;justify-content:flex-start">'+(pr||esc(w.kana))+'</p>':'')
    +'<p style="font-size:18px;margin-top:4px">'+esc(w.en)+'</p>'
    +'</div></div>'
    +'<div class="actions">'
    +(canSpeakJa()?'<button class="btn" data-act="say" data-arg="'+esc(w.kana.split('・')[0])+'">Play audio</button>':'')
    +(S.cards[w.id]||st==='known'?'':'<button class="btn primary" data-act="startWord" data-arg="'+esc(w.id)+'">Start learning</button>')
    +knowBtn(w.id)
    +'</div>'
    +'<div class="pager"><button class="btn" data-act="openVocab" data-arg="'+esc(prevW.id)+'">← Previous</button>'
    +'<button class="btn" data-act="openVocab" data-arg="'+esc(nextW.id)+'">Next →</button></div>'
    +'<p class="muted note"><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span> · '+esc(cardStatText)+'</p>'
    +'<section class="panel"><details class="how"><summary><h3 style="display:inline">Example sentences ('+w.ex.length+')</h3></summary>'
    +'<div style="display:grid;gap:10px;margin-top:12px">'+w.ex.map(e=>exBlock(e.jp,e.en,e.cas,w.jp)).join('')+'</div>'
    +'</details></section></div>';
}
function vocabHtml(){
  if(ui.vocab!==null) return vocabDetailHtml();
  const now=Date.now(), due=dueIds('vocab',now).length;
  const chips=['all','new','learning','young','mature','known'].map(k=>'<button class="chip" data-act="filter" data-arg="'+k+'" aria-pressed="'+(ui.vf===k)+'">'+(k==='all'?'All':STATUS_LABEL[k])+'</button>').join('')+'<button class="chip" data-act="vtop" aria-pressed="'+ui.vtop+'">Top 1000</button>'+['N5','N4','N3'].map(l=>'<button class="chip" data-act="vlv" data-arg="'+l+'" aria-pressed="'+(ui.vlv===l)+'">'+l+'</button>').join('');
  return '<section class="panel row"><div><h2>Vocabulary</h2><p class="muted">'+VOCAB.length+' words with example sentences ('+['N5','N4','N3'].map(l=>VOCAB.filter(w=>w.lv===l).length+' '+l).join(', ')+')</p></div>'+stackBar('vocab')+legend('vocab')+lvGroup(['N5','N4','N3'],vocabLvStat,'vlv',ui.vlv,'All levels')
    +'<div class="actions"><button class="btn primary" data-act="review" data-arg="vocab"'+(due?'':' disabled')+'>'+(due?'Read '+due+' due':'Nothing due')+'</button>'+learnBtn()+'<button class="btn" data-act="readVocab">Read sentences</button>'+markBtn()+'</div>'+heavyNote()+markHint()+'</section>'
    +'<div class="toolbar"><input class="search" id="vq" type="search" placeholder="Search words, readings or meanings" aria-label="Search words" value="'+esc(ui.vq)+'"><div class="chips">'+chips+'</div></div>'
    +'<div class="vlist" id="vlist">'+vocabListHtml()+'</div>'
    +'<p class="muted credits">Word list: JLPT lists by Jonathan Waller (<a href="https://www.tanos.co.uk/jlpt/">tanos.co.uk</a>, CC BY). Frequency: BCCWJ word frequency lists (NINJAL). N3 word list: <a href="https://langoal.com/en/vocabulary/n3.html">Langoal</a>. Pitch accent: <a href="https://github.com/mifunetoshiro/kanjium">Kanjium</a> and <a href="https://en.wiktionary.org/">Wiktionary</a> (CC BY-SA 4.0).</p>';
}

/* ---------- Kanji tab ---------- */
const topWord=jp=>{ const v=ITEM['v:'+jp]; return !!v&&isTop(v); };
// Start learning on a kanji page: a single card, graded like the kanji reviews.
function startKanjiLearn(id){
  if(!ITEM[id]||S.cards[id]||isKnown(id)) return;
  startKanjiReads([id],false,true);
}
function kanjiWordsHtml(k){
  return '<p class="muted note">Words with this kanji. Top 1000 words come first.</p><div class="words">'+k.ex.map(w=>'<div class="word"><span class="w" lang="ja">'+esc(w[0])+'</span><span class="wm"><span class="wr" lang="ja">'+esc(w[1])+'</span><span>'+esc(w[2])+'</span>'+(topWord(w[0])?TOP_BADGE:'')+'</span>'+spk(w[1])+'</div>').join('')+'</div>';
}
// The page for a kanji being learned or reviewed: its words and a Done button, which counts as a successful review.
function kanjiReadHtml(s,head){
  const k=ITEM[s.queue[0]];
  return head+'<section class="panel kd"><div class="kd-char" lang="ja">'+esc(k.ch)+'</div><h2>'+esc(k.en)+'</h2>'+kanjiWordsHtml(k)
    +'<div class="actions"><button class="btn primary" data-act="readDone">Done</button></div></section>';
}
// Kanji list filter: search (character, meaning, readings; romaji works) and progress.
const KANJI_LEVELS=['N5','N4','N3'];  // N2 and N1 kanji stay in the list under All
// One progress bar per JLPT level: kanji started or known. Tapping a level filters the list to it.
// Progress bars per JLPT level. With an act, each row is a button that filters (cur is the filtered level);
// without one (Today), the rows just show progress.
function lvBars(levels,stat,act,cur){
  const tag=act?'button':'div';
  return '<div class="lvbars">'+levels.map(l=>{
    const [s,n]=stat(l);
    return '<'+tag+' class="lvrow"'+(act?' data-act="'+act+'" data-arg="'+l+'" aria-pressed="'+(cur===l)+'"':'')+'><span class="lvname">'+l+'</span><span class="prog"><i style="width:'+(n?s/n*100:0)+'%"></i></span><span class="muted">'+s+' of '+n+'</span></'+tag+'>';
  }).join('')+'</div>';
}
// A combined bar for a group of levels, with the per-level bars in a dropdown under it.
function lvGroup(levels,stat,act,cur,title){
  const [s,n]=levels.reduce((a,l)=>{ const [x,y]=stat(l); return [a[0]+x,a[1]+y]; },[0,0]);
  return '<details class="lvgroup"><summary><span class="lvname">'+title+'</span><span class="prog"><i style="width:'+(n?s/n*100:0)+'%"></i></span><span class="muted">'+s+' of '+n+'</span></summary>'
    +lvBars(levels,stat,act,cur)+'</details>';
}
const vocabLvStat=l=>{ const ws=VOCAB.filter(w=>w.lv===l); return [ws.filter(w=>stateOf(w.id)!=='new').length, ws.length]; };
const grammarLvStat=l=>{ const gs=GRAMMAR.filter(g=>g.level===l); return [gs.filter(g=>gstate(g)!=='new').length, gs.length]; };
const kanjiLvStat=l=>{ const ks=KANJI.filter(k=>k.lv===l); return [ks.filter(k=>stateOf(k.id)!=='new').length, ks.length]; };
function kanjiLevelHtml(){ return lvGroup(KANJI_LEVELS,kanjiLvStat,'klv',ui.klv,'All levels'); }
function kanjiRows(){
  const q=ui.kq.trim().toLowerCase(), qh=q?romajiToKana(q):'', qk=qh?toKata(qh):'';
  return KANJI.filter(k=>{
    if(ui.klv&&k.lv!==ui.klv) return false;
    if(ui.kf!=='all'&&stateOf(k.id)!==ui.kf) return false;
    if(!q) return true;
    const hay=(k.ch+' '+k.en+' '+k.on+' '+k.kun).toLowerCase();
    return hay.includes(q)||(qh&&hay.includes(qh))||(qk&&hay.includes(qk));
  });
}
function kanjiTilesHtml(){
  const rows=kanjiRows();
  if(!rows.length) return '<p class="muted" style="padding:12px 4px">No kanji match.</p>';
  return rows.map(k=>{ const st=stateOf(k.id); return '<button class="ktile st-'+st+'" '+(ui.mark?'data-act="toggleKnown" data-arg="'+esc(k.id)+'" aria-pressed="'+(st==='known')+'"':'data-act="openKanji" data-arg="'+esc(k.ch)+'"')+' aria-label="'+esc(k.ch+', '+k.en)+'"><span class="kc" lang="ja">'+esc(k.ch)+'</span><span class="km">'+esc(k.en)+'</span></button>'; }).join('');
}
function kanjiHtml(){
  if(ui.kanji){
    const k=ITEM['k:'+ui.kanji]; const i=KANJI.indexOf(k); const st=stateOf(k.id);
    return '<section class="panel kd"><div class="kd-top"><button class="btn" data-act="closeKanji">← All kanji</button><span class="stat st-'+st+'">'+STATUS_LABEL[st]+'</span></div>'
      +'<div class="kd-char" lang="ja">'+esc(k.ch)+'</div><h2>'+esc(k.en)+'</h2>'
      +'<dl class="kv"><dt>On’yomi</dt><dd lang="ja">'+esc(k.on)+'</dd><dt>Kun’yomi</dt><dd lang="ja">'+esc(k.kun)+'</dd><dt>Strokes</dt><dd>'+k.st+'</dd></dl>'
      +(st==='new'?'':kanjiWordsHtml(k))
      +'<div class="actions"><button class="btn" data-act="openKanji" data-arg="'+esc(KANJI[(i+KANJI.length-1)%KANJI.length].ch)+'">← Previous</button>'
      +(S.cards[k.id]||st==='known'?'':'<button class="btn primary" data-act="startKanji" data-arg="'+esc(k.id)+'">Start learning</button>')+knowBtn(k.id)
      +'<button class="btn" data-act="openKanji" data-arg="'+esc(KANJI[(i+1)%KANJI.length].ch)+'">Next →</button></div></section>';
  }
  const now=Date.now(), due=dueIds('kanji',now).length;
  const chips=['all','new','learning','young','mature','known'].map(k=>'<button class="chip" data-act="kfilter" data-arg="'+k+'" aria-pressed="'+(ui.kf===k)+'">'+(k==='all'?'All':STATUS_LABEL[k])+'</button>').join('')
    +KANJI_LEVELS.map(l=>'<button class="chip" data-act="klv" data-arg="'+l+'" aria-pressed="'+(ui.klv===l)+'">'+l+'</button>').join('');
  return '<section class="panel row"><div><h2>Kanji</h2><p class="muted">'+KANJI.length+' Jōyō kanji, with readings and words</p></div>'+stackBar('kanji')+legend('kanji')+kanjiLevelHtml()
    +'<div class="actions"><button class="btn primary" data-act="review" data-arg="kanji"'+(due?'':' disabled')+'>'+(due?'Review '+due:'Nothing due')+'</button>'+learnBtn(false,'kanji')+'<button class="btn" data-act="kquiz">Reading quiz</button>'+markBtn()+'</div>'+markHint()+'</section>'
    +'<div class="toolbar"><input class="search" id="kq" type="search" placeholder="Search kanji, readings or meanings" aria-label="Search kanji" value="'+esc(ui.kq)+'"><div class="chips">'+chips+'</div></div>'
    +'<div class="kgrid" id="ktiles">'+kanjiTilesHtml()+'</div>'
    +'<p class="muted credits">Kanji readings, meanings, grades and stroke counts: <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project">KANJIDIC2</a>; example words: <a href="https://www.edrdg.org/jmdict/j_jmdict.html">JMdict</a> (both EDRDG, CC BY-SA 4.0).</p>';
}

/* ---------- Grammar tab ---------- */
// Each lesson feed session shows this many of the lesson's examples, picked at random.
const FEED_N=10;
function feedLen(g){ return Math.min(FEED_N,g.ex.length); }
function lessonNum(i){ const lv=GRAMMAR[i].level; return GRAMMAR.slice(0,i+1).filter(g=>g.level===lv).length; }
function lessonStatus(g){
  const p=S.grammar[g.id];
  if(isKnown(g.id)) return 'Known';
  const c=gCard(g);
  if(c&&c.due<=Date.now()) return 'Due';
  if(p&&p.done) return 'Done';
  if(p&&p.read) return 'Read '+Math.min(p.read,feedLen(g))+'/'+feedLen(g);
  return p?'Opened':'Not started';
}
// Opening a lesson records it, so its sentences join the mixed reading feed.
// It also picks three random examples to preview; they stay the same until the lesson is opened again.
// Opening a lesson adds it to the Mixed reading pool. Swiping between lessons only browses (browse=true): those
// lessons join the pool once their feed or quiz is used.
function openLesson(i,browse){ const g=GRAMMAR[i]; if(!browse&&!S.grammar[g.id]){ S.grammar[g.id]={best:0,tries:0,done:false,read:0,at:Date.now()}; commit(); } ui.lesson=i; ui.learn=false; ui.preview=shuffle(g.ex).slice(0,5); }
// The learn page for a new lesson: its description and Start learning. It makes no progress entry until the feed is read.
function learnLessonHtml(i){
  const g=GRAMMAR[i];
  return '<div class="lesson-view"><div>'+backBtn('closeLesson','All lessons')+'</div>'
    +'<div class="titleline"><span class="ln" style="grid-row:auto">'+lessonNum(i)+'</span><div><p class="eyebrow">'+esc(g.level)+'</p><h1 style="font-size:24px">'+esc(g.title)+'</h1><p class="muted">'+esc(g.sub)+'</p></div></div>'
    +'<div class="pattern" lang="ja">'+esc(g.pattern)+'</div>'
    +'<div class="actions"><button class="btn primary" data-act="startGrammar" data-arg="'+i+'">Start learning</button>'+knowBtn(g.id)+'</div>'
    +'<details class="how" open><summary>How it works</summary><ul class="notes">'+g.notes.map(n=>'<li>'+n+'</li>').join('')+'</ul></details></div>';
}
function mixLessons(){ return GRAMMAR.filter(g=>S.grammar[g.id]||isKnown(g.id)); }
function mixBtn(){ return mixLessons().length?'<button class="btn" data-act="readMix">Mixed reading</button>':''; }
function grammarHtml(){
  if(ui.lesson!==null){
    const g=GRAMMAR[ui.lesson], i=ui.lesson, p=S.grammar[g.id], st=gstate(g);
    if(ui.learn&&st==='new') return learnLessonHtml(i);
    const more=g.ex.filter(e=>ui.preview.indexOf(e)<0);
    return '<div class="lesson-view"><div>'+backBtn('closeLesson','All lessons')+'</div>'
      +'<div class="titleline"><span class="ln" style="grid-row:auto">'+lessonNum(i)+'</span><div><p class="eyebrow">'+esc(g.level)+'</p><h1 style="font-size:24px">'+esc(g.title)+'</h1><p class="muted">'+esc(g.sub)+'</p></div></div>'
      +'<div class="pattern" lang="ja">'+esc(g.pattern)+'</div>'
      +'<div class="actions"><button class="btn primary" data-act="readLesson" data-arg="'+i+'">Read '+feedLen(g)+' examples</button>'+knowBtn(g.id)+'</div>'
      +'<div class="pager"><button class="btn" data-act="lessonStep" data-arg="-1">← Previous</button><button class="btn" data-act="lessonStep" data-arg="1">Next →</button></div>'
      +'<p class="muted note"><span class="stat '+GSTATE_CLS[st]+'">'+GSTATE_LABEL[st]+'</span> · '+seenText(g)+(isKnown(g.id)?'':(gCard(g)?' · '+schedText(gCard(g),Date.now()):' · finish a feed to add it to your reading reviews'))+'</p>'
      +'<details class="how"><summary>How it works</summary><ul class="notes">'+g.notes.map(n=>'<li>'+n+'</li>').join('')+'</ul></details>'
      +'<section class="panel" style="display:grid;gap:10px"><h3>Example sentences ('+g.ex.length+')</h3>'+ui.preview.map(e=>exBlock(e[0],e[1],e[2],g.title)).join('')
      +(more.length?'<details class="how allex"><summary>Show the other '+more.length+'</summary><div class="allex-list">'+more.map(e=>exBlock(e[0],e[1],e[2],g.title)).join('')+'</div></details>':'')+'</section></div>';
  }
  const dl=dueLessons(Date.now()).length;
  const chips=Object.keys(GSTATE_LABEL).map(k=>'<button class="chip" data-act="gfilter" data-arg="'+k+'" aria-pressed="'+(ui.gf===k)+'">'+GSTATE_LABEL[k]+'</button>').join('')
    +['N5','N4','N3'].map(l=>'<button class="chip" data-act="glv" data-arg="'+l+'" aria-pressed="'+(ui.glv===l)+'">'+l+'</button>').join('');
  return '<section class="panel row"><div><h2>Grammar</h2><p class="muted">'+GRAMMAR.length+' lessons with example sentences ('+['N5','N4','N3'].map(l=>GRAMMAR.filter(g=>g.level===l).length+' '+l).join(', ')+'). Finish a lesson\'s feed and it comes back in your reading reviews.</p></div>'+gStackBar()+gLegend()+lvGroup(['N5','N4','N3'],grammarLvStat,'glv',ui.glv,'All levels')
    +'<div class="actions">'+gReviewBtn(dl)+learnGrammarBtn(dl>0)+mixBtn()+markBtn()+'</div>'+markHint()+'</section>'
    +'<div class="toolbar"><input class="search" id="gq" type="search" placeholder="Search titles, patterns or notes" aria-label="Search lessons" value="'+esc(ui.gq)+'"><div class="chips">'+chips+'</div></div>'
    +'<div class="lessons" id="glist">'+lessonListHtml()+'</div>';
}
// Lesson list filters: search (title, description, pattern, notes; romaji works), progress, and level.
// Returns [lesson, index] pairs; the lesson page's Previous/Next step through the same filtered list.
function lessonRows(){
  const q=ui.gq.trim().toLowerCase(), qh=q?romajiToKana(q):'', qk=qh?toKata(qh):'';
  return GRAMMAR.map((g,i)=>[g,i]).filter(([g])=>{
    if(ui.gf!=='all'&&gstate(g)!==ui.gf) return false;
    if(ui.glv&&g.level!==ui.glv) return false;
    if(!q) return true;
    const hay=(g.title+' '+g.sub+' '+g.pattern+' '+g.notes.join(' ')).replace(/<[^>]+>/g,'').toLowerCase();
    return hay.includes(q)||(qh&&hay.includes(qh))||(qk&&hay.includes(qk));
  });
}
// The lesson d steps away from lesson i in the filtered list (wrapping), or in the full list if i isn't in it.
function lessonStep(i,d){
  let l=lessonRows().map(r=>r[1]); if(l.indexOf(i)<0) l=GRAMMAR.map((g,j)=>j);
  return l[(l.indexOf(i)+d+l.length)%l.length];
}
// Word and lesson pages opened from a reading feed or a lookup go back to where you were instead of the list.
function backBtn(a,label){ return ui.back?'<button class="btn link" data-act="backToRead">← '+(ui.back.read?'Back to reading':'Back')+'</button>':'<button class="btn link" data-act="'+a+'">← '+label+'</button>'; }
function lessonListHtml(){
  const rows=lessonRows(); let level='';
  if(!rows.length) return '<p class="muted" style="padding:8px 2px">No lessons match.</p>';
  return rows.map(([g,i])=>{ const kn=isKnown(g.id), done=kn||lessonDone(g);
    const head=g.level!==level?'<h3 class="lvl">'+esc(g.level)+'</h3>':''; level=g.level;
    return head+'<button class="lesson'+(kn?' known':done?' pass':'')+'" '+(ui.mark?'data-act="toggleKnown" data-arg="'+esc(g.id)+'" aria-pressed="'+kn+'"':'data-act="openLesson" data-arg="'+i+'"')+'><span class="ln">'+(done?'✓':lessonNum(i))+'</span><span class="lt"><b>'+esc(g.title)+'</b><small>'+esc(g.sub)+'</small></span><span class="lres">'+esc(lessonStatus(g))+'</span><span class="lpat" lang="ja">'+esc(g.pattern)+'</span></button>'; }).join('');
}

/* ---------- Reading feed ---------- */
// One sentence at a time: read it, optionally reveal the English, move on. No grading.
// Listen first (settings.listen, only with a Japanese voice): each sentence plays with its text hidden (r.heard false);
// the first tap shows the Japanese, the next the English. Feeds speak the first Japanese line that is shown.
function listenOn(){ return !!S.settings.listen&&canSpeakJa(); }
function feedAudio(it){ const k=lineOrder().find(k=>k!=='en'&&lineOn(k)&&(k!=='cas'||it.cas)); return jpPlain(k==='cas'?it.cas:it.jp); }
function feedSpeak(){ const r=ui.read; if(r&&r.i<r.items.length&&(S.settings.autoSpeak||listenOn())) speak(feedAudio(r.items[r.i])); }
// Space, Enter and a left swipe: show the Japanese (listening), then the English, then go on.
function readStep(){ const r=ui.read; if(listenOn()&&!r.heard){ r.heard=true; render(); } else if(r.shown||!lineOn('en')) readNext(); else { r.shown=true; render(); } }
// Extra reviews pick a random started word or grammar lesson (learning, young or mature; kanji are read on their own page).
// Random known reads a known word or lesson without touching its schedule.
// One pool per Today row: vocab, kanji or grammar.
const EXTRA_KINDS={vocab:['vocab'], kanji:['kanji'], grammar:['grammar']};
function extraPool(key){
  const kinds=EXTRA_KINDS[key], out=[];
  if(kinds.includes('vocab')) VOCAB.forEach(w=>{ if(S.cards[w.id]&&!isKnown(w.id)) out.push({kind:'vocab',id:w.id}); });
  if(kinds.includes('kanji')&&SHOW_KANJI) KANJI.forEach(k=>{ if(S.cards[k.id]&&!isKnown(k.id)) out.push({kind:'kanji',id:k.id}); });
  if(kinds.includes('grammar')) GRAMMAR.forEach((g,i)=>{ if(S.cards[g.id]&&!isKnown(g.id)) out.push({kind:'grammar',id:g.id,i:i}); });
  return out;
}
function knownPool(key){
  const kinds=EXTRA_KINDS[key], out=[];
  if(kinds.includes('vocab')) VOCAB.forEach(w=>{ if(isKnown(w.id)) out.push({kind:'vocab',id:w.id}); });
  if(kinds.includes('kanji')&&SHOW_KANJI) KANJI.forEach(k=>{ if(isKnown(k.id)) out.push({kind:'kanji',id:k.id}); });
  if(kinds.includes('grammar')) GRAMMAR.forEach((g,i)=>{ if(isKnown(g.id)) out.push({kind:'grammar',id:g.id,i:i}); });
  return out;
}
function extraBtns(key){
  return '<button class="btn" data-act="extraReview" data-arg="'+key+'"'+(extraPool(key).length?'':' disabled')+'>Extra review</button>'
    +(knownHidden(key)?'':'<button class="btn" data-act="extraKnown" data-arg="'+key+'"'+(knownPool(key).length?'':' disabled')+'>Random known</button>');
}
function startExtra(known,key){
  key=EXTRA_KINDS[key]?key:'vocab';
  const pool=known?knownPool(key):extraPool(key); if(!pool.length) return;
  const x=pool[Math.floor(Math.random()*pool.length)];
  if(x.kind==='kanji'){ startKanjiReads([x.id],known); return; }
  const c=S.cards[x.id], skip=c&&c.exi!==undefined?[].concat(c.exi):[];
  const unit=x.kind==='vocab'?wordSentences(ITEM[x.id],REVIEW_WPER,skip):lessonSentences(x.i,REVIEW_GPER);
  // Known items have no schedule, so their feed leaves S.cards alone (no soon flag).
  startRead(known?'Known':'Extra review',orderUnits([unit]),{type:'extra',known:known,key:key,soon:known?undefined:{},n:1});
}
function startRead(title,items,meta){
  go(()=>{
    ui.read={title:title,items:items,i:0,shown:false,meta:meta};
    feedSpeak();
  });
}
// A lesson feed shows sentences not yet read in the current round first, so a few sessions cover the whole pool.
// S.grammar[id].seen lists the example indexes read this round; when it covers them all, rounds goes up and it resets.
function lessonSentences(i,n,skip){
  const g=GRAMMAR[i], seen=new Set(((S.grammar[g.id]||{}).seen||[]).concat(skip||[])), all=g.ex.map((e,k)=>k);
  return shuffle(all.filter(k=>!seen.has(k))).concat(shuffle(all.filter(k=>seen.has(k)))).slice(0,n).map(k=>({jp:g.ex[k][0],en:g.ex[k][1],cas:g.ex[k][2]||'',g:i,exi:k,rid:g.id}));
}
function readLesson(i,learn){ const g=GRAMMAR[i]; startRead(g.level+' · '+g.title, lessonSentences(i,FEED_N), {type:'lesson',idx:i,learn:!!learn}); }
function seenText(g){
  const p=S.grammar[g.id]||{}, n=(p.seen||[]).length, r=p.rounds||0;
  return r?'all '+g.ex.length+' sentences read'+(r>1?' '+r+' times':'')+(n?' · '+n+' into the next round':''):n+' of '+g.ex.length+' sentences read';
}
// Mixed reading: 20 sentences from lessons you've opened or know. Lessons you haven't read for a while come up more
// (weight 1 + days since last read, up to 30), and no lesson gets more than 3 sentences when there are enough lessons.
function readMix(){
  const ls=mixLessons(); if(!ls.length) return;
  const now=Date.now(), last=g=>Math.max((S.grammar[g.id]||{}).at||0,(S.known[g.id]||{}).at||0);
  const wt=ls.map(g=>1+Math.min(30,(now-last(g))/86400000)), total=wt.reduce((a,b)=>a+b,0);
  const per=ls.length>=7?3:Math.ceil(20/ls.length), used=new Map(), picked=new Set(), items=[];
  for(let tries=0;items.length<20&&tries<1000;tries++){
    let r=Math.random()*total, k=0; while(k<wt.length-1&&r>=wt[k]){ r-=wt[k]; k++; }
    const g=ls[k], e=g.ex[Math.floor(Math.random()*g.ex.length)];
    if((used.get(g)||0)>=per||picked.has(e)) continue;
    picked.add(e); used.set(g,(used.get(g)||0)+1); items.push({jp:e[0],en:e[1],cas:e[2]||'',g:GRAMMAR.indexOf(g)});
  }
  startRead('Mixed reading', items, {type:'mix'});
}
// Vocab reading: random example sentences from words you've started or marked known, topped up with the
// most frequent new words so it's useful from day one. Nothing to grade.
const VREAD_N=20;
function vocabReadPool(){
  const pool=VOCAB.filter(w=>S.cards[w.id]||isKnown(w.id));
  if(pool.length<40) VOCAB.filter(w=>!S.cards[w.id]&&!isKnown(w.id)).sort(byLearnOrder).slice(0,40-pool.length).forEach(w=>pool.push(w));
  return pool;
}
function readVocab(){
  const pairs=[]; vocabReadPool().forEach(w=>w.ex.forEach(e=>pairs.push({jp:e.jp,en:e.en,cas:e.cas,w:w.id})));
  const seen=new Set(), items=[];
  shuffle(pairs).forEach(p=>{ if(items.length<VREAD_N&&!seen.has(p.w)){ seen.add(p.w); items.push(p); } });
  startRead('Vocab reading', items, {type:'vocab'});
}
// Reading reviews: no grading. Each due word gets REVIEW_WPER sentences (ones not shown at its last review,
// card.exi, first) and each due lesson REVIEW_GPER, unread ones first. Reading past an item's last sentence (fin)
// schedules it as Good; "See again soon" schedules it as Again and adds one more of its sentences at the end of the feed.
// Learning a new word works the same way: LEARN_SENT sentences, and the word's card is made at the last one.
// A review feed holds at most REVIEW_V words and REVIEW_G lessons; the end screen offers the rest.
const REVIEW_V=10, REVIEW_G=3, REVIEW_WPER=3, REVIEW_GPER=5, LEARN_SENT=5;
function wordSentences(w,n,skip){
  const all=w.ex.map((_,k)=>k), ks=shuffle(all.filter(k=>skip.indexOf(k)<0)).concat(shuffle(all.filter(k=>skip.indexOf(k)>=0))).slice(0,n);
  return ks.map(k=>({jp:w.ex[k].jp,en:w.ex[k].en,cas:w.ex[k].cas,w:w.id,exi:k,rid:w.id}));
}
// Lays out a feed from units (each word's or lesson's sentences, in order). With settings.spread on (the default),
// units are mixed: each next sentence comes from a random unit, weighted by how many sentences it has left so long
// units spread across the whole feed, and never from the unit just shown unless it is the only one left. Off, each
// unit's sentences come together. The last sentence of each unit is marked fin, with the indexes it showed (exs).
function orderUnits(units){
  units=shuffle(units).map(u=>{ const f=u[u.length-1]; f.fin=true; f.exs=u.map(x=>x.exi); return u.slice(); });
  if(S.settings.spread===false) return [].concat(...units);
  const out=[]; let last=null;
  while(units.some(u=>u.length)){
    let pool=units.filter(u=>u.length&&u[0].rid!==last); if(!pool.length) pool=units.filter(u=>u.length);
    let r=Math.random()*pool.reduce((a,u)=>a+u.length,0), k=0; while(k<pool.length-1&&r>=pool[k].length){ r-=pool[k].length; k++; }
    const x=pool[k].shift(); out.push(x); last=x.rid;
  }
  return out;
}
// Puts an extra sentence somewhere after the current one: at the end when grouped, otherwise at a random spot not
// next to another sentence of the same word or lesson (the end if there is none).
function insertLater(r,x){
  if(S.settings.spread===false){ r.items.push(x); return; }
  const ok=[]; for(let k=r.i+2;k<=r.items.length;k++) if(r.items[k-1].rid!==x.rid&&(!r.items[k]||r.items[k].rid!==x.rid)) ok.push(k);
  r.items.splice(ok.length?ok[Math.floor(Math.random()*ok.length)]:r.items.length,0,x);
}
function startReview(kind){
  const now=Date.now(), units=[];
  if(kind!=='grammar') dueIds('vocab',now).slice(0,REVIEW_V).forEach(id=>{ const c=S.cards[id]; units.push(wordSentences(ITEM[id],REVIEW_WPER,c.exi===undefined?[]:[].concat(c.exi))); });
  if(kind!=='vocab') dueLessons(now).slice(0,REVIEW_G).forEach(g=>units.push(lessonSentences(GRAMMAR.indexOf(g),REVIEW_GPER)));
  if(!units.length) return;
  startRead('Reading review', orderUnits(units), {type:'review',kind:kind,soon:{},n:units.length});
}
// Start learning on a word page: LEARN_SENT sentences of that word; its card is made at the last one.
function startWordLearn(id){
  const w=ITEM[id]; if(!w||S.cards[id]||isKnown(id)) return;
  startRead('New word', orderUnits([wordSentences(w,LEARN_SENT,[]).map(x=>Object.assign(x,{isNew:true}))]), {type:'learn',soon:{},n:1});
}
function reviewPass(it,soon){
  const r=ui.read, now=Date.now(), id=it.rid, w=it.w&&ITEM[it.w];
  if(soon) r.meta.soon[id]=1;
  if(!it.fin) return;
  const miss=!!r.meta.soon[id]; delete r.meta.soon[id];
  const prev=S.cards[id]||(w?null:gCard(GRAMMAR[it.g]))||newCard(now);
  S.cards[id]=nextState(prev,miss?0:prev.tap?1:2,now); delete S.cards[id].tap;
  if(w) S.cards[id].exi=it.exs||[it.exi];
  if(miss){ const x=w?wordSentences(w,1,it.exs||[it.exi])[0]:lessonSentences(it.g,1,it.exs||[it.exi])[0]; x.fin=true; x.again=true; insertLater(r,x); }
}
// "I already know this" in a review or new-word feed: marks the word or lesson known and drops its other sentences.
function knowRead(){
  const r=ui.read, it=r&&r.items[r.i]; if(!it||!it.rid||!r.meta.soon) return;
  setKnown(it.rid,true); delete r.meta.soon[it.rid];
  r.items=r.items.slice(0,r.i).concat(r.items.slice(r.i).filter(x=>x.rid!==it.rid)); r.known=(r.known||0)+1; r.shown=false; r.heard=false;
  commit(); render(); window.scrollTo(0,0);
  feedSpeak();
}
function readNext(soon){
  const r=ui.read; if(!r||r.i>=r.items.length) return;
  bump(1);
  const it=r.items[r.i], now=Date.now();
  if(it.g!==undefined){
    const g=GRAMMAR[it.g], p=S.grammar[g.id]||{best:0,tries:0,done:false,read:0,at:0};
    p.at=now;
    if(it.exi!==undefined){
      p.seen=p.seen||[]; if(p.seen.indexOf(it.exi)<0) p.seen.push(it.exi);
      if(p.seen.length>=g.ex.length){ p.rounds=(p.rounds||0)+1; p.seen=[]; }
    }
    if(r.meta.type==='lesson'){
      p.read=Math.max(p.read||0,r.i+1);
      // Finishing a lesson's feed puts it on the reading schedule, and counts as its review when it's due.
      if(r.i+1>=r.items.length){ p.done=true; const c=gCard(g); if(!S.cards[g.id]||c.due<=now) S.cards[g.id]=nextState(c||newCard(now),2,now); }
    }
    S.grammar[g.id]=p;
  }
  if(r.meta.soon) reviewPass(it,soon);
  commit();
  r.i++; r.shown=false; r.heard=false;
  render(); window.scrollTo(0,0);
  feedSpeak();
}
function readHtml(){
  const r=ui.read, n=r.items.length;
  const head='<div class="sess-head"><button class="btn link" data-act="readExit">← Back</button><div class="prog"><i style="width:'+(r.i/n*100)+'%"></i></div><span class="count">'+Math.min(r.i+1,n)+' / '+n+'</span></div>';
  if(r.i>=n){
    const t=r.meta.type, now=Date.now();
    if(t==='extra'){
      const act=r.meta.known?'extraKnown':'extraReview';
      return head+'<section class="panel done"><p class="eyebrow">'+esc(r.title)+'</p><div class="big">'+n+'</div><p>sentences read</p>'
        +'<div class="actions"><button class="btn primary" data-act="'+act+'" data-arg="'+r.meta.key+'">Another</button><button class="btn" data-act="readExit">Done</button></div></section>';
    }
    if(t==='review'||t==='learn'){
      const dw=dueIds('vocab',now).length, dl=dueLessons(now).length, left=r.meta.kind==='vocab'?dw:r.meta.kind==='grammar'?dl:dw+dl, nw=nextNew();
      let nextDue=Infinity; Object.keys(S.cards).forEach(id=>{ const d=S.cards[id].due; if(d>now&&d<nextDue&&(id.slice(0,2)==='v:'||GRAMMAR.some(g=>g.id===id))) nextDue=d; });
      const days=daysUntil(nextDue,now);
      const nxt=nextDue===Infinity||left?'':days<1?'later today':days===1?'tomorrow':'in '+days+' days';
      const btns=(left?'<button class="btn primary" data-act="review" data-arg="'+(r.meta.kind||'all')+'">Read '+left+' more due</button>':'')
        +(nw&&t==='learn'&&!heavy()?'<button class="btn'+(left?'':' primary')+'" data-act="openNew">Learn '+esc(nw.jp)+'</button>':'')
        +'<button class="btn'+(left||(nw&&t==='learn'&&!heavy())?'':' primary')+'" data-act="'+(t==='learn'?'home':'readExit')+'">Done</button>'+(nw&&t==='review'&&!heavy()?'<button class="btn" data-act="openNew">Learn '+esc(nw.jp)+'</button>':'');
      return head+'<section class="panel done"><p class="eyebrow">'+esc(r.title)+'</p><div class="big">'+n+'</div><p>sentences read</p>'
        +'<div class="facts">'+(t==='learn'?'<span><b>'+(r.meta.n-(r.known||0))+'</b> new words added to your reviews</span>':'<span><b>'+(r.meta.n-(r.known||0))+'</b> words and lessons reviewed</span>')+(r.known?'<span><b>'+r.known+'</b> marked known</span>':'')+(nxt?'<span>Next reading <b>'+nxt+'</b></span>':'')+(todayCount()>=goal()?'<span><b>Daily goal reached</b></span>':'')+'</div>'
        +'<div class="actions">'+btns+'</div></section>';
    }
    const lesson=t==='lesson', nx=lesson?r.meta.idx+1:-1;
    const btns=r.meta.learn?'<button class="btn primary" data-act="home">Done</button>':lesson
      ? '<button class="btn primary" data-act="readExit">Back to lesson</button><button class="btn" data-act="readLesson" data-arg="'+r.meta.idx+'">Read again</button>'+(nx<GRAMMAR.length?'<button class="btn" data-act="gopen" data-arg="'+nx+'">Next lesson</button>':'')
      : '<button class="btn primary" data-act="'+({vocab:'readVocab',mix:'readMix'}[t])+'">More sentences</button><button class="btn" data-act="readExit">Done</button>';
    const sc=lesson&&gCard(GRAMMAR[r.meta.idx]);
    return head+'<section class="panel done"><p class="eyebrow">'+esc(r.title)+'</p><div class="big">'+n+'</div><p>sentences read</p>'+(sc&&!isKnown(GRAMMAR[r.meta.idx].id)?'<div class="facts"><span>In your reading reviews: <b>'+schedText(sc,now)+'</b></span></div>':'')+'<div class="actions">'+btns+'</div></section>';
  }
  const it=r.items[r.i], w=it.w&&ITEM[it.w], g=w?null:GRAMMAR[it.g];
  // A word's meaning stays hidden with the English line, so the sentence gets read first.
  const enOn=lineOn('en'), shown=r.shown||!enOn;
  const label=w?w.jp+(w.kana!==w.jp?' · '+w.kana:'')+(shown?' · '+w.en:''):r.meta.type==='lesson'?g.pattern:g.level+' · '+g.title;
  const pill=it.isNew?'<span class="pill">New</span>':it.again?'<span class="pill">Again</span>':'';
  const top='<div class="card-top"><button class="linkish" data-act="feedOpen" data-arg="'+(w?esc(w.id):'g'+it.g)+'"'+(w?' lang="ja"':'')+' title="'+(w?'Open this word':'Open this lesson')+'">'+esc(label)+'</button>'+pill+flagBtn(it,w?w.jp:g.title)+'</div>';
  const hide=listenOn()&&!r.heard;
  const extra='<div class="read-extra">'+(r.meta.soon?'<button class="btn link know" data-act="readSoon">See again soon <kbd>A</kbd></button><button class="btn link know" data-act="knowRead">I already know this <kbd>K</kbd></button>':'')
    +(canSpeakJa()?'<button class="btn link know" data-act="listenToggle" aria-pressed="'+listenOn()+'">Listen first: '+(listenOn()?'on':'off')+' <kbd>L</kbd></button>':'')+'</div>';
  const ctrl=hide
    ? '<div class="grades two"><button class="btn primary" data-act="readHear">Show Japanese</button><button class="btn" data-act="readNext">Next →</button></div>'
    : shown
    ? '<button class="btn primary wide" data-act="readNext">Next</button>'
    : '<div class="grades two"><button class="btn primary" data-act="readShow">Show English</button><button class="btn" data-act="readNext">Next →</button></div>';
  const body=hide
    ? '<div class="listen"><button class="btn" data-act="feedSay">'+SPK_SVG+' Play again</button><p class="muted">Listen, then show the sentence.</p></div>'
    : '<div class="lines">'+exLines(it,{big:true,noEn:!r.shown})+'</div>';
  return head+'<article class="card">'+top+body+'</article>'+ctrl+extra+'<p class="keyhint">'+(hide?'Space: show Japanese':enOn?'Space: English, then next':'Space: next')+' · → skip ahead · R audio'+(hide?'':' · tap a word to look it up')+'</p>';
}

/* ---------- Quizzes ---------- */
function shuffleQ(x){
  const order=shuffle(x.o.map((_,i)=>i));
  return {q:x.q, big:x.big||'', opts:order.map(i=>x.o[i]), a:order.indexOf(x.a), why:x.why};
}
function startQuiz(title,qs,meta){
  go(()=>{ ui.quiz={title:title,qs:qs,i:0,picked:null,score:0,finished:false,meta:meta}; });
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
  }
  render(); window.scrollTo(0,0);
}
function quizHtml(){
  const q=ui.quiz;
  const head='<div class="sess-head"><button class="btn link" data-act="quizExit">← Exit</button><div class="prog"><i style="width:'+((q.finished?q.qs.length:q.i)/q.qs.length*100)+'%"></i></div><span class="count">'+Math.min(q.i+1,q.qs.length)+' / '+q.qs.length+'</span></div>';
  if(q.finished){
    const n=q.qs.length;
    const msg = q.score===n ? 'Perfect score.' : q.score>=n*0.7 ? 'Solid work.' : 'Keep practicing, it comes with repetition.';
    const btns='<button class="btn primary" data-act="kquiz">New quiz</button><button class="btn" data-act="quizExit">Done</button>';
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
    case 'home': ui.back=null; vocabScroll=0; lessonScroll=0; kanjiScroll=0; go(()=>{ ui.tab='home'; ui.session=null; ui.quiz=null; ui.read=null; ui.lesson=null; ui.kanji=null; ui.vocab=null; ui.mark=false; ui.confirmReset=false; }); break;
    case 'tab': ui.back=null; vocabScroll=0; lessonScroll=0; kanjiScroll=0; go(()=>{ ui.tab=arg; ui.lesson=null; ui.kanji=null; ui.vocab=null; ui.mark=false; ui.confirmReset=false; }); break;
    case 'review': if(arg==='kanji') startKanjiReads(dueIds('kanji',Date.now()).slice(0,30)); else startReview(arg); break;
    case 'openNew': { const kind=arg||'vocab', w=nextNew(kind); if(!w) break;
      go(()=>{ ui.back=null; ui.session=null; ui.quiz=null; ui.read=null; ui.lesson=null; ui.mark=false; ui.vocab=null; ui.kanji=null;
        if(kind==='kanji'){ ui.tab='kanji'; ui.kanji=w.ch; } else { ui.tab='vocab'; ui.vocab=w.id; } }); break; }
    case 'startWord': startWordLearn(arg); break;
    case 'extraReview': startExtra(false,arg); break;
    case 'extraKnown': startExtra(true,arg); break;
    case 'startKanji': startKanjiLearn(arg); break;
    case 'readDone': finishRead(); break;
    case 'readSoon': readNext(true); break;
    case 'knowRead': knowRead(); break;
    case 'exit': go(()=>{ ui.session=null; }); break;
    case 'say': speak(arg); break;
    case 'openLesson': if(ui.lesson===null) lessonScroll=window.scrollY; go(()=>{ openLesson(+arg); }); break;
    case 'gopen': go(()=>{ ui.quiz=null; ui.read=null; ui.tab='grammar'; openLesson(+arg); }); break;
    case 'readLesson': readLesson(+arg); break;
    case 'startGrammar': readLesson(+arg,true); break;
    case 'learnGrammar': go(()=>{ ui.quiz=null; ui.read=null; ui.tab='grammar'; ui.lesson=+arg; ui.learn=true; ui.preview=[]; }); break;
    case 'readMix': readMix(); break;
    case 'readVocab': readVocab(); break;
    case 'flag': toggleFlag(arg); render(); break;
    case 'exportData': exportData(); break;
    case 'copyFlags': copyFlags(); break;
    case 'clearFlags': flaggedList().forEach(f=>{ f.on=false; f.at=Date.now(); }); commit(); ui.backupMsg='Cleared the flagged list.'; render(); break;
    case 'readShow': if(ui.read){ ui.read.shown=true; render(); } break;
    case 'readHear': if(ui.read){ ui.read.heard=true; render(); } break;
    case 'feedSay': if(ui.read&&ui.read.items[ui.read.i]) speak(feedAudio(ui.read.items[ui.read.i])); break;
    case 'listenToggle': S.settings.listen=!S.settings.listen; if(ui.read) ui.read.heard=true; commit(); render(); break;
    case 'listen': S.settings.listen=(arg==='1'); commit(); render(); break;
    case 'rate': S.settings.rate=+arg; commit(); render(); speak('こんにちは。日本語を勉強しましょう。'); break;
    case 'goal': S.settings.goal=+arg; commit(); render(); break;
    case 'knownToggle': S.settings.hideKnown=Object.assign({},S.settings.hideKnown,{[arg]:!knownHidden(arg)}); commit(); render(); break;
    case 'readNext': readNext(); break;
    case 'readExit': go(()=>{ ui.read=null; }); break;
    case 'voiceTest': speak('こんにちは。日本語を勉強しましょう。'); break;
    case 'furiMode': S.settings.furi=arg; commit(); render(); break;
    case 'spread': S.settings.spread=(arg==='1'); commit(); render(); break;
    case 'autoSpeak': S.settings.autoSpeak=(arg==='1'); commit(); render(); break;
    case 'lineMove': { const k=arg.split(':')[0], o=lineOrder().slice(), i=o.indexOf(k), j=i+(+arg.split(':')[1]);
      if(i>=0&&j>=0&&j<o.length){ o[i]=o[j]; o[j]=k; S.settings.order=o; commit(); render(); } } break;
    case 'lineToggle': { if(!LINES[arg]||lineLocked(arg)) break;
      const off=(Array.isArray(S.settings.off)?S.settings.off:[]).filter(x=>x!==arg); if(lineOn(arg)) off.push(arg);
      S.settings.off=off; commit(); render(); } break;
    case 'closeLesson': if(ui.back){ act('backToRead'); break; } ui.lesson=null; render(); window.scrollTo(0,lessonScroll); break;
    case 'kquiz': startQuiz('Kanji reading quiz', kanjiQuizQs(10), {type:'kanji'}); break;
    case 'pick': pickAnswer(+arg); break;
    case 'next': nextQuestion(); break;
    case 'quizExit': go(()=>{ ui.quiz=null; }); break;
    case 'openKanji': if(ui.kanji===null) kanjiScroll=window.scrollY; go(()=>{ ui.kanji=arg; }); break;
    case 'closeKanji': ui.kanji=null; render(); window.scrollTo(0,kanjiScroll); break;
    // The list's scroll position is kept only when leaving the list, not on Previous/Next from a detail page.
    case 'openVocab': if(ui.vocab===null) vocabScroll=window.scrollY; go(()=>{ ui.vocab=arg; }); break;
    case 'closeVocab': if(ui.back){ act('backToRead'); break; } ui.vocab=null; render(); window.scrollTo(0,vocabScroll); break;
    case 'addCard': if(!S.cards[arg]){ S.cards[arg]=newCard(Date.now()); commit(); render(); } break;
    case 'filter': ui.vf=arg; render(); break;
    case 'kfilter': ui.kf=arg; render(); break;
    case 'klv': ui.klv=ui.klv===arg?'':arg; render(); break;
    case 'vtop': ui.vtop=!ui.vtop; render(); break;
    case 'vlv': ui.vlv=ui.vlv===arg?'':arg; render(); break;
    case 'gfilter': ui.gf=arg; render(); break;
    case 'lessonStep': go(()=>{ openLesson(lessonStep(ui.lesson,+arg),true); }); break;
    case 'lkClose': closeLookup(); break;
    case 'lkAdd': if(!S.cards[arg]){ S.cards[arg]=newCard(Date.now()); commit(); } render(); openLookup(arg); break;
    case 'lkOpen': { const b={read:ui.read,tab:ui.tab,vocab:ui.vocab,lesson:ui.lesson,y:window.scrollY,prev:ui.back};
      go(()=>{ ui.back=b; ui.read=null; ui.tab='vocab'; ui.lesson=null; ui.vocab=arg; }); break; }
    case 'feedOpen': { const b={read:ui.read,tab:ui.tab,vocab:ui.vocab,lesson:ui.lesson,y:window.scrollY,prev:ui.back};
      go(()=>{ ui.back=b; ui.read=null; if(arg[0]==='g'){ ui.tab='grammar'; ui.vocab=null; openLesson(+arg.slice(1),true); } else { ui.tab='vocab'; ui.lesson=null; ui.vocab=arg; } }); break; }
    case 'backToRead': { const b=ui.back; if(!b) break; ui.back=b.prev; ui.tab=b.tab; ui.vocab=b.vocab; ui.lesson=b.lesson; ui.read=b.read; render(); window.scrollTo(0,b.y||0); break; }
    case 'glv': ui.glv=ui.glv===arg?'':arg; render(); break;
    case 'markMode': ui.mark=!ui.mark; render(); break;
    case 'toggleKnown': setKnown(arg,!isKnown(arg)); commit(); render(); break;
    case 'markShown': { const on=arg==='1'; vocabRows().forEach(w=>{ if(isKnown(w.id)!==on) setKnown(w.id,on); }); commit(); render(); break; }
    case 'resetAsk': ui.confirmReset=true; ui.settingsOpen=true; render(); break;
    case 'resetNo': ui.confirmReset=false; render(); break;
    case 'resetGo': {
      const keep=Date.now();
      S=defaultState(); S.resetAt=keep; ui.confirmReset=false; commit(); render(); break; }
  }
}
document.addEventListener('click',function(e){
  const lk=e.target.closest('.lk');
  if(lk){ lk.querySelectorAll('ruby.fh').forEach(r=>r.classList.add('fs')); noteTap(lk.dataset.lk); openLookup(lk.dataset.lk,lk); return; }
  if(LKOPEN&&!e.target.closest('#lk-sheet')){ closeLookup(); return; }
  const b=e.target.closest('[data-act]'); if(!b) return;
  if(b.dataset.act==='furi'){ b.classList.toggle('fs'); return; }
  act(b.dataset.act,b.dataset.arg);
});
// Remember whether Settings is open, since every change re-renders the page.
document.addEventListener('toggle',function(e){
  if(e.target&&e.target.classList&&e.target.classList.contains('settings')) ui.settingsOpen=e.target.open;
},true);
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
  if(e.target&&e.target.id==='kq'){ ui.kq=e.target.value; const l=$('#ktiles'); if(l) l.innerHTML=kanjiTilesHtml(); }
  if(e.target&&e.target.id==='gq'){ ui.gq=e.target.value; const l=$('#glist'); if(l) l.innerHTML=lessonListHtml(); }
});
document.addEventListener('keydown',function(e){
  if(LKOPEN&&e.key==='Escape'){ e.preventDefault(); closeLookup(); return; }
  const tg=e.target;
  // Focused lookup words open like a tap; the tabs move with the arrow keys and activate as they go.
  if(tg&&tg.classList&&tg.classList.contains('lk')&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); tg.click(); return; }
  if(tg&&tg.classList&&tg.classList.contains('tab')&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){
    e.preventDefault();
    const tabs=[...document.querySelectorAll('#tabs .tab')], j=(tabs.indexOf(tg)+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length, arg=tabs[j].dataset.arg;
    act('tab',arg); const n=document.querySelector('#tabs .tab[data-arg="'+arg+'"]'); if(n) n.focus();
    return;
  }
  const t=e.target; if(t&&t!==document.body&&t!==document.documentElement) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(ui.session&&ui.session.queue.length){
    if(e.key===' '||e.key==='Enter'){ e.preventDefault(); act('readDone'); }
    else if(e.key==='r'||e.key==='R'||e.key==='s'||e.key==='S'){
      e.preventDefault();
      const it=ITEM[ui.session.queue[0]];
      if(it) speak(it.ex&&it.ex[0]?it.ex[0][1]:(it.kun||it.on));
    }
  } else if(ui.read&&ui.read.i<ui.read.items.length){
    if(e.key===' '||e.key==='Enter'){ e.preventDefault(); readStep(); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); readNext(); }
    else if(e.key==='r'||e.key==='R'||e.key==='s'||e.key==='S'){ e.preventDefault(); act('feedSay'); }
    else if((e.key==='l'||e.key==='L')&&canSpeakJa()){ e.preventDefault(); act('listenToggle'); }
    else if(ui.read.meta.soon&&(e.key==='a'||e.key==='A')){ e.preventDefault(); readNext(true); }
    else if(ui.read.meta.soon&&(e.key==='k'||e.key==='K')){ e.preventDefault(); knowRead(); }
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
  } else if(ui.lesson!==null&&ui.tab==='grammar'&&!ui.session&&!ui.quiz&&!ui.read){
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ e.preventDefault(); act('lessonStep', e.key==='ArrowLeft'?-1:1); }
    else if(e.key==='Escape'||e.key==='Backspace'){ e.preventDefault(); act('closeLesson'); }
    else if(e.key==='k'||e.key==='K'){ e.preventDefault(); act('toggleKnown', GRAMMAR[ui.lesson].id); }
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
    if(dx<0) readStep();
  } else if(ui.vocab!==null&&!ui.session&&!ui.quiz&&!ui.read){
    const rows=vocabRows(), list=rows.some(w=>w.id===ui.vocab)?rows:VOCAB;
    const idx=list.findIndex(w=>w.id===ui.vocab);
    if(idx>=0){
      if(dx<0) act('openVocab', list[(idx+1)%list.length].id);
      else if(dx>0) act('openVocab', list[(idx+list.length-1)%list.length].id);
    }
  } else if(ui.lesson!==null&&!ui.session&&!ui.quiz&&!ui.read){
    act('lessonStep', dx<0?1:-1);
  }
},{passive:true});

/*TEST_HOOK*/
render();
initRemote();
})();
