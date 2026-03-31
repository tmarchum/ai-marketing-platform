import { useState, useRef, useEffect, useCallback } from "react";

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
// THEME — LIGHT
// ═══════════════════════════════════════════════════════════════════
const T = {
  bg: "#f5f6fa",
  card: "#ffffff",
  sidebar: "#ffffff",
  topbar: "#ffffff",
  border: "#e2e5ea",
  borderLight: "#eef0f4",
  text: "#1a1a2e",
  textSec: "#4a5568",
  textMuted: "#8492a6",
  textDim: "#a0aec0",
  inputBg: "#f7f8fc",
  inputBorder: "#dfe3eb",
  hoverBg: "#f0f2f8",
  accent: "#6C5CE7",
  accentLight: "#6C5CE710",
  success: "#10B981",
  danger: "#EF4444",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowLg: "0 4px 14px rgba(0,0,0,0.08)",
};

// ═══════════════════════════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════════════════════════
function Spinner({ size=16, color="#6C5CE7" }) {
  return <span style={{ display:"inline-block", width:size, height:size,
    border:`2px solid ${color}33`, borderTopColor:color,
    borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />;
}
function Btn({ children, onClick, disabled, grad, color="#fff", bg="#1a1a2e", sm, full, style={} }) {
  return <button onClick={onClick} disabled={disabled} style={{
    background: disabled?"#e2e5ea": grad||bg,
    color: disabled?"#a0aec0":color,
    border: grad?"none":`1px solid ${disabled?"#e2e5ea":color+"33"}`,
    borderRadius:10, padding: sm?"6px 14px":"10px 22px",
    fontSize: sm?12:13, fontWeight:600, cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6,
    transition:"all 0.2s", width:full?"100%":"auto", justifyContent:full?"center":"flex-start",
    boxShadow: disabled?"none":"0 1px 2px rgba(0,0,0,0.05)",
    ...style }}>{children}</button>;
}
function Tag({ label, color="#6c757d" }) {
  return <span style={{ background:color+"12", color, border:`1px solid ${color}22`,
    borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:600 }}>{label}</span>;
}
function Card({ children, accent, style={} }) {
  return <div style={{ background:T.card,
    border:`1px solid ${accent||T.border}`,
    borderRadius:14, padding:20, boxShadow:T.shadow, ...style }}>{children}</div>;
}
function SectionTitle({ children, sub }) {
  return <div style={{ marginBottom:20 }}>
    <h2 style={{ fontWeight:700, fontSize:20, margin:0, color:T.text }}>{children}</h2>
    {sub && <p style={{ color:T.textMuted, fontSize:13, margin:"4px 0 0" }}>{sub}</p>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// CLAUDE API
// ═══════════════════════════════════════════════════════════════════
async function claudeCall(prompt, maxTokens=800) {
  try {
    const r = await fetch("/api/content/claude", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ prompt, maxTokens })
    });
    if (r.ok) { const d = await r.json(); if (!d.error) return d.text; }
  } catch {}
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
// META GRAPH API — ANALYTICS
// ═══════════════════════════════════════════════════════════════════
async function fetchPageInsights(pageId, accessToken) {
  try {
    const metrics = "page_impressions,page_engaged_users,page_post_engagements,page_fan_adds";
    const r = await fetch(
      `https://graph.facebook.com/v25.0/${pageId}/insights?metric=${metrics}&period=day&date_preset=last_7d&access_token=${accessToken}`
    );
    const d = await r.json();
    if (d.error) return { error: d.error.message };
    return d.data || [];
  } catch(e) { return { error: e.message }; }
}

async function fetchPostInsights(postId, accessToken) {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v25.0/${postId}?fields=message,created_time,likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`
    );
    const d = await r.json();
    if (d.error) return null;
    return {
      id: d.id,
      message: d.message || "",
      created: d.created_time,
      likes: d.likes?.summary?.total_count || 0,
      comments: d.comments?.summary?.total_count || 0,
      shares: d.shares?.count || 0,
    };
  } catch { return null; }
}

async function fetchPagePosts(pageId, accessToken, limit=10) {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v25.0/${pageId}/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares&limit=${limit}&access_token=${accessToken}`
    );
    const d = await r.json();
    if (d.error) return [];
    return (d.data||[]).map(p=>({
      id: p.id,
      message: p.message || "",
      created: p.created_time,
      likes: p.likes?.summary?.total_count || 0,
      comments: p.comments?.summary?.total_count || 0,
      shares: p.shares?.count || 0,
    }));
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════
// APIFY — WEB & COMPETITOR SCRAPING
// ═══════════════════════════════════════════════════════════════════
function getApifyToken() {
  const keys = JSON.parse(localStorage.getItem("admin_keys")||"{}");
  const token = keys.APIFY_API_TOKEN;
  if (!token) throw new Error("הגדר APIFY_API_TOKEN בדף ניהול");
  return token;
}

async function runApifyActor(actorId, input) {
  const token = getApifyToken();
  const runR = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(input)
  });
  const run = await runR.json();
  if (run.error) throw new Error(run.error.message || "שגיאה בהפעלת Apify");
  const runId = run.data?.id;
  if (!runId) throw new Error("לא התקבל run ID");

  // Poll for completion
  let status = "RUNNING";
  let attempts = 0;
  while (status === "RUNNING" || status === "READY") {
    if (attempts++ > 40) throw new Error("הסריקה לקחה יותר מדי זמן");
    await new Promise(r=>setTimeout(r, 3000));
    const statusR = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const statusD = await statusR.json();
    status = statusD.data?.status || "FAILED";
  }
  if (status !== "SUCCEEDED") throw new Error(`סריקה נכשלה: ${status}`);

  const datasetId = run.data?.defaultDatasetId;
  const itemsR = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=30`);
  return await itemsR.json();
}

// Scrape a website for text content
async function scrapeWebsite(url) {
  const items = await runApifyActor("apify~website-content-crawler", {
    startUrls: [{ url }],
    maxCrawlPages: 5,
    maxCrawlDepth: 1,
  });
  return items.map(i => i.text || i.body || "").filter(Boolean).join("\n\n").slice(0, 3000);
}

// Scrape Facebook page posts
async function scrapeFacebookPage(pageUrl) {
  const items = await runApifyActor("apify~facebook-posts-scraper", {
    startUrls: [{ url: pageUrl }],
    resultsLimit: 15,
    viewOption: "CHRONOLOGICAL"
  });
  return items.map(item => ({
    text: item.text || item.message || "",
    likes: item.likes || item.reactionsCount || 0,
    comments: item.comments || item.commentsCount || 0,
    shares: item.shares || item.sharesCount || 0,
    date: item.time || item.timestamp || "",
    url: item.url || item.postUrl || "",
  })).filter(p => p.text);
}

// Search Google for competitors
async function searchCompetitors(bizName, bizDescription) {
  const query = `${bizName} מתחרים OR דומה OR אלטרנטיבה ${bizDescription?.split(" ").slice(0,5).join(" ")||""}`;
  try {
    const items = await runApifyActor("apify~google-search-scraper", {
      queries: query,
      maxPagesPerQuery: 1,
      resultsPerPage: 10,
    });
    return items.flatMap(i => i.organicResults || []).map(r => ({
      title: r.title || "",
      url: r.url || r.link || "",
      description: r.description || "",
    })).filter(r => r.url && !r.url.includes(bizName.replace(/\s/g,"")));
  } catch { return []; }
}

// Full business scan: website + find competitors + scrape them
async function fullBusinessScan(biz, onProgress) {
  const results = { websiteContent: null, fbPosts: null, competitors: [], competitorPosts: [], searchResults: [] };

  // Step 1: Scrape business website
  if (biz.url) {
    onProgress("סורק את האתר שלך...");
    try { results.websiteContent = await scrapeWebsite(biz.url); } catch(e) { results.websiteError = e.message; }
  }

  // Step 2: Scrape own Facebook page
  const fbTokens = biz.social?.facebook?.tokens;
  const pageId = fbTokens?.META_PAGE_ID;
  if (pageId) {
    onProgress("סורק את דף הפייסבוק שלך...");
    try {
      const fbUrl = `https://www.facebook.com/${pageId}`;
      results.fbPosts = await scrapeFacebookPage(fbUrl);
    } catch {}
  }

  // Step 3: Search for competitors
  onProgress("מחפש מתחרים ברשת...");
  try { results.searchResults = await searchCompetitors(biz.name, biz.description); } catch {}

  // Step 4: Ask Claude to identify competitors from search results
  if (results.searchResults.length > 0 || biz.description) {
    onProgress("מזהה מתחרים עם AI...");
    try {
      const searchInfo = results.searchResults.length > 0
        ? `\nתוצאות חיפוש:\n${results.searchResults.slice(0,8).map(r=>`- ${r.title}: ${r.url} — ${r.description?.slice(0,60)}`).join("\n")}`
        : "";
      const raw = await claudeCall(`מצא את המתחרים העיקריים של "${biz.name}".
${biz.description ? `תיאור: ${biz.description}` : ""}${searchInfo}

החזר JSON בלבד:
{"competitors":[{"name":"שם","fbUrl":"קישור דף פייסבוק (אם ידוע)","url":"קישור אתר","reason":"למה הוא מתחרה"}],"industry":"תחום","marketPosition":"מיקום בשוק"}
מצא 3-5 מתחרים רלוונטיים. אם אתה לא יודע את ה-fbUrl שלהם תן מחרוזת ריקה.`, 600);
      const clean = raw.replace(/```json|```/g,"").trim();
      const found = JSON.parse(clean);
      results.competitors = found.competitors || [];
      results.industry = found.industry;
      results.marketPosition = found.marketPosition;
    } catch {}
  }

  // Step 5: Scrape competitor Facebook pages
  const fbComps = results.competitors.filter(c => c.fbUrl);
  if (fbComps.length > 0) {
    for (const comp of fbComps.slice(0, 3)) {
      onProgress(`סורק מתחרה: ${comp.name}...`);
      try {
        const posts = await scrapeFacebookPage(comp.fbUrl);
        results.competitorPosts.push({ name: comp.name, url: comp.fbUrl, posts });
      } catch {}
    }
  }

  // Step 6: Full AI analysis with all data
  onProgress("מנתח הכל עם AI...");
  const websiteInfo = results.websiteContent ? `\nתוכן מהאתר:\n${results.websiteContent.slice(0,800)}` : "";
  const ownPostsInfo = results.fbPosts?.length > 0
    ? `\nפוסטים מהדף שלך:\n${results.fbPosts.slice(0,5).map(p=>`- "${p.text.slice(0,50)}..." → ${p.likes} לייקים, ${p.comments} תגובות`).join("\n")}`
    : "";
  const compInfo = results.competitorPosts.length > 0
    ? `\nפוסטים של מתחרים:\n${results.competitorPosts.map(c=>{
        const top = c.posts.sort((a,b)=>(b.likes+b.comments)-(a.likes+a.comments)).slice(0,3);
        return `${c.name}:\n${top.map(p=>`  - "${p.text.slice(0,50)}..." → ${p.likes} לייקים, ${p.comments} תגובות`).join("\n")}`;
      }).join("\n")}`
    : "";
  const compList = results.competitors.length > 0
    ? `\nמתחרים שזוהו: ${results.competitors.map(c=>`${c.name} (${c.reason})`).join(", ")}`
    : "";

  const raw = await claudeCall(`אתה מנתח שיווקי מומחה. נתח את העסק הבא באופן מקיף:
שם: "${biz.name}"${biz.url?`\nאתר: ${biz.url}`:""}${biz.description?`\nתיאור: ${biz.description}`:""}${websiteInfo}${ownPostsInfo}${compList}${compInfo}

נתח הכל והחזר JSON בלבד:
{"tone":"טון המותג","audience":"קהל יעד","strengths":["יתרון1","יתרון2","יתרון3"],"contentIdeas":["רעיון1","רעיון2","רעיון3","רעיון4"],"bestPlatform":"פלטפורמה מומלצת","postFrequency":"תדירות","competitorInsights":"תובנה מרכזית מהמתחרים","topThemes":["נושא1","נושא2","נושא3"],"bestHooks":["hook1","hook2"],"gaps":["פער1","פער2"],"recommendation":"המלצה אסטרטגית"}`, 800);

  const clean = raw.replace(/```json|```/g,"").trim();
  results.analysis = JSON.parse(clean);
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// META ADS API — BOOST
// ═══════════════════════════════════════════════════════════════════
async function boostPost(postId, accessToken, adAccountId, budget, duration, targeting) {
  try {
    // Create campaign
    const campR = await fetch(`https://graph.facebook.com/v25.0/${adAccountId}/campaigns`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        name: `Boost_${postId}_${Date.now()}`,
        objective: "OUTCOME_ENGAGEMENT",
        status: "PAUSED",
        special_ad_categories: [],
        access_token: accessToken
      })
    });
    const camp = await campR.json();
    if (camp.error) return { error: camp.error.message };

    // Create ad set
    const endTime = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();
    const adSetR = await fetch(`https://graph.facebook.com/v25.0/${adAccountId}/adsets`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        name: `Boost_AdSet_${postId}`,
        campaign_id: camp.id,
        daily_budget: Math.round(budget * 100),
        billing_event: "IMPRESSIONS",
        optimization_goal: "POST_ENGAGEMENT",
        targeting: targeting || { geo_locations: { countries: ["IL"] }, age_min: 18, age_max: 65 },
        start_time: new Date().toISOString(),
        end_time: endTime,
        status: "PAUSED",
        access_token: accessToken
      })
    });
    const adSet = await adSetR.json();
    if (adSet.error) return { error: adSet.error.message };

    // Create ad from existing post
    const adR = await fetch(`https://graph.facebook.com/v25.0/${adAccountId}/ads`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        name: `Boost_Ad_${postId}`,
        adset_id: adSet.id,
        creative: { object_story_id: postId },
        status: "PAUSED",
        access_token: accessToken
      })
    });
    const ad = await adR.json();
    if (ad.error) return { error: ad.error.message };

    return { success: true, campaignId: camp.id, adSetId: adSet.id, adId: ad.id };
  } catch(e) { return { error: e.message }; }
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
    if (pipeline.done) return <Tag label="פורסם" color="#10B981"/>;
    if (cur) return <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
      <Spinner size={10} color={cur.color}/><span style={{color:cur.color}}>{cur.label}</span>
    </span>;
    return null;
  }
  return <div style={{display:"flex",gap:4,marginTop:14,flexWrap:"wrap"}}>
    {stages.map((s,i)=>{
      const st = pipeline.stages?.[s.id];
      const active = pipeline.current===s.id;
      return <div key={s.id} style={{display:"flex",alignItems:"center",gap:4}}>
        <div style={{ width:32,height:32,borderRadius:"50%",
          background: st==="done"?s.color+"20":active?s.color+"10":T.inputBg,
          border:`2px solid ${st==="done"||active?s.color:T.border}`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
          boxShadow:active?`0 0 12px ${s.color}33`:"none",transition:"all 0.4s" }}>
          {st==="done"?"✓":active?<Spinner size={12} color={s.color}/>:s.icon}
        </div>
        <div style={{fontSize:9,color:st==="done"||active?s.color:T.textDim,fontWeight:active?700:400}}>{s.label}</div>
        {i<stages.length-1&&<div style={{width:10,height:2,background:st==="done"?s.color:T.border,marginLeft:4}}/>}
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
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <Tag label={post.platform} color={pl.color}/>
        <Tag label={post.business} color={T.textMuted}/>
        {post.pipeline&&<PipelineBar stages={MEDIA_STAGES} pipeline={post.pipeline} compact/>}
        {post.ugc&&<PipelineBar stages={UGC_STAGES} pipeline={post.ugc} compact/>}
      </div>
      <span style={{color:T.textDim,fontSize:11}}>{post.date}</span>
    </div>

    {editing
      ? <textarea value={txt} onChange={e=>setTxt(e.target.value)} style={{
          width:"100%",minHeight:80,background:T.inputBg,border:`1px solid ${T.inputBorder}`,
          borderRadius:10,color:T.text,padding:12,fontSize:13,fontFamily:"inherit",
          direction:"rtl",resize:"vertical",boxSizing:"border-box"}}/>
      : <p style={{color:T.textSec,fontSize:13,lineHeight:1.7,margin:"0 0 10px",
          direction:"rtl",whiteSpace:"pre-wrap"}}>{txt}</p>
    }

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {post.hashtags.map(h=><span key={h} style={{color:pl.color,fontSize:11}}>#{h}</span>)}
    </div>

    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {!post.approved
        ? <Btn sm bg="#10B98115" color="#10B981" onClick={()=>onUpdate({...post,approved:true})}>אשר</Btn>
        : <Tag label="מאושר" color="#10B981"/>
      }
      {editing
        ? <><Btn sm bg="#10B98115" color="#10B981" onClick={()=>{onUpdate({...post,content:txt});setEditing(false);}}>שמור</Btn>
            <Btn sm bg={T.inputBg} color={T.textMuted} onClick={()=>setEditing(false)}>ביטול</Btn></>
        : <Btn sm bg={T.inputBg} color={T.textSec} onClick={()=>setEditing(true)}>ערוך</Btn>
      }
      {!post.pipeline
        ? <Btn sm bg="#F59E0B15" color="#F59E0B" onClick={startMedia}>מדיה AI</Btn>
        : <Btn sm bg={T.inputBg} color={T.textSec} onClick={()=>setExp(p=>!p)}>{exp?"▲":"▼"} מדיה</Btn>
      }
      {!post.ugc
        ? <Btn sm bg="#EC489915" color="#EC4899" onClick={startUGC}>UGC</Btn>
        : <Btn sm bg={T.inputBg} color={T.textSec} onClick={()=>setExp(p=>!p)}>{exp?"▲":"▼"} UGC</Btn>
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
    <div className="stats-grid" style={{display:"grid",gap:12,marginBottom:28}}>
      {stats.map(s=><Card key={s.label} style={{textAlign:"center",padding:16}}>
        <div style={{fontSize:24}}>{s.icon}</div>
        <div style={{fontSize:28,fontWeight:700,color:s.color,margin:"4px 0"}}>{s.value}</div>
        <div style={{color:T.textMuted,fontSize:11}}>{s.label}</div>
      </Card>)}
    </div>
    <div className="two-col-grid" style={{display:"grid",gap:16}}>
      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1}}>PIPELINE</div>
        {[
          ["Claude API","כתיבת תוכן + פרומפטים","#8B5CF6"],
          ["Flux (Replicate)","יצירת תמונות","#F59E0B"],
          ["Runway ML","יצירת סרטונים","#EC4899"],
          ["ElevenLabs","קול עברי (UGC)","#06B6D4"],
          ["D-ID","Avatar מדבר","#F59E0B"],
          ["Meta Graph API","פרסום אוטומטי","#1877F2"],
        ].map(([name,desc,c])=><div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.borderLight}`}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{color:T.text,fontSize:12,fontWeight:600}}>{name}</div>
            <div style={{color:T.textMuted,fontSize:11}}>{desc}</div>
          </div>
          <Tag label="פעיל" color={c}/>
        </div>)}
      </Card>
      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1}}>עלויות חודשיות</div>
        {[
          ["100 פוסטים + מדיה","~$40","#10B981"],
          ["100 סרטוני UGC","~$19","#EC4899"],
          ["Backend (Railway)","$7","#8B5CF6"],
          ["סה\"כ","~$66/חודש","#F59E0B"],
        ].map(([k,v,c])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.borderLight}`}}>
          <span style={{color:T.textSec,fontSize:13}}>{k}</span>
          <span style={{color:c,fontWeight:700,fontSize:13}}>{v}</span>
        </div>)}
        <p style={{color:T.textMuted,fontSize:11,marginTop:12,lineHeight:1.6}}>
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
    <div className="two-col-grid" style={{display:"grid",gap:16,marginBottom:24}}>
      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:10}}>הוסף URL</div>
        <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
          <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="https://..."
            style={{flex:1,minWidth:150,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,
              padding:"9px 12px",color:T.text,fontSize:12,fontFamily:"monospace"}}/>
          <select value={role} onChange={e=>setRole(e.target.value)} style={{
            background:T.inputBg,border:`1px solid ${T.inputBorder}`,color:T.textSec,
            borderRadius:10,padding:"9px 10px",fontSize:12,fontFamily:"inherit"}}>
            {["עסק","מתחרה","השראה","מקור"].map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
        <Btn sm grad="linear-gradient(135deg,#8B5CF6,#3B82F6)" onClick={addUrl}>הוסף</Btn>
      </Card>
      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:10}}>תוכן ידני</div>
        <textarea value={manualTxt} onChange={e=>setManualTxt(e.target.value)}
          placeholder="הדבק תיאור עסק, מסרים, יתרונות..."
          style={{width:"100%",minHeight:70,background:T.inputBg,border:`1px solid ${T.inputBorder}`,
            borderRadius:10,color:T.text,padding:12,fontSize:12,fontFamily:"inherit",
            direction:"rtl",resize:"none",boxSizing:"border-box",marginBottom:8}}/>
        <Btn sm bg="#8B5CF615" color="#8B5CF6" onClick={addManual}>הוסף תוכן</Btn>
      </Card>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {sources.map(s=>{
        const c = s.type==="competitor"?"#EF4444":s.type==="manual"?"#8B5CF6":"#10B981";
        return <Card key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:14}}>
          <div style={{width:36,height:36,borderRadius:10,background:c+"15",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
            {s.type==="url"?"🌐":s.type==="manual"?"✏️":"🎯"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:T.text,fontSize:13,fontWeight:600}}>{s.name}</div>
            <div style={{color:T.textMuted,fontSize:11,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.url}</div>
          </div>
          <Tag label={s.role} color={c}/>
          <Btn sm bg={T.inputBg} color={T.textMuted} onClick={()=>setSources(p=>p.filter(x=>x.id!==s.id))}>✕</Btn>
        </Card>;
      })}
    </div>
  </div>;
}

