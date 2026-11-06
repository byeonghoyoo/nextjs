
/* Saturday review: only lessons previously published during the current week; no new vocabulary. */
(function(){
"use strict";
const WK_BEGIN="2026-11-04";
const wkE=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const wkInternal={};
function wkSessions(day){
  const d=new Date(day.date+"T12:00:00Z"),weekDay=d.getUTCDay();
  const mon=new Date(d);mon.setUTCDate(d.getUTCDate()-(weekDay===0?6:weekDay-1));
  const fri=new Date(mon);fri.setUTCDate(mon.getUTCDate()+4);
  const start=Math.max(Date.parse(WK_BEGIN+"T00:00:00Z"),Date.parse(mon.toISOString().slice(0,10)+"T00:00:00Z"));
  const end=Date.parse(fri.toISOString().slice(0,10)+"T00:00:00Z");
  return lessons.filter(x=>x.kind!=="weekend"&&x.kind!=="sunday"&&Date.parse(x.date+"T00:00:00Z")>=start&&Date.parse(x.date+"T00:00:00Z")<=end).flatMap(x=>
    ["am","pm"].filter(view=>view==="am"?x.morning:x.evening).map(view=>({date:x.date,lesson:x,view,lessonSession:view==="am"?x.morning:x.evening}))
  );
}
function wkData(l){
  const sessions=wkSessions(l);
  const words=sessions.flatMap(a=>a.lessonSession.words.map((w,i)=>({...w,source:a,date:a.date,index:i,key:a.date+"-"+a.view+"-"+i})));
  const scenes=sessions.flatMap(a=>(a.lessonSession.scenes||[]).map((s,i)=>({title:s.title,dialogue:s.dialogue,source:a,index:i})));
  return {sessions,words,scenes,grammar:sessions.map(a=>({g:a.lessonSession.grammar,source:a})).filter(x=>x.g)};
}
const steps={am:[["wk_scenes","실제 생성된 4개 상황 사진을 보고 의미 떠올리기"],["wk_words","이번 주 신규 40개 단어를 전부 다시 보고 소리 내기"],["wk_listen","기존 대사들을 들으며 3번 말하기"],["wk_grammar","이번 주에 배운 문법 4개 반복 연습"],["wk_amquiz","10개씩 랜덤 단어 테스트 완료"]],pm:[["wk_roleplay","카페·길찾기·마트·계산대 4상황 대화 연습"],["wk_pmquiz","기존 단어 중 랜덤 10개 복습 시험"],["wk_wrong","틀린 단어 다시 말하며 재도전"],["wk_gramquiz","이번 주 문법 문제 4개 확인"],["wk_pmcomplete","저녁 주간 복습 완료 확인"]]};
function wkCheckCount(l){const c=(state.checks||{})[l.date]||{};return Object.values(steps).flat().filter(x=>c[x[0]]).length;}
function wkPercent(l){return Math.round(wkCheckCount(l)/10*100)}
function wkCompleted(l){return wkCheckCount(l)===10}
const scenarios=[
 {title:"카페에서 주문하기",prompt:"작은 아이스커피를 주문할 때?",answer:"Can I have a small iced coffee, please?",ko:"작은 아이스커피 한 잔 주시겠어요?",pic:0},
 {title:"지하철역 길 묻기",prompt:"지하철역으로 가는 길을 물을 때?",answer:"Excuse me, how do I get to the subway?",ko:"실례합니다. 지하철역에 어떻게 가나요?",pic:1},
 {title:"마트에서 우유 찾기",prompt:"매장에서 우유가 어디 있는지 물을 때?",answer:"Excuse me, where is the milk?",ko:"실례합니다. 우유가 어디 있나요?",pic:2},
 {title:"카드로 결제하기",prompt:"카드로 결제 가능한지 물을 때?",answer:"Can I pay by card?",ko:"카드로 결제할 수 있을까요?",pic:3}
];
const grammarQs=[
 {q:"커피를 공손하게 요청하는 표현을 고르세요.",choices:["Can I have a coffee, please?","I have can a coffee.","Please coffee I am."],answer:0,explain:"Can I have + 물건, please?"},
 {q:"지하철역까지 가는 길을 묻는 문장을 고르세요.",choices:["I get how subway to?","How do I get to the subway?","The subway do I how?"],answer:1,explain:"How do I get to + 장소?"},
 {q:"우유가 어디 있는지 묻는 문장을 고르세요.",choices:["Where the milk is?","Where are milk?","Where is the milk?"],answer:2,explain:"Where is + 단수 물건?"},
 {q:"카드로 결제할 때의 문장을 고르세요.",choices:["Can I pay by card?","Can I pay with cash card?","Pay I can by a card?"],answer:0,explain:"Can I pay by card? / Can I pay in cash?"}
];
function wkShuffle(a){const arr=[...a];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr;}
function wkTest(l,wrongOnly=false){
  const d=wkData(l),p=wkInternal[l.date]||(wkInternal[l.date]={});
  let pool=d.words;
  if(wrongOnly){const miss=((state.weekends||{})[l.date]||{}).wrong||{};const picked=pool.filter(w=>miss[w.key]);if(picked.length)pool=picked;}
  p.test=wkShuffle(pool).slice(0,10).map(word=>{
    const other=wkShuffle(d.words.filter(w=>w.key!==word.key&&w.ko!==word.ko)).slice(0,3);
    return {word,options:wkShuffle([word,...other]),answer:null};
  });
  p.lastMode=wrongOnly?"wrong":"all";
  return p.test;
}
function wkRender(l,target){
  const root=document.getElementById(target);if(!root)return;
  const data=wkData(l);
  const meta=(state.weekends||{})[l.date]||{},view=(meta.view==="pm")?"pm":"am";
  const p=wkInternal[l.date]||(wkInternal[l.date]={});
  if(!p.test)wkTest(l);
  const tally=data.sessions.length,dayCount=new Set(data.sessions.map(s=>s.date)).size;
  const header='<div class="card wkHeader"><span class="pill">SATURDAY · WEEK 01 REVIEW</span><h2>🔁 11월 7일 · 토요일 주간 종합복습</h2><p>11월 4일(수)~6일(금)에 <b>실제로 게시한 '+dayCount+'일 · '+tally+'회차 · '+data.words.length+'개 단어</b>를 다시 공부해요.</p><p class="muted small">주말에는 새 단어와 새 문법이 없습니다. 게시되지 않은 저녁 수업은 포함하지 않았어요.</p><div class="sessionNav"><button data-wkview="am" class="'+(view==="am"?"active":"")+'">☀️ 오전 · 사진·단어·문법 복습</button><button data-wkview="pm" class="'+(view==="pm"?"active":"")+'">🌙 저녁 · 상황극·퀴즈·오답</button></div><div class="meter"><div style="width:'+wkPercent(l)+'%"></div></div><p class="muted small">주간 복습 체크: '+wkCheckCount(l)+'/10 · '+wkPercent(l)+'%</p></div>';
  const sceneGrid='<div class="wkSceneGrid">'+scenarios.map(s=>'<div class="wkScene"><div class="wkSceneImage" role="img" aria-label="'+wkE(s.title)+' 장면 사진" style="background-position:'+(s.pic%2?100:0)+'% '+(s.pic>1?100:0)+'%"></div><div class="wkSceneText"><b>'+wkE(s.title)+'</b><p>'+wkE(s.prompt)+'</p><button class="btn" data-wksay="'+s.pic+'">🔊 영어 듣기</button><details><summary>정답 영어·뜻 펼치기</summary><b>'+wkE(s.answer)+'</b><p>'+wkE(s.ko)+'</p></details></div></div>').join("")+'</div>';
  const allWords='<div class="wkWordGrid">'+data.words.map((w,i)=>'<article class="wkWord"><div class="wkWordTop">'+renderWordPicture(w.source.lesson,w.source.view,w.index,w)+'</div><div class="wkWordName">'+wkE(w.en)+'</div><button class="btn" data-wkword="'+i+'">🔊</button><details><summary>뜻 · 예문</summary><p><b>'+wkE(w.ko)+'</b></p><p>'+wkE(w.example)+'</p></details><span class="muted small">'+w.date+' '+(w.source.view==="am"?"오전":"저녁")+'</span></article>').join("")+'</div>';
  const allGrammar='<div class="wkGrammarGrid">'+data.grammar.map(({g,source},i)=>'<div class="wkGrammarCard"><div class="eyebrow">'+(i+1)+' · '+wkE(source.date)+'</div><b>'+wkE(g.title)+'</b><p>'+wkE(g.meaning)+'</p><div class="grammarPattern">'+wkE(g.pattern)+'</div><button class="btn" data-wkgram="'+i+'">🔊 예문 듣기</button><details><summary>예문 뜻 펼치기</summary><p>'+wkE(g.example)+'</p><p>'+wkE(g.exampleKo)+'</p></details></div>').join("")+'</div>';
  const dialogueList='<div class="wkDialogues">'+data.scenes.map((s,i)=>'<div class="wkDialogue"><h3>'+(i+1)+'. '+wkE(s.title)+'</h3>'+s.dialogue.map((d,j)=>'<div class="wkLine"><div class="small muted">'+wkE(d.speaker)+'</div><b>'+wkE(d.en)+'</b><div class="speakrow"><button class="btn" data-wkline="'+i+'" data-wkli="'+j+'">🔊 듣기</button><button class="btn" data-wkline="'+i+'" data-wkli="'+j+'" data-wkslow="1">🐢 느리게</button></div><details><summary>🇰🇷 뜻 펼치기</summary><p>'+wkE(d.ko)+'</p></details></div>').join("")+'</div>').join("")+'</div>';
  const qList=grammarQs.map((q,i)=>{
    const ans=(meta.grammarAnswers||{})[i];
    return '<div class="wkQuestion"><h3>문법 Q'+(i+1)+'. '+wkE(q.q)+'</h3><div class="choices">'+q.choices.map((x,j)=>'<button class="choice '+(ans!==undefined?(j===q.answer?"correct":j===ans?"wrong":""):"")+'" data-wkgq="'+i+'" data-wkgc="'+j+'">'+wkE(x)+'</button>').join("")+'</div>'+(ans===undefined?"":'<p class="feedback">'+(ans===q.answer?"✅ 정답! ":"💡 핵심 구조: ")+wkE(q.explain)+'</p>')+'</div>';
  }).join("");
  const test=p.test||[];
  const quizCards='<div class="wkQuiz"><p class="muted small">이번 주 '+data.words.length+'개 중 랜덤 10개. 틀린 문제는 오답 목록에 저장해요.</p><div class="speakrow"><button class="btn primary" data-wkrandom="1">🔀 새 10문제 뽑기</button><button class="btn" data-wkretry="1">↩️ 오답 재시험</button></div>'+test.map((q,i)=>'<div class="wkQuestion"><h3>단어 '+(i+1)+'/10 · '+wkE(q.word.en)+'</h3><button class="btn" data-wkqvoice="'+i+'">🔊 발음 듣기</button><div class="choices">'+q.options.map((opt,j)=>'<button class="choice '+(q.answer!==null?(opt.key===q.word.key?"correct":q.answer===j?"wrong":""):"")+'" data-wkq="'+i+'" data-wkopt="'+j+'">'+wkE(opt.ko)+'</button>').join("")+'</div><div class="feedback">'+(q.answer===null?"":(q.options[q.answer].key===q.word.key?"✅ 정답! ":"❌ 다시 외워요: ")+wkE(q.word.example))+'</div></div>').join("")+'</div>';
  const checklist='<div class="card"><h2>✅ '+(view==="am"?"오전":"저녁")+' 복습 체크</h2>'+steps[view].map(([id,txt])=>'<label class="task"><input type="checkbox" data-wkcheck="'+id+'" '+(((state.checks||{})[l.date]||{})[id]?"checked":"")+'><span>'+wkE(txt)+'</span></label>').join("")+'</div>';
  let body="";
  if(view==="am"){
    body='<div class="card"><h2>① 사진으로 상황 떠올리기</h2><p class="muted small">사진은 실제 생성된 장면 이미지입니다. 한글 풀이를 보기 전 영어를 먼저 말해보세요.</p>'+sceneGrid+'</div><div class="card"><h2>② 배운 단어 '+data.words.length+'개 · 새 단어 없음</h2><p class="muted small">수요일 20개 · 목요일 10개 · 금요일 10개. 그림에서 의미를 유추하고 발음 듣기.</p>'+allWords+'</div><div class="card"><h2>③ 이번 주 배운 문법 '+data.grammar.length+'개 복습</h2>'+allGrammar+'</div><div class="card"><h2>④ 랜덤 10단어 확인 시험</h2>'+quizCards+'</div>'+checklist;
  }else{
    body='<div class="card"><h2>① 그림 상황극 · 역할 바꿔 말하기</h2>'+sceneGrid+'</div><div class="card"><h2>② 이번 주 원래 수업 대사 다시 말하기</h2><p class="muted small">새 문장 추가 없이 게시된 대사만 재사용합니다.</p>'+dialogueList+'</div><div class="card"><h2>③ 랜덤 단어 10개 시험과 오답 재도전</h2>'+quizCards+'</div><div class="card"><h2>④ 쉬운 문법 적용 문제</h2>'+qList+'</div>'+checklist;
  }
  root.innerHTML=header+body;
  root.querySelectorAll("[data-wkview]").forEach(b=>b.onclick=()=>{state.weekends=state.weekends||{};state.weekends[l.date]=state.weekends[l.date]||{};state.weekends[l.date].view=b.dataset.wkview;save();wkRender(l,target)});
  root.querySelectorAll("[data-wkcheck]").forEach(b=>b.onchange=()=>{state.checks[l.date]=state.checks[l.date]||{};state.checks[l.date][b.dataset.wkcheck]=b.checked;save();wkRender(l,target);todayStats();renderProgress();});
  root.querySelectorAll("[data-wksay]").forEach(b=>b.onclick=()=>say(scenarios[+b.dataset.wksay].answer));
  root.querySelectorAll("[data-wkword]").forEach(b=>b.onclick=()=>say(data.words[+b.dataset.wkword].en));
  root.querySelectorAll("[data-wkgram]").forEach(b=>b.onclick=()=>say(data.grammar[+b.dataset.wkgram].g.example));
  root.querySelectorAll("[data-wkline]").forEach(b=>b.onclick=()=>say(data.scenes[+b.dataset.wkline].dialogue[+b.dataset.wkli].en,b.dataset.wkslow==="1"));
  root.querySelectorAll("[data-wkrandom]").forEach(b=>b.onclick=()=>{wkTest(l);wkRender(l,target)});
  root.querySelectorAll("[data-wkretry]").forEach(b=>b.onclick=()=>{wkTest(l,true);wkRender(l,target)});
  root.querySelectorAll("[data-wkqvoice]").forEach(b=>b.onclick=()=>say(p.test[+b.dataset.wkqvoice].word.en));
  root.querySelectorAll("[data-wkq]").forEach(b=>b.onclick=()=>{
    const q=p.test[+b.dataset.wkq],choice=+b.dataset.wkopt;if(q.answer!==null)return;q.answer=choice;
    state.weekends=state.weekends||{};const m=state.weekends[l.date]=state.weekends[l.date]||{};m.wrong=m.wrong||{};
    if(q.options[choice].key===q.word.key)delete m.wrong[q.word.key];else m.wrong[q.word.key]=true;
    m.answered=(m.answered||0)+1;save();wkRender(l,target);
  });
  root.querySelectorAll("[data-wkgq]").forEach(b=>b.onclick=()=>{state.weekends=state.weekends||{};const m=state.weekends[l.date]=state.weekends[l.date]||{};m.grammarAnswers=m.grammarAnswers||{};m.grammarAnswers[b.dataset.wkgq]=+b.dataset.wkgc;save();wkRender(l,target)});
}
window.renderWeekendReview=wkRender;
window.weekendReviewData=wkData;
window.weekendReviewPercent=wkPercent;
window.weekendReviewCompleted=wkCompleted;
})();