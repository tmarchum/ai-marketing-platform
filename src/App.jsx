import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const PLATFORMS = [
  { id: "facebook",  label: "פייסבוק",   color: "#1877F2" },
  { id: "instagram", label: "אינסטגרם", color: "#E1306C" },
  { id: "seo",       label: "בלוג SEO",  color: "#34A853" },
];
const CONTENT_TYPES = ["פוסט קצר", "סטורי", "מאמר SEO", "מודעה"];
const BUSINESSES = [
  { id: "cinema",  name: "הקולנוע הנודד", icon: "🎬", color: "#F59E0B" },
  { id: "flights", name: "צייד טיסות",    icon: "✈️", color: "#3B82F6" },
];
const AVATAR_LIBRARY = [
  { id:"a1", name:"מיכל", age:"28", desc:"אמא צעירה, חמה", color:"#EC4899", img:"https://picsum.photos/seed/w1/200/200" },
  { id:"a2", name:"שירה", age:"34", desc:"לייפסטייל, ספורטיבית", color:"#8B5CF6", img:"https://picsum.photos/seed/w2/200/200" },
  { id:"a3", name:"נועה", age:"26", desc:"טרנדי, עירונית", color:"#06B6D4", img:"https://picsum.photos/seed/w3/200/200" },
  { id:"a4", name:"דנה", age:"41", desc:"מקצועית, אמינה", color:"#10B981", img:"https://picsum.photos/seed/w4/200/200" },
  { id:"a5", name:"ליאור", age:"31", desc:"אבא, מעשי", color:"#F59E0B", img:"https://picsum.photos/seed/m1/200/200" },
  { id:"a6", name:"עמית", age:"38", desc:"מנהל, אמין", color:"#EF4444", img:"https://picsum.photos/seed/m2/200/200" },
];
const SOURCES_INIT = [
  { id:1, name:"הקולנוע הנודד", url:"wanderingcinema.co.il", type:"url", role:"עסק" },
  { id:2, name:"צייד טיסות", url:"flighthunter.co.il", type:"url", role:"עסק" },
  { id:3, name:"מתחרה", url:"competitor.co.il", type:"competitor", role:"מתחרה" },
];
const SAMPLE_POSTS = [
  { id:1, business:"הקולנוע הנודד", platform:"פייסבוק", type:"פוסט קצר",
    content:"🎬 ערב קולנוע תחת כיפת השמיים!\n\nהקולנוע הנודד מגיע לאירוע שלכם – חתונות, גיבוש, ערבים פרטיים.\nהצעת מחיר לאירועי קיץ ⬇️",
    hashtags:["קולנוע","אירועים","כיפת_השמיים"], date:"ב׳ 01.04 · 20:00", approved:false, media:null, ugc:null, pipeline:null },
  { id:2, business:"צייד טיסות", platform:"אינסטגרם", type:"סטורי",
    content:"✈️ טסים בקרוב?\n\nה-AI שלנו סורק מאות מחירים ומוצא לכם את הטיסה הכי זולה לפני כולם.\nצייד טיסות 🎯",
    hashtags:["טיסות","חיסכון","צייד_טיסות"], date:"ג׳ 02.04 · 20:00", approved:false, media:null, ugc:null, pipeline:null },
];