// CONTENT
function Content({ posts, setPosts, sources, businesses, analyticsData }) {
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

      // Smart content: include engagement insights if available
      let engagementHint = "";
      const bizAnalytics = analyticsData?.[selBiz.id];
      if (bizAnalytics?.topPosts?.length > 0) {
        const top = bizAnalytics.topPosts.slice(0,3);
        engagementHint = `\n\nנתוני ביצועים (פוסטים מוצלחים):
${top.map(p=>`- "${p.message?.slice(0,50)}..." → ${p.likes} לייקים, ${p.comments} תגובות`).join("\n")}
למד מהפוסטים המוצלחים — מה הטון? מה ה-hook? מה הנושא? צור תוכן דומה באיכות אבל ייחודי.`;
      }

      // Competitor insights
      let competitorHint = "";
      if (selBiz.competitorAnalysis) {
        const ca = selBiz.competitorAnalysis;
        competitorHint = `\n\nתובנות ממתחרים (Apify):
נושאים חמים: ${ca.topThemes?.join(", ")||""}
Hooks שעובדים: ${ca.bestHooks?.join(", ")||""}
פערים שאפשר לנצל: ${ca.gaps?.join(", ")||""}
${ca.recommendation||""}`;
      }
      if (selBiz.competitorData?.some(d=>d.posts?.length>0)) {
        const topCompPosts = selBiz.competitorData.flatMap(d=>d.posts||[])
          .sort((a,b)=>(b.likes+b.comments)-(a.likes+a.comments)).slice(0,3);
        if (topCompPosts.length>0) {
          competitorHint += `\nפוסטים מובילים של מתחרים:
${topCompPosts.map(p=>`- "${p.text?.slice(0,50)}..." → ${p.likes} לייקים, ${p.comments} תגובות`).join("\n")}
צור תוכן שמתחרה ברמה הזו אבל ייחודי לעסק שלנו.`;
        }
      }

      const raw = await claudeCall(`אתה מומחה שיווק ישראלי. צור 2 פוסטים חדשים ושונים לעסק: ${selBiz.name}.${bizDesc}${scanInfo}${sourceInfo}
פלטפורמות: ${platLabels}. סוגים: ${selTypes.join(", ")}. מטרה: לידים.${existingContent}${engagementHint}${competitorHint}
חשוב: התאם טון ושפה לעסק. צור תוכן ייחודי שלא דומה לפוסטים קיימים.
החזר JSON בלבד: {"posts":[{"platform":"פייסבוק","type":"פוסט קצר","content":"...","hashtags":["..."]}]}`);
      const clean = raw.replace(/```json|```/g,"").trim();
      const arr = JSON.parse(clean).posts;
      const newPosts = arr.map((p,i)=>({
        id:Date.now()+i, business:selBiz.name, ...p,
        date:"ד׳ 03.04 · 20:00", approved:false, media:null, ugc:null, pipeline:null
      }));
      setPosts(p=>[...newPosts,...p]);
      setMsg(`נוצרו ${newPosts.length} פוסטים עבור ${selBiz.name}`);
    } catch(e) { setMsg(`שגיאה: ${e.message || "בדוק API key בדף ניהול"}`); }
    setLoading(false);
  }

  function updatePost(id, updater) {
    setPosts(prev=>prev.map(p=>p.id===id?(typeof updater==="function"?updater(p):{...p,...updater}):p));
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="יצירת פוסטים לפי עסק — AI לומד מביצועים קודמים">תוכן ומדיה</SectionTitle>

    {/* Business selector */}
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
      {BUSINESSES.map(b=>{
        const cnt = posts.filter(p=>p.business===b.name).length;
        return <button key={b.id} onClick={()=>setSelBiz(b)} style={{
          display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:12,cursor:"pointer",
          background:selBiz?.id===b.id?b.color+"12":T.card,
          border:`1px solid ${selBiz?.id===b.id?b.color:T.border}`,fontFamily:"inherit",
          color:selBiz?.id===b.id?T.text:T.textMuted,fontWeight:selBiz?.id===b.id?700:400,fontSize:13,transition:"all 0.2s",
          boxShadow: selBiz?.id===b.id?`0 0 0 2px ${b.color}33`:"none"}}>
          <span style={{fontSize:18}}>{b.icon}</span>{b.name}
          <span style={{background:T.inputBg,borderRadius:10,padding:"1px 7px",fontSize:10,color:T.textMuted}}>{cnt}</span>
        </button>;
      })}
    </div>

    {/* Existing posts notice */}
    {existingBizPosts.length>0&&<div style={{background:"#8B5CF608",border:"1px solid #8B5CF618",borderRadius:10,
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
          <div style={{color:T.textMuted,fontSize:11,marginBottom:8}}>פלטפורמות</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {PLATFORMS.map(p=><button key={p.id} onClick={()=>setSelPlatforms(prev=>
              prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} style={{
              background:selPlatforms.includes(p.id)?p.color+"12":T.inputBg,
              border:`1px solid ${selPlatforms.includes(p.id)?p.color:T.inputBorder}`,
              color:selPlatforms.includes(p.id)?p.color:T.textMuted,
              borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit"
            }}>{p.label}</button>)}
          </div>
        </div>
        <div>
          <div style={{color:T.textMuted,fontSize:11,marginBottom:8}}>סוגי תוכן</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {CONTENT_TYPES.map(t=><button key={t} onClick={()=>setSelTypes(prev=>
              prev.includes(t)?prev.filter(x=>x!==t):[...prev,t])} style={{
              background:selTypes.includes(t)?"#8B5CF612":T.inputBg,
              border:`1px solid ${selTypes.includes(t)?"#8B5CF6":T.inputBorder}`,
              color:selTypes.includes(t)?"#8B5CF6":T.textMuted,
              borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit"
            }}>{t}</button>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <Btn disabled={loading||!selBiz}
          grad={loading||!selBiz?undefined:"linear-gradient(135deg,#8B5CF6,#3B82F6)"}
          onClick={generate}>
          {loading?<><Spinner/>מייצר...</>:`צור פוסטים ל${selBiz?.name||"..."}`}
        </Btn>
        <Btn grad="linear-gradient(135deg,#EC4899,#F59E0B)"
          onClick={()=>existingBizPosts.filter(p=>!p.pipeline&&!p.ugc).forEach(post=>{
            updatePost(post.id,{...post,pipeline:{stages:Object.fromEntries(MEDIA_STAGES.map(s=>[s.id,"pending"])),current:null,done:false}});
            runPipeline(MEDIA_STAGES, upd=>setPosts(prev=>prev.map(p=>p.id===post.id?{...p,pipeline:upd}:p)));
          })}>
          הפעל מדיה AI
        </Btn>
        {msg&&<span style={{color:msg.includes("שגיאה")?"#EF4444":"#10B981",fontSize:12,fontWeight:600}}>{msg}</span>}
      </div>
    </Card>

    {/* Posts filtered by business */}
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {existingBizPosts.length===0
        ? <Card><div style={{textAlign:"center",color:T.textDim,padding:30}}>אין פוסטים ל-{selBiz?.name} — לחץ "צור פוסטים"</div></Card>
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
          desc:"Video upload + scheduling דרך Meta Graph API v25. תומך ב-Reels ו-Feed.",
          api:"Meta Graph API v25"},
      ].map(item=><Card key={item.step} accent={item.color+"18"}>
        <div style={{display:"flex",gap:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:item.color+"12",
            border:`1px solid ${item.color}33`,display:"flex",alignItems:"center",
            justifyContent:"center",color:item.color,fontWeight:700,fontSize:16,flexShrink:0}}>
            {item.step}
          </div>
          <div style={{minWidth:0}}>
            <div style={{color:T.text,fontWeight:600,fontSize:14,marginBottom:4}}>{item.title}</div>
            <div style={{color:T.textMuted,fontSize:12,lineHeight:1.6,marginBottom:6}}>{item.desc}</div>
            <code style={{color:item.color,fontSize:11,background:item.color+"08",
              padding:"3px 10px",borderRadius:6}}>{item.api}</code>
          </div>
        </div>
      </Card>)}
    </div>
    <Card>
      <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:12}}>עלויות ל-100 פוסטים</div>
      {[["Claude (פרומפטים)","~$2","#8B5CF6"],["Flux (תמונות)","~$0.30","#F59E0B"],
        ["Runway (סרטונים)","~$25","#EC4899"],["Meta API","חינם","#1877F2"],["סה\"כ","~$27","#10B981"]]
        .map(([k,v,c])=><div key={k} style={{display:"flex",justifyContent:"space-between",
          padding:"8px 0",borderBottom:`1px solid ${T.borderLight}`}}>
          <span style={{color:T.textSec,fontSize:12}}>{k}</span>
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
    <div style={{display:"flex",gap:0,marginBottom:24,flexWrap:"wrap"}}>
      {STEPS_LABELS.map((s,i)=><div key={s} style={{display:"flex",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,
          padding:"6px 14px",borderRadius:20,
          background:i===step?"#EC489910":i<step?"#10B98110":"transparent",
          border:`1px solid ${i===step?"#EC4899":i<step?"#10B981":T.border}`}}>
          <span style={{width:18,height:18,borderRadius:"50%",background:i<step?"#10B981":i===step?"#EC4899":T.border,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700,flexShrink:0}}>
            {i<step?"✓":i+1}
          </span>
          <span style={{fontSize:12,color:i===step?"#EC4899":i<step?"#10B981":T.textDim,fontWeight:i===step?700:400}}>{s}</span>
        </div>
        {i<STEPS_LABELS.length-1&&<div style={{width:20,height:1,background:i<step?"#10B981":T.border}}/>}
      </div>)}
    </div>

    {step===0&&<div style={{animation:"fadeUp 0.3s ease"}}>
      <div className="two-col-grid" style={{display:"grid",gap:14,marginBottom:20}}>
        {DEFAULT_BUSINESSES.map(b=><Card key={b.id} accent={biz.id===b.id?b.color:undefined}
          style={{cursor:"pointer",transition:"all 0.2s"}} onClick={()=>setBiz(b)}>
          <div style={{fontSize:32,marginBottom:8}}>{b.icon}</div>
          <div style={{fontWeight:700,color:T.text}}>{b.name}</div>
          <div style={{color:T.textMuted,fontSize:12,marginTop:4}}>{b.type}</div>
        </Card>)}
      </div>
      <Btn grad="linear-gradient(135deg,#EC4899,#8B5CF6)" onClick={()=>setStep(1)}>המשך ←</Btn>
    </div>}

    {step===1&&<div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{color:T.textMuted,fontSize:11,fontWeight:700}}>בחר דמות</div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}
              onChange={e=>{const u=URL.createObjectURL(e.target.files[0]);
                setAvatar({id:"custom",name:"דמות מותאמת",age:"—",desc:"תמונה שלך",color:"#10B981",img:u});}}/>
            <Btn sm bg="#10B98110" color="#10B981"
              style={{border:"1px solid #10B98133"}} onClick={()=>fileRef.current.click()}>
              העלה תמונה
            </Btn>
          </div>
        </div>
        <div className="avatar-grid" style={{display:"grid",gap:10}}>
          {AVATAR_LIBRARY.map(av=><div key={av.id} onClick={()=>setAvatar(av)} style={{
            background:avatar?.id===av.id?av.color+"10":T.card,
            border:`2px solid ${avatar?.id===av.id?av.color:T.border}`,
            borderRadius:12,padding:12,cursor:"pointer",transition:"all 0.2s"}}>
            <img src={av.img} alt={av.name} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8,marginBottom:8}}/>
            <div style={{color:T.text,fontWeight:600,fontSize:13}}>{av.name}</div>
            <div style={{color:T.textMuted,fontSize:11}}>{av.age} · {av.desc}</div>
          </div>)}
        </div>
      </div>

      {avatar&&<Card style={{marginBottom:16}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
          <img src={avatar.img} alt="" style={{width:44,height:44,borderRadius:10,objectFit:"cover",border:`2px solid ${avatar.color}`}}/>
          <div>
            <div style={{color:T.text,fontWeight:600}}>{avatar.name} מדברת על {biz.name}</div>
            <div style={{color:T.textMuted,fontSize:11}}>30-40 שניות · עברית טבעית</div>
          </div>
        </div>
        <Btn sm grad="linear-gradient(135deg,#8B5CF6,#EC4899)" disabled={genLoading} onClick={genScript}>
          {genLoading?<><Spinner size={12}/>כותב...</>:"כתוב סקריפט"}
        </Btn>
        {script&&<textarea value={script} onChange={e=>setScript(e.target.value)} style={{
          width:"100%",minHeight:100,background:T.inputBg,border:`1px solid #8B5CF633`,
          borderRadius:10,color:T.text,padding:12,fontSize:12,fontFamily:"inherit",
          direction:"rtl",resize:"vertical",marginTop:12,boxSizing:"border-box"}}/>}
      </Card>}

      <div style={{display:"flex",gap:8}}>
        <Btn bg={T.inputBg} color={T.textSec} onClick={()=>setStep(0)}>← חזור</Btn>
        <Btn disabled={!avatar||script.length<20}
          grad={avatar&&script.length>=20?"linear-gradient(135deg,#EC4899,#F59E0B)":undefined}
          onClick={produce}>
          הפק סרטון
        </Btn>
      </div>
    </div>}

    {step===2&&<div style={{animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20,flexWrap:"wrap"}}>
        {avatar&&<img src={avatar.img} alt="" style={{width:60,height:60,borderRadius:12,objectFit:"cover",border:"2px solid #EC4899"}}/>}
        <div>
          <h3 style={{margin:0,fontWeight:700,color:T.text}}>{loading?"מפיק סרטון UGC...":"סרטון מוכן!"}</h3>
          <p style={{color:T.textMuted,fontSize:12,margin:"4px 0 0"}}>{avatar?.name} · {biz.name}</p>
        </div>
      </div>
      <PipelineBar stages={UGC_STAGES} pipeline={pipeline}/>
      {pipeline?.done&&<div style={{marginTop:16}}>
        <Card accent="#10B98133">
          <div style={{color:"#10B981",fontWeight:700,marginBottom:10}}>פורסם בהצלחה</div>
          {[["ElevenLabs","קול עברי טבעי","~$0.03"],["D-ID","Avatar מדבר","~$0.05"],
            ["Meta API","Reel פורסם","חינם"]].map(([k,d,v])=>
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.borderLight}`}}>
              <div><span style={{color:T.text,fontSize:12,fontWeight:600}}>{k}</span>
                <span style={{color:T.textMuted,fontSize:11,marginRight:8}}> · {d}</span></div>
              <span style={{color:"#10B981",fontSize:12,fontWeight:700}}>{v}</span>
            </div>)}
        </Card>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <Btn grad="linear-gradient(135deg,#8B5CF6,#EC4899)"
            onClick={()=>{setStep(0);setPipeline(null);setScript("");setAvatar(null);}}>
            + סרטון חדש
          </Btn>
          <Btn bg={T.inputBg} color={T.textSec} onClick={()=>{setStep(1);setPipeline(null);}}>ערוך</Btn>
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
  const [scanProgress, setScanProgress] = useState({});
  const [scrapingComp, setScrapingComp] = useState({});
  const [newCompUrl, setNewCompUrl] = useState({});

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
    setScanProgress(p=>({...p,[biz.id]:"מתחיל סריקה מקיפה..."}));
    try {
      const results = await fullBusinessScan(biz, (msg) => setScanProgress(p=>({...p,[biz.id]:msg})));
      const analysis = results.analysis || {};
      // Store both the analysis (for existing UI) and the full scan data
      updateBiz(biz.id, {
        scanResult: analysis,
        fullScanData: results,
        // Auto-add found competitors
        competitors: results.competitors?.length > 0
          ? results.competitors.map((c,i) => ({ id: Date.now()+i, name: c.name, url: c.fbUrl || c.url || "", reason: c.reason }))
          : (biz.competitors || []),
        // Store competitor posts if found
        competitorData: results.competitorPosts?.length > 0 ? results.competitorPosts : (biz.competitorData || null),
        competitorAnalysis: analysis.competitorInsights ? {
          insights: analysis.competitorInsights,
          topThemes: analysis.topThemes,
          bestHooks: analysis.bestHooks,
          gaps: analysis.gaps,
          recommendation: analysis.recommendation
        } : (biz.competitorAnalysis || null),
        competitorLastScan: results.competitorPosts?.length > 0 ? new Date().toISOString() : (biz.competitorLastScan || null),
        lastFullScan: new Date().toISOString()
      });
    } catch(e) {
      updateBiz(biz.id, { scanResult: { error: e.message || "שגיאה בסריקה — הגדר API keys בדף ניהול (Claude + Apify)" } });
    }
    setScanning(p=>({...p,[biz.id]:false}));
    setScanProgress(p=>({...p,[biz.id]:null}));
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

  function addCompetitor(bizId) {
    const url = newCompUrl[bizId]?.trim();
    if (!url) return;
    setBusinesses(p=>p.map(b=>{
      if (b.id!==bizId) return b;
      const comps = [...(b.competitors||[]), { id:Date.now(), name: url.replace(/https?:\/\/(www\.)?(facebook\.com\/)?/,"").split("/")[0]||url, url }];
      return {...b, competitors: comps};
    }));
    setNewCompUrl(p=>({...p,[bizId]:""}));
  }

  function removeCompetitor(bizId, compId) {
    setBusinesses(p=>p.map(b=>{
      if (b.id!==bizId) return b;
      return {...b, competitors: (b.competitors||[]).filter(c=>c.id!==compId)};
    }));
  }

  async function scrapeCompetitors(biz) {
    const comps = biz.competitors || [];
    if (comps.length===0) return;
    setScrapingComp(p=>({...p,[biz.id]:true}));
    try {
      const allData = [];
      for (const comp of comps) {
        try {
          const posts = await scrapeCompetitorPage(comp.url);
          allData.push({ name: comp.name, url: comp.url, posts });
        } catch(e) {
          allData.push({ name: comp.name, url: comp.url, posts: [], error: e.message });
        }
      }
      // Analyze with AI
      const validData = allData.filter(d=>d.posts.length>0);
      let analysis = null;
      if (validData.length > 0) {
        try { analysis = await analyzeCompetitors(biz.name, validData); } catch {}
      }
      updateBiz(biz.id, { competitorData: allData, competitorAnalysis: analysis, competitorLastScan: new Date().toISOString() });
    } catch(e) {
      updateBiz(biz.id, { competitorData: [{ error: e.message }] });
    }
    setScrapingComp(p=>({...p,[biz.id]:false}));
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="הוסף עסקים, חבר רשתות, סרוק מתחרים עם AI">ניהול עסקים</SectionTitle>

    {!adding ? <Btn grad="linear-gradient(135deg,#8B5CF6,#3B82F6)" onClick={()=>setAdding(true)} style={{marginBottom:20}}>
      + הוסף עסק חדש
    </Btn> : <Card style={{marginBottom:20}}>
      <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:12}}>עסק חדש</div>
      <div className="two-col-grid" style={{display:"grid",gap:12,marginBottom:12}}>
        <div>
          <div style={{color:T.textMuted,fontSize:11,marginBottom:4}}>שם העסק *</div>
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="שם העסק"
            style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,padding:"9px 12px",color:T.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:T.textMuted,fontSize:11,marginBottom:4}}>כתובת אתר</div>
          <input value={form.url} onChange={e=>setForm(p=>({...p,url:e.target.value}))} placeholder="https://..."
            style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,padding:"9px 12px",color:T.text,fontSize:12,fontFamily:"monospace",boxSizing:"border-box"}}/>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{color:T.textMuted,fontSize:11,marginBottom:4}}>תיאור העסק</div>
        <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="במה עוסק העסק, קהל יעד, יתרונות..."
          style={{width:"100%",minHeight:60,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,padding:12,fontSize:12,fontFamily:"inherit",direction:"rtl",resize:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
        <div>
          <div style={{color:T.textMuted,fontSize:11,marginBottom:6}}>אייקון</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {BIZ_ICONS.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))}
              style={{width:32,height:32,background:form.icon===ic?"#8B5CF612":T.inputBg,
                border:`1px solid ${form.icon===ic?"#8B5CF6":T.inputBorder}`,borderRadius:8,cursor:"pointer",fontSize:14}}>{ic}</button>)}
          </div>
        </div>
        <div>
          <div style={{color:T.textMuted,fontSize:11,marginBottom:6}}>צבע</div>
          <div style={{display:"flex",gap:4}}>
            {BIZ_COLORS.map(c=><button key={c} onClick={()=>setForm(p=>({...p,color:c}))}
              style={{width:28,height:28,background:c,borderRadius:8,cursor:"pointer",
                border:`2px solid ${form.color===c?"#fff":"transparent"}`,boxShadow:form.color===c?`0 0 0 2px ${c}`:""}}/>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn grad="linear-gradient(135deg,#10B981,#3B82F6)" onClick={addBiz}>שמור</Btn>
        <Btn sm bg={T.inputBg} color={T.textMuted} onClick={()=>setAdding(false)}>ביטול</Btn>
      </div>
    </Card>}

    {/* Business cards */}
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {businesses.map(biz=>{
        const result = biz.scanResult;
        const bizPosts = posts?.filter(p=>p.business===biz.name)||[];
        const expanded = editId===biz.id;
        return <Card key={biz.id} accent={biz.color+"33"}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onClick={()=>setEditId(expanded?null:biz.id)}>
            <div style={{width:48,height:48,borderRadius:12,background:biz.color+"15",border:`1px solid ${biz.color}33`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{biz.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{color:T.text,fontSize:15,fontWeight:700}}>{biz.name}</span>
                {result&&!result.error&&<Tag label="נסרק" color="#10B981"/>}
              </div>
              <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                {biz.url&&<Tag label={biz.url.replace(/https?:\/\/(www\.)?/,"")} color={T.textMuted}/>}
                <Tag label={`${bizPosts.length} פוסטים`} color="#8B5CF6"/>
                {SOCIAL_PLATFORMS.filter(sp=>biz.social?.[sp.id]?.connected).map(sp=>
                  <Tag key={sp.id} label={sp.icon+" "+sp.label} color={sp.color}/>)}
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
              <Btn sm grad="linear-gradient(135deg,#8B5CF6,#06B6D4)" disabled={scanning[biz.id]} onClick={e=>{e.stopPropagation();scanBiz(biz);}}>
                {scanning[biz.id]?<><Spinner size={10}/> {scanProgress[biz.id]||"סורק..."}</>:"סרוק AI"}
              </Btn>
              <span style={{color:T.textDim,fontSize:16}}>{expanded?"▲":"▼"}</span>
            </div>
          </div>

          {/* Expanded */}
          {expanded&&<div style={{marginTop:16,borderTop:`1px solid ${T.borderLight}`,paddingTop:16}}>
            {/* Description edit */}
            <div style={{marginBottom:14}}>
              <div style={{color:T.textMuted,fontSize:11,marginBottom:4}}>תיאור העסק</div>
              <textarea value={biz.description||""} onChange={e=>updateBiz(biz.id,{description:e.target.value})}
                placeholder="תאר את העסק — ישמש את ה-AI ליצירת תוכן מותאם..."
                style={{width:"100%",minHeight:50,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,
                  padding:12,fontSize:12,fontFamily:"inherit",direction:"rtl",resize:"none",boxSizing:"border-box"}}/>
            </div>

            {/* URL edit */}
            <div style={{marginBottom:14}}>
              <div style={{color:T.textMuted,fontSize:11,marginBottom:4}}>כתובת אתר</div>
              <input value={biz.url||""} onChange={e=>updateBiz(biz.id,{url:e.target.value})} placeholder="https://..."
                style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,padding:"9px 12px",color:T.text,fontSize:12,fontFamily:"monospace",boxSizing:"border-box"}}/>
            </div>

            {/* Social connections per business */}
            <div style={{marginBottom:14}}>
              <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:10,letterSpacing:1}}>רשתות חברתיות — {biz.name}</div>
              <div className="two-col-grid" style={{display:"grid",gap:10}}>
                {SOCIAL_PLATFORMS.map(plat=>{
                  const conn = biz.social?.[plat.id] || {connected:false,tokens:{}};
                  const allFilled = plat.fields.every(f=>conn.tokens?.[f.key]);
                  return <div key={plat.id} style={{background:T.inputBg,border:`1px solid ${conn.connected&&allFilled?plat.color+"33":T.borderLight}`,
                    borderRadius:10,padding:12,transition:"all 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:conn.connected?10:0}}>
                      <span style={{fontSize:18}}>{plat.icon}</span>
                      <span style={{color:T.text,fontSize:12,fontWeight:600,flex:1}}>{plat.label}</span>
                      <button onClick={()=>toggleSocial(biz.id,plat.id)} style={{
                        width:36,height:20,borderRadius:10,border:"none",cursor:"pointer",
                        background:conn.connected?plat.color:"#ccc",position:"relative",transition:"all 0.2s"}}>
                        <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",
                          position:"absolute",top:3,transition:"all 0.2s",
                          ...(conn.connected?{left:19}:{left:3})}}/>
                      </button>
                    </div>
                    {conn.connected&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {plat.fields.map(f=><div key={f.key}>
                        <div style={{color:T.textDim,fontSize:9,marginBottom:2}}>{f.label}</div>
                        <input value={conn.tokens?.[f.key]||""} onChange={e=>setSocialToken(biz.id,plat.id,f.key,e.target.value)}
                          placeholder={f.hint} type="password"
                          style={{width:"100%",background:T.card,border:`1px solid ${T.inputBorder}`,borderRadius:8,
                            padding:"6px 8px",color:T.text,fontSize:10,fontFamily:"monospace",boxSizing:"border-box"}}/>
                      </div>)}
                    </div>}
                  </div>;
                })}
              </div>
            </div>

            {/* Competitors */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>מתחרים — {biz.name}</div>
                <Btn sm grad="linear-gradient(135deg,#00C853,#00B0FF)" disabled={scrapingComp[biz.id]||!(biz.competitors?.length>0)}
                  onClick={e=>{e.stopPropagation();scrapeCompetitors(biz);}}>
                  {scrapingComp[biz.id]?<><Spinner size={10}/> סורק מתחרים...</>:"סרוק מתחרים (Apify)"}
                </Btn>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                <input value={newCompUrl[biz.id]||""} onChange={e=>setNewCompUrl(p=>({...p,[biz.id]:e.target.value}))}
                  placeholder="קישור לדף פייסבוק של מתחרה..."
                  style={{flex:1,minWidth:200,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,
                    padding:"8px 12px",color:T.text,fontSize:12,fontFamily:"monospace",boxSizing:"border-box"}}/>
                <Btn sm bg="#00C85312" color="#00C853" onClick={()=>addCompetitor(biz.id)}>+ הוסף</Btn>
              </div>
              {(biz.competitors||[]).length>0 && <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                {biz.competitors.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
                  background:T.inputBg,borderRadius:8,fontSize:12}}>
                  <span style={{color:"#EF4444"}}>🎯</span>
                  <span style={{color:T.text,fontWeight:600,flex:1}}>{c.name}</span>
                  <span style={{color:T.textDim,fontSize:10,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{c.url}</span>
                  <button onClick={()=>removeCompetitor(biz.id,c.id)} style={{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:12}}>✕</button>
                </div>)}
              </div>}

              {/* Competitor scrape results */}
              {biz.competitorAnalysis&&<div style={{background:"#00C85308",border:"1px solid #00C85318",borderRadius:10,padding:14,marginBottom:10}}>
                <div style={{color:"#00C853",fontWeight:600,fontSize:12,marginBottom:10}}>תובנות מתחרים (Apify + AI)</div>
                <p style={{color:T.textSec,fontSize:12,margin:"0 0 10px",direction:"rtl",lineHeight:1.6}}>{biz.competitorAnalysis.insights}</p>
                {biz.competitorAnalysis.topThemes?.length>0&&<div style={{marginBottom:8}}>
                  <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>נושאים חמים:</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{biz.competitorAnalysis.topThemes.map((t,i)=><Tag key={i} label={t} color="#00C853"/>)}</div>
                </div>}
                {biz.competitorAnalysis.bestHooks?.length>0&&<div style={{marginBottom:8}}>
                  <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>Hooks שעובדים:</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{biz.competitorAnalysis.bestHooks.map((h,i)=><Tag key={i} label={h} color="#8B5CF6"/>)}</div>
                </div>}
                {biz.competitorAnalysis.gaps?.length>0&&<div style={{marginBottom:8}}>
                  <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>פערים (הזדמנויות):</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{biz.competitorAnalysis.gaps.map((g,i)=><Tag key={i} label={g} color="#F59E0B"/>)}</div>
                </div>}
                {biz.competitorAnalysis.recommendation&&<div style={{background:T.inputBg,borderRadius:8,padding:10,marginTop:8}}>
                  <div style={{color:T.accent,fontSize:12,fontWeight:600}}>{biz.competitorAnalysis.recommendation}</div>
                </div>}
              </div>}

              {/* Individual competitor data */}
              {biz.competitorData?.some(d=>d.posts?.length>0)&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
                {biz.competitorData.filter(d=>d.posts?.length>0).map((d,i)=>{
                  const top = d.posts.sort((a,b)=>(b.likes+b.comments)-(a.likes+a.comments)).slice(0,3);
                  const avg = (d.posts.reduce((s,p)=>s+p.likes+p.comments,0)/d.posts.length).toFixed(0);
                  return <div key={i} style={{background:T.inputBg,borderRadius:8,padding:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{color:T.text,fontSize:12,fontWeight:600}}>🎯 {d.name}</span>
                      <span style={{color:T.textMuted,fontSize:10}}>{d.posts.length} פוסטים · ממוצע {avg}</span>
                    </div>
                    {top.map((p,j)=><div key={j} style={{color:T.textSec,fontSize:11,direction:"rtl",padding:"3px 0",
                      borderBottom:j<top.length-1?`1px solid ${T.borderLight}`:"none"}}>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>
                        "{p.text.slice(0,50)}..." — <span style={{color:"#EC4899"}}>{p.likes}</span> · <span style={{color:"#8B5CF6"}}>{p.comments}</span>
                      </span>
                    </div>)}
                  </div>;
                })}
              </div>}
              {biz.competitorData?.some(d=>d.error)&&<div style={{color:"#EF4444",fontSize:11,marginTop:4}}>
                {biz.competitorData.filter(d=>d.error).map((d,i)=><div key={i}>שגיאה ב-{d.name}: {d.error}</div>)}
              </div>}
              {biz.competitorLastScan&&<div style={{color:T.textDim,fontSize:9,marginTop:4}}>
                סריקה אחרונה: {new Date(biz.competitorLastScan).toLocaleString("he-IL")}
              </div>}
            </div>

            {/* Scan results */}
            {result&&!result.error&&<div style={{background:"#10B98108",border:"1px solid #10B98118",borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{color:"#10B981",fontWeight:600,fontSize:12}}>תוצאות סריקת AI {biz.fullScanData?"(סריקה מקיפה)":""}</div>
                {biz.lastFullScan&&<div style={{color:T.textDim,fontSize:9}}>סריקה: {new Date(biz.lastFullScan).toLocaleString("he-IL")}</div>}
              </div>
              <div className="two-col-grid" style={{display:"grid",gap:10,marginBottom:10}}>
                <div><span style={{color:T.textMuted,fontSize:11}}>טון: </span><span style={{color:T.text,fontSize:12}}>{result.tone}</span></div>
                <div><span style={{color:T.textMuted,fontSize:11}}>קהל יעד: </span><span style={{color:T.text,fontSize:12}}>{result.audience}</span></div>
                {result.bestPlatform&&<div><span style={{color:T.textMuted,fontSize:11}}>פלטפורמה מומלצת: </span><span style={{color:T.text,fontSize:12}}>{result.bestPlatform}</span></div>}
                {result.postFrequency&&<div><span style={{color:T.textMuted,fontSize:11}}>תדירות: </span><span style={{color:T.text,fontSize:12}}>{result.postFrequency}</span></div>}
              </div>
              {result.strengths?.length>0&&<div style={{marginBottom:8}}>
                <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>יתרונות:</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{result.strengths.map((s,i)=><Tag key={i} label={s} color="#10B981"/>)}</div>
              </div>}
              {result.contentIdeas?.length>0&&<div style={{marginBottom:8}}>
                <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>רעיונות לתוכן:</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{result.contentIdeas.map((s,i)=><Tag key={i} label={s} color="#8B5CF6"/>)}</div>
              </div>}
              {result.topThemes?.length>0&&<div style={{marginBottom:8}}>
                <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>נושאים חמים:</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{result.topThemes.map((t,i)=><Tag key={i} label={t} color="#06B6D4"/>)}</div>
              </div>}
              {result.bestHooks?.length>0&&<div style={{marginBottom:8}}>
                <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>Hooks שעובדים:</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{result.bestHooks.map((h,i)=><Tag key={i} label={h} color="#EC4899"/>)}</div>
              </div>}
              {result.gaps?.length>0&&<div style={{marginBottom:8}}>
                <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>פערים — הזדמנויות:</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{result.gaps.map((g,i)=><Tag key={i} label={g} color="#F59E0B"/>)}</div>
              </div>}
              {result.competitorInsights&&<div style={{background:T.inputBg,borderRadius:8,padding:10,marginBottom:8}}>
                <div style={{color:T.textMuted,fontSize:10,marginBottom:4}}>תובנות מתחרים:</div>
                <div style={{color:T.textSec,fontSize:12,direction:"rtl",lineHeight:1.5}}>{result.competitorInsights}</div>
              </div>}
              {result.recommendation&&<div style={{background:"#8B5CF608",border:"1px solid #8B5CF618",borderRadius:8,padding:10}}>
                <div style={{color:"#8B5CF6",fontSize:12,fontWeight:600,direction:"rtl"}}>{result.recommendation}</div>
              </div>}
            </div>}
            {result?.error&&<div style={{color:"#EF4444",fontSize:12,padding:10,background:"#EF444408",borderRadius:10,marginBottom:14}}>{result.error}</div>}

            {/* Remove */}
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <Btn sm onClick={()=>removeBiz(biz.id)} bg="#EF444410" color="#EF4444">מחק עסק</Btn>
            </div>
          </div>}
        </Card>;
      })}
    </div>
    {businesses.length===0&&<Card><div style={{textAlign:"center",color:T.textDim,padding:30}}>הוסף את העסק הראשון שלך</div></Card>}
  </div>;
}

// PUBLISH
function Publish({ posts, businesses }) {
  const [publishing, setPublishing] = useState({});
  const [results, setResults] = useState({});
  const [selBizId, setSelBizId] = useState(businesses[0]?.id||"");
  const [boostModal, setBoostModal] = useState(null);
  const [boostForm, setBoostForm] = useState({ budget:5, duration:3, adAccountId:"" });
  const [boosting, setBoosting] = useState(false);
  const [boostResult, setBoostResult] = useState(null);
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
      const hashtags = (post.hashtags||[]).map(h=>h.startsWith("#")?h:`#${h}`).join(" ");
      const message = post.content + (hashtags ? "\n\n" + hashtags : "");

      if (platformId === "facebook") {
        const pageId = tokens.META_PAGE_ID;
        const accessToken = tokens.META_ACCESS_TOKEN;
        if (!pageId || !accessToken) throw new Error("חסר Page ID או Access Token");
        const r = await fetch(`https://graph.facebook.com/v25.0/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, access_token: accessToken })
        });
        const d = await r.json();
        if (d.id) {
          setResults(p=>({...p,[key]:{status:"ok",postId:d.id}}));
        } else {
          setResults(p=>({...p,[key]:{status:"error",msg: d.error?.message || "שגיאה בפרסום"}}));
        }
      } else if (platformId === "instagram") {
        const igUserId = tokens.META_IG_USER_ID;
        const accessToken = tokens.META_ACCESS_TOKEN;
        if (!igUserId || !accessToken) throw new Error("חסר IG User ID או Access Token");
        setResults(p=>({...p,[key]:{status:"error",msg:"אינסטגרם דורש תמונה — בקרוב"}}));
      } else {
        setResults(p=>({...p,[key]:{status:"error",msg:"פלטפורמה לא נתמכת עדיין"}}));
      }
    } catch (e) {
      setResults(p=>({...p,[key]:{status:"error",msg: e.message || "שגיאה"}}));
    }
    setPublishing(p=>({...p,[key]:false}));
  }

  async function handleBoost() {
    if (!boostModal || !boostForm.adAccountId) return;
    setBoosting(true);
    const biz = businesses.find(b=>b.name===boostModal.business);
    const accessToken = biz?.social?.facebook?.tokens?.META_ACCESS_TOKEN;
    const result = await boostPost(
      boostModal.fbPostId,
      accessToken,
      boostForm.adAccountId.startsWith("act_") ? boostForm.adAccountId : `act_${boostForm.adAccountId}`,
      boostForm.budget,
      boostForm.duration,
      { geo_locations: { countries: ["IL"] }, age_min: 18, age_max: 65 }
    );
    setBoostResult(result);
    setBoosting(false);
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="פרסם וקדם תוכן מאושר לרשתות של כל עסק">פרסום וקידום</SectionTitle>

    {/* Business selector */}
    <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
      {businesses.map(b=><button key={b.id} onClick={()=>setSelBizId(b.id)} style={{
        display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:12,cursor:"pointer",
        background:selBizId===b.id?b.color+"12":T.card,
        border:`1px solid ${selBizId===b.id?b.color:T.border}`,fontFamily:"inherit",
        color:selBizId===b.id?T.text:T.textMuted,fontWeight:selBizId===b.id?700:400,fontSize:13,transition:"all 0.2s",
        boxShadow: selBizId===b.id?`0 0 0 2px ${b.color}33`:"none"}}>
        <span style={{fontSize:18}}>{b.icon}</span>{b.name}
        {SOCIAL_PLATFORMS.filter(sp=>b.social?.[sp.id]?.connected).length>0&&
          <span style={{fontSize:9,color:"#10B981"}}>● מחובר</span>}
      </button>)}
    </div>

    {selBiz&&<>
      {/* Connected platforms */}
      <Card style={{marginBottom:16}}>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:10}}>רשתות מחוברות — {selBiz.icon} {selBiz.name}</div>
        {connectedPlatforms.length===0
          ? <div style={{color:T.textDim,fontSize:12,padding:10}}>
              אין רשתות מחוברות לעסק הזה. עבור ל<span style={{color:"#8B5CF6",fontWeight:600}}>עסקים</span> → לחץ על העסק → חבר רשתות.
            </div>
          : <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {connectedPlatforms.map(sp=><Tag key={sp.id} label={sp.icon+" "+sp.label+" ✓"} color={sp.color}/>)}
            </div>}
      </Card>

      {/* Posts to publish */}
      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1}}>
          פוסטים מאושרים — {selBiz.name} ({approved.length})
        </div>
        {approved.length===0
          ? <div style={{textAlign:"center",color:T.textDim,padding:30}}>אין פוסטים מאושרים ל-{selBiz.name} — אשר פוסטים בדף תוכן</div>
          : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {approved.map(post=>{
              const platMatch = PLATFORMS.find(p=>post.platform?.includes(p.label.split(" ")[0]));
              return <div key={post.id} style={{background:T.inputBg,borderRadius:12,padding:14,border:`1px solid ${T.borderLight}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                  <Tag label={post.platform} color={platMatch?.color||"#888"}/>
                  <Tag label={post.type||"פוסט"} color={T.textMuted}/>
                  {post.pipeline?.done&&<Tag label="מדיה" color="#F59E0B"/>}
                  {post.ugc?.done&&<Tag label="UGC" color="#EC4899"/>}
                </div>
                <p style={{color:T.textSec,fontSize:12,margin:"0 0 10px",direction:"rtl",lineHeight:1.6,
                  maxHeight:60,overflow:"hidden"}}>{post.content}</p>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {connectedPlatforms.map(sp=>{
                    const key=`${post.id}_${sp.id}`;
                    const res=results[key];
                    return <Btn key={sp.id} sm disabled={publishing[key]}
                      bg={res?.status==="ok"?"#10B98115":res?.status==="error"?"#EF444410":T.card}
                      color={res?.status==="ok"?"#10B981":res?.status==="error"?"#EF4444":sp.color}
                      onClick={()=>publishPost(post,sp.id)}>
                      {publishing[key]?<Spinner size={10}/>:res?.status==="ok"?"פורסם":res?.status==="error"?"נכשל":`${sp.icon} פרסם`}
                    </Btn>;
                  })}
                  {/* Boost button */}
                  {connectedPlatforms.some(sp=>sp.id==="facebook") &&
                    Object.entries(results).some(([k,v])=>k.startsWith(post.id+"_facebook")&&v?.status==="ok") &&
                    <Btn sm grad="linear-gradient(135deg,#F59E0B,#EF4444)"
                      onClick={()=>{
                        const fbRes = results[`${post.id}_facebook`];
                        setBoostModal({...post, fbPostId: fbRes?.postId});
                        setBoostResult(null);
                      }}>
                      קדם
                    </Btn>
                  }
                  {connectedPlatforms.length===0&&<span style={{color:T.textDim,fontSize:11}}>חבר רשת בדף עסקים</span>}
                </div>
              </div>;
            })}
          </div>}
      </Card>

      {/* Boost modal */}
      {boostModal && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1000,
        display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
        onClick={()=>setBoostModal(null)}>
        <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,padding:24,
          maxWidth:420,width:"100%",boxShadow:T.shadowLg,direction:"rtl"}}>
          <h3 style={{margin:"0 0 16px",color:T.text,fontSize:18}}>קידום פוסט</h3>
          <p style={{color:T.textSec,fontSize:12,margin:"0 0 16px",lineHeight:1.6}}>
            {boostModal.content?.slice(0,80)}...
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
            <div>
              <label style={{color:T.textMuted,fontSize:11,display:"block",marginBottom:4}}>Ad Account ID</label>
              <input value={boostForm.adAccountId} onChange={e=>setBoostForm(p=>({...p,adAccountId:e.target.value}))}
                placeholder="act_123456789 או 123456789"
                style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,
                  padding:"9px 12px",color:T.text,fontSize:12,fontFamily:"monospace",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <label style={{color:T.textMuted,fontSize:11,display:"block",marginBottom:4}}>תקציב יומי ($)</label>
                <input type="number" value={boostForm.budget} onChange={e=>setBoostForm(p=>({...p,budget:+e.target.value}))}
                  style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,
                    padding:"9px 12px",color:T.text,fontSize:12,boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{color:T.textMuted,fontSize:11,display:"block",marginBottom:4}}>ימים</label>
                <input type="number" value={boostForm.duration} onChange={e=>setBoostForm(p=>({...p,duration:+e.target.value}))}
                  style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,
                    padding:"9px 12px",color:T.text,fontSize:12,boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{background:T.inputBg,borderRadius:10,padding:10}}>
              <div style={{color:T.textMuted,fontSize:11}}>טרגוט: ישראל, 18-65</div>
              <div style={{color:T.accent,fontSize:13,fontWeight:700,marginTop:4}}>
                סה"כ: ${boostForm.budget * boostForm.duration}
              </div>
            </div>
          </div>
          {boostResult && (
            boostResult.success
              ? <div style={{background:"#10B98108",border:"1px solid #10B98118",borderRadius:10,padding:12,marginBottom:12}}>
                  <span style={{color:"#10B981",fontWeight:600,fontSize:13}}>הקמפיין נוצר בסטטוס PAUSED</span>
                  <div style={{color:T.textMuted,fontSize:11,marginTop:4}}>הפעל אותו מ-Facebook Ads Manager</div>
                </div>
              : <div style={{background:"#EF444408",borderRadius:10,padding:12,marginBottom:12,color:"#EF4444",fontSize:12}}>
                  {boostResult.error}
                </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <Btn grad="linear-gradient(135deg,#F59E0B,#EF4444)" disabled={boosting||!boostForm.adAccountId}
              onClick={handleBoost}>
              {boosting?<><Spinner size={12}/>יוצר קמפיין...</>:"צור קמפיין קידום"}
            </Btn>
            <Btn bg={T.inputBg} color={T.textMuted} onClick={()=>setBoostModal(null)}>ביטול</Btn>
          </div>
        </div>
      </div>}
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
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:10}}>ימי פרסום</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {DAYS.map((d,i)=><button key={d} onClick={()=>setDays(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])} style={{
            width:42,height:42,background:days.includes(i)?"#8B5CF610":T.inputBg,
            border:`1px solid ${days.includes(i)?"#8B5CF6":T.inputBorder}`,
            color:days.includes(i)?"#8B5CF6":T.textMuted,borderRadius:10,
            cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>{d}</button>)}
        </div>
      </div>
      <div>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:10}}>שעה</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["12:00","18:00","20:00","21:00"].map(t=><button key={t} onClick={()=>setTime(t)} style={{
            background:time===t?"#8B5CF610":T.inputBg,border:`1px solid ${time===t?"#8B5CF6":T.inputBorder}`,
            color:time===t?"#8B5CF6":T.textMuted,borderRadius:10,padding:"7px 16px",
            cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>{t}</button>)}
        </div>
      </div>
    </Card>
    {approved.length===0
      ? <Card><div style={{textAlign:"center",color:T.textDim,padding:30}}>אשר פוסטים בעמוד תוכן</div></Card>
      : <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {approved.map(post=>{
            const pl=PLATFORMS.find(p=>post.platform.includes(p.label.split(" ")[0]))||PLATFORMS[0];
            return <Card key={post.id} style={{display:"flex",alignItems:"center",gap:12,padding:14,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                  <Tag label={post.platform} color={pl.color}/>
                  <Tag label={post.business} color={T.textMuted}/>
                  {post.pipeline?.done&&<Tag label="מדיה" color="#F59E0B"/>}
                  {post.ugc?.done&&<Tag label="UGC" color="#EC4899"/>}
                </div>
                <p style={{color:T.textSec,fontSize:12,margin:0,direction:"rtl",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.content.split("\n")[0]}</p>
              </div>
              <Btn sm grad="linear-gradient(135deg,#10B981,#3B82F6)">פרסם</Btn>
            </Card>;
          })}
        </div>
    }
  </div>;
}

// ANALYTICS — REAL DATA FROM META
function Analytics({ posts, businesses, analyticsData, setAnalyticsData }) {
  const [loading, setLoading] = useState(false);
  const [selBizId, setSelBizId] = useState(businesses?.[0]?.id||"");
  const [aiInsight, setAiInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const selBiz = businesses?.find(b=>b.id===selBizId);

  const bizData = analyticsData?.[selBizId] || {};
  const done = posts.filter(p=>p.pipeline?.done||p.ugc?.done).length;

  async function fetchAnalytics() {
    if (!selBiz) return;
    const fbTokens = selBiz.social?.facebook?.tokens;
    if (!fbTokens?.META_PAGE_ID || !fbTokens?.META_ACCESS_TOKEN) return;
    setLoading(true);
    try {
      const [insights, pagePosts] = await Promise.all([
        fetchPageInsights(fbTokens.META_PAGE_ID, fbTokens.META_ACCESS_TOKEN),
        fetchPagePosts(fbTokens.META_PAGE_ID, fbTokens.META_ACCESS_TOKEN, 20)
      ]);

      const topPosts = [...pagePosts].sort((a,b)=>(b.likes+b.comments+b.shares)-(a.likes+a.comments+a.shares));
      const totalLikes = pagePosts.reduce((s,p)=>s+p.likes,0);
      const totalComments = pagePosts.reduce((s,p)=>s+p.comments,0);
      const totalShares = pagePosts.reduce((s,p)=>s+p.shares,0);
      const avgEngagement = pagePosts.length > 0 ? ((totalLikes+totalComments+totalShares)/pagePosts.length).toFixed(1) : 0;

      const data = {
        insights: insights.error ? null : insights,
        posts: pagePosts,
        topPosts,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagement,
        lastFetch: new Date().toISOString()
      };

      setAnalyticsData(prev=>({...prev, [selBizId]: data}));
      localStorage.setItem("analytics_data", JSON.stringify({...analyticsData, [selBizId]: data}));
    } catch(e) {
      console.error("Analytics fetch error:", e);
    }
    setLoading(false);
  }

  async function generateInsight() {
    if (!bizData.posts?.length) return;
    setInsightLoading(true);
    try {
      const topContent = bizData.topPosts?.slice(0,5).map(p=>
        `"${p.message?.slice(0,80)}" — ${p.likes} לייקים, ${p.comments} תגובות, ${p.shares} שיתופים`
      ).join("\n");
      const raw = await claudeCall(`אתה מנתח שיווק דיגיטלי מומחה. נתח את הביצועים של דף הפייסבוק "${selBiz?.name}":

פוסטים מובילים:
${topContent}

ממוצע אינטראקציות לפוסט: ${bizData.avgEngagement}
סה"כ: ${bizData.totalLikes} לייקים, ${bizData.totalComments} תגובות, ${bizData.totalShares} שיתופים

נתח:
1. מה הנושאים/סגנונות שמביאים הכי הרבה אינטראקציות?
2. מה השעה/יום הכי טוב לפרסם?
3. 3 המלצות קונקרטיות לשיפור התוכן.
4. איזה סוג CTA עובד הכי טוב?

כתוב בעברית, קצר וממוקד. עד 200 מילים.`, 500);
      setAiInsight(raw);
    } catch(e) { setAiInsight("שגיאה: " + e.message); }
    setInsightLoading(false);
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="ביצועים אמיתיים מ-Meta + תובנות AI">ניתוח ביצועים</SectionTitle>

    {/* Business selector */}
    <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
      {businesses?.map(b=><button key={b.id} onClick={()=>setSelBizId(b.id)} style={{
        display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:12,cursor:"pointer",
        background:selBizId===b.id?b.color+"12":T.card,
        border:`1px solid ${selBizId===b.id?b.color:T.border}`,fontFamily:"inherit",
        color:selBizId===b.id?T.text:T.textMuted,fontWeight:selBizId===b.id?700:400,fontSize:13,transition:"all 0.2s"}}>
        <span style={{fontSize:18}}>{b.icon}</span>{b.name}
      </button>)}
      <Btn sm grad="linear-gradient(135deg,#8B5CF6,#3B82F6)" disabled={loading} onClick={fetchAnalytics}>
        {loading?<><Spinner size={12}/>טוען...</>:"עדכן נתונים"}
      </Btn>
    </div>

    {/* Stats */}
    <div className="stats-grid-3" style={{display:"grid",gap:14,marginBottom:24}}>
      {[
        ["סה\"כ לייקים", bizData.totalLikes||0, "#EC4899"],
        ["סה\"כ תגובות", bizData.totalComments||0, "#8B5CF6"],
        ["סה\"כ שיתופים", bizData.totalShares||0, "#3B82F6"],
        ["ממוצע אינטראקציות", bizData.avgEngagement||0, "#10B981"],
        ["פוסטים שנבדקו", bizData.posts?.length||0, "#F59E0B"],
        ["מדיה הופקה", done, "#06B6D4"],
      ].map(([l,v,c])=><Card key={l} style={{textAlign:"center",padding:16}}>
        <div style={{fontSize:28,fontWeight:700,color:c}}>{v}</div>
        <div style={{color:T.textMuted,fontSize:12,marginTop:4}}>{l}</div>
      </Card>)}
    </div>

    {/* Top posts */}
    {bizData.topPosts?.length > 0 && <Card style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>פוסטים מובילים</div>
        <Btn sm grad="linear-gradient(135deg,#10B981,#06B6D4)" disabled={insightLoading} onClick={generateInsight}>
          {insightLoading?<><Spinner size={12}/>מנתח...</>:"תובנות AI"}
        </Btn>
      </div>
      {bizData.topPosts.slice(0,5).map((p,i)=><div key={p.id||i} style={{display:"flex",alignItems:"center",gap:12,
        padding:"10px 0",borderBottom:i<4?`1px solid ${T.borderLight}`:"none"}}>
        <div style={{width:28,height:28,borderRadius:8,background:["#F59E0B","#8B5CF6","#EC4899","#10B981","#3B82F6"][i]+"15",
          display:"flex",alignItems:"center",justifyContent:"center",color:["#F59E0B","#8B5CF6","#EC4899","#10B981","#3B82F6"][i],
          fontWeight:700,fontSize:12,flexShrink:0}}>
          {i+1}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:T.text,fontSize:12,direction:"rtl",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {p.message?.slice(0,60) || "(ללא טקסט)"}
          </div>
        </div>
        <div style={{display:"flex",gap:10,flexShrink:0}}>
          <span style={{color:"#EC4899",fontSize:11,fontWeight:600}}>{p.likes}</span>
          <span style={{color:"#8B5CF6",fontSize:11,fontWeight:600}}>{p.comments}</span>
          <span style={{color:"#3B82F6",fontSize:11,fontWeight:600}}>{p.shares}</span>
        </div>
      </div>)}
      <div style={{display:"flex",gap:12,marginTop:8}}>
        <span style={{color:"#EC4899",fontSize:10}}>● לייקים</span>
        <span style={{color:"#8B5CF6",fontSize:10}}>● תגובות</span>
        <span style={{color:"#3B82F6",fontSize:10}}>● שיתופים</span>
      </div>
    </Card>}

    {/* AI Insight */}
    {aiInsight && <Card style={{marginBottom:20}}>
      <div style={{color:"#10B981",fontWeight:600,fontSize:13,marginBottom:10}}>תובנות AI</div>
      <p style={{color:T.textSec,fontSize:13,margin:0,lineHeight:1.8,direction:"rtl",whiteSpace:"pre-wrap"}}>{aiInsight}</p>
    </Card>}

    {/* Fallback static insights */}
    {!bizData.posts?.length && <Card>
      <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:14}}>תובנות (לחץ "עדכן נתונים" לנתונים אמיתיים)</div>
      {[["יום הכי טוב","יום ג׳","#8B5CF6"],
        ["שעה מומלצת","20:00","#EC4899"],
        ["סוג תוכן מוביל","סרטוני UGC","#10B981"]]
        .map(([label,val,color])=><div key={label} style={{display:"flex",
          justifyContent:"space-between",alignItems:"center",padding:"10px 14px",
          background:T.inputBg,borderRadius:10,marginBottom:8}}>
          <span style={{color:T.textSec,fontSize:12}}>{label}</span>
          <span style={{color,fontWeight:600,fontSize:13}}>{val}</span>
        </div>)}
    </Card>}

    {bizData.lastFetch && <div style={{color:T.textDim,fontSize:10,marginTop:8,textAlign:"center"}}>
      עודכן לאחרונה: {new Date(bizData.lastFetch).toLocaleString("he-IL")}
    </div>}
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
  { id:"APIFY_API_TOKEN",        label:"Apify API Token",       service:"סריקת מתחרים", color:"#00C853", hint:"apify_api_..." },
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>API KEYS</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {saved&&<span style={{color:"#10B981",fontSize:11}}>נשמר</span>}
          <Btn sm grad="linear-gradient(135deg,#10B981,#3B82F6)"
            onClick={()=>{
              const blob = new Blob([envFileContent],{type:"text/plain"});
              const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
              a.download=".env"; a.click();
            }}>ייצא .env</Btn>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {API_KEYS_CONFIG.map(k=>{
          const val = keys[k.id]||"";
          const result = testResults[k.id];
          return <div key={k.id} className="admin-key-row" style={{display:"grid",gap:8,alignItems:"center"}}>
            <div>
              <div style={{color:T.text,fontSize:12,fontWeight:600}}>{k.label}</div>
              <div style={{color:k.color,fontSize:10}}>{k.service}</div>
            </div>
            <div style={{position:"relative"}}>
              <input
                type={visible[k.id]?"text":"password"}
                value={val}
                placeholder={k.hint}
                onChange={e=>saveKeys({...keys,[k.id]:e.target.value})}
                style={{width:"100%",background:T.inputBg,border:`1px solid ${val?T.inputBorder:T.borderLight}`,
                  borderRadius:10,padding:"8px 32px 8px 10px",color:T.text,fontSize:12,
                  fontFamily:"monospace",boxSizing:"border-box"}}
              />
              <button onClick={()=>setVisible(p=>({...p,[k.id]:!p[k.id]}))}
                style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:12}}>
                {visible[k.id]?"🙈":"👁"}
              </button>
            </div>
            <Btn sm disabled={!val||testing[k.id]} onClick={()=>testKey(k.id)}
              bg={result==="ok"?"#10B98110":result?"#EF444410":T.inputBg}
              color={result==="ok"?"#10B981":result?"#EF4444":T.textMuted}>
              {testing[k.id]?<Spinner size={10}/>:result==="ok"?"✓":result?"✗":"בדוק"}
            </Btn>
            <div style={{width:8,height:8,borderRadius:"50%",
              background:val?(result==="ok"?"#10B981":result?"#EF4444":T.textMuted):T.border,
              flexShrink:0}}/>
          </div>;
        })}
      </div>
    </Card>

    {/* Users */}
    <Card style={{marginBottom:20}}>
      <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:16,letterSpacing:1}}>משתמשים</div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <input value={newUser.email} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))}
          placeholder="email@example.com" type="email"
          style={{flex:1,minWidth:180,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,
            padding:"8px 12px",color:T.text,fontSize:12,fontFamily:"inherit"}}/>
        <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}
          style={{background:T.inputBg,border:`1px solid ${T.inputBorder}`,color:T.textSec,
            borderRadius:10,padding:"8px 10px",fontSize:12,fontFamily:"inherit"}}>
          {["admin","editor","viewer"].map(r=><option key={r}>{r}</option>)}
        </select>
        <Btn sm grad="linear-gradient(135deg,#8B5CF6,#3B82F6)" onClick={inviteUser}>+ הזמן</Btn>
      </div>
      {loadingUsers
        ? <div style={{textAlign:"center",padding:20}}><Spinner/></div>
        : users.length===0
          ? <div style={{color:T.textDim,fontSize:12,textAlign:"center",padding:16}}>אין משתמשים — הזמן את הראשון</div>
          : <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {users.map(u=>{
                const roleColor = u.role==="admin"?"#EC4899":u.role==="editor"?"#F59E0B":T.textMuted;
                return <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"10px 14px",background:T.inputBg,borderRadius:10}}>
                  <div style={{width:32,height:32,borderRadius:"50%",
                    background:roleColor+"15",border:`1px solid ${roleColor}33`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:roleColor,fontSize:13,fontWeight:700,flexShrink:0}}>
                    {(u.email||u.name||"?")[0].toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:T.text,fontSize:13}}>{u.email||u.name}</div>
                    <div style={{color:T.textDim,fontSize:11}}>{u.created_at ? new Date(u.created_at).toLocaleDateString("he-IL") : ""}</div>
                  </div>
                  <Tag label={u.role||"viewer"} color={roleColor}/>
                  {u.role!=="admin"&&
                    <Btn sm bg={T.inputBg} color={T.textMuted} onClick={()=>removeUser(u.id)}>✕</Btn>}
                </div>;
              })}
            </div>
      }
    </Card>

    {/* Env preview */}
    <Card>
      <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:12,letterSpacing:1}}>.env PREVIEW</div>
      <pre style={{background:T.inputBg,border:`1px solid ${T.borderLight}`,borderRadius:10,
        padding:14,fontSize:10,color:T.textDim,overflowX:"auto",margin:0,lineHeight:1.8}}>
        {API_KEYS_CONFIG.map(k=>
          `${k.id}=${keys[k.id] ? (visible["all"] ? keys[k.id] : "•".repeat(Math.min(keys[k.id].length,20))) : ""}`
        ).join("\n")}
      </pre>
      <div style={{marginTop:10}}>
        <Btn sm onClick={()=>setVisible(p=>({...p,all:!p.all}))} bg={T.inputBg} color={T.textMuted}>
          {visible.all?"הסתר":"הצג הכל"}
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
  const [analyticsData, setAnalyticsData] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("analytics_data")||"{}"); } catch { return {}; }
  });
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(()=>{ localStorage.setItem("businesses",JSON.stringify(businesses)); },[businesses]);

  const running = posts.filter(p=>(p.pipeline&&!p.pipeline.done)||(p.ugc&&!p.ugc.done)).length;
  const published = posts.filter(p=>p.pipeline?.done||p.ugc?.done).length;

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,
      fontFamily:"'IBM Plex Sans Hebrew','Assistant',sans-serif",
      direction:"rtl",color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@300;400;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        textarea, input, select { outline: none; }

        /* Responsive layout */
        .stats-grid { grid-template-columns: repeat(5, 1fr); }
        .stats-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .two-col-grid { grid-template-columns: 1fr 1fr; }
        .avatar-grid { grid-template-columns: repeat(3, 1fr); }
        .admin-key-row { grid-template-columns: 180px 1fr auto auto; }
        .desktop-sidebar { display: flex; }
        .mobile-bottom-nav { display: none; }
        .mobile-menu-btn { display: none; }

        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .stats-grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
          .two-col-grid { grid-template-columns: 1fr !important; }
          .avatar-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .admin-key-row { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-bottom-nav { display: flex !important; }
          .mobile-menu-btn { display: flex !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stats-grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .avatar-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* SIDEBAR — Desktop */}
      <div className="desktop-sidebar" style={{width:220,background:T.sidebar,borderLeft:`1px solid ${T.border}`,
        flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0,boxShadow:"2px 0 8px rgba(0,0,0,0.03)"}}>
        {/* Logo */}
        <div style={{padding:"18px 16px",borderBottom:`1px solid ${T.borderLight}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,
              background:"linear-gradient(135deg,#EC4899,#8B5CF6,#F59E0B)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff"}}>⚡</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,lineHeight:1.2,color:T.text}}>AI Marketing</div>
              <div style={{color:T.textDim,fontSize:10}}>Platform</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:"12px 8px",overflowY:"auto"}}>
          {NAV_ITEMS.map(item=><button key={item.id} onClick={()=>setPage(item.id)} style={{
            width:"100%",display:"flex",alignItems:"center",gap:10,
            background:page===item.id?T.accent+"10":"transparent",
            border:`1px solid ${page===item.id?T.accent+"22":"transparent"}`,
            borderRadius:10,padding:"10px 12px",cursor:"pointer",
            color:page===item.id?T.accent:T.textMuted,fontWeight:page===item.id?600:400,
            fontSize:13,fontFamily:"inherit",marginBottom:2,transition:"all 0.15s",
            textAlign:"right",justifyContent:"flex-start"
          }}>
            <span style={{fontSize:15}}>{item.icon}</span>
            {item.label}
          </button>)}
        </nav>

        {/* Status */}
        <div style={{padding:"12px 12px",borderTop:`1px solid ${T.borderLight}`}}>
          {running>0&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <span style={{color:"#8B5CF6",fontSize:10,animation:"pulse 1.5s infinite"}}>●</span>
            <span style={{color:"#8B5CF6",fontSize:11}}>{running} פועל</span>
          </div>}
          {published>0&&<div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:"#10B981",fontSize:10}}>●</span>
            <span style={{color:"#10B981",fontSize:11}}>{published} פורסם</span>
          </div>}
          {!running&&!published&&<div style={{color:T.textDim,fontSize:11}}>מוכן</div>}
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,overflowY:"auto",maxHeight:"100vh",paddingBottom:70}}>
        {/* Top bar */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.borderLight}`,
          background:T.topbar,position:"sticky",top:0,zIndex:50,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* Mobile menu toggle */}
            <button className="mobile-menu-btn" onClick={()=>setMobileNav(!mobileNav)}
              style={{display:"none",alignItems:"center",justifyContent:"center",
                width:36,height:36,borderRadius:10,border:`1px solid ${T.border}`,
                background:T.card,cursor:"pointer",fontSize:18}}>
              ☰
            </button>
            <div style={{color:T.text,fontWeight:700,fontSize:16}}>
              {NAV_ITEMS.find(n=>n.id===page)?.icon} {NAV_ITEMS.find(n=>n.id===page)?.label}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{background:"#10B98110",border:"1px solid #10B98122",
              color:"#10B981",borderRadius:10,padding:"5px 12px",fontSize:11,fontWeight:600}}>
              {posts.filter(p=>p.approved).length} מאושרים
            </div>
            <div style={{background:"#EC489910",border:"1px solid #EC489922",
              color:"#EC4899",borderRadius:10,padding:"5px 12px",fontSize:11,fontWeight:600}}>
              {posts.length} פוסטים
            </div>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNav && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:100}}
          onClick={()=>setMobileNav(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"0 0 0 20px",
            padding:16,maxWidth:260,marginRight:0,marginLeft:"auto",boxShadow:T.shadowLg,
            maxHeight:"80vh",overflowY:"auto"}}>
            {NAV_ITEMS.map(item=><button key={item.id} onClick={()=>{setPage(item.id);setMobileNav(false);}} style={{
              width:"100%",display:"flex",alignItems:"center",gap:10,
              background:page===item.id?T.accent+"10":"transparent",
              border:"none",borderRadius:10,padding:"12px 14px",cursor:"pointer",
              color:page===item.id?T.accent:T.textSec,fontWeight:page===item.id?600:400,
              fontSize:14,fontFamily:"inherit",marginBottom:2}}>
              <span style={{fontSize:17}}>{item.icon}</span>
              {item.label}
            </button>)}
          </div>
        </div>}

        <div style={{padding:"20px",maxWidth:920,margin:"0 auto"}}>
          {page==="dashboard"&&<Dashboard posts={posts} sources={sources} businesses={businesses}/>}
          {page==="businesses"&&<Businesses businesses={businesses} setBusinesses={setBusinesses} posts={posts}/>}
          {page==="sources"&&<Sources sources={sources} setSources={setSources}/>}
          {page==="content"&&<Content posts={posts} setPosts={setPosts} sources={sources} businesses={businesses} analyticsData={analyticsData}/>}
          {page==="media"&&<MediaAI/>}
          {page==="ugc"&&<UGCStudio/>}
          {page==="publish"&&<Publish posts={posts} businesses={businesses}/>}
          {page==="schedule"&&<Schedule posts={posts}/>}
          {page==="analytics"&&<Analytics posts={posts} businesses={businesses} analyticsData={analyticsData} setAnalyticsData={setAnalyticsData}/>}
          {page==="admin"&&<Admin/>}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,
        background:T.card,borderTop:`1px solid ${T.border}`,zIndex:100,
        justifyContent:"space-around",padding:"6px 4px",boxShadow:"0 -2px 10px rgba(0,0,0,0.06)"}}>
        {NAV_ITEMS.slice(0,5).map(item=><button key={item.id} onClick={()=>setPage(item.id)} style={{
          display:"flex",flexDirection:"column",alignItems:"center",gap:2,
          background:"transparent",border:"none",cursor:"pointer",padding:"4px 8px",
          color:page===item.id?T.accent:T.textDim,fontFamily:"inherit",minWidth:0}}>
          <span style={{fontSize:18}}>{item.icon}</span>
          <span style={{fontSize:9,fontWeight:page===item.id?700:400}}>{item.label}</span>
        </button>)}
        <button onClick={()=>setMobileNav(true)} style={{
          display:"flex",flexDirection:"column",alignItems:"center",gap:2,
          background:"transparent",border:"none",cursor:"pointer",padding:"4px 8px",
          color:T.textDim,fontFamily:"inherit"}}>
          <span style={{fontSize:18}}>⋯</span>
          <span style={{fontSize:9}}>עוד</span>
        </button>
      </div>
    </div>
  );
}
