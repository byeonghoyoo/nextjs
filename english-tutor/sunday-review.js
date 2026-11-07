/* Sunday cumulative assessment: reuse ONLY actually published Monday–Friday lessons. */
(function () {
"use strict";
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const plans = {
 am: [["sun_am_scenes","이번 주에 실제 배운 4개 상황 사진 보고 기억하기"],["sun_am_words","누적 단어 40개 그림으로 뜻 떠올리기"],["sun_am_listen","영어 대사 듣고 3번 소리 내어 말하기"],["sun_am_grammar","기존 핵심 문법 4개 복습하기"],["sun_am_quiz","누적 단어 랜덤 10문제 풀기"]],
 pm: [["sun_pm_roleplay","4가지 상황에서 역할을 바꿔 영어로 말하기"],["sun_pm_quiz","종합 랜덤 단어 10문제 풀기"],["sun_pm_wrong","틀린 단어 오답 재도전하기"],["sun_pm_grammar","문법 4문제 직접 선택하기"],["sun_pm_report","주간 성취도 확인하고 저녁 학습 마치기"]]
};
function dataFor(l) {
 const utc=new Date(l.date+"T12:00:00Z"),dow=utc.getUTCDay();
 const monday=new Date(utc);monday.setUTCDate(utc.getUTCDate()-(dow===0?6:dow-1));
 const friday=new Date(monday);friday.setUTCDate(monday.getUTCDate()+4);
 const min="2026-11-04",max=friday.toISOString().slice(0,10),start=monday.toISOString().slice(0,10);
 const sessions=lessons.filter(x=>x.date>=min&&x.date>=start&&x.date<=max&&x.kind!=="weekend"&&x.kind!=="sunday").flatMap(x=>
 ["am","pm"].filter(v=>v==="am"?!!x.morning:!!x.evening).map(v=>({date:x.date,view:v,lesson:x,lessonSession:v==="am"?x.morning:x.evening})));
 const words=sessions.flatMap(s=>(s.lessonSession.words||[]).map((w,i)=>({...w,key:s.date+"-"+s.view+"-"+i,source:s,index:i})));
 const grammar=sessions.filter(s=>!!s.lessonSession.grammar).map(s=>({g:s.lessonSession.grammar,source:s}));
 const scenarios=sessions.map(s=>({source:s,scene:s.lessonSession.scenes?.[0]||null,dialogue:(s.lessonSession.scenes||[]).flatMap(sc=>sc.dialogue||[])}));
 return {sessions,words,grammar,scenarios,days:new Set(sessions.map(s=>s.date)).size};
}
function stateFor(l){state.sundays=state.sundays||{};return state.sundays[l.date]||(state.sundays[l.date]={view:"am",quizzes:{},misses:{},grammarAnswers:{},history:[]})}
function count(l){const c=(state.checks||{})[l.date]||{};return [...plans.am,...plans.pm].filter(p=>!!c[p[0]]).length}
function percent(l){return Math.round(count(l)/10*100)}
function completed(l){return count(l)===10}
function shuffle(v){const a=[...v];for(let i=a.length-1;i>0;i--){const k=Math.floor(Math.random()*(i+1));[a[k],a[i]]=[a[i],a[k]]}return a}
function buildQuiz(l,mode,missed=false){
 const d=dataFor(l),st=stateFor(l);
 let pool=missed?d.words.filter(w=>!!st.misses[w.key]):d.words;
 if(!pool.length)pool=d.words;
 st.quizzes[mode]={items:shuffle(pool).slice(0,10).map(w=>({key:w.key,options:shuffle([w,...shuffle(d.words.filter(z=>z.key!==w.key && z.ko!==w.ko)).slice(0,3)]).map(z=>z.key),answer:null})),missedOnly:missed};
 save();
}
function quizHTML(l,view,d,st) {
 const test=st.quizzes[view];if(!test)return '<div class="sunBlank"><p>랜덤 10문제 시험을 시작해 보세요. 틀린 문제는 오답 목록에 저장돼요.</p><button class="btn primary" data-sun-test="1">🧠 10문제 시작</button></div>';
 const dictionary=Object.fromEntries(d.words.map(w=>[w.key,w]));
 const parts=test.items.map((x,i)=>{
   const w=dictionary[x.key];if(!w)return "";
   const opts=x.options.map((k,j)=>{const p=dictionary[k];if(!p)return "";const cls=x.answer===null?"":(k===w.key?"correct":j===x.answer?"wrong":"");return '<button class="choice '+cls+'" data-sun-answer="'+i+'" data-sun-option="'+j+'" '+(x.answer!==null?"disabled":"")+'>'+esc(p.ko)+'</button>'}).join("");
   return '<div class="wkQuestion"><h3>Q'+(i+1)+'. '+esc(w.en)+'</h3><button class="btn" data-sun-voice="'+i+'">🔊 듣기</button><div class="choices">'+opts+'</div><p class="feedback">'+(x.answer===null?"뜻을 기억해서 답을 눌러보세요.":x.options[x.answer]===w.key?"✅ 정답! "+esc(w.example):"❌ 다시 말하기: "+esc(w.en)+" = "+esc(w.ko))+'</p></div>';
 }).join("");
 const answered=test.items.filter(x=>x.answer!==null).length,correct=test.items.filter(x=>x.answer!==null&&x.options[x.answer]===x.key).length;
 return '<div class="sunQuizStats"><b>'+answered+'/10 답변 · '+correct+'개 정답</b><div class="speakrow"><button class="btn primary" data-sun-restart="1">🔀 새 10문제</button><button class="btn" data-sun-wrong="1">↩ 오답 재도전</button></div></div>'+parts;
}
function scenariosHTML(d) {
 return '<div class="sunSceneGrid">'+d.scenarios.map((v,i)=>{
  const pic=i<4?'<div class="sunScenePhoto sunQuarter" role="img" aria-label="'+esc(v.scene?.alt||"학습 상황")+'" style="background-position:'+(i%2?100:0)+'% '+(i>1?100:0)+'%"></div>':
  renderScenePicture(v.source.lesson,v.source.view,0,v.scene||{alt:v.lessonSession?.title||"상황"});
  const lines=v.dialogue.map((line,j)=>'<div class="sunLine"><b>'+esc(line.en)+'</b><button class="btn" data-sun-dialogue="'+i+'" data-sun-line="'+j+'">🔊</button><button class="btn" data-sun-dialogue="'+i+'" data-sun-line="'+j+'" data-sun-slow="1">🐢</button><details><summary>🇰🇷 뜻 보기</summary><p>'+esc(line.ko)+'</p></details></div>').join("");
  return '<article class="sunScene"><div class="sunSceneVisual">'+pic+'</div><div class="sunSceneInfo"><div class="eyebrow">'+esc(v.source.date)+' · '+(v.source.view==="am"?"오전":"저녁")+'</div><h3>'+esc(v.source.lessonSession.title)+'</h3><p class="muted small">사진을 보고 먼저 영어 상황을 떠올려 보세요.</p>'+lines+'</div></article>';
 }).join("")+'</div>';
}
function wordHTML(d){
 return '<div class="wkWordGrid">'+d.words.map((w,i)=>
 '<article class="wkWord"><div class="wkWordTop">'+renderWordPicture(w.source.lesson,w.source.view,w.index,w)+'</div><div class="wkWordName">'+esc(w.en)+'</div><button class="btn" data-sun-word="'+i+'">🔊</button><details><summary>뜻과 예문 확인</summary><p><b>'+esc(w.ko)+'</b></p><p>'+esc(w.example)+'</p><button class="btn" data-sun-example="'+i+'">🔊 예문</button></details><span class="muted small">'+esc(w.source.date)+' '+(w.source.view==="am"?"오전":"저녁")+'</span></article>').join("")+'</div>';
}
function grammarHTML(d){
 return '<div class="wkGrammarGrid">'+d.grammar.map(({g,source},i)=>
 '<article class="wkGrammarCard"><span class="eyebrow">배운 문법 '+(i+1)+' · '+esc(source.date)+'</span><h3>'+esc(g.title)+'</h3><p>'+esc(g.meaning)+'</p><div class="grammarPattern">'+esc(g.pattern)+'</div><button class="btn" data-sun-gramvoice="'+i+'">🔊 예문 듣기</button><details><summary>예문 뜻 펼치기</summary><p>'+esc(g.example)+'</p><p>'+esc(g.exampleKo)+'</p></details></article>').join("")+'</div>';
}
function grammarTestHTML(d,st) {
 return d.grammar.map(({g},i)=>{
 const answer=st.grammarAnswers[i];
 return '<div class="wkQuestion"><h3>문법 Q'+(i+1)+'. '+esc(g.question)+'</h3><div class="choices">'+g.choices.map((c,j)=>'<button class="choice '+(answer===undefined?"":(j===g.correct?"correct":j===answer?"wrong":""))+'" data-sun-gramq="'+i+'" data-sun-gramopt="'+j+'">'+esc(c)+'</button>').join("")+'</div><p class="feedback">'+(answer===undefined?"이전에 배운 문법을 골라보세요.":answer===g.correct?"✅ 정답! "+esc(g.pattern):"💡 다시 확인: "+esc(g.pattern))+'</p></div>';
 }).join("");
}
function scoreHTML(l,d,st) {
 const cs=(state.checks||{})[l.date]||{},done=count(l),qa=Object.values(st.quizzes||{});
 const scored=qa.flatMap(q=>q.items||[]).filter(q=>q.answer!==null);
 const right=scored.filter(q=>q.options[q.answer]===q.key).length;
 const wrong=d.words.filter(w=>st.misses[w.key]).length;
 const available=d.words.length;
 return '<div class="sunMetrics"><div><b>'+available+'</b><span>실제 학습 누적 단어</span></div><div><b>'+d.grammar.length+'</b><span>복습할 기존 문법</span></div><div><b>'+right+'/'+scored.length+'</b><span>맞힌 문제/응답</span></div><div><b>'+wrong+'</b><span>남은 오답</span></div><div><b>'+done+'/10</b><span>일요일 학습 체크</span></div></div><div class="meter"><div style="width:'+percent(l)+'%"></div></div><p class="muted small">결과는 이 기기의 브라우저에 자동 저장되며, 기존 수업과 영상 100개 코스 기록은 유지됩니다.</p>';
}
function checkHTML(l,view) {
 const c=(state.checks||{})[l.date]||{};
 return '<div class="card"><h2>✅ '+(view==="am"?"오전":"저녁")+' 종합평가 완료 체크</h2>'+plans[view].map(([id,title])=>'<label class="task"><input type="checkbox" data-sun-check="'+id+'" '+(c[id]?"checked":"")+'><span>'+esc(title)+'</span></label>').join("")+'</div>';
}
function render(l,target){
 const holder=document.getElementById(target);if(!holder)return;
 const d=dataFor(l),st=stateFor(l),view=st.view==="pm"?"pm":"am";
 const title='<div class="card sunHero"><span class="pill">SUNDAY · WEEK 01 FINAL REVIEW</span><h2>🎯 '+esc(l.date)+' 일요일 · 첫 주 종합평가</h2><p>11월 4일~6일에 실제 게시된 <b>'+d.days+'일 · '+d.sessions.length+'회 수업 · 단어 '+d.words.length+'개 · 문법 '+d.grammar.length+'개</b>만 복습해요.</p><p class="muted small">새 단어·새 문법 없음. 누락된 저녁 수업은 학습한 것으로 가정하지 않았어요.</p><div class="sessionNav"><button data-sun-view="am" class="'+(view==="am"?"active":"")+'">☀️ 오전 · 단어·표현 종합복습</button><button data-sun-view="pm" class="'+(view==="pm"?"active":"")+'">🌙 저녁 · 오답·대화·주간평가</button></div>'+scoreHTML(l,d,st)+'</div>';
 let body="";
 const quiz='<div class="card"><h2>🧠 이번 주 단어 랜덤 10문제</h2>'+quizHTML(l,view,d,st)+'</div>';
 if(view==="am"){
 body='<div class="card"><h2>① 원래 배웠던 사진 상황 4개 떠올리기</h2>'+scenariosHTML(d)+'</div><div class="card"><h2>② 실제 누적 단어 '+d.words.length+'개 · 전부 복습</h2><p class="muted small">그림부터 보고 영어를 말한 후 ‘뜻과 예문’을 열어 확인하세요.</p>'+wordHTML(d)+'</div><div class="card"><h2>③ 기존 문법 '+d.grammar.length+'개 다시 연습</h2>'+grammarHTML(d)+'</div>'+quiz+checkHTML(l,view);
 }else{
 body='<div class="card"><h2>① 실전 대화 · 역할 바꿔 말하기</h2><p class="muted small">새로운 문장이 아니라 실제 게시된 4개 회차의 기존 대사예요. 각 문장마다 듣기·느리게 듣기와 뜻 확인이 가능해요.</p>'+scenariosHTML(d)+'</div>'+quiz+'<div class="card"><h2>③ 이전에 배운 문법 '+d.grammar.length+'문제</h2>'+grammarTestHTML(d,st)+'</div><div class="card"><h2>④ 오답 다시 확인 · 주간 달성률</h2>'+scoreHTML(l,d,st)+'</div>'+checkHTML(l,view);
 }
 holder.innerHTML=title+body;
 holder.querySelectorAll("[data-sun-view]").forEach(b=>b.onclick=()=>{st.view=b.dataset.sunView;save();render(l,target);});
 holder.querySelectorAll("[data-sun-dialogue]").forEach(b=>b.onclick=()=>say(d.scenarios[+b.dataset.sunDialogue].dialogue[+b.dataset.sunLine].en,b.dataset.sunSlow==="1"));
 holder.querySelectorAll("[data-sun-word]").forEach(b=>b.onclick=()=>say(d.words[+b.dataset.sunWord].en));
 holder.querySelectorAll("[data-sun-example]").forEach(b=>b.onclick=()=>say(d.words[+b.dataset.sunExample].example,true));
 holder.querySelectorAll("[data-sun-gramvoice]").forEach(b=>b.onclick=()=>say(d.grammar[+b.dataset.sunGramvoice].g.example));
 holder.querySelectorAll("[data-sun-check]").forEach(b=>b.onchange=()=>{state.checks[l.date]=state.checks[l.date]||{};state.checks[l.date][b.dataset.sunCheck]=b.checked;save();render(l,target);todayStats();renderProgress();});
 holder.querySelectorAll("[data-sun-test],[data-sun-restart]").forEach(b=>b.onclick=()=>{buildQuiz(l,view,false);render(l,target);});
 holder.querySelectorAll("[data-sun-wrong]").forEach(b=>b.onclick=()=>{buildQuiz(l,view,true);render(l,target);});
 holder.querySelectorAll("[data-sun-voice]").forEach(b=>b.onclick=()=>{const q=st.quizzes[view]?.items[+b.dataset.sunVoice],w=d.words.find(z=>z.key===q?.key);if(w)say(w.en);});
 holder.querySelectorAll("[data-sun-answer]").forEach(b=>b.onclick=()=>{
 const test=st.quizzes[view],q=test?.items[+b.dataset.sunAnswer],opt=+b.dataset.sunOption;if(!q||q.answer!==null)return;
 q.answer=opt;
 if(q.options[opt]===q.key)delete st.misses[q.key];else st.misses[q.key]=true;
 if(test.items.every(x=>x.answer!==null)){
   const score=test.items.filter(x=>x.options[x.answer]===x.key).length;
   st.history.push({date:l.date,session:view,score,total:test.items.length});
   st.history=st.history.slice(-80);
 }
 save();render(l,target);
 });
 holder.querySelectorAll("[data-sun-gramq]").forEach(b=>b.onclick=()=>{st.grammarAnswers[+b.dataset.sunGramq]=+b.dataset.sunGramopt;save();render(l,target);});
}
window.renderSundayReview=render;
window.sundayReviewData=dataFor;
window.sundayReviewPercent=percent;
window.sundayReviewCompleted=completed;
})();