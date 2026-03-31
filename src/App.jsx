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
const DEFAULT_BUSINESSES = [
  { id: "cinema",  name: "הקולנוע הנודד", icon: "🎬", color: "#F59E0B", url:"", description:"", social:{}, scanResult:null },
  { id: "flights", name: "צייד טיסות",    icon: "✈️", color: "#3B82F6", url:"", description:"", social:{}, scanResult:null },
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

const BIZ_ICONS = ["🏪","🎬","✈️","🍕","💇","🏋️","🏠","🚗","📸","🎵","🛍️","💻","🎓","🏥","⚖️"];
const BIZ_COLORS = ["#F59E0B","#3B82F6","#EC4899","#10B981","#8B5CF6","#EF4444","#06B6D4","#F97316"];

const SOCIAL_PLATFORMS = [
  { id:"facebook",  label:"פייסבוק",   icon:"📘", color:"#1877F2", fields:[
    { key:"META_ACCESS_TOKEN", label:"Access Token", hint:"EAA..." },
    { key:"META_PAGE_ID", label:"Page ID", hint:"123456789" }
  ]},
  { id:"instagram", label:"אינסטגרם", icon:"📷", color:"#E1306C", fields:[
    { key:"META_ACCESS_TOKEN", label:"Access Token (Meta)", hint:"EAA..." },
    { key:"META_IG_USER_ID", label:"Business Account ID", hint:"123456789" }
  ]},
  { id:"wordpress", label:"WordPress / בלוג", icon:"📝", color:"#21759B", fields:[
    { key:"WORDPRESS_URL", label:"כתובת האתר", hint:"https://yourblog.com" },
    { key:"WORDPRESS_APP_PASSWORD", label:"App Password", hint:"xxxx xxxx xxxx" }
  ]},
  { id:"tiktok",    label:"טיקטוק",   icon:"🎵", color:"#010101", fields:[
    { key:"TIKTOK_ACCESS_TOKEN", label:"Access Token", hint:"act...." }
  ]},
];

const NAV_ITEMS = [
  { id:"dashboard", icon:"📊", label:"דשבורד" },
  { id:"businesses",icon:"🏪", label:"עסקים" },
  { id:"sources",   icon:"🌐", label:"מקורות" },
  { id:"content",   icon:"✍️", label:"תוכן" },
  { id:"media",     icon:"🖼️", label:"מדיה AI" },
  { id:"ugc",       icon:"🎭", label:"UGC Avatar" },
  { id:"publish",   icon:"📡", label:"פרסום" },
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
  // Try backend proxy first
  try {
    const r = await fetch("/api/content/claude", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ prompt, maxTokens })
    });
    if (r.ok) { const d = await r.json(); if (!d.error) return d.text; }
  } catch {}
  // Fallback: use API key from admin settings via CORS proxy
  const keys = JSON.parse(localStorage.getItem("admin_keys")||"{}");
  const apiKey = keys.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("הגדר ANTHROPIC_API_KEY בדף ניהול");
  const proxyUrl = localStorage.getItem("cors_proxy") || "https://api.anthropic.com";
  const r2 = await fetch(proxyUrl+"/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, messages:[{role:"user",content:prompt}] })
  });
  const d2 = await r2.json();
  if (d2.error) throw new Error(d2.error.message||JSON.stringify(d2.error));
  return d2.content?.[0]?.text || "";
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
function Dashboard({ posts, sources, businesses }) {
  const approved = posts.filter(p=>p.approved).length;
  const withMedia = posts.filter(p=>p.pipeline?.done).length;
  const withUGC = posts.filter(p=>p.ugc?.done).length;
  const stats = [
    { label:"עסקים", value:businesses?.length||0, color:"#F59E0B", icon:"🏪" },
    { label:"פוסטים", value:posts.length, color:"#8B5CF6", icon:"✍️" },
    { label:"מאושרים", value:approved, color:"#10B981", icon:"✅" },
    { label:"עם מדיה AI", value:withMedia, color:"#F59E0B", icon:"🖼️" },
    { label:"סרטוני UGC", value:withUGC, color:"#EC4899", icon:"🎭" },
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
function Content({ posts, setPosts, sources, businesses }) {
  const BUSINESSES = businesses || DEFAULT_BUSINESSES;
  const [selBiz, setSelBiz] = useState(BUSINESSES[0]);
  const [selPlatforms, setSelPlatforms] = useState(["facebook","instagram"]);
  const [selTypes, setSelTypes] = useState(["פוסט קצר"]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const existingBizPosts = posts.filter(p=>p.business===selBiz?.name);

  async function generate() {
    setLoading(true); setMsg("");
    try {
      const platLabels = PLATFORMS.filter(p=>selPlatforms.includes(p.id)).map(p=>p.label).join(", ");
      const bizSources = sources.filter(s=>s.name===selBiz.name||s.role==="עסק");
      const sourceInfo = bizSources.length>0 ? `\nמקורות מידע: ${bizSources.map(s=>s.url||s.name).join(", ")}` : "";
      const bizDesc = selBiz.description ? `\nתיאור: ${selBiz.description}` : "";
      const scanInfo = selBiz.scanResult && !selBiz.scanResult.error ? `\nטון מותג: ${selBiz.scanResult.tone}. קהל יעד: ${selBiz.scanResult.audience}.` : "";
      const existingContent = existingBizPosts.length>0
        ? `\n\nפוסטים קיימים (אל תחזור עליהם!):\n${existingBizPosts.slice(0,5).map(p=>`- [${p.platform}] ${p.content.slice(0,60)}...`).join("\n")}`
        : "";
      const raw = await claudeCall(`אתה מומחה שיווק ישראלי. צור 2 פוסטים חדשים ושונים לעסק: ${selBiz.name}.${bizDesc}${scanInfo}${sourceInfo}
פלטפורמות: ${platLabels}. סוגים: ${selTypes.join(", ")}. מטרה: לידים.${existingContent}
חשוב: התאם טון ושפה לעסק. צור תוכן ייחודי שלא דומה לפוסטים קיימים.
החזר JSON בלבד: {"posts":[{"platform":"פייסבוק","type":"פוסט קצר","content":"...","hashtags":["..."]}]}`);
      const clean = raw.replace(/```json|```/g,"").trim();
      const arr = JSON.parse(clean).posts;
      const newPosts = arr.map((p,i)=>({
        id:Date.now()+i, business:selBiz.name, ...p,
        date:"ד׳ 03.04 · 20:00", approved:false, media:null, ugc:null, pipeline:null
      }));
      setPosts(p=>[...newPosts,...p]);
      setMsg(`✅ נוצרו ${newPosts.length} פוסטים עבור ${selBiz.name}`);
    } catch(e) { setMsg(`⚠️ ${e.message || "שגיאה — בדוק API key בדף ניהול"}`); }
    setLoading(false);
  }

  function updatePost(id, updater) {
    setPosts(prev=>prev.map(p=>p.id===id?(typeof updater==="function"?updater(p):{...p,...updater}):p));
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="יצירת פוסטים לפי עסק — AI בודק פוסטים קיימים">תוכן ומדיה</SectionTitle>

    {/* Business selector */}
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {BUSINESSES.map(b=>{
        const cnt = posts.filter(p=>p.business===b.name).length;
        return <button key={b.id} onClick={()=>setSelBiz(b)} style={{
          display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,cursor:"pointer",
          background:selBiz?.id===b.id?b.color+"15":"#0d0d0d",
          border:`1px solid ${selBiz?.id===b.id?b.color:"#1e1e1e"}`,fontFamily:"inherit",
          color:selBiz?.id===b.id?"#eee":"#666",fontWeight:selBiz?.id===b.id?700:400,fontSize:13,transition:"all 0.2s"}}>
          <span style={{fontSize:18}}>{b.icon}</span>{b.name}
          <span style={{background:"#ffffff10",borderRadius:10,padding:"1px 7px",fontSize:10}}>{cnt}</span>
        </button>;
      })}
    </div>

    {/* Existing posts notice */}
    {existingBizPosts.length>0&&<div style={{background:"#8B5CF610",border:"1px solid #8B5CF622",borderRadius:8,
      padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
      <span style={{color:"#8B5CF6",fontSize:12}}>📋</span>
      <span style={{color:"#8B5CF6",fontSize:12}}>
        ל-{selBiz?.name} יש {existingBizPosts.length} פוסטים קיימים ({existingBizPosts.filter(p=>p.approved).length} מאושרים).
        ה-AI ייצור תוכן שונה מהקיים.
      </span>
    </div>}

    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:16}}>
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
        <div>
          <div style={{color:"#555",fontSize:11,marginBottom:8}}>סוגי תוכן</div>
          <div style={{display:"flex",gap:6}}>
            {CONTENT_TYPES.map(t=><button key={t} onClick={()=>setSelTypes(prev=>
              prev.includes(t)?prev.filter(x=>x!==t):[...prev,t])} style={{
              background:selTypes.includes(t)?"#8B5CF620":"#111",
              border:`1px solid ${selTypes.includes(t)?"#8B5CF6":"#222"}`,
              color:selTypes.includes(t)?"#a78bfa":"#555",
              borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontFamily:"inherit"
            }}>{t}</button>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <Btn disabled={loading||!selBiz}
          grad={loading||!selBiz?undefined:"linear-gradient(135deg,#8B5CF6,#3B82F6)"}
          onClick={generate}>
          {loading?<><Spinner/>מייצר...</>:`⚡ צור פוסטים ל${selBiz?.name||"..."}`}
        </Btn>
        <Btn grad="linear-gradient(135deg,#EC4899,#F59E0B)"
          onClick={()=>existingBizPosts.filter(p=>!p.pipeline&&!p.ugc).forEach(post=>{
            updatePost(post.id,{...post,pipeline:{stages:Object.fromEntries(MEDIA_STAGES.map(s=>[s.id,"pending"])),current:null,done:false}});
            runPipeline(MEDIA_STAGES, upd=>setPosts(prev=>prev.map(p=>p.id===post.id?{...p,pipeline:upd}:p)));
          })}>
          ⚡ הפעל מדיה AI
        </Btn>
        {msg&&<span style={{color:msg.includes("⚠")||msg.includes("שגיאה")?"#EF4444":"#10B981",fontSize:12}}>{msg}</span>}
      </div>
    </Card>

    {/* Posts filtered by business */}
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {existingBizPosts.length===0
        ? <Card><div style={{textAlign:"center",color:"#333",padding:30}}>אין פוסטים ל-{selBiz?.name} — לחץ "צור פוסטים"</div></Card>
        : existingBizPosts.map(post=><PostCard key={post.id} post={post}
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
  const [biz, setBiz] = useState(DEFAULT_BUSINESSES[0]);
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
        {DEFAULT_BUSINESSES.map(b=><Card key={b.id} accent={biz.id===b.id?b.color:undefined}
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

// BUSINESSES
function Businesses({ businesses, setBusinesses, posts }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:"", icon:BIZ_ICONS[0], color:BIZ_COLORS[0], url:"", description:"" });
  const [scanning, setScanning] = useState({});

  function updateBiz(id, upd) { setBusinesses(p=>p.map(b=>b.id===id?{...b,...upd}:b)); }

  function addBiz() {
    if (!form.name.trim()) return;
    setBusinesses(p=>[...p,{ id:Date.now().toString(), ...form, social:{}, scanResult:null }]);
    setForm({ name:"", icon:BIZ_ICONS[0], color:BIZ_COLORS[0], url:"", description:"" });
    setAdding(false);
  }
  function removeBiz(id) { setBusinesses(p=>p.filter(b=>b.id!==id)); }

  async function scanBiz(biz) {
    setScanning(p=>({...p,[biz.id]:true}));
    try {
      const prompt = `אתה מנתח שיווקי מומחה. נתח את העסק הבא וספק תובנות:
שם: "${biz.name}"${biz.url?`\nאתר: ${biz.url}`:""}${biz.description?`\nתיאור: ${biz.description}`:""}

החזר JSON בלבד (בלי markdown):
{"tone":"טון המותג המומלץ","audience":"קהל יעד ראשי","strengths":["יתרון 1","יתרון 2","יתרון 3"],"contentIdeas":["רעיון 1","רעיון 2","רעיון 3","רעיון 4"],"competitors":["מתחרה 1","מתחרה 2"],"bestPlatform":"הפלטפורמה המומלצת","postFrequency":"תדירות פרסום מומלצת"}`;
      const raw = await claudeCall(prompt, 600);
      const clean = raw.replace(/```json|```/g,"").trim();
      const result = JSON.parse(clean);
      updateBiz(biz.id, { scanResult: result });
    } catch(e) {
      updateBiz(biz.id, { scanResult: { error: e.message || "שגיאה בסריקה — הגדר API key בדף ניהול" } });
    }
    setScanning(p=>({...p,[biz.id]:false}));
  }

  function setSocialToken(bizId, platformId, key, value) {
    setBusinesses(p=>p.map(b=>{
      if (b.id!==bizId) return b;
      const social = {...(b.social||{})};
      social[platformId] = {...(social[platformId]||{connected:false,tokens:{}}), tokens:{...(social[platformId]?.tokens||{}), [key]:value}};
      return {...b,social};
    }));
  }
  function toggleSocial(bizId, platformId) {
    setBusinesses(p=>p.map(b=>{
      if (b.id!==bizId) return b;
      const social = {...(b.social||{})};
      const cur = social[platformId] || {connected:false,tokens:{}};
      social[platformId] = {...cur, connected:!cur.connected};
      return {...b,social};
    }));
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="הוסף עסקים, חבר רשתות, סרוק עם AI">ניהול עסקים</SectionTitle>

    {!adding ? <Btn grad="linear-gradient(135deg,#8B5CF6,#3B82F6)" onClick={()=>setAdding(true)} style={{marginBottom:20}}>
      + הוסף עסק חדש
    </Btn> : <Card style={{marginBottom:20}}>
      <div style={{color:"#888",fontSize:11,fontWeight:700,marginBottom:12}}>עסק חדש</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div>
          <div style={{color:"#555",fontSize:11,marginBottom:4}}>שם העסק *</div>
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="שם העסק"
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:7,padding:"8px 12px",color:"#ddd",fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:"#555",fontSize:11,marginBottom:4}}>כתובת אתר</div>
          <input value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} placeholder="https://..."
            style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:7,padding:"8px 12px",color:"#ddd",fontSize:12,fontFamily:"monospace",boxSizing:"border-box"}}/>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{color:"#555",fontSize:11,marginBottom:4}}>תיאור העסק</div>
        <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="במה עוסק העסק, קהל יעד, יתרונות..."
          style={{width:"100%",minHeight:60,background:"#111",border:"1px solid #222",borderRadius:7,color:"#ddd",padding:10,fontSize:12,fontFamily:"inherit",direction:"rtl",resize:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",gap:16,marginBottom:16}}>
        <div>
          <div style={{color:"#555",fontSize:11,marginBottom:6}}>אייקון</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {BIZ_ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))}
              style={{width:30,height:30,background:form.icon===ic?"#8B5CF620":"#111",
                border:`1px solid ${form.icon===ic?"#8B5CF6":"#222"}`,borderRadius:6,cursor:"pointer",fontSize:14}}>{ic}</button>)}
          </div>
        </div>
        <div>
          <div style={{color:"#555",fontSize:11,marginBottom:6}}>צבע</div>
          <div style={{display:"flex",gap:4}}>
            {BIZ_COLORS.map(c=><button key={c} onClick={()=>setForm(p=>({...p,color:c}))}
              style={{width:26,height:26,background:c,borderRadius:6,cursor:"pointer",
                border:`2px solid ${form.color===c?"#fff":"transparent"}`}}/>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn grad="linear-gradient(135deg,#10B981,#3B82F6)" onClick={addBiz}>שמור</Btn>
        <Btn sm bg="#111" color="#666" onClick={()=>setAdding(false)}>ביטול</Btn>
      </div>
    </Card>}

    {/* Business cards */}
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {businesses.map(biz=>{
        const result = biz.scanResult;
        const bizPosts = posts?.filter(p=>p.business===biz.name)||[];
        const expanded = editId===biz.id;
        return <Card key={biz.id} accent={biz.color+"44"}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onClick={()=>setEditId(expanded?null:biz.id)}>
            <div style={{width:48,height:48,borderRadius:10,background:biz.color+"20",border:`1px solid ${biz.color}33`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{biz.icon}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:"#eee",fontSize:15,fontWeight:700}}>{biz.name}</span>
                {result&&!result.error&&<Tag label="נסרק ✓" color="#10B981"/>}
              </div>
              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                {biz.url&&<Tag label={biz.url.replace(/https?:\/\/(www\.)?/,"")} color="#666"/>}
                <Tag label={`${bizPosts.length} פוסטים`} color="#8B5CF6"/>
                {SOCIAL_PLATFORMS.filter(sp=>biz.social?.[sp.id]?.connected).map(sp=>
                  <Tag key={sp.id} label={sp.icon+" "+sp.label} color={sp.color}/>)}
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Btn sm grad="linear-gradient(135deg,#8B5CF6,#06B6D4)" disabled={scanning[biz.id]} onClick={e=>{e.stopPropagation();scanBiz(biz);}}>
                {scanning[biz.id]?<><Spinner size={10}/> סורק...</>:"🔍 סרוק AI"}
              </Btn>
              <span style={{color:"#444",fontSize:16}}>{expanded?"▲":"▼"}</span>
            </div>
          </div>

          {/* Expanded: scan results + social connections */}
          {expanded&&<div style={{marginTop:16,borderTop:"1px solid #1a1a1a",paddingTop:16}}>
            {/* Description edit */}
            <div style={{marginBottom:14}}>
              <div style={{color:"#555",fontSize:11,marginBottom:4}}>תיאור העסק</div>
              <textarea value={biz.description||""} onChange={e=>updateBiz(biz.id,{description:e.target.value})}
                placeholder="תאר את העסק — ישמש את ה-AI ליצירת תוכן מותאם..."
                style={{width:"100%",minHeight:50,background:"#111",border:"1px solid #222",borderRadius:7,color:"#ddd",
                  padding:10,fontSize:12,fontFamily:"inherit",direction:"rtl",resize:"none",boxSizing:"border-box"}}/>
            </div>

            {/* URL edit */}
            <div style={{marginBottom:14}}>
              <div style={{color:"#555",fontSize:11,marginBottom:4}}>כתובת אתר</div>
              <input value={biz.url||""} onChange={e=>updateBiz(biz.id,{url:e.target.value})} placeholder="https://..."
                style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:7,padding:"8px 12px",color:"#ddd",fontSize:12,fontFamily:"monospace",boxSizing:"border-box"}}/>
            </div>

            {/* Social connections per business */}
            <div style={{marginBottom:14}}>
              <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1}}>רשתות חברתיות — {biz.name}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {SOCIAL_PLATFORMS.map(plat=>{
                  const conn = biz.social?.[plat.id] || {connected:false,tokens:{}};
                  const allFilled = plat.fields.every(f=>conn.tokens?.[f.key]);
                  return <div key={plat.id} style={{background:"#080808",border:`1px solid ${conn.connected&&allFilled?plat.color+"44":"#161616"}`,
                    borderRadius:8,padding:12,transition:"all 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:conn.connected?10:0}}>
                      <span style={{fontSize:18}}>{plat.icon}</span>
                      <span style={{color:"#ccc",fontSize:12,fontWeight:600,flex:1}}>{plat.label}</span>
                      <button onClick={()=>toggleSocial(biz.id,plat.id)} style={{
                        width:36,height:20,borderRadius:10,border:"none",cursor:"pointer",
                        background:conn.connected?plat.color:"#333",position:"relative",transition:"all 0.2s"}}>
                        <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",
                          position:"absolute",top:3,transition:"all 0.2s",
                          ...(conn.connected?{left:19}:{left:3})}}/>
                      </button>
                    </div>
                    {conn.connected&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {plat.fields.map(f=><div key={f.key}>
                        <div style={{color:"#444",fontSize:9,marginBottom:2}}>{f.label}</div>
                        <input value={conn.tokens?.[f.key]||""} onChange={e=>setSocialToken(biz.id,plat.id,f.key,e.target.value)}
                          placeholder={f.hint} type="password"
                          style={{width:"100%",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:5,
                            padding:"5px 8px",color:"#ddd",fontSize:10,fontFamily:"monospace",boxSizing:"border-box"}}/>
                      </div>)}
                    </div>}
                  </div>;
                })}
              </div>
            </div>

            {/* Scan results */}
            {result&&!result.error&&<div style={{background:"#071a0f",border:"1px solid #10B98122",borderRadius:8,padding:14,marginBottom:14}}>
              <div style={{color:"#10B981",fontWeight:600,fontSize:12,marginBottom:10}}>💡 תוצאות סריקת AI</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div><span style={{color:"#555",fontSize:11}}>טון: </span><span style={{color:"#ddd",fontSize:12}}>{result.tone}</span></div>
                <div><span style={{color:"#555",fontSize:11}}>קהל יעד: </span><span style={{color:"#ddd",fontSize:12}}>{result.audience}</span></div>
                {result.bestPlatform&&<div><span style={{color:"#555",fontSize:11}}>פלטפורמה מומלצת: </span><span style={{color:"#ddd",fontSize:12}}>{result.bestPlatform}</span></div>}
                {result.postFrequency&&<div><span style={{color:"#555",fontSize:11}}>תדירות: </span><span style={{color:"#ddd",fontSize:12}}>{result.postFrequency}</span></div>}
              </div>
              {result.strengths?.length>0&&<div style={{marginBottom:8}}>
                <div style={{color:"#555",fontSize:10,marginBottom:4}}>יתרונות:</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{result.strengths.map((s,i)=><Tag key={i} label={s} color="#10B981"/>)}</div>
              </div>}
              {result.contentIdeas?.length>0&&<div>
                <div style={{color:"#555",fontSize:10,marginBottom:4}}>רעיונות לתוכן:</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{result.contentIdeas.map((s,i)=><Tag key={i} label={s} color="#8B5CF6"/>)}</div>
              </div>}
            </div>}
            {result?.error&&<div style={{color:"#EF4444",fontSize:12,padding:10,background:"#EF444410",borderRadius:8,marginBottom:14}}>{result.error}</div>}

            {/* Remove */}
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <Btn sm onClick={()=>removeBiz(biz.id)} bg="#EF444415" color="#EF4444">🗑️ מחק עסק</Btn>
            </div>
          </div>}
        </Card>;
      })}
    </div>
    {businesses.length===0&&<Card><div style={{textAlign:"center",color:"#333",padding:30}}>הוסף את העסק הראשון שלך</div></Card>}
  </div>;
}

