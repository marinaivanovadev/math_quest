
import React,{useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import"./styles.css";

const LEVELS=[
{id:1,name:"Sunny Meadow",skill:"Addition to 10",type:"add",max:10,time:0,unlock:0},
{id:2,name:"Bunny Bridge",skill:"Subtraction to 10",type:"sub",max:10,time:0,unlock:80},
{id:3,name:"Rainbow Path",skill:"Mixed to 10",type:"mixed",max:10,time:12,unlock:180},
{id:4,name:"Forest Trail",skill:"Addition to 20",type:"add",max:20,time:12,unlock:300},
{id:5,name:"Crystal Cave",skill:"Subtraction to 20",type:"sub",max:20,time:10,unlock:450},
{id:6,name:"Castle Road",skill:"Mixed to 20",type:"mixed",max:20,time:9,unlock:650},
{id:7,name:"Cloud Castle",skill:"Addition to 29",type:"add",max:29,time:9,unlock:900},
{id:8,name:"Moon Mountain",skill:"Subtraction to 29",type:"sub",max:29,time:8,unlock:1200},
{id:9,name:"Star Kingdom",skill:"Mixed to 29",type:"mixed",max:29,time:7,unlock:1550},
{id:10,name:"Math Mastery",skill:"Mixed Challenge",type:"mixed",max:29,time:6,unlock:2000}
];
const AVATARS=["🦄","🐱","🐶","🐰","🦊","🐼","🐨","🐸"];
const initial={coins:0,stars:0,streak:0,bestStreak:0,correct:0,attempts:0,totalTime:0,hints:0,
facts:{},levelStars:{},avatar:"🦄",name:"Math Explorer",sound:true,lastUnlocked:1,
badges:[],sessions:[],strategyStats:{make10:0,nearDoubles:0,factFamily:0}};
const load=()=>{try{return{...initial,...JSON.parse(localStorage.getItem("mathQuestV41")||"{}")}}catch{return initial}};
const factKey=(a,op,b)=>`${a}${op}${b}`;

function App(){
 const[p,setP]=useState(load),[screen,setScreen]=useState("home"),[lid,setLid]=useState(1),
 [q,setQ]=useState(null),[input,setInput]=useState(""),[feedback,setFeedback]=useState(null),
 [started,setStarted]=useState(0),[left,setLeft]=useState(0),[hint,setHint]=useState(null),
 [qnum,setQnum]=useState(1),[round,setRound]=useState([]),[sessionStart,setSessionStart]=useState(0),
 [notice,setNotice]=useState(null),[strategy,setStrategy]=useState(null);

 const level=useMemo(()=>LEVELS.find(x=>x.id===lid),[lid]);
 useEffect(()=>localStorage.setItem("mathQuestV41",JSON.stringify(p)),[p]);

 const unlocked=id=>id===1||p.coins>=LEVELS[id-1].unlock;
 useEffect(()=>{
   const maxOpen=LEVELS.filter(l=>unlocked(l.id)).reduce((m,l)=>Math.max(m,l.id),1);
   if(maxOpen>p.lastUnlocked){
     setP(x=>({...x,lastUnlocked:maxOpen}));
     setNotice(`Level ${maxOpen} is now available!`);
     beep("reward");
   }
 },[p.coins]);

 useEffect(()=>{
   if(screen!=="game"||!q||feedback||!level.time)return;
   const t=setInterval(()=>{
     const r=Math.max(0,level.time-(Date.now()-started)/1000);setLeft(r);
     if(r<=0){answer("",true)}
   },100);
   return()=>clearInterval(t)
 },[screen,q,feedback,level.time,started]);

 function makeQ(l=level){
   let pool=[];
   for(let a=0;a<=l.max;a++)for(let b=0;b<=l.max;b++){
     if((l.type==="add"||l.type==="mixed")&&a+b<=l.max)pool.push({a,b,op:"+",answer:a+b});
     if((l.type==="sub"||l.type==="mixed")&&a>=b)pool.push({a,b,op:"−",answer:a-b});
   }
   const weighted=pool.flatMap(x=>{
     const f=p.facts[factKey(x.a,x.op,x.b)]||{};
     let w=1+(f.wrong||0)*4+Math.max(0,3-(f.correct||0));
     // Related fact families are favored when one member is weak.
     if(x.op==="+"&&x.a!==x.b){
       const rel=p.facts[factKey(x.b,x.op,x.a)];
       if(rel?.wrong)w+=2;
     }
     return Array(Math.min(10,w)).fill(x);
   });
   return weighted[Math.floor(Math.random()*weighted.length)]
 }
 function beep(kind){
   if(!p.sound)return;
   try{
     const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();
     o.connect(g);g.connect(ctx.destination);
     o.frequency.value=kind==="good"?660:kind==="bad"?220:kind==="reward"?880:520;
     g.gain.value=.035;o.start();o.stop(ctx.currentTime+(kind==="reward"?.25:.1));
   }catch{}
 }
 function start(id){
   setLid(id);setQnum(1);setRound([]);setSessionStart(Date.now());setScreen("game");setHint(null);setStrategy(null);
   setTimeout(()=>newQuestion(id),0)
 }
 function newQuestion(id=lid){
   const l=LEVELS.find(x=>x.id===id);
   // Use the explicitly selected level so React state timing cannot create a stale-level bug.
   let n=makeQ(l);
   if(!n)n={a:2,b:3,op:"+",answer:5};
   setQ(n);setInput("");setFeedback(null);setHint(null);setStrategy(null);setStarted(Date.now());setLeft(l.time)
 }
 function answer(v=input,timed=false){
   if(!q||feedback||(!timed&&v===""))return;
   const ans=Number(v),correct=!timed&&ans===q.answer,elapsed=(Date.now()-started)/1000,key=factKey(q.a,q.op,q.b);
   beep(correct?"good":"bad");
   setP(x=>{
     const facts={...x.facts},old=facts[key]||{correct:0,wrong:0,time:0};
     facts[key]={correct:old.correct+(correct?1:0),wrong:old.wrong+(correct?0:1),time:old.time+elapsed,last:Date.now()};
     const s=correct?x.streak+1:0,bonus=correct?(elapsed<=3?5:0)+(s>0&&s%3===0?10:0):0;
     return {...x,facts,attempts:x.attempts+1,correct:x.correct+(correct?1:0),totalTime:x.totalTime+elapsed,
       streak:s,bestStreak:Math.max(x.bestStreak,s),coins:x.coins+(correct?10+bonus:0),stars:x.stars+(correct?1:0)}
   });
   setRound(r=>[...r,{q:`${q.a} ${q.op} ${q.b}`,answer:q.answer,correct,time:elapsed}]);
   setFeedback({correct,timeout:timed});
 }
 function next(){
   if(qnum>=10){finish(round.concat(feedback?.correct!==undefined?[{correct:feedback.correct}]:[]));return}
   setQnum(n=>n+1);newQuestion()
 }
 function finish(finalRound=round){
   const score=finalRound.filter(x=>x.correct).length;
   const bonus=score===10?50:score>=8?25:0;
   if(bonus){setP(x=>({...x,coins:x.coins+bonus}))}
   setP(x=>({...x,sessions:[...x.sessions,{date:Date.now(),level:lid,score,questions:10}]}));
   beep("reward");setScreen("finish")
 }
 function showHint(){
   if(hint||feedback)return;
   setHint(q.op==="+"?"numberline":"numberline");
   setP(x=>({...x,hints:x.hints+1}));
 }
 function showStrategy(){
   if(feedback)return;
   setStrategy(q.op==="+"?strategyForAdd(q.a,q.b):strategyForSub(q.a,q.b));
 }
 function strategyForAdd(a,b){
   if(a+b<=10)return `Make 10: ${Math.min(a,10-a)} helps you get to 10, then add the rest.`;
   if(a===b)return `Double it: ${a}+${b} is two groups of ${a}.`;
   return `Break it apart: start with the bigger number and add the smaller number in parts.`;
 }
 function strategyForSub(a,b){
   if(a-b===0)return `Same numbers: taking ${b} away from ${a} leaves 0.`;
   return `Count back from ${a}, or think: ${b} + ? = ${a}.`;
 }
 const weak=Object.entries(p.facts).map(([key,f])=>({...f,key,tries:(f.correct||0)+(f.wrong||0),
   accuracy:(f.correct||0)/Math.max(1,(f.correct||0)+(f.wrong||0)),avg:(f.time||0)/Math.max(1,(f.correct||0)+(f.wrong||0))}))
   .filter(x=>x.wrong>0).sort((a,b)=>a.accuracy-b.accuracy||b.avg-a.avg).slice(0,15);
 const avg=p.attempts?p.totalTime/p.attempts:0;

 if(notice)return <div className="overlay"><div className="notice card"><div className="confetti">🎊 ✨ 🎉</div><h1>New Adventure Unlocked!</h1><p>{notice}</p><button onClick={()=>setNotice(null)}>Let's go! →</button></div></div>;

 if(screen==="home")return <><Header p={p}/><main className="home">
  <section className="hero card"><button className="avatarBtn" onClick={()=>setScreen("avatar")}>{p.avatar}</button><div><h1>Hi, {p.name}! 🌈</h1><p>Ready for today's math adventure?</p></div><div className="stats"><span>🪙 {p.coins}</span><span>⭐ {p.stars}</span><span>🔥 {p.bestStreak}</span></div></section>
  <div className="daily card"><div><b>🌟 Today's Mission</b><p>Finish one 10-question adventure.</p></div><button onClick={()=>start(Math.max(1,Math.min(p.lastUnlocked,10)))}>Play</button></div>
  <h2>🗺️ Choose an adventure</h2><div className="levels">{LEVELS.map(l=>{const open=unlocked(l.id);return <button disabled={!open} className={`level card ${open?"":"locked"}`} onClick={()=>start(l.id)} key={l.id}><div className="levelIcon">{open?["🌱","🐰","🌈","🌲","💎","🏰","☁️","🌙","⭐","👑"][l.id-1]:"🔒"}</div><div><strong>Level {l.id}: {l.name}</strong><small>{l.skill}</small></div>{!open&&<em>{l.unlock} 🪙</em>}</button>})}</div>
  <div className="actions"><button onClick={()=>setScreen("dashboard")}>👩‍👧 Parent Dashboard</button><button onClick={()=>setScreen("avatar")}>🧸 My Character</button><button className="secondary" onClick={()=>setP(x=>({...x,sound:!x.sound}))}>{p.sound?"🔊 Sound On":"🔇 Sound Off"}</button></div>
 </main></>;

 if(screen==="avatar")return <><Header p={p}/><main className="settings card"><h1>🧸 My Character</h1><div className="bigAvatar">{p.avatar}</div><input value={p.name} onChange={e=>setP({...p,name:e.target.value.slice(0,18)})}/><div className="avatarGrid">{AVATARS.map(a=><button className={a===p.avatar?"selected":""} onClick={()=>setP({...p,avatar:a})} key={a}>{a}</button>)}</div><label className="sound"><input type="checkbox" checked={p.sound} onChange={e=>setP({...p,sound:e.target.checked})}/> 🔊 Sound effects</label><button onClick={()=>setScreen("home")}>← Back</button></main></>;

 if(screen==="dashboard")return <><Header p={p}/><main className="dashboard card"><h1>👩‍👧 Parent Dashboard</h1><p>The game adapts practice using accuracy, mistakes and response time.</p>
  <div className="progressGrid"><div><b>{p.correct}</b><span>Correct</span></div><div><b>{p.attempts?Math.round(p.correct/p.attempts*100):0}%</b><span>Accuracy</span></div><div><b>{avg.toFixed(1)}s</b><span>Avg. time</span></div><div><b>{p.bestStreak}</b><span>Best streak</span></div></div>
  <h2>🧠 Facts needing practice</h2>{weak.length?<div className="facts">{weak.map(f=><div className="fact" key={f.key}><strong>{f.key}</strong><span>{Math.round(f.accuracy*100)}% correct</span><span>{f.wrong} mistakes</span><span>{f.avg.toFixed(1)}s avg</span></div>)}</div>:<div className="empty">Not enough data yet. The game will identify difficult facts as she plays.</div>}
  <h2>🎯 How to read this</h2><ul><li>Low accuracy means the fact needs more practice.</li><li>High time with good accuracy means she knows it but is not automatic yet.</li><li>The game deliberately brings weak facts back more often.</li><li>Wrong answers never remove coins.</li></ul>
  <h2>🏅 Recent adventures</h2>{p.sessions.length?<div className="sessions">{p.sessions.slice(-8).reverse().map((s,i)=><div key={i}>Level {s.level} — <b>{s.score}/10</b></div>)}</div>:<div className="empty">No completed adventures yet.</div>}
  <button onClick={()=>setScreen("home")}>← Back</button></main></>;

 if(screen==="finish"){const score=round.filter(x=>x.correct).length;return <div className="finish"><div className="reward card"><div className="celebrate">🎉 ✨ 🪙 ✨ 🎉</div><h1>Adventure Complete!</h1><p>Fantastic work, {p.name}!</p><div className="score"><b>{score}/10</b><span>correct answers</span></div>{score===10?<div className="badge">🏆 PERFECT ADVENTURE! +50 bonus coins</div>:score>=8?<div className="badge">🌟 SUPER ADVENTURE! +25 bonus coins</div>:<div className="badge">💪 Every mistake helps your brain learn!</div>}<p>🪙 Keep collecting coins to unlock new worlds.</p><button onClick={()=>setScreen("home")}>🏠 Home</button><button className="secondary" onClick={()=>start(lid)}>🔄 Play again</button></div></div>}

 if(screen==="game"&&(!q||!level))return <><Header p={p} title={`Level ${level.id} · ${level.name}`}/><main className="game"><section className="question card loading"><div className="big">🌟</div><h2>Getting your question ready…</h2></section></main></>;

 return <><Header p={p} title={`Level ${level.id} · ${level.name}`}/><main className="game"><div className="gameTop"><span>🔥 {p.streak}</span><span>Question {qnum} / 10</span><span>{level.time?`⏱️ ${Math.ceil(left)}s`:"🌿 No timer"}</span></div><div className="dots">{Array.from({length:10},(_,i)=><i className={i<qnum-1?"done":i===qnum-1?"current":""} key={i}/>)}</div>
 <section className="question card"><div className="equation">{q.a} <span>{q.op}</span> {q.b} <span>=</span> <strong>{feedback?.correct?q.answer:"?"}</strong></div>
 {strategy&&!feedback&&<div className="strategy">🧠 <b>Try this:</b> {strategy}</div>}
 {hint&&!feedback&&<div className="hint">💡 Number line: move {q.op==="+"?"forward":"backward"} from {q.a}.<div className="numberLine">{Array.from({length:level.max+1},(_,i)=><span className={i===q.answer?"answerDot":""} key={i}>{i}</span>)}</div></div>}
 {!feedback&&<><div className="answerDisplay">{input||"?"}</div><div className="keypad">{[1,2,3,4,5,6,7,8,9,0].map(n=><button key={n} onClick={()=>setInput(s=>s.length<2?s+n:s)}>{n}</button>)}<button onClick={()=>setInput(s=>s.slice(0,-1))}>⌫</button><button className="go" onClick={()=>answer()}>✓</button></div><div className="helpRow"><button onClick={showHint}>💡 Hint</button><button onClick={showStrategy}>🧠 Strategy</button></div></>}
 {feedback&&<div className={`feedback ${feedback.correct?"good":"try"}`}><div className="big">{feedback.correct?"🎉 Great job!":feedback.timeout?"⏰ Time's up!":"🌟 Nice try!"}</div><p>{feedback.correct?`The answer is ${q.answer}. You earned coins!`:`The answer is ${q.answer}. Let's learn it together.`}</p><button className="next" onClick={next}>{qnum===10?"See my reward! 🎁":"Next →"}</button></div>}</section></main></>
}
function Header({p,title}){return <header><div className="logo">{title||"🌈 Math Quest"}</div><div className="coins">{p.avatar}　🪙 {p.coins}</div></header>}
createRoot(document.getElementById("root")).render(<App/>);