const NAV_ITEMS = [
  { id:"dashboard", icon:"📊", label:"דשבורד" },
  { id:"sources",   icon:"🌐", label:"מקורות" },
  { id:"content",   icon:"✍️", label:"תוכן" },
  { id:"media",     icon:"🖼️", label:"מדיה AI" },
  { id:"ugc",       icon:"🎭", label:"UGC Avatar" },
  { id:"schedule",  icon:"📅", label:"תזמון" },
  { id:"analytics", icon:"📈", label:"ניתוח" },
  { id:"admin",     icon:"⚙️", label:"ניהול" },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════
function Spinner({ size=16, color="#a78bfa" }) {
  return <span style={{ display:"inline-block", width:size, height:size,
    border:`2px solid ${color}33`, borderTopColor:color,
    borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />;
}
function Btn({ children, onClick, disabled, grad, color="#fff", bg="#1a1a1a", sm, full, style={} }) {
  return <button onClick={onClick} disabled={disabled} style={{
    background: disabled?"#111": grad||bg,
    color: disabled?"#333":color,
    border: grad?"none":`1px solid ${disabled?"#1f1f1f":color+"33"}`,
    borderRadius:8, padding: sm?"5px 12px":"9px 20px",
    fontSize: sm?11:13, fontWeight:700, cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6,
    transition:"all 0.2s", width:full?"100%":"auto", justifyContent:full?"center":"flex-start",
    ...style }}>{children}</button>;
}
function Tag({ label, color="#666" }) {
  return <span style={{ background:color+"18", color, border:`1px solid ${color}33`,
    borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:600 }}>{label}</span>;
}
function Card({ children, accent, style={} }) {
  return <div style={{ background:"#0d0d0d",
    border:`1px solid ${accent||"#1e1e1e"}`,
    borderRadius:12, padding:20, ...style }}>{children}</div>;
}
function SectionTitle({ children, sub }) {
  return <div style={{ marginBottom:20 }}>
    <h2 style={{ fontWeight:700, fontSize:18, margin:0 }}>{children}</h2>
    {sub && <p style={{ color:"#444", fontSize:13, margin:"4px 0 0" }}>{sub}</p>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// CLAUDE API
// ═══════════════════════════════════════════════════════════════════
async function claudeCall(prompt, maxTokens=800) {
  const r = await fetch("/api/content/claude", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ prompt, maxTokens })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.text;
}

// ═══════════════════════════════════════════════════════════════════
// PIPELINE SIMULATION
// ═══════════════════════════════════════════════════════════════════
const MEDIA_STAGES = [
  { id:"prompt",  label:"פרומפט",  icon:"🧠", color:"#8B5CF6", ms:2500 },
  { id:"image",   label:"Flux",    icon:"🖼️", color:"#F59E0B", ms:4000 },
  { id:"video",   label:"Runway",  icon:"🎬", color:"#EC4899", ms:8000 },
  { id:"publish", label:"Meta",    icon:"📡", color:"#1877F2", ms:2000 },
];
const UGC_STAGES = [
  { id:"script",  label:"סקריפט", icon:"✍️", color:"#8B5CF6", ms:2000 },
  { id:"tts",     label:"קול",    icon:"🎙️", color:"#EC4899", ms:3000 },
  { id:"avatar",  label:"D-ID",   icon:"🎭", color:"#F59E0B", ms:7000 },
  { id:"bg",      label:"רקע",    icon:"🏠", color:"#10B981", ms:3000 },
  { id:"publish", label:"Meta",   icon:"📡", color:"#1877F2", ms:2000 },
];

async function runPipeline(stages, onUpdate) {
  const s = Object.fromEntries(stages.map(st=>[st.id,"pending"]));
  for (const stage of stages) {
    s[stage.id] = "running";
    onUpdate({ stages:{...s}, current:stage.id, done:false });
    await sleep(stage.ms);
    s[stage.id] = "done";
  }
  onUpdate({ stages:{...s}, current:null, done:true });
}

function PipelineBar({ stages, pipeline, compact }) {
  if (!pipeline) return null;
  if (compact) {
    const cur = stages.find(s=>s.id===pipeline.current);
    if (pipeline.done) return <Tag label="✅ פורסם" color="#10B981"/>;
    if (cur) return <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
      <Spinner size={10} color={cur.color}/><span style={{color:cur.color}}>{cur.label}</span>
    </span>;
    return null;
  }
  return <div style={{display:"flex",gap:4,marginTop:14}}>
    {stages.map((s,i)=>{
      const st = pipeline.stages?.[s.id];
      const active = pipeline.current===s.id;
      return <div key={s.id} style={{display:"flex",alignItems:"center",gap:4}}>
        <div style={{ width:32,height:32,borderRadius:"50%",
          background: st==="done"?s.color+"25":active?s.color+"15":"#111",
          border:`2px solid ${st==="done"||active?s.color:"#222"}`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
          boxShadow:active?`0 0 12px ${s.color}55`:"none",transition:"all 0.4s" }}>
          {st==="done"?"✓":active?<Spinner size={12} color={s.color}/>:s.icon}
        </div>
        <div style={{fontSize:9,color:st==="done"||active?s.color:"#333",fontWeight:active?700:400}}>{s.label}</div>
        {i<stages.length-1&&<div style={{width:10,height:2,background:st==="done"?s.color:"#222",marginLeft:4}}/>}
      </div>;
    })}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// POST CARD
// ═══════════════════════════════════════════════════════════════════
function PostCard({ post, onUpdate, compact }) {
  const [exp, setExp] = useState(false);
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(post.content);
  const pl = PLATFORMS.find(p=>post.platform.includes(p.label.split(" ")[0]))||PLATFORMS[0];

  async function startMedia() {
    const init = { stages:Object.fromEntries(MEDIA_STAGES.map(s=>[s.id,"pending"])), current:null, done:false };
    onUpdate({...post, pipeline:init});
    setExp(true);
    await runPipeline(MEDIA_STAGES, upd => onUpdate(p=>({...p, pipeline:upd})));
  }
  async function startUGC() {
    const init = { stages:Object.fromEntries(UGC_STAGES.map(s=>[s.id,"pending"])), current:null, done:false };
    onUpdate({...post, ugc:init});
    setExp(true);
    await runPipeline(UGC_STAGES, upd => onUpdate(p=>({...p, ugc:upd})));
  }

  return <Card accent={post.pipeline?.done||post.ugc?.done?"#10B98133":undefined}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <Tag label={post.platform} color={pl.color}/>
        <Tag label={post.business} color="#666"/>
        {post.pipeline&&<PipelineBar stages={MEDIA_STAGES} pipeline={post.pipeline} compact/>}
        {post.ugc&&<PipelineBar stages={UGC_STAGES} pipeline={post.ugc} compact/>}
      </div>
      <span style={{color:"#333",fontSize:11}}>{post.date}</span>
    </div>

    {editing
      ? <textarea value={txt} onChange={e=>setTxt(e.target.value)} style={{
          width:"100%",minHeight:80,background:"#111",border:"1px solid #333",
          borderRadius:8,color:"#ddd",padding:10,fontSize:12,fontFamily:"inherit",
          direction:"rtl",resize:"vertical",boxSizing:"border-box"}}/>
      : <p style={{color:"#bbb",fontSize:13,lineHeight:1.7,margin:"0 0 10px",
          direction:"rtl",whiteSpace:"pre-wrap"}}>{txt}</p>
    }

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {post.hashtags.map(h=><span key={h} style={{color:pl.color,fontSize:11}}>#{h}</span>)}
    </div>

    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {!post.approved
        ? <Btn sm bg="#00ff8820" color="#00ff88" onClick={()=>onUpdate({...post,approved:true})}>✓ אשר</Btn>
        : <Tag label="✓ מאושר" color="#00ff88"/>
      }
      {editing
        ? <><Btn sm bg="#00ff8820" color="#00ff88" onClick={()=>{onUpdate({...post,content:txt});setEditing(false);}}>שמור</Btn>
            <Btn sm onClick={()=>setEditing(false)}>ביטול</Btn></>
        : <Btn sm onClick={()=>setEditing(true)}>✏️</Btn>
      }
      {!post.pipeline
        ? <Btn sm bg="#F59E0B20" color="#F59E0B" onClick={startMedia}>🖼️ מדיה AI</Btn>
        : <Btn sm onClick={()=>setExp(p=>!p)}>{exp?"▲":"▼"} מדיה</Btn>
      }
      {!post.ugc
        ? <Btn sm bg="#EC489920" color="#EC4899" onClick={startUGC}>🎭 UGC</Btn>
        : <Btn sm onClick={()=>setExp(p=>!p)}>{exp?"▲":"▼"} UGC</Btn>
      }
    </div>

    {exp && post.pipeline && <PipelineBar stages={MEDIA_STAGES} pipeline={post.pipeline}/>}
    {exp && post.ugc && <PipelineBar stages={UGC_STAGES} pipeline={post.ugc}/>}
  </Card>;
}

// ═══════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════

// DASHBOARD
function Dashboard({ posts, sources }) {
  const approved = posts.filter(p=>p.approved).length;
  const withMedia = posts.filter(p=>p.pipeline?.done).length;
  const withUGC = posts.filter(p=>p.ugc?.done).length;
  const stats = [
    { label:"פוסטים", value:posts.length, color:"#8B5CF6", icon:"✍️" },
    { label:"מאושרים", value:approved, color:"#10B981", icon:"✅" },
    { label:"עם מדיה AI", value:withMedia, color:"#F59E0B", icon:"🖼️" },
    { label:"סרטוני UGC", value:withUGC, color:"#EC4899", icon:"🎭" },
    { label:"מקורות", value:sources.length, color:"#3B82F6", icon:"🌐" },
  ];
  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="סקירה כללית של המערכת">דשבורד</SectionTitle>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:28}}>
      {stats.map(s=><Card key={s.label} style={{textAlign:"center",padding:16}}>
        <div style={{fontSize:24}}>{s.icon}</div>
        <div style={{fontSize:28,fontWeight:700,color:s.color,margin:"4px 0"}}>{s.value}</div>
        <div style={{color:"#555",fontSize:11}}>{s.label}</div>
      </Card>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card>
        <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1}}>PIPELINE</div>
        {[
          ["Claude API","כתיבת תוכן + פרומפטים","#8B5CF6"],
          ["Flux (Replicate)","יצירת תמונות","#F59E0B"],
          ["Runway ML","יצירת סרטונים","#EC4899"],
          ["ElevenLabs","קול עברי (UGC)","#06B6D4"],
          ["D-ID","Avatar מדבר","#F59E0B"],
          ["Meta Graph API","פרסום אוטומטי","#1877F2"],
        ].map(([name,desc,c])=><div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #111"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{color:"#ccc",fontSize:12,fontWeight:600}}>{name}</div>
            <div style={{color:"#444",fontSize:11}}>{desc}</div>
          </div>
          <Tag label="פעיל" color={c}/>
        </div>)}
      </Card>
      <Card>
        <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1}}>עלויות חודשיות</div>
        {[
          ["100 פוסטים + מדיה","~$40","#10B981"],
          ["100 סרטוני UGC","~$19","#EC4899"],
          ["Backend (Railway)","$7","#8B5CF6"],
          ["סה\"כ","~$66/חודש","#F59E0B"],
        ].map(([k,v,c])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #111"}}>
          <span style={{color:"#666",fontSize:13}}>{k}</span>
          <span style={{color:c,fontWeight:700,fontSize:13}}>{v}</span>
        </div>)}
        <p style={{color:"#444",fontSize:11,marginTop:12,lineHeight:1.6}}>
          עלות לליד ממוצעת: $2–8.<br/>
          על 20 לידים/חודש — ROI חיובי מהיום הראשון.
        </p>
      </Card>
    </div>
  </div>;
}

// SOURCES
function Sources({ sources, setSources }) {
  const [newUrl, setNewUrl] = useState("");
  const [role, setRole] = useState("עסק");
  const [manualTxt, setManualTxt] = useState("");

  function addUrl() {
    if (!newUrl.trim()) return;
    const name = newUrl.replace(/https?:\/\/(www\.)?/,"").split("/")[0];
    setSources(p=>[...p,{id:Date.now(),name,url:newUrl,type:role==="מתחרה"?"competitor":"url",role}]);
    setNewUrl("");
  }
  function addManual() {
    if (!manualTxt.trim()) return;
    setSources(p=>[...p,{id:Date.now(),name:"תוכן ידני "+(p.length+1),url:manualTxt.slice(0,40)+"...",type:"manual",role:"מקור ידני"}]);
    setManualTxt("");
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="הוסף אתרים, תוכן ומתחרים">מקורות מידע</SectionTitle>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
      <Card>
        <div style={{color:"#888",fontSize:11,fontWeight:700,marginBottom:10}}>הוסף URL</div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="https://..."
            style={{flex:1,background:"#111",border:"1px solid #222",borderRadius:8,
              padding:"8px 12px",color:"#ddd",fontSize:12,fontFamily:"monospace"}}/>
          <select value={role} onChange={e=>setRole(e.target.value)} style={{
            background:"#111",border:"1px solid #222",color:"#aaa",
            borderRadius:8,padding:"8px 10px",fontSize:12,fontFamily:"inherit"}}>
            {["עסק","מתחרה","השראה","מקור"].map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
        <Btn sm grad="linear-gradient(135deg,#8B5CF6,#3B82F6)" onClick={addUrl}>הוסף</Btn>
      </Card>
      <Card>
        <div style={{color:"#888",fontSize:11,fontWeight:700,marginBottom:10}}>תוכן ידני</div>
        <textarea value={manualTxt} onChange={e=>setManualTxt(e.target.value)}
          placeholder="הדבק תיאור עסק, מסרים, יתרונות..."
          style={{width:"100%",minHeight:70,background:"#111",border:"1px solid #222",
            borderRadius:8,color:"#ddd",padding:10,fontSize:12,fontFamily:"inherit",
            direction:"rtl",resize:"none",boxSizing:"border-box",marginBottom:8}}/>
        <Btn sm bg="#7C3AED20" color="#a78bfa" onClick={addManual}>הוסף תוכן</Btn>
      </Card>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {sources.map(s=>{
        const c = s.type==="competitor"?"#EF4444":s.type==="manual"?"#8B5CF6":"#10B981";
        return <Card key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:14}}>
          <div style={{width:36,height:36,borderRadius:8,background:c+"20",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
            {s.type==="url"?"🌐":s.type==="manual"?"✏️":"🎯"}
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#eee",fontSize:13,fontWeight:600}}>{s.name}</div>
            <div style={{color:"#444",fontSize:11,fontFamily:"monospace"}}>{s.url}</div>
          </div>
          <Tag label={s.role} color={c}/>
          <Btn sm onClick={()=>setSources(p=>p.filter(x=>x.id!==s.id))}>✕</Btn>
        </Card>;
      })}
    </div>
  </div>;
}

// CONTENT
function Content({ posts, setPosts, sources }) {
  const [selBiz, setSelBiz] = useState(BUSINESSES[0]);
  const [selPlatforms, setSelPlatforms] = useState(["facebook","instagram"]);
  const [selTypes, setSelTypes] = useState(["פוסט קצר"]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    setLoading(true); setMsg("");
    try {
      const platLabels = PLATFORMS.filter(p=>selPlatforms.includes(p.id)).map(p=>p.label).join(", ");
      const raw = await claudeCall(`אתה מומחה שיווק ישראלי. צור 2 פוסטים לעסק: ${selBiz.name}.
פלטפורמות: ${platLabels}. סוגים: ${selTypes.join(", ")}. מטרה: לידים.
החזר JSON בלבד: {"posts":[{"platform":"פייסבוק","type":"פוסט קצר","content":"...","hashtags":["..."]}]}`);
      const clean = raw.replace(/```json|```/g,"").trim();
      const arr = JSON.parse(clean).posts;
      const newPosts = arr.map((p,i)=>({
        id:Date.now()+i, business:selBiz.name, ...p,
        date:"ד׳ 03.04 · 20:00", approved:false, media:null, ugc:null, pipeline:null
      }));
      setPosts(p=>[...newPosts,...p]);
      setMsg(`✅ נוצרו ${newPosts.length} פוסטים`);
    } catch { setMsg("⚠️ שגיאה — בדוק API key"); }
    setLoading(false);
  }

  function updatePost(id, updater) {
    setPosts(prev=>prev.map(p=>p.id===id?(typeof updater==="function"?updater(p):{...p,...updater}):p));
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="יצירת פוסטים, מדיה AI וסרטוני UGC">תוכן ומדיה</SectionTitle>
    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:16}}>
        <div>
          <div style={{color:"#555",fontSize:11,marginBottom:8}}>עסק</div>
          <div style={{display:"flex",gap:8}}>
            {BUSINESSES.map(b=><button key={b.id} onClick={()=>setSelBiz(b)} style={{
              background:selBiz.id===b.id?b.color+"20":"#111",
              border:`1px solid ${selBiz.id===b.id?b.color:"#222"}`,
              color:selBiz.id===b.id?b.color:"#555",
              borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontFamily:"inherit"
            }}>{b.icon} {b.name}</button>)}
          </div>
        </div>
        <div>
          <div style={{color:"#555",fontSize:11,marginBottom:8}}>פלטפורמות</div>
          <div style={{display:"flex",gap:6}}>
            {PLATFORMS.map(p=><button key={p.id} onClick={()=>setSelPlatforms(prev=>
              prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} style={{
              background:selPlatforms.includes(p.id)?p.color+"20":"#111",
              border:`1px solid ${selPlatforms.includes(p.id)?p.color:"#222"}`,
              color:selPlatforms.includes(p.id)?p.color:"#555",
              borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontFamily:"inherit"
            }}>{p.label}</button>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <Btn disabled={loading}
          grad={loading?undefined:"linear-gradient(135deg,#8B5CF6,#3B82F6)"}
          onClick={generate}>
          {loading?<><Spinner/>מייצר...</>:"⚡ צור פוסטים"}
        </Btn>
        <Btn grad="linear-gradient(135deg,#EC4899,#F59E0B)"
          onClick={()=>posts.filter(p=>!p.pipeline&&!p.ugc).forEach(post=>{
            updatePost(post.id,{...post,pipeline:{stages:Object.fromEntries(MEDIA_STAGES.map(s=>[s.id,"pending"])),current:null,done:false}});
            runPipeline(MEDIA_STAGES, upd=>setPosts(prev=>prev.map(p=>p.id===post.id?{...p,pipeline:upd}:p)));
          })}>
          ⚡ הפעל הכל
        </Btn>
        {msg&&<span style={{color:"#10B981",fontSize:12}}>{msg}</span>}
      </div>
    </Card>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {posts.map(post=><PostCard key={post.id} post={post}
        onUpdate={upd=>setPosts(prev=>prev.map(p=>p.id===post.id?(typeof upd==="function"?upd(p):upd):p))}/>)}
    </div>
  </div>;
}

// MEDIA AI INFO
function MediaAI() {
  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="Claude → Flux → Runway → Meta">מדיה AI — ארכיטקטורה</SectionTitle>
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
      {[
        {step:"1",title:"Claude בונה פרומפט תמונה",color:"#8B5CF6",
          desc:"מנתח את הפוסט ובונה פרומפט אנגלית מקצועי כולל אווירה, תאורה, צבעים, קומפוזיציה.",
          api:"Claude API → image prompt"},
        {step:"2",title:"Flux מייצר תמונה",color:"#F59E0B",
          desc:"Flux 1.1 Pro מייצר תמונה בדיוק לפי הפרומפט — $0.003 לתמונה, 3-8 שניות.",
          api:"Replicate API → Flux 1.1"},
        {step:"3",title:"Runway מייצר סרטון",color:"#EC4899",
          desc:"Gen-3 Alpha Turbo ממיר תמונה לסרטון 5 שניות עם תנועה טבעית — $0.25 לסרטון.",
          api:"Runway ML Gen-3 Turbo"},
        {step:"4",title:"Meta מפרסם אוטומטית",color:"#1877F2",
          desc:"Video upload + scheduling דרך Meta Graph API v19. תומך ב-Reels ו-Feed.",
          api:"Meta Graph API v19"},
      ].map(item=><Card key={item.step} accent={item.color+"22"}>
        <div style={{display:"flex",gap:14}}>
          <div style={{width:40,height:40,borderRadius:10,background:item.color+"20",
            border:`1px solid ${item.color}44`,display:"flex",alignItems:"center",
            justifyContent:"center",color:item.color,fontWeight:700,fontSize:16,flexShrink:0}}>
            {item.step}
          </div>
          <div>
            <div style={{color:"#eee",fontWeight:600,fontSize:14,marginBottom:4}}>{item.title}</div>
            <div style={{color:"#666",fontSize:12,lineHeight:1.6,marginBottom:6}}>{item.desc}</div>
            <code style={{color:item.color,fontSize:11,background:"#111",
              padding:"2px 8px",borderRadius:4}}>{item.api}</code>
          </div>
        </div>
      </Card>)}
    </div>
    <Card>
      <div style={{color:"#555",fontSize:11,fontWeight:700,marginBottom:12}}>עלויות ל-100 פוסטים</div>
      {[["Claude (פרומפטים)","~$2","#8B5CF6"],["Flux (תמונות)","~$0.30","#F59E0B"],
        ["Runway (סרטונים)","~$25","#EC4899"],["Meta API","חינם","#1877F2"],["סה\"כ","~$27","#10B981"]]
        .map(([k,v,c])=><div key={k} style={{display:"flex",justifyContent:"space-between",
          padding:"8px 0",borderBottom:"1px solid #111"}}>
          <span style={{color:"#666",fontSize:12}}>{k}</span>
          <span style={{color:c,fontWeight:700,fontSize:12}}>{v}</span>
        </div>)}
    </Card>
  </div>;
}

// UGC STUDIO
function UGCStudio() {
  const [step, setStep] = useState(0);
  const [biz, setBiz] = useState(BUSINESSES[0]);
  const [avatar, setAvatar] = useState(null);
  const [script, setScript] = useState("");
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const fileRef = useRef();

  async function genScript() {
    if (!avatar) return;
    setGenLoading(true);
    try {
      const txt = await claudeCall(`כתוב סקריפט UGC לסרטון 30-40 שניות בעברית מדוברת.
דמות: ${avatar.name}, ${avatar.age}, ${avatar.desc}. עסק: ${biz.name}.
סגנון: אותנטי, שיחתי, לא פרסומי. 90-110 מילים.
התחל עם hook שמושך תשומת לב. סיים עם: "קישור בביו".
החזר רק את הסקריפט.`, 400);
      setScript(txt);
    } catch { setScript(`היי חברות... חייבת לספר לכן על ${biz.name}. פשוט שינה לי את הכל. אם רוצות לדעת עוד — קישור בביו 🙂`); }
    setGenLoading(false);
  }

  async function produce() {
    setLoading(true);
    const init = { stages:Object.fromEntries(UGC_STAGES.map(s=>[s.id,"pending"])), current:null, done:false };
    setPipeline(init);
    setStep(3);
    await runPipeline(UGC_STAGES, upd=>setPipeline(upd));
    setLoading(false);
  }

  const STEPS_LABELS = ["עסק","דמות + סקריפט","הפקה"];

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="סרטוני משפיעניות AI בעברית — D-ID + ElevenLabs">UGC Avatar Studio</SectionTitle>

    {/* Step indicator */}
    <div style={{display:"flex",gap:0,marginBottom:24}}>
      {STEPS_LABELS.map((s,i)=><div key={s} style={{display:"flex",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,
          padding:"6px 14px",borderRadius:20,
          background:i===step?"#EC489915":i<step?"#10B98115":"transparent",
          border:`1px solid ${i===step?"#EC4899":i<step?"#10B981":"#222"}`}}>
          <span style={{width:18,height:18,borderRadius:"50%",background:i<step?"#10B981":i===step?"#EC4899":"#222",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0}}>
            {i<step?"✓":i+1}
          </span>
          <span style={{fontSize:12,color:i===step?"#EC4899":i<step?"#10B981":"#444",fontWeight:i===step?700:400}}>{s}</span>
        </div>
        {i<STEPS_LABELS.length-1&&<div style={{width:20,height:1,background:i<step?"#10B981":"#222"}}/>}
      </div>)}
    </div>

    {step===0&&<div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
        {BUSINESSES.map(b=><Card key={b.id} accent={biz.id===b.id?b.color:undefined}
          style={{cursor:"pointer",transition:"all 0.2s"}} onClick={()=>setBiz(b)}>
          <div style={{fontSize:32,marginBottom:8}}>{b.icon}</div>
          <div style={{fontWeight:700,color:"#eee"}}>{b.name}</div>
          <div style={{color:"#555",fontSize:12,marginTop:4}}>{b.type}</div>
        </Card>)}
      </div>
      <Btn grad="linear-gradient(135deg,#EC4899,#8B5CF6)" onClick={()=>setStep(1)}>המשך ←</Btn>
    </div>}

    {step===1&&<div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{color:"#888",fontSize:11,fontWeight:700}}>בחר דמות</div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{const u=URL.createObjectURL(e.target.files[0]);
                setAvatar({id:"custom",name:"דמות מותאמת",age:"—",desc:"תמונה שלך",color:"#10B981",img:u});}}/>
            <Btn sm bg="#10B98115" color="#10B981"
              style={{border:"1px solid #10B98133"}} onClick={()=>fileRef.current.click()}>
              ⬆️ העלה תמונה
            </Btn>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {AVATAR_LIBRARY.map(av=><div key={av.id} onClick={()=>setAvatar(av)} style={{
            background:avatar?.id===av.id?av.color+"18":"#0d0d0d",
            border:`2px solid ${avatar?.id===av.id?av.color:"#1e1e1e"}`,
            borderRadius:10,padding:12,cursor:"pointer",transition:"all 0.2s"}}>
            <img src={av.img} alt={av.name} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:7,marginBottom:8}}/>
            <div style={{color:"#eee",fontWeight:600,fontSize:13}}>{av.name}</div>
            <div style={{color:"#555",fontSize:11}}>{av.age} · {av.desc}</div>
          </div>)}
        </div>
      </div>

      {avatar&&<Card style={{marginBottom:16}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
          <img src={avatar.img} alt="" style={{width:44,height:44,borderRadius:8,objectFit:"cover",border:`2px solid ${avatar.color}`}}/>
          <div>
            <div style={{color:"#eee",fontWeight:600}}>{avatar.name} מדברת על {biz.name}</div>
            <div style={{color:"#555",fontSize:11}}>30-40 שניות · עברית טבעית</div>
          </div>
        </div>
        <Btn sm grad="linear-gradient(135deg,#8B5CF6,#EC4899)" disabled={genLoading} onClick={genScript}>
          {genLoading?<><Spinner size={12}/>כותב...</>:"✍️ כתוב סקריפט"}
        </Btn>
        {script&&<textarea value={script} onChange={e=>setScript(e.target.value)} style={{
          width:"100%",minHeight:100,background:"#111",border:"1px solid #8B5CF633",
          borderRadius:8,color:"#ccc",padding:12,fontSize:12,fontFamily:"inherit",
          direction:"rtl",resize:"vertical",marginTop:12,boxSizing:"border-box"}}/>}
      </Card>}

      <div style={{display:"flex",gap:8}}>
        <Btn onClick={()=>setStep(0)}>← חזור</Btn>
        <Btn disabled={!avatar||script.length<20}
          grad={avatar&&script.length>=20?"linear-gradient(135deg,#EC4899,#F59E0B)":undefined}
          onClick={produce}>
          ⚡ הפק סרטון
        </Btn>
      </div>
    </div>}

    {step===2&&<div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
        {avatar&&<img src={avatar.img} alt="" style={{width:60,height:60,borderRadius:10,objectFit:"cover",border:"2px solid #EC4899"}}/>}
        <div>
          <h3 style={{margin:0,fontWeight:700}}>{loading?"מפיק סרטון UGC...":"✅ סרטון מוכן!"}</h3>
          <p style={{color:"#444",fontSize:12,margin:"4px 0 0"}}>{avatar?.name} · {biz.name}</p>
        </div>
      </div>
      <PipelineBar stages={UGC_STAGES} pipeline={pipeline}/>
      {pipeline?.done&&<div style={{marginTop:16}}>
        <Card accent="#10B98133">
          <div style={{color:"#10B981",fontWeight:700,marginBottom:10}}>✅ פורסם בהצלחה</div>
          {[["ElevenLabs","קול עברי טבעי","~$0.03"],["D-ID","Avatar מדבר","~$0.05"],
            ["Meta API","Reel פורסם","חינם"]].map(([k,d,v])=>
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #111"}}>
              <div><span style={{color:"#ccc",fontSize:12,fontWeight:600}}>{k}</span>
                <span style={{color:"#555",fontSize:11,marginRight:8}}> · {d}</span></div>
              <span style={{color:"#10B981",fontSize:12,fontWeight:700}}>{v}</span>
            </div>)}
        </Card>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <Btn grad="linear-gradient(135deg,#8B5CF6,#EC4899)"
            onClick={()=>{setStep(0);setPipeline(null);setScript("");setAvatar(null);}}>
            + סרטון חדש
          </Btn>
          <Btn onClick={()=>{setStep(1);setPipeline(null);}}>ערוך</Btn>
        </div>
      </div>}
    </div>}
  </div>;
}

// SCHEDULE
function Schedule({ posts }) {
  const DAYS = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
  const [days, setDays] = useState([1,3]);
  const [time, setTime] = useState("20:00");
  const approved = posts.filter(p=>p.approved);
  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="תזמון פרסום אוטומטי">לוח פרסומים</SectionTitle>
    <Card style={{marginBottom:20}}>
      <div style={{marginBottom:16}}>
        <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:10}}>ימי פרסום</div>
        <div style={{display:"flex",gap:8}}>
          {DAYS.map((d,i)=><button key={d} onClick={()=>setDays(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])} style={{
            width:38,height:38,background:days.includes(i)?"#8B5CF620":"#111",
            border:`1px solid ${days.includes(i)?"#8B5CF6":"#222"}`,
            color:days.includes(i)?"#a78bfa":"#444",borderRadius:7,
            cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>{d}</button>)}
        </div>
      </div>
      <div>
        <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:10}}>שעה</div>
        <div style={{display:"flex",gap:8}}>
          {["12:00","18:00","20:00","21:00"].map(t=><button key={t} onClick={()=>setTime(t)} style={{
            background:time===t?"#8B5CF620":"#111",border:`1px solid ${time===t?"#8B5CF6":"#222"}`,
            color:time===t?"#a78bfa":"#555",borderRadius:7,padding:"6px 14px",
            cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>{t}</button>)}
        </div>
      </div>
    </Card>
    {approved.length===0
      ? <Card><div style={{textAlign:"center",color:"#333",padding:30}}>אשר פוסטים בעמוד תוכן</div></Card>
      : <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {approved.map(post=>{
            const pl=PLATFORMS.find(p=>post.platform.includes(p.label.split(" ")[0]))||PLATFORMS[0];
            return <Card key={post.id} style={{display:"flex",alignItems:"center",gap:12,padding:14}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,marginBottom:4}}>
                  <Tag label={post.platform} color={pl.color}/>
                  <Tag label={post.business} color="#666"/>
                  {post.pipeline?.done&&<Tag label="🖼️ מדיה" color="#F59E0B"/>}
                  {post.ugc?.done&&<Tag label="🎭 UGC" color="#EC4899"/>}
                </div>
                <p style={{color:"#777",fontSize:12,margin:0,direction:"rtl",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.content.split("\n")[0]}</p>
              </div>
              <Btn sm grad="linear-gradient(135deg,#10B981,#3B82F6)">📡 פרסם</Btn>
            </Card>;
          })}
        </div>
    }
  </div>;
}

// ANALYTICS
function Analytics({ posts }) {
  const done = posts.filter(p=>p.pipeline?.done||p.ugc?.done).length;
  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="ביצועים ותובנות AI">ניתוח</SectionTitle>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
      {[["לידים השבוע","14","#10B981"],["Avg Engagement","8.3%","#8B5CF6"],["מדיה הופקה",done,"#EC4899"]]
        .map(([l,v,c])=><Card key={l} style={{textAlign:"center"}}>
          <div style={{fontSize:32,fontWeight:700,color:c}}>{v}</div>
          <div style={{color:"#555",fontSize:12,marginTop:4}}>{l}</div>
        </Card>)}
    </div>
    <Card>
      <div style={{color:"#555",fontSize:11,fontWeight:700,marginBottom:14}}>תובנות AI</div>
      {[["🏆","פוסט מוביל","ערב קולנוע תחת כיפת השמיים","#F59E0B"],
        ["📅","יום הכי טוב","יום ג׳","#8B5CF6"],
        ["⏰","שעה מומלצת","20:00","#EC4899"],
        ["📈","סוג תוכן מוביל","סרטוני UGC","#10B981"]]
        .map(([icon,label,val,color])=><div key={label} style={{display:"flex",
          justifyContent:"space-between",alignItems:"center",padding:"10px 14px",
          background:"#111",borderRadius:8,marginBottom:8}}>
          <span style={{display:"flex",gap:8,alignItems:"center"}}>
            <span>{icon}</span><span style={{color:"#666",fontSize:12}}>{label}</span>
          </span>
          <span style={{color,fontWeight:600,fontSize:13}}>{val}</span>
        </div>)}
      <div style={{background:"#071a0f",border:"1px solid #10B98122",borderRadius:8,padding:14,marginTop:12}}>
        <div style={{color:"#10B981",fontWeight:600,fontSize:12,marginBottom:6}}>💡 המלצה לשבוע הבא</div>
        <p style={{color:"#666",fontSize:12,margin:0,lineHeight:1.7,direction:"rtl"}}>
          סרטוני UGC מביאים 3.2x יותר לידים מפוסטים רגילים. מומלץ להגדיל ל-3 UGC בשבוע.
          שילוב של hook שאלתי + CTA רך מביא engagement גבוה ב-40%.
        </p>
      </div>
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════
const API_KEYS_CONFIG = [
  { id:"ANTHROPIC_API_KEY",      label:"Claude API Key",        service:"Anthropic",    color:"#8B5CF6", hint:"sk-ant-..." },
  { id:"REPLICATE_API_TOKEN",    label:"Replicate Token",       service:"Flux Images",  color:"#F59E0B", hint:"r8_..." },
  { id:"RUNWAYML_API_SECRET",    label:"Runway API Secret",     service:"Video Gen",    color:"#EC4899", hint:"..." },
  { id:"ELEVENLABS_API_KEY",     label:"ElevenLabs Key",        service:"Hebrew TTS",   color:"#06B6D4", hint:"..." },
  { id:"DID_API_KEY",            label:"D-ID API Key",          service:"Avatar Video", color:"#F59E0B", hint:"..." },
  { id:"META_ACCESS_TOKEN",      label:"Meta Access Token",     service:"Facebook/IG",  color:"#1877F2", hint:"EAA..." },
  { id:"META_PAGE_ID",           label:"Facebook Page ID",      service:"Facebook",     color:"#1877F2", hint:"1234567890" },
  { id:"META_IG_USER_ID",        label:"Instagram Business ID", service:"Instagram",    color:"#E1306C", hint:"1234567890" },
  { id:"SUPABASE_URL",           label:"Supabase URL",          service:"Database",     color:"#10B981", hint:"https://xxx.supabase.co" },
  { id:"SUPABASE_SERVICE_KEY",   label:"Supabase Service Key",  service:"Database",     color:"#10B981", hint:"eyJ..." },
  { id:"REDIS_URL",              label:"Redis URL",             service:"Bull Queue",   color:"#EF4444", hint:"redis://..." },
  { id:"WORDPRESS_URL",          label:"WordPress URL",         service:"Blog SEO",     color:"#21759B", hint:"https://yourblog.com" },
  { id:"WORDPRESS_APP_PASSWORD", label:"WordPress App Password",service:"Blog SEO",     color:"#21759B", hint:"xxxx xxxx xxxx" },
];

function Admin() {
  const [keys, setKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_keys")||"{}"); } catch { return {}; }
  });
  const [visible, setVisible] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ email:"", role:"viewer" });
  const [saved, setSaved] = useState(false);

  function saveKeys(updated) {
    setKeys(updated);
    localStorage.setItem("admin_keys", JSON.stringify(updated));
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  }

  async function testKey(keyId) {
    setTesting(p=>({...p,[keyId]:true}));
    try {
      const r = await fetch("/api/admin/test-key", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ keyId, value: keys[keyId] })
      });
      const d = await r.json();
      setTestResults(p=>({...p,[keyId]: d.ok ? "ok" : d.error||"failed"}));
    } catch {
      setTestResults(p=>({...p,[keyId]:"שגיאת רשת"}));
    }
    setTesting(p=>({...p,[keyId]:false}));
  }

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const r = await fetch("/api/admin/users");
      const d = await r.json();
      setUsers(d);
    } catch { setUsers([]); }
    setLoadingUsers(false);
  }

  async function inviteUser() {
    if (!newUser.email.trim()) return;
    await fetch("/api/admin/users/invite", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(newUser)
    });
    setNewUser({ email:"", role:"viewer" });
    loadUsers();
  }

  async function removeUser(id) {
    await fetch(`/api/admin/users/${id}`, { method:"DELETE" });
    setUsers(p=>p.filter(u=>u.id!==id));
  }

  useEffect(()=>{ loadUsers(); }, []);

  const envFileContent = API_KEYS_CONFIG
    .map(k=>`${k.id}=${keys[k.id]||""}`)
    .join("\n");

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="API Keys, משתמשים וסביבה">ניהול מערכת</SectionTitle>

    {/* API Keys */}
    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{color:"#666",fontSize:11,fontWeight:700,letterSpacing:1}}>API KEYS</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {saved&&<span style={{color:"#10B981",fontSize:11}}>✓ נשמר</span>}
          <Btn sm grad="linear-gradient(135deg,#10B981,#3B82F6)"
            onClick={()=>{
              const blob = new Blob([envFileContent],{type:"text/plain"});
              const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
              a.download=".env"; a.click();
            }}>⬇️ ייצא .env</Btn>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {API_KEYS_CONFIG.map(k=>{
          const val = keys[k.id]||"";
          const result = testResults[k.id];
          return <div key={k.id} style={{display:"grid",gridTemplateColumns:"180px 1fr auto auto",gap:8,alignItems:"center"}}>
            <div>
              <div style={{color:"#ccc",fontSize:12,fontWeight:600}}>{k.label}</div>
              <div style={{color:k.color,fontSize:10}}>{k.service}</div>
            </div>
            <div style={{position:"relative"}}>
              <input
                type={visible[k.id]?"text":"password"}
                value={val}
                placeholder={k.hint}
                onChange={e=>saveKeys({...keys,[k.id]:e.target.value})}
                style={{width:"100%",background:"#111",border:`1px solid ${val?"#333":"#1a1a1a"}`,
                  borderRadius:7,padding:"7px 32px 7px 10px",color:"#ddd",fontSize:12,
                  fontFamily:"monospace",boxSizing:"border-box"}}
              />
              <button onClick={()=>setVisible(p=>({...p,[k.id]:!p[k.id]}))}
                style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:12}}>
                {visible[k.id]?"🙈":"👁"}
              </button>
            </div>
            <Btn sm disabled={!val||testing[k.id]} onClick={()=>testKey(k.id)}
              bg={result==="ok"?"#10B98120":result?"#EF444420":"#1a1a1a"}
              color={result==="ok"?"#10B981":result?"#EF4444":"#888"}>
              {testing[k.id]?<Spinner size={10}/>:result==="ok"?"✓":result?"✗":"בדוק"}
            </Btn>
            <div style={{width:8,height:8,borderRadius:"50%",
              background:val?(result==="ok"?"#10B981":result?"#EF4444":"#666"):"#222",
              flexShrink:0}}/>
          </div>;
        })}
      </div>
    </Card>

    {/* Users */}
    <Card style={{marginBottom:20}}>
      <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:16,letterSpacing:1}}>משתמשים</div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <input value={newUser.email} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))}
          placeholder="email@example.com" type="email"
          style={{flex:1,minWidth:200,background:"#111",border:"1px solid #222",borderRadius:7,
            padding:"7px 12px",color:"#ddd",fontSize:12,fontFamily:"inherit"}}/>
        <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}
          style={{background:"#111",border:"1px solid #222",color:"#aaa",
            borderRadius:7,padding:"7px 10px",fontSize:12,fontFamily:"inherit"}}>
          {["admin","editor","viewer"].map(r=><option key={r}>{r}</option>)}
        </select>
        <Btn sm grad="linear-gradient(135deg,#8B5CF6,#3B82F6)" onClick={inviteUser}>+ הזמן</Btn>
      </div>
      {loadingUsers
        ? <div style={{textAlign:"center",padding:20}}><Spinner/></div>
        : users.length===0
          ? <div style={{color:"#333",fontSize:12,textAlign:"center",padding:16}}>אין משתמשים — הזמן את הראשון</div>
          : <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {users.map(u=>{
                const roleColor = u.role==="admin"?"#EC4899":u.role==="editor"?"#F59E0B":"#666";
                return <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"10px 14px",background:"#111",borderRadius:8}}>
                  <div style={{width:32,height:32,borderRadius:"50%",
                    background:roleColor+"20",border:`1px solid ${roleColor}33`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:roleColor,fontSize:13,fontWeight:700,flexShrink:0}}>
                    {(u.email||u.name||"?")[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:"#ccc",fontSize:13}}>{u.email||u.name}</div>
                    <div style={{color:"#444",fontSize:11}}>{u.created_at ? new Date(u.created_at).toLocaleDateString("he-IL") : ""}</div>
                  </div>
                  <Tag label={u.role||"viewer"} color={roleColor}/>
                  {u.role!=="admin"&&
                    <Btn sm onClick={()=>removeUser(u.id)}>✕</Btn>}
                </div>;
              })}
            </div>
      }
    </Card>

    {/* Env preview */}
    <Card>
      <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:12,letterSpacing:1}}>.env PREVIEW</div>
      <pre style={{background:"#060606",border:"1px solid #1a1a1a",borderRadius:8,
        padding:14,fontSize:10,color:"#444",overflowX:"auto",margin:0,lineHeight:1.8}}>
        {API_KEYS_CONFIG.map(k=>
          `${k.id}=${keys[k.id] ? (visible["all"] ? keys[k.id] : "•".repeat(Math.min(keys[k.id].length,20))) : ""}`
        ).join("\n")}
      </pre>
      <div style={{marginTop:10}}>
        <Btn sm onClick={()=>setVisible(p=>({...p,all:!p.all}))} bg="#111" color="#666">
          {visible.all?"🙈 הסתר":"👁 הצג הכל"}
        </Btn>
      </div>
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [posts, setPosts] = useState(SAMPLE_POSTS);
  const [sources, setSources] = useState(SOURCES_INIT);
  const [sideOpen, setSideOpen] = useState(true);

  const running = posts.filter(p=>(p.pipeline&&!p.pipeline.done)||(p.ugc&&!p.ugc.done)).length;
  const published = posts.filter(p=>p.pipeline?.done||p.ugc?.done).length;

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#060606",
      fontFamily:"'IBM Plex Sans Hebrew','Assistant',sans-serif",
      direction:"rtl",color:"#e8e8e8"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@300;400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
        textarea, input, select { outline: none; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{width:200,background:"#080808",borderLeft:"1px solid #111",
        display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
        {/* Logo */}
        <div style={{padding:"18px 16px",borderBottom:"1px solid #111"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,
              background:"linear-gradient(135deg,#EC4899,#8B5CF6,#F59E0B)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
            <div>
              <div style={{fontWeight:700,fontSize:13,lineHeight:1.2}}>AI Marketing</div>
              <div style={{color:"#333",fontSize:10}}>Platform</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:"12px 8px",overflowY:"auto"}}>
          {NAV_ITEMS.map(item=><button key={item.id} onClick={()=>setPage(item.id)} style={{
            width:"100%",display:"flex",alignItems:"center",gap:10,
            background:page===item.id?"#ffffff08":"transparent",
            border:`1px solid ${page===item.id?"#ffffff15":"transparent"}`,
            borderRadius:8,padding:"9px 12px",cursor:"pointer",
            color:page===item.id?"#eee":"#444",fontWeight:page===item.id?600:400,
            fontSize:13,fontFamily:"inherit",marginBottom:2,transition:"all 0.15s",
            textAlign:"right",justifyContent:"flex-start"
          }}>
            <span style={{fontSize:15}}>{item.icon}</span>
            {item.label}
          </button>)}
        </nav>

        {/* Status */}
        <div style={{padding:"12px 12px",borderTop:"1px solid #111"}}>
          {running>0&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <span style={{color:"#8B5CF6",fontSize:10,animation:"pulse 1.5s infinite"}}>●</span>
            <span style={{color:"#8B5CF6",fontSize:11}}>{running} פועל</span>
          </div>}
          {published>0&&<div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:"#10B981",fontSize:10}}>●</span>
            <span style={{color:"#10B981",fontSize:11}}>{published} פורסם</span>
          </div>}
          {!running&&!published&&<div style={{color:"#333",fontSize:11}}>מוכן</div>}
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,overflowY:"auto",maxHeight:"100vh"}}>
        {/* Top bar */}
        <div style={{padding:"14px 28px",borderBottom:"1px solid #111",
          background:"#080808",position:"sticky",top:0,zIndex:50,
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{color:"#eee",fontWeight:700,fontSize:15}}>
            {NAV_ITEMS.find(n=>n.id===page)?.icon} {NAV_ITEMS.find(n=>n.id===page)?.label}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{background:"#10B98115",border:"1px solid #10B98133",
              color:"#10B981",borderRadius:8,padding:"5px 12px",fontSize:11}}>
              {posts.filter(p=>p.approved).length} מאושרים
            </div>
            <div style={{background:"#EC489915",border:"1px solid #EC489933",
              color:"#EC4899",borderRadius:8,padding:"5px 12px",fontSize:11}}>
              {posts.length} פוסטים
            </div>
          </div>
        </div>

        <div style={{padding:"28px",maxWidth:900,margin:"0 auto"}}>
          {page==="dashboard"&&<Dashboard posts={posts} sources={sources}/>}
          {page==="sources"&&<Sources sources={sources} setSources={setSources}/>}
          {page==="content"&&<Content posts={posts} setPosts={setPosts} sources={sources}/>}
          {page==="media"&&<MediaAI/>}
          {page==="ugc"&&<UGCStudio/>}
          {page==="schedule"&&<Schedule posts={posts}/>}
          {page==="analytics"&&<Analytics posts={posts}/>}
          {page==="admin"&&<Admin/>}
        </div>
      </div>
    </div>
  );
}