// PUBLISH
function Publish({ posts, businesses }) {
  const [publishing, setPublishing] = useState({});
  const [results, setResults] = useState({});
  const [selBizId, setSelBizId] = useState(businesses[0]?.id||"");
  const selBiz = businesses.find(b=>b.id===selBizId);
  const approved = posts.filter(p=>p.approved && (!selBiz || p.business===selBiz.name));
  const connectedPlatforms = selBiz ? SOCIAL_PLATFORMS.filter(sp=>{
    const c=selBiz.social?.[sp.id]; return c?.connected && c.tokens && Object.values(c.tokens).some(v=>v);
  }) : [];

  async function publishPost(post, platformId) {
    const key = `${post.id}_${platformId}`;
    setPublishing(p=>({...p,[key]:true}));
    try {
      const biz = businesses.find(b=>b.name===post.business);
      const tokens = biz?.social?.[platformId]?.tokens || {};
      const r = await fetch("/api/publish/post", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ postId:post.id, platform:platformId, content:post.content, hashtags:post.hashtags, tokens })
      });
      const d = await r.json();
      setResults(p=>({...p,[key]: d.ok ? "ok" : d.error||"failed"}));
    } catch {
      setResults(p=>({...p,[key]:"צריך backend פעיל"}));
    }
    setPublishing(p=>({...p,[key]:false}));
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="פרסם תוכן מאושר לרשתות של כל עסק">פרסום</SectionTitle>

    {/* Business selector */}
    <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
      {businesses.map(b=><button key={b.id} onClick={()=>setSelBizId(b.id)} style={{
        display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:10,cursor:"pointer",
        background:selBizId===b.id?b.color+"15":"#0d0d0d",
        border:`1px solid ${selBizId===b.id?b.color:"#1e1e1e"}`,fontFamily:"inherit",
        color:selBizId===b.id?"#eee":"#666",fontWeight:selBizId===b.id?700:400,fontSize:13,transition:"all 0.2s"}}>
        <span style={{fontSize:18}}>{b.icon}</span>{b.name}
        {SOCIAL_PLATFORMS.filter(sp=>b.social?.[sp.id]?.connected).length>0&&
          <span style={{fontSize:9,color:"#10B981"}}>● מחובר</span>}
      </button>)}
    </div>

    {selBiz&&<>
      {/* Connected platforms for this business */}
      <Card style={{marginBottom:16}}>
        <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:10}}>רשתות מחוברות — {selBiz.icon} {selBiz.name}</div>
        {connectedPlatforms.length===0
          ? <div style={{color:"#444",fontSize:12,padding:10}}>
              אין רשתות מחוברות לעסק הזה. עבור ל<span style={{color:"#8B5CF6"}}>🏪 עסקים</span> → לחץ על העסק → חבר רשתות.
            </div>
          : <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {connectedPlatforms.map(sp=><Tag key={sp.id} label={sp.icon+" "+sp.label+" ✓"} color={sp.color}/>)}
            </div>}
      </Card>

      {/* Posts to publish */}
      <Card>
        <div style={{color:"#666",fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1}}>
          פוסטים מאושרים — {selBiz.name} ({approved.length})
        </div>
        {approved.length===0
          ? <div style={{textAlign:"center",color:"#333",padding:30}}>אין פוסטים מאושרים ל-{selBiz.name} — אשר פוסטים בדף תוכן</div>
          : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {approved.map(post=>{
              const platMatch = PLATFORMS.find(p=>post.platform?.includes(p.label.split(" ")[0]));
              return <div key={post.id} style={{background:"#111",borderRadius:10,padding:14,border:"1px solid #1a1a1a"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <Tag label={post.platform} color={platMatch?.color||"#888"}/>
                  <Tag label={post.type||"פוסט"} color="#555"/>
                  {post.pipeline?.done&&<Tag label="🖼️ מדיה" color="#F59E0B"/>}
                  {post.ugc?.done&&<Tag label="🎭 UGC" color="#EC4899"/>}
                </div>
                <p style={{color:"#888",fontSize:12,margin:"0 0 10px",direction:"rtl",lineHeight:1.6,
                  maxHeight:60,overflow:"hidden"}}>{post.content}</p>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {connectedPlatforms.map(sp=>{
                    const key=`${post.id}_${sp.id}`;
                    const res=results[key];
                    return <Btn key={sp.id} sm disabled={publishing[key]}
                      bg={res==="ok"?"#10B98120":res?"#EF444420":"#1a1a1a"}
                      color={res==="ok"?"#10B981":res?"#EF4444":sp.color}
                      onClick={()=>publishPost(post,sp.id)}>
                      {publishing[key]?<Spinner size={10}/>:res==="ok"?"✓ פורסם":res?`✗`:`${sp.icon} פרסם`}
                    </Btn>;
                  })}
                  {connectedPlatforms.length===0&&<span style={{color:"#444",fontSize:11}}>חבר רשת בדף עסקים</span>}
                </div>
              </div>;
            })}
          </div>}
      </Card>
    </>}
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
  const [businesses, setBusinesses] = useState(()=>{
    try { const s=localStorage.getItem("businesses"); return s?JSON.parse(s):DEFAULT_BUSINESSES; } catch { return DEFAULT_BUSINESSES; }
  });
  const [sideOpen, setSideOpen] = useState(true);

  useEffect(()=>{ localStorage.setItem("businesses",JSON.stringify(businesses)); },[businesses]);

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
          {page==="dashboard"&&<Dashboard posts={posts} sources={sources} businesses={businesses}/>}
          {page==="businesses"&&<Businesses businesses={businesses} setBusinesses={setBusinesses} posts={posts}/>}
          {page==="sources"&&<Sources sources={sources} setSources={setSources}/>}
          {page==="content"&&<Content posts={posts} setPosts={setPosts} sources={sources} businesses={businesses}/>}
          {page==="media"&&<MediaAI/>}
          {page==="ugc"&&<UGCStudio/>}
          {page==="publish"&&<Publish posts={posts} businesses={businesses}/>}
          {page==="schedule"&&<Schedule posts={posts}/>}
          {page==="analytics"&&<Analytics posts={posts}/>}
          {page==="admin"&&<Admin/>}
        </div>
      </div>
    </div>
  );
}
