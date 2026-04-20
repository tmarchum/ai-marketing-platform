import { useState, useRef, useEffect, useCallback } from "react";
import { supabase, authFetch } from "./lib/supabase";

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
const SOURCES_INIT = [
  { id:1, name:"הקולנוע הנודד", url:"wanderingcinema.co.il", type:"url", role:"עסק" },
  { id:2, name:"צייד טיסות", url:"flighthunter.co.il", type:"url", role:"עסק" },
  { id:3, name:"מתחרה", url:"competitor.co.il", type:"competitor", role:"מתחרה" },
];
const SAMPLE_POSTS = [
  { id:1, business:"הקולנוע הנודד", platform:"פייסבוק", type:"פוסט קצר",
    content:"🎬 ערב קולנוע תחת כיפת השמיים!\n\nהקולנוע הנודד מגיע לאירוע שלכם – חתונות, גיבוש, ערבים פרטיים.\nהצעת מחיר לאירועי קיץ ⬇️",
    hashtags:["קולנוע","אירועים","כיפת_השמיים"], date:"ב׳ 01.04 · 20:00", approved:false, media:null, pipeline:null },
  { id:2, business:"צייד טיסות", platform:"אינסטגרם", type:"סטורי",
    content:"✈️ טסים בקרוב?\n\nה-AI שלנו סורק מאות מחירים ומוצא לכם את הטיסה הכי זולה לפני כולם.\nצייד טיסות 🎯",
    hashtags:["טיסות","חיסכון","צייד_טיסות"], date:"ג׳ 02.04 · 20:00", approved:false, media:null, pipeline:null },
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
  { id:"linkedin",  label:"לינקדאין",  icon:"💼", color:"#0A66C2", fields:[
    { key:"LINKEDIN_ACCESS_TOKEN", label:"Access Token", hint:"AQV..." },
    { key:"LINKEDIN_AUTHOR_URN",   label:"Author URN",   hint:"urn:li:organization:1234 / urn:li:person:abc" }
  ]},
];

const NAV_ITEMS = [
  { id:"dashboard", icon:"📊", label:"דשבורד" },
  { id:"businesses",icon:"🏪", label:"עסקים" },
  { id:"sources",   icon:"🌐", label:"מקורות" },
  { id:"content",   icon:"✍️", label:"תוכן" },
  { id:"media",     icon:"🖼️", label:"מדיה AI" },
  { id:"agents",    icon:"🤖", label:"סוכנים" },
  { id:"publish",   icon:"📡", label:"פרסום" },
  { id:"schedule",  icon:"📅", label:"תזמון" },
  { id:"analytics", icon:"📈", label:"ניתוח" },
  { id:"admin",     icon:"⚙️", label:"ניהול" },
  { id:"superadmin",icon:"👑", label:"ניהול פלטפורמה", adminOnly:true },
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
function Card({ children, accent, style={}, onClick }) {
  return <div onClick={onClick} style={{ background:T.card,
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
// URL SHORTENER
// ═══════════════════════════════════════════════════════════════════
async function shortenUrl(url, businessId) {
  if (!url) return "";
  try {
    const r = await authFetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, business_id: businessId }),
    });
    const d = await r.json();
    return d.shortUrl || url;
  } catch { return url; }
}

// ═══════════════════════════════════════════════════════════════════
// CLAUDE API
// ═══════════════════════════════════════════════════════════════════
async function claudeCall(prompt, maxTokens=800) {
  try {
    const r = await authFetch("/api/content/claude", {
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
// POST METRICS — TRACK LIKES/COMMENTS OVER TIME
// ═══════════════════════════════════════════════════════════════════
async function fetchPostMetrics(posts, businesses) {
  const today = new Date().toISOString().split("T")[0];
  const metricsHistory = JSON.parse(localStorage.getItem("post_metrics")||"{}");
  const results = [];
  let permissionError = false;
  const pageMetrics = {};

  // Step 1: For each business with FB tokens, use the new fb-metrics endpoint
  const seenPages = new Set();
  for (const biz of businesses) {
    const pageId = biz.social?.facebook?.tokens?.META_PAGE_ID;
    const accessToken = biz.social?.facebook?.tokens?.META_ACCESS_TOKEN;
    if (!pageId || !accessToken || seenPages.has(pageId)) continue;
    seenPages.add(pageId);
    try {
      const r = await authFetch(`/api/fb-metrics/${pageId}?token=${accessToken}`);
      const d = await r.json();
      if (d.page) {
        pageMetrics[biz.name] = {
          fans: d.page.fans,
          followers: d.page.followers,
          totalPosts: d.totalPosts,
          engagementAvailable: d.engagementAvailable,
          posts: d.posts || [],
        };
      }
      if (!d.engagementAvailable) permissionError = true;
    } catch {}
  }

  // Step 2: Show ALL published posts from Facebook per business (not just matched)
  const matchedFbIds = new Set();
  for (const post of posts) {
    if (!post.fbPostId || !post.published) continue;
    matchedFbIds.add(post.fbPostId);
    const bizMetrics = pageMetrics[post.business];
    const fbPost = bizMetrics?.posts?.find(p => p.id === post.fbPostId);

    const metrics = fbPost && bizMetrics?.engagementAvailable
      ? { likes: fbPost.likes || 0, comments: fbPost.comments || 0, shares: fbPost.shares || 0, date: today, needsPermission: false,
          created_time: fbPost.created_time, permalink_url: fbPost.permalink_url, full_picture: fbPost.full_picture, status_type: fbPost.status_type }
      : { likes: null, comments: null, shares: null, date: today, needsPermission: true,
          created_time: fbPost?.created_time, permalink_url: fbPost?.permalink_url, full_picture: fbPost?.full_picture, status_type: fbPost?.status_type,
          pageFans: bizMetrics?.fans, pageFollowers: bizMetrics?.followers, totalPosts: bizMetrics?.totalPosts };

    if (!metricsHistory[post.fbPostId]) metricsHistory[post.fbPostId] = [];
    const todayIdx = metricsHistory[post.fbPostId].findIndex(m => m.date === today);
    if (todayIdx >= 0) metricsHistory[post.fbPostId][todayIdx] = metrics;
    else metricsHistory[post.fbPostId].push(metrics);

    results.push({ postId: post.fbPostId, business: post.business, ...metrics, source: "platform" });
  }
  // Also add FB posts not in our system
  for (const [bizName, pm] of Object.entries(pageMetrics)) {
    for (const fp of (pm.posts || [])) {
      if (matchedFbIds.has(fp.id)) continue;
      results.push({
        postId: fp.id, business: bizName, date: today, source: "facebook",
        likes: fp.likes ?? null, comments: fp.comments ?? null, shares: fp.shares ?? null,
        needsPermission: !pm.engagementAvailable,
        created_time: fp.created_time, permalink_url: fp.permalink_url, full_picture: fp.full_picture,
        status_type: fp.status_type, message: fp.message,
      });
    }
  }

  localStorage.setItem("post_metrics", JSON.stringify(metricsHistory));
  return { results, permissionError, pageMetrics };
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
    if (d.error) {
      // Fallback: try without engagement fields
      const r2 = await fetch(
        `https://graph.facebook.com/v25.0/${postId}?fields=message,created_time&access_token=${accessToken}`
      );
      const d2 = await r2.json();
      if (d2.error) return null;
      return {
        id: d2.id, message: d2.message || "", created: d2.created_time,
        likes: null, comments: null, shares: null, needsPermission: true
      };
    }
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
    // Try with engagement fields first
    let r = await fetch(
      `https://graph.facebook.com/v25.0/${pageId}/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares&limit=${limit}&access_token=${accessToken}`
    );
    let d = await r.json();
    if (d.error) {
      // Fallback: fetch posts without engagement fields (works with Standard Access)
      r = await fetch(
        `https://graph.facebook.com/v25.0/${pageId}/posts?fields=message,created_time&limit=${limit}&access_token=${accessToken}`
      );
      d = await r.json();
      if (d.error) return [];
      return (d.data||[]).map(p=>({
        id: p.id,
        message: p.message || "",
        created: p.created_time,
        likes: null, comments: null, shares: null,
        needsPermission: true
      }));
    }
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

// Scrape a competitor's Facebook page (used by Businesses page)
async function scrapeCompetitorPage(url) {
  // If it's a Facebook URL, use the FB scraper
  if (url.includes("facebook.com")) {
    return await scrapeFacebookPage(url);
  }
  // Otherwise scrape the website for content
  const text = await scrapeWebsite(url);
  // Return as array of post-like objects
  return [{ text: text.slice(0, 500), likes: 0, comments: 0, shares: 0, date: "", url }];
}

// Analyze competitor data with AI
async function analyzeCompetitors(bizName, competitorData) {
  const summary = competitorData.map(c => {
    const topPosts = c.posts.sort((a,b) => (b.likes+b.comments) - (a.likes+a.comments)).slice(0, 3);
    return `${c.name} (${c.url}):\n${topPosts.map(p => `  - "${(p.text||"").slice(0,60)}..." → ${p.likes} לייקים, ${p.comments} תגובות`).join("\n")}`;
  }).join("\n\n");

  const raw = await claudeCall(`אתה מנתח שיווקי. נתח את המתחרים של "${bizName}":
${summary}

החזר JSON בלבד:
{"insights":"תובנה מרכזית","strengths":["יתרון1","יתרון2"],"weaknesses":["חולשה1","חולשה2"],"opportunities":["הזדמנות1","הזדמנות2"],"topContent":"סוג התוכן שעובד הכי טוב","recommendation":"המלצה אסטרטגית"}`, 800);

  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch {}
    return { insights: clean.slice(0, 200), strengths: [], weaknesses: [], opportunities: [], recommendation: "" };
  }
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
{"tone":"טון המותג","audience":"קהל יעד","strengths":["יתרון1","יתרון2","יתרון3"],"contentIdeas":["רעיון1","רעיון2","רעיון3","רעיון4"],"bestPlatform":"פלטפורמה מומלצת","postFrequency":"תדירות","competitorInsights":"תובנה מרכזית מהמתחרים","topThemes":["נושא1","נושא2","נושא3"],"bestHooks":["hook1","hook2"],"gaps":["פער1","פער2"],"recommendation":"המלצה אסטרטגית"}
חשוב: החזר JSON תקין בלבד, ללא טקסט נוסף.`, 1200);

  const clean = raw.replace(/```json|```/g,"").trim();
  try {
    results.analysis = JSON.parse(clean);
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { results.analysis = JSON.parse(jsonMatch[0]); } catch {
        results.analysis = { tone: "לא זמין", audience: "לא זמין", strengths: [], contentIdeas: [], recommendation: clean.slice(0, 200) };
      }
    } else {
      results.analysis = { tone: "לא זמין", audience: "לא זמין", strengths: [], contentIdeas: [], recommendation: clean.slice(0, 200) };
    }
  }
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
// MEDIA PIPELINE — REAL AI IMAGE GENERATION + PUBLISH
// ═══════════════════════════════════════════════════════════════════
const MEDIA_STAGES = [
  { id:"prompt",  label:"פרומפט",  icon:"🧠", color:"#8B5CF6" },
  { id:"image",   label:"תמונה/סרטון", icon:"🖼️", color:"#F59E0B" },
  { id:"publish", label:"Meta",    icon:"📡", color:"#1877F2" },
];
// Claude prompt enhancer — converts Hebrew post to detailed English prompt for Gemini/Veo
async function enhancePromptWithClaude(post, businesses, mediaType = "image") {
  const biz = (businesses || []).find(b => b.name === post.business) || {};
  const isVideo = mediaType === "video";
  const visualIdentity = biz.visual_identity ? `\n\nBRAND VISUAL IDENTITY (style guide — match this consistently):\n"""\n${biz.visual_identity}\n"""` : "";
  const instruction = `You are a visual director creating prompts for Google ${isVideo ? "Veo 3 video" : "Imagen / Gemini image"} generation.

Your job: read the Hebrew social media post below and produce a DETAILED English ${isVideo ? "video" : "image"} prompt that visually represents THE EXACT SPECIFIC SUBJECT described in the post — not a generic business photo.

CRITICAL RULES:
1. FIRST, identify the SINGLE MOST SPECIFIC concrete subject/product/activity mentioned in the post (e.g. "interactive trivia quiz game station with colorful buttons", "chocolate cake slice with melting ganache", "live cooking demo with chef plating dish") — NOT generic "people at an event" or "business meeting".
2. The prompt MUST showcase that specific subject as the MAIN FOCAL POINT of the ${isVideo ? "video" : "image"}.
3. Do NOT substitute with a generic stock-photo scene of the business category.
4. Match the BRAND VISUAL IDENTITY below for style, palette, mood, and recurring motifs — so all media from this brand looks consistent.
5. Include: specific subject (most important), ${isVideo ? "camera movement, action, " : "composition, camera angle, "}lighting, color palette, mood, style, setting, small authentic details.
6. ${isVideo ? "Aspect: vertical 9:16 for mobile social media." : ""}
7. NO text, NO typography, NO logos, NO captions, NO subtitles, NO watermarks anywhere in the ${isVideo ? "video" : "image"}.
8. Keep under ${isVideo ? "140" : "120"} words. Output ONLY the final prompt text — no preamble, no labels.

Business context: ${biz.name || ""} — ${biz.description || biz.industry || ""}${visualIdentity}

Hebrew post:
"""
${post.content}
"""

Now write the ${isVideo ? "video" : "image"} prompt:`;

  let enhanced = post.content;
  try {
    const r = await authFetch("/api/content/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: instruction,
        maxTokens: 600,
      }),
    });
    const d = await r.json();
    enhanced = (d.text || "").trim() || post.content;
    // Always append a hard no-text constraint as insurance
    enhanced += " No text, no letters, no typography, no logos, no captions anywhere in the frame.";
  } catch {
    enhanced = post.content;
  }
  return enhanced;
}

// Generate image for an existing post using Gemini 2.5 Flash Image
// Pipeline: Claude enhances Hebrew post → English visual prompt → Gemini image
async function runGeminiImagePipeline(post, businesses, onUpdate) {
  const s = Object.fromEntries(MEDIA_STAGES.map(st=>[st.id,"pending"]));

  // STAGE 1: Enhance prompt with Claude
  s.prompt = "running";
  onUpdate({ stages:{...s}, current:"prompt", done:false });
  let enhancedPrompt;
  try {
    enhancedPrompt = await enhancePromptWithClaude(post, businesses, "image");
  } catch {
    enhancedPrompt = post.content;
  }
  s.prompt = "done";
  s.image = "running";
  onUpdate({ stages:{...s}, current:"image", done:false, enhancedPrompt });

  let imageBase64;
  try {
    const imgR = await authFetch("/api/gemini/image", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        prompt: enhancedPrompt
      })
    });
    if (!imgR.ok) {
      const errText = await imgR.text().catch(()=>"");
      throw new Error(`Gemini HTTP ${imgR.status}: ${errText.substring(0,100)}`);
    }
    const imgD = await imgR.json();
    if (imgD.error) throw new Error(imgD.error);
    imageBase64 = `data:${imgD.contentType};base64,${imgD.imageBase64}`;
  } catch(e) {
    s.image = "error";
    onUpdate({ stages:{...s}, current:null, done:false, error:`שגיאה ב-Gemini: ${e.message}` });
    return { error: e.message };
  }
  s.image = "done";

  // STOP — wait for user approval
  s.publish = "waiting";
  onUpdate({ stages:{...s}, current:null, done:false, imageUrl: imageBase64, readyToPublish:true });
  return { imageUrl: imageBase64 };
}

// Generate VIDEO for an existing post using Gemini Veo
async function runGeminiVideoPipeline(post, businesses, onUpdate, opts={}) {
  const s = Object.fromEntries(MEDIA_STAGES.map(st=>[st.id,"pending"]));

  // STAGE 1: Enhance prompt with Claude
  s.prompt = "running";
  onUpdate({ stages:{...s}, current:"prompt", done:false });
  let enhancedPrompt;
  try {
    enhancedPrompt = await enhancePromptWithClaude(post, businesses, "video");
  } catch {
    enhancedPrompt = post.content;
  }
  s.prompt = "done";
  s.image = "running";
  onUpdate({ stages:{...s}, current:"image", done:false, enhancedPrompt });

  try {
    // Start video generation
    const aspect = opts?.aspect || "9:16";
    const duration = opts?.duration || 8;
    const r = await authFetch("/api/gemini/video", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        prompt: enhancedPrompt,
        aspectRatio: aspect,
        durationSeconds: duration
      })
    });
    if (!r.ok) {
      const errText = await r.text().catch(()=>"");
      throw new Error(`Veo HTTP ${r.status}: ${errText.substring(0,100)}`);
    }
    const { operationName, error } = await r.json();
    if (error) throw new Error(error);

    // Poll for completion
    for (let i = 0; i < 60; i++) {
      await new Promise(r=>setTimeout(r, 3000));
      const poll = await authFetch(`/api/gemini/video/${encodeURIComponent(operationName)}`);
      const result = await poll.json();
      if (result.error) throw new Error(result.error);
      if (result.done) {
        const videoUrl = result.videoUrl;
        if (!videoUrl) throw new Error("No video URL returned");
        s.image = "done";
        s.publish = "waiting";
        onUpdate({ stages:{...s}, current:null, done:false, videoUrl, readyToPublish:true });
        return { videoUrl };
      }
    }
    throw new Error("Timeout — video generation took too long");
  } catch(e) {
    s.image = "error";
    onUpdate({ stages:{...s}, current:null, done:false, error:`שגיאה ב-Veo: ${e.message}` });
    return { error: e.message };
  }
}

// Publish media to Facebook — called only after user approves
// Compute next schedule slot for a business, skipping slots already taken by other scheduled posts
function computeNextScheduleSlot(biz, existingPosts) {
  if (!biz?.schedule?.enabled) return null;
  const days = biz.schedule.days || [];
  const times = biz.schedule.times || [];
  if (!days.length || !times.length) return null;
  const now = new Date();
  const takenSlots = new Set(
    (existingPosts||[])
      .filter(p => p.business === biz.name && p.scheduled_at && !p.published)
      .map(p => new Date(p.scheduled_at).toISOString())
  );
  // Look up to 60 days ahead for an available slot
  for (let d = 0; d < 60; d++) {
    const day = new Date(now); day.setDate(day.getDate() + d);
    if (!days.includes(day.getDay())) continue;
    for (const time of times) {
      const [h, m] = time.split(":").map(Number);
      const slot = new Date(day); slot.setHours(h, m, 0, 0);
      if (slot < now) continue; // skip past times today
      if (takenSlots.has(slot.toISOString())) continue;
      return slot.toISOString();
    }
  }
  return null;
}

async function publishMediaToFB(post, businesses, pipeline, onUpdate) {
  const s = { ...(pipeline.stages || {}), publish: "running" };
  onUpdate({ ...pipeline, stages:{...s}, current:"publish" });
  try {
    const biz = businesses.find(b=>b.name===post.business);
    const fbTokens = biz?.social?.facebook?.tokens;
    if (!fbTokens?.META_PAGE_ID || !fbTokens?.META_ACCESS_TOKEN) {
      s.publish = "done";
      onUpdate({ ...pipeline, stages:{...s}, current:null, done:true, readyToPublish:false });
      return { ok: true, postId: null };
    }
    const pageId = fbTokens.META_PAGE_ID;
    const accessToken = fbTokens.META_ACCESS_TOKEN;
    const hashtags = (post.hashtags||[]).map(h=>h.startsWith("#")?h:`#${h}`).join(" ");
    const message = post.content + (hashtags ? "\n\n" + hashtags : "");
    let mediaUrl = pipeline.videoUrl || pipeline.imageUrl;

    // If base64 data URL, upload to Supabase Storage first to get a real URL
    if (mediaUrl && mediaUrl.startsWith("data:")) {
      const upR = await authFetch("/api/upload/image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: mediaUrl, contentType: mediaUrl.match(/data:([^;]+)/)?.[1] || "image/png" })
      });
      const upD = await upR.json();
      if (upD.error) throw new Error(`העלאת תמונה: ${upD.error}`);
      mediaUrl = upD.url;
    }

    const isVideo = !!pipeline.videoUrl;
    const endpoint = isVideo
      ? `https://graph.facebook.com/v25.0/${pageId}/videos`
      : `https://graph.facebook.com/v25.0/${pageId}/photos`;

    // Facebook videos require file_url + description, photos require url + message
    const body = isVideo
      ? { file_url: mediaUrl, description: message, access_token: accessToken }
      : { url: mediaUrl, message, access_token: accessToken };

    const r = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    s.publish = "done";
    onUpdate({ ...pipeline, stages:{...s}, current:null, done:true, postId: d.post_id || d.id, readyToPublish:false });
    return { ok: true, postId: d.post_id || d.id };
  } catch(e) {
    s.publish = "error";
    onUpdate({ ...pipeline, stages:{...s}, current:null, done:false, error: `שגיאה בפרסום: ${e.message}`, readyToPublish:false });
    return { error: e.message };
  }
}

function PipelineBar({ stages, pipeline, compact }) {
  if (!pipeline) return null;
  if (compact) {
    const cur = stages.find(s=>s.id===pipeline.current);
    if (pipeline.error) return <Tag label={`שגיאה: ${String(pipeline.error).slice(0,40)}`} color="#EF4444"/>;
    const pubStage = pipeline.stages?.publish;
    if (pubStage==="done") return <Tag label="פורסם" color="#10B981"/>;
    if (pubStage==="waiting"||pipeline.readyToPublish) return <Tag label="ממתין לאישור" color="#F59E0B"/>;
    if (pipeline.done && !pipeline.readyToPublish) return <Tag label="פורסם" color="#10B981"/>;
    if (cur) return <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
      <Spinner size={10} color={cur.color}/><span style={{color:cur.color}}>{cur.label}</span>
    </span>;
    return null;
  }
  return <div style={{marginTop:14}}>
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
      {stages.map((s,i)=>{
        const st = pipeline.stages?.[s.id];
        const active = pipeline.current===s.id;
        return <div key={s.id} style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{ width:32,height:32,borderRadius:"50%",
            background: st==="done"?s.color+"20":st==="error"?"#EF444420":st==="waiting"?"#F59E0B20":active?s.color+"10":T.inputBg,
            border:`2px solid ${st==="done"?s.color:st==="error"?"#EF4444":st==="waiting"?"#F59E0B":active?s.color:T.border}`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
            boxShadow:active?`0 0 12px ${s.color}33`:"none",transition:"all 0.4s" }}>
            {st==="done"?"✓":st==="error"?"✗":st==="waiting"?"⏸":active?<Spinner size={12} color={s.color}/>:s.icon}
          </div>
          <div style={{fontSize:9,color:st==="done"||active?s.color:st==="error"?"#EF4444":st==="waiting"?"#F59E0B":T.textDim,fontWeight:active||st==="waiting"?700:400}}>{s.label}</div>
          {i<stages.length-1&&<div style={{width:10,height:2,background:st==="done"?s.color:T.border,marginLeft:4}}/>}
        </div>;
      })}
    </div>
    {pipeline.imageUrl&&<div style={{marginTop:10}}>
      <img src={pipeline.imageUrl} alt="AI generated" style={{width:120,height:120,borderRadius:10,objectFit:"cover",border:`1px solid ${T.border}`}}/>
    </div>}
    {pipeline.error&&<div style={{marginTop:8,padding:"8px 10px",background:"#EF444415",border:`1px solid #EF444440`,borderRadius:8,color:"#EF4444",fontSize:11,fontWeight:600,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>⚠️ {pipeline.error}</div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// POST CARD
// ═══════════════════════════════════════════════════════════════════
function PostCard({ post, onUpdate, onDelete, onRegenerate, compact, businesses, allPosts, postMetrics }) {
  const [exp, setExp] = useState(false);
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(post.content);
  const pl = PLATFORMS.find(p=>post.platform.includes(p.label.split(" ")[0]))||PLATFORMS[0];
  const metrics = postMetrics; // {likes, comments, shares} or null
  const biz = (businesses||[]).find(b=>b.name===post.business);
  const bizHasSchedule = !!biz?.schedule?.enabled && (biz.schedule?.days?.length>0) && (biz.schedule?.times?.length>0);

  const [mediaChoice, setMediaChoice] = useState(null);
  const [videoOpts, setVideoOpts] = useState(null); // {aspect, duration} or null
  const [scheduling, setScheduling] = useState(false);
  const [autoSchedulingNow, setAutoSchedulingNow] = useState(false);
  const [abLoading, setAbLoading] = useState(false);
  const [scheduleVal, setScheduleVal] = useState(() => {
    if (post.scheduled_at) {
      try { return new Date(post.scheduled_at).toISOString().slice(0,16); } catch { return ""; }
    }
    // Default: 1 hour from now
    const d = new Date(Date.now() + 60*60*1000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0,16);
  });

  // Auto-schedule effect: when media becomes ready and business has a schedule, auto-assign next slot
  useEffect(()=>{
    if (!post.pipeline?.readyToPublish) return;
    if (post.published || post.scheduled_at) return;
    if (!bizHasSchedule) return;
    if (autoSchedulingNow) return;
    const slotIso = computeNextScheduleSlot(biz, allPosts);
    if (!slotIso) return;
    (async()=>{
      setAutoSchedulingNow(true);
      try {
        const fields = { scheduled_at: slotIso };
        // Upload base64 media if needed
        const pipImg = post.pipeline?.imageUrl;
        const pipVid = post.pipeline?.videoUrl;
        if (pipImg && pipImg.startsWith("data:") && !post.image_url) {
          try {
            const upR = await authFetch("/api/upload/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64:pipImg, contentType: pipImg.match(/data:([^;]+)/)?.[1] || "image/png"})});
            const upD = await upR.json();
            if (upD.url) fields.image_url = upD.url;
          } catch {}
        } else if (pipImg && !pipImg.startsWith("data:") && !post.image_url) {
          fields.image_url = pipImg;
        }
        if (pipVid && !pipVid.startsWith("data:") && !post.video_url) {
          fields.video_url = pipVid;
        }
        onUpdate(p=>({...p, ...fields}));
        if (typeof post.id === 'string' && post.id.length > 20) {
          try { await authFetch(`/api/content/${post.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(fields)}); } catch {}
        }
      } finally { setAutoSchedulingNow(false); }
    })();
  }, [post.pipeline?.readyToPublish, post.id, bizHasSchedule]);

  async function savePostField(fields) {
    // Update local + persist to DB
    onUpdate(p => ({ ...p, ...fields }));
    if (typeof post.id === 'string' && post.id.length > 20) {
      try {
        await authFetch(`/api/content/${post.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields)
        });
      } catch {}
    }
  }

  async function saveSchedule() {
    if (!scheduleVal) return;
    const iso = new Date(scheduleVal).toISOString();
    const fields = { scheduled_at: iso };

    // If media is base64 in pipeline, upload to storage so the cron can publish it
    const pipelineImg = post.pipeline?.imageUrl;
    const pipelineVid = post.pipeline?.videoUrl;

    if (pipelineImg && pipelineImg.startsWith("data:") && !post.image_url) {
      try {
        const upR = await authFetch("/api/upload/image", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: pipelineImg, contentType: pipelineImg.match(/data:([^;]+)/)?.[1] || "image/png" })
        });
        const upD = await upR.json();
        if (upD.url) fields.image_url = upD.url;
      } catch (e) { alert("שגיאה בהעלאת תמונה: " + e.message); return; }
    }
    if (pipelineVid && !pipelineVid.startsWith("data:") && !post.video_url) {
      fields.video_url = pipelineVid;
    }
    if (pipelineImg && !pipelineImg.startsWith("data:") && !post.image_url) {
      fields.image_url = pipelineImg;
    }

    await savePostField(fields);
    setScheduling(false);
    alert("✅ הפוסט יתפרסם אוטומטית ב-" + new Date(iso).toLocaleString("he-IL"));
  }
  async function clearSchedule() {
    await savePostField({ scheduled_at: null });
    setScheduling(false);
  }
  async function startMedia(type, opts) {
    setMediaChoice(null);
    setVideoOpts(null);
    const init = { stages:Object.fromEntries(MEDIA_STAGES.map(s=>[s.id,"pending"])), current:null, done:false, mediaType:type, aspect: opts?.aspect, duration: opts?.duration };
    onUpdate({...post, pipeline:init});
    setExp(true);
    const mergeUpd = upd => onUpdate(p=>({...p, pipeline:{...upd, mediaType:type, aspect: opts?.aspect, duration: opts?.duration}}));
    if (type === "gemini-video") {
      await runGeminiVideoPipeline(post, businesses||[], mergeUpd, opts);
    } else {
      await runGeminiImagePipeline(post, businesses||[], mergeUpd);
    }
  }
  async function doPublish() {
    const result = await publishMediaToFB(post, businesses||[], post.pipeline, upd => onUpdate(p=>({...p, pipeline:upd})));
    if (result?.ok) {
      const now = new Date().toISOString();
      onUpdate(p=>({...p, published: true, publishedAt: now, fbPostId: result.postId || p.fbPostId}));
      // Persist to DB
      if (typeof post.id === 'string') {
        authFetch(`/api/content/${post.id}`, {
          method:"PUT", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ status:"published", published_at: now, fb_post_id: result.postId || null })
        }).catch(()=>{});
      }
    }
  }

  return <Card accent={post.published?"#1877F233":post.pipeline?.done?"#10B98133":undefined}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <Tag label={post.platform} color={pl.color}/>
        {post.published && <Tag label="📡 פורסם" color="#1877F2"/>}
        {!post.published && post.scheduled_at && <Tag label={`⏰ ${new Date(post.scheduled_at).toLocaleString("he-IL",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`} color="#F59E0B"/>}
        {autoSchedulingNow && <Tag label="⏳ מתזמן..." color="#F59E0B"/>}
        <Tag label={post.business} color={T.textMuted}/>
        {post.pipeline&&<PipelineBar stages={MEDIA_STAGES} pipeline={post.pipeline} compact/>}
      </div>
      <span style={{color:T.textDim,fontSize:11}}>{post.date}</span>
    </div>

    {/* Per-post engagement metrics */}
    {post.published && metrics && (
      <div style={{display:"flex",gap:16,padding:"8px 12px",background:T.inputBg,borderRadius:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{color:"#1877F2",fontSize:12,fontWeight:600}}>👍 {metrics.likes ?? "—"}</span>
        <span style={{color:"#10B981",fontSize:12,fontWeight:600}}>💬 {metrics.comments ?? "—"}</span>
        <span style={{color:"#F59E0B",fontSize:12,fontWeight:600}}>🔄 {metrics.shares ?? "—"}</span>
        {metrics.impressions != null && <span style={{color:"#8B5CF6",fontSize:12,fontWeight:600}}>👁️ {metrics.impressions}</span>}
        {metrics.reach != null && <span style={{color:"#EC4899",fontSize:12,fontWeight:600}}>📣 {metrics.reach}</span>}
        {metrics.permalink_url && <a href={metrics.permalink_url} target="_blank" rel="noreferrer" style={{color:"#1877F2",fontSize:10,fontWeight:600,textDecoration:"none",marginRight:"auto"}}>צפה בפייסבוק ↗</a>}
      </div>
    )}

    {editing
      ? <textarea value={txt} onChange={e=>setTxt(e.target.value)} style={{
          width:"100%",minHeight:80,background:T.inputBg,border:`1px solid ${T.inputBorder}`,
          borderRadius:10,color:T.text,padding:12,fontSize:13,fontFamily:"inherit",
          direction:"rtl",resize:"vertical",boxSizing:"border-box"}}/>
      : <p style={{color:T.textSec,fontSize:13,lineHeight:1.7,margin:"0 0 10px",
          direction:"rtl",whiteSpace:"pre-wrap"}}>{txt}</p>
    }

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {(post.hashtags||[]).map(h=><span key={h} style={{color:pl.color,fontSize:11}}>#{h}</span>)}
    </div>

    {/* Media preview — image_url / video_url */}
    {(post.video_url || post.image_url || post.pipeline?.imageUrl || post.pipeline?.videoUrl) && (
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {(post.video_url || post.pipeline?.videoUrl) && (
            <video src={post.video_url || post.pipeline?.videoUrl} controls
              style={{width:"100%",maxWidth:360,maxHeight:220,borderRadius:10,background:"#000"}}/>
          )}
          {(post.image_url || post.pipeline?.imageUrl) && !(post.video_url || post.pipeline?.videoUrl) && (
            <img src={post.image_url || post.pipeline?.imageUrl} alt="AI"
              style={{maxWidth:360,maxHeight:220,borderRadius:10,objectFit:"cover",border:`1px solid ${T.border}`}}/>
          )}
          {(post.image_url || post.pipeline?.imageUrl) && (post.video_url || post.pipeline?.videoUrl) && (
            <img src={post.image_url || post.pipeline?.imageUrl} alt="AI"
              style={{width:80,height:80,borderRadius:8,objectFit:"cover",border:`1px solid ${T.border}`,cursor:"pointer"}}
              title="תמונת מקור"/>
          )}
        </div>
        {/* Image variants picker */}
        {Array.isArray(post.image_variants) && post.image_variants.length > 1 && (
          <div style={{marginTop:8}}>
            <div style={{color:T.textDim,fontSize:10,fontWeight:600,marginBottom:5}}>🎨 וריאציות — לחץ לבחירה:</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {post.image_variants.map((vurl, vi) => {
                const isSelected = vurl === post.image_url;
                return <button key={vi}
                  onClick={async()=>{
                    onUpdate(p=>({...p, image_url: vurl}));
                    try { await authFetch(`/api/posts/${post.id}/select-variant`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({variant_url: vurl})}); } catch{}
                  }}
                  style={{
                    width:60,height:60,padding:0,border:`2px solid ${isSelected?"#10B981":T.border}`,
                    borderRadius:8,overflow:"hidden",cursor:"pointer",background:"transparent",
                    boxShadow:isSelected?"0 0 0 2px #10B98144":"none",transition:"all 0.2s"
                  }}>
                  <img src={vurl} alt={`v${vi+1}`} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                </button>;
              })}
            </div>
          </div>
        )}
      </div>
    )}

    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {editing
        ? <><Btn sm bg="#10B98115" color="#10B981" onClick={()=>{onUpdate({...post,content:txt});setEditing(false);}}>שמור</Btn>
            <Btn sm bg={T.inputBg} color={T.textMuted} onClick={()=>setEditing(false)}>ביטול</Btn></>
        : <Btn sm bg={T.inputBg} color={T.textSec} onClick={()=>setEditing(true)}>ערוך</Btn>
      }
      {!post.pipeline || (!post.pipeline.done && !post.pipeline.current && !post.pipeline.readyToPublish && (!post.pipeline.stages || Object.keys(post.pipeline.stages).length===0))
        ? <>
          <Btn sm bg="#4285F415" color="#4285F4" onClick={()=>startMedia("gemini")}>🖼️ תמונה</Btn>
          <Btn sm bg="#34A85315" color="#34A853" onClick={()=>setVideoOpts(v=>v?null:{aspect:"9:16",duration:8})}>
            🎬 סרטון {videoOpts?"▲":"▼"}
          </Btn>
          {videoOpts && <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",background:T.inputBg,borderRadius:10,padding:"6px 10px",border:`1px solid ${T.border}`,marginTop:6,width:"100%"}}>
            <span style={{fontSize:11,color:T.textMuted}}>פורמט:</span>
            <select value={videoOpts.aspect} onChange={e=>setVideoOpts(v=>({...v,aspect:e.target.value}))}
              style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:12,fontFamily:"inherit",cursor:"pointer",padding:"4px 8px"}}>
              <option value="9:16">📱 אורך (9:16)</option>
              <option value="16:9">🖥️ רוחב (16:9)</option>
            </select>
            <span style={{fontSize:11,color:T.textMuted,marginRight:8}}>משך:</span>
            <select value={videoOpts.duration} onChange={e=>setVideoOpts(v=>({...v,duration:Number(e.target.value)}))}
              style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:12,fontFamily:"inherit",cursor:"pointer",padding:"4px 8px"}}>
              <option value={4}>4 שניות</option>
              <option value={6}>6 שניות</option>
              <option value={8}>8 שניות</option>
            </select>
            <Btn sm bg="#34A853" color="#fff" onClick={()=>startMedia("gemini-video",videoOpts)}>▶ צור סרטון</Btn>
            <Btn sm bg={T.inputBg} color={T.textMuted} onClick={()=>setVideoOpts(null)}>ביטול</Btn>
          </div>}
        </>
        : <>
          <Btn sm bg={T.inputBg} color={T.textSec} onClick={()=>setExp(p=>!p)}>{exp?"▲":"▼"} מדיה</Btn>
          {post.pipeline?.readyToPublish && !post.scheduled_at && <Btn sm bg="#1877F215" color="#1877F2" onClick={doPublish}>📡 פרסם עכשיו</Btn>}
          {post.pipeline?.readyToPublish && !post.published && <Btn sm bg="#F59E0B15" color="#F59E0B" onClick={()=>setScheduling(s=>!s)}>
            ⏰ {post.scheduled_at?"שנה תזמון":"תזמן ידני"}
          </Btn>}
          {(post.pipeline?.readyToPublish || post.pipeline?.error || post.pipeline?.done) && <>
            <Btn sm bg="#8B5CF615" color="#8B5CF6" title="צור גרסה חדשה עם אותם הגדרות"
              onClick={()=>{
                const wasVideo = !!post.pipeline?.videoUrl || post.pipeline?.mediaType === "gemini-video";
                onUpdate({...post, pipeline: null});
                if (wasVideo) startMedia("gemini-video", {aspect: post.pipeline?.aspect||"9:16", duration: post.pipeline?.duration||8});
                else startMedia("gemini");
              }}>🔄 צור שוב</Btn>
            <Btn sm bg={T.inputBg} color={T.textMuted} title="נקה והתחל מחדש"
              onClick={()=>onUpdate({...post, pipeline: null})}>✨ אפשרות אחרת</Btn>
          </>}
          {scheduling && <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",background:"#F59E0B08",borderRadius:10,padding:"10px 12px",border:`1px solid #F59E0B40`,marginTop:6,width:"100%"}}>
            <span style={{fontSize:11,color:T.textMuted,fontWeight:600}}>📅 מתי לפרסם:</span>
            <input type="datetime-local" value={scheduleVal} onChange={e=>setScheduleVal(e.target.value)}
              style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:12,fontFamily:"inherit",padding:"6px 8px"}}/>
            <Btn sm bg="#F59E0B" color="#fff" onClick={saveSchedule}>שמור תזמון</Btn>
            {post.scheduled_at && <Btn sm bg="#EF444415" color="#EF4444" onClick={clearSchedule}>בטל תזמון</Btn>}
            <Btn sm bg={T.inputBg} color={T.textMuted} onClick={()=>setScheduling(false)}>סגור</Btn>
            <div style={{width:"100%",color:T.textDim,fontSize:10,marginTop:4}}>הפוסט יתפרסם אוטומטית ללא אישור נוסף בזמן שנבחר</div>
          </div>}
        </>
      }
      {onRegenerate && <Btn sm bg="#8B5CF610" color="#8B5CF6" onClick={onRegenerate}>🔄 צור פוסט אחר</Btn>}
      {post.video_url && typeof post.id === "string" && post.id.length > 20 && <Btn sm bg="#FF000015" color="#FF0000"
        onClick={async()=>{
          try {
            const r = await authFetch(`/api/posts/${post.id}/youtube-export`,{method:"POST"});
            const d = await r.json();
            if (!d.ok) throw new Error(d.error || "שגיאה");
            const text = `כותרת:\n${d.title}\n\nתיאור:\n${d.description}\n\nתגיות: ${d.tags.join(", ")}\n\nסרטון: ${d.video_url}`;
            await navigator.clipboard.writeText(text);
            alert(`✅ הועתק ל-clipboard!\n\nכותרת: ${d.title}\n\nעבור אל youtube.com/upload, הדבק את הקישור לסרטון והעתק את הטקסט להעלאה.`);
            window.open("https://youtube.com/upload", "_blank");
          } catch(e) { alert("שגיאה: " + e.message); }
        }}>
        📺 YouTube
      </Btn>}
      {!post.published && typeof post.id === "string" && post.id.length > 20 && <Btn sm bg="#EC489910" color="#EC4899" disabled={abLoading}
        onClick={async()=>{
          if (!confirm("ליצור גרסה חלופית של הטקסט? הגרסה הנוכחית תישמר כ-variant זמין להחלפה.")) return;
          setAbLoading(true);
          try {
            const r = await authFetch(`/api/posts/${post.id}/regenerate-content`,{method:"POST"});
            const d = await r.json();
            if (d.ok) {
              onUpdate(p=>({...p, content: d.content, hashtags: d.hashtags || p.hashtags, content_variants: [...(p.content_variants||[]), {content: p.content, hashtags: p.hashtags, label:"previous"}].slice(-3)}));
            } else { alert("שגיאה: " + (d.error || "לא ידוע")); }
          } catch(e) { alert("שגיאה: " + e.message); }
          setAbLoading(false);
        }}>
        {abLoading ? <><Spinner size={10}/>יוצר...</> : "🎭 גרסה חלופית"}
      </Btn>}
      {onDelete && <Btn sm bg="#EF444410" color="#EF4444" onClick={()=>{if(confirm("למחוק את הפוסט?"))onDelete(post.id)}}>🗑️</Btn>}
    </div>

    {/* Content variants (A/B versions available) */}
    {Array.isArray(post.content_variants) && post.content_variants.length > 0 && !post.published && (
      <div style={{marginTop:10,padding:"10px 12px",background:"#EC489908",border:"1px solid #EC489933",borderRadius:10}}>
        <div style={{color:"#EC4899",fontSize:10,fontWeight:700,marginBottom:6}}>🎭 גרסאות חלופיות זמינות ({post.content_variants.length}):</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {post.content_variants.map((v,vi) => (
            <div key={vi} style={{background:T.card,borderRadius:8,padding:8,border:`1px solid ${T.border}`}}>
              <div style={{color:T.textSec,fontSize:11,direction:"rtl",lineHeight:1.4,marginBottom:6,maxHeight:60,overflow:"hidden"}}>
                {(v.content || "").slice(0, 200)}...
              </div>
              <button onClick={async()=>{
                if (!confirm("להחליף לגרסה הזאת?")) return;
                try {
                  await authFetch(`/api/posts/${post.id}/use-variant`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content: v.content, hashtags: v.hashtags})});
                  onUpdate(p=>({...p, content: v.content, hashtags: v.hashtags || p.hashtags, content_variants: (p.content_variants||[]).filter((_,i)=>i!==vi).concat([{content: p.content, hashtags: p.hashtags, label:"swapped"}]).slice(-3)}));
                } catch(e) { alert("שגיאה: " + e.message); }
              }} style={{background:"#EC489915",border:"none",color:"#EC4899",fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
                השתמש בגרסה זו ←
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    {(exp || post.pipeline?.error) && post.pipeline && <PipelineBar stages={post.pipeline.gemini ? GEMINI_STAGES : MEDIA_STAGES} pipeline={post.pipeline}/>}
  </Card>;
}

// ═══════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════

// DASHBOARD
function Dashboard({ posts, sources, businesses }) {
  const published = posts.filter(p=>p.published).length;
  const withMedia = posts.filter(p=>p.pipeline?.done).length;
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [latestMetrics, setLatestMetrics] = useState([]);

  const [permWarning, setPermWarning] = useState(false);

  // Auto-load metrics from DB on mount
  useEffect(()=>{
    async function loadMetrics() {
      try {
        const r = await authFetch("/api/metrics?days=30");
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          // Group by post_id, take latest per post
          const byPost = {};
          for (const m of data) {
            if (!byPost[m.post_id] || m.date > byPost[m.post_id].date) byPost[m.post_id] = m;
          }
          setLatestMetrics(Object.values(byPost));
        }
      } catch {}
    }
    loadMetrics();
  }, []);

  const [pageStats, setPageStats] = useState({});

  async function refreshMetrics() {
    setMetricsLoading(true);
    try {
      const { results, permissionError, pageMetrics } = await fetchPostMetrics(posts, businesses);
      setPermWarning(permissionError);
      setPageStats(pageMetrics || {});
      setLatestMetrics(results.map(m=>{
        const post = posts.find(p=>p.fbPostId===m.postId);
        return { ...m, content: m.message || post?.content?.slice(0,80) || "" };
      }));
    } catch {}
    setMetricsLoading(false);
  }

  const stats = [
    { label:"עסקים", value:businesses?.length||0, color:"#F59E0B", icon:"🏪" },
    { label:"פוסטים", value:posts.length, color:"#8B5CF6", icon:"✍️" },
    { label:"פורסמו", value:published, color:"#1877F2", icon:"📡" },
    { label:"עם מדיה AI", value:withMedia, color:"#F59E0B", icon:"🖼️" },
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

    {/* Published posts metrics */}
    {published > 0 && <Card style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>📊 ביצועי פוסטים שפורסמו</div>
        <Btn sm bg="#1877F212" color="#1877F2" onClick={refreshMetrics} disabled={metricsLoading}>
          {metricsLoading?<><Spinner size={12}/>מעדכן...</>:"עדכן נתונים"}
        </Btn>
      </div>
      {permWarning && <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:8,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>⚠️</span>
        <div style={{flex:1}}>
          <div style={{color:"#92400E",fontSize:11,fontWeight:600}}>לייקים ותגובות — ממתין ל-Business Verification</div>
          <div style={{color:"#A16207",fontSize:10}}>היכנס ל-Meta Developer Console → Go Live → Start verification. אחרי אישור, הנתונים יופיעו אוטומטית.</div>
        </div>
      </div>}
      {/* Page-level stats from what IS available */}
      {Object.keys(pageStats).length > 0 && <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
        {Object.entries(pageStats).map(([bizName, ps])=><div key={bizName} style={{background:T.inputBg,borderRadius:10,padding:"10px 16px",flex:"1 1 200px",minWidth:160}}>
          <div style={{color:T.textSec,fontSize:11,fontWeight:600,marginBottom:6}}>{bizName}</div>
          <div style={{display:"flex",gap:14}}>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#1877F2",fontWeight:700,fontSize:18}}>{ps.fans||0}</div>
              <div style={{color:T.textDim,fontSize:9}}>מעריצים</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#8B5CF6",fontWeight:700,fontSize:18}}>{ps.followers||0}</div>
              <div style={{color:T.textDim,fontSize:9}}>עוקבים</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#10B981",fontWeight:700,fontSize:18}}>{ps.totalPosts||0}</div>
              <div style={{color:T.textDim,fontSize:9}}>פוסטים</div>
            </div>
          </div>
        </div>)}
      </div>}
      {latestMetrics.length > 0
        ? <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {latestMetrics.map((m,i)=>{
              const pubDate = m.created_time ? new Date(m.created_time) : null;
              const dateStr = pubDate ? pubDate.toLocaleDateString("he-IL",{day:"numeric",month:"short",year:"numeric"}) : "";
              const timeStr = pubDate ? pubDate.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"}) : "";
              const typeIcon = m.status_type==="added_video" ? "🎬" : m.status_type==="added_photos" ? "🖼️" : m.full_picture ? "🖼️" : "📝";
              const link = m.permalink_url || `https://facebook.com/${m.postId}`;
              return <div key={i} style={{padding:"12px 14px",background:T.inputBg,borderRadius:10,gap:10,display:"flex",alignItems:"flex-start"}}>
                {m.full_picture && <img src={m.full_picture} alt="" style={{width:56,height:56,objectFit:"cover",borderRadius:8,flexShrink:0}} />}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:12}}>{typeIcon}</span>
                      <span style={{color:T.textSec,fontSize:11,fontWeight:600}}>{m.business}</span>
                      {m.source==="platform" && <span style={{background:"#8B5CF620",color:"#8B5CF6",fontSize:8,padding:"1px 5px",borderRadius:4,fontWeight:600}}>מהמערכת</span>}
                    </div>
                    {dateStr && <div style={{color:T.textDim,fontSize:9,flexShrink:0}}>{dateStr} {timeStr}</div>}
                  </div>
                  <div style={{color:T.textMuted,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",direction:"rtl",marginBottom:6}}>{m.content}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    {m.needsPermission
                      ? <div style={{color:"#F59E0B",fontSize:9,fontWeight:600}}>⚠️ לייקים/תגובות — ממתין ל-Verification</div>
                      : <div style={{display:"flex",gap:14}}>
                          <span style={{color:"#1877F2",fontSize:11,fontWeight:600}}>👍 {m.likes||0}</span>
                          <span style={{color:"#10B981",fontSize:11,fontWeight:600}}>💬 {m.comments||0}</span>
                          <span style={{color:"#F59E0B",fontSize:11,fontWeight:600}}>🔄 {m.shares||0}</span>
                        </div>
                    }
                    <a href={link} target="_blank" rel="noreferrer" style={{color:"#1877F2",fontSize:9,fontWeight:600,textDecoration:"none"}}>צפה בפייסבוק ↗</a>
                  </div>
                </div>
              </div>;
            })}
            {latestMetrics[0]?.date && <div style={{color:T.textDim,fontSize:9,textAlign:"center",marginTop:6}}>
              עודכן: {latestMetrics[0].date} | {latestMetrics.length} פוסטים
            </div>}
          </div>
        : <div style={{color:T.textDim,fontSize:12,textAlign:"center",padding:20}}>
            לחץ "עדכן נתונים" לראות מעקב פוסטים
          </div>
      }
    </Card>}
    <div className="two-col-grid" style={{display:"grid",gap:16}}>
      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1}}>PIPELINE</div>
        {[
          ["Claude API","כתיבת תוכן + פוסטים","#8B5CF6"],
          ["Gemini 2.5 Flash","יצירת תמונות","#4285F4"],
          ["Veo 3.0 Fast","יצירת סרטונים","#4285F4"],
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
          ["Backend (Railway)","$7","#8B5CF6"],
          ["סה\"כ","~$47/חודש","#F59E0B"],
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
function Content({ posts, setPosts, sources, businesses, setBusinesses, analyticsData }) {
  const BUSINESSES = businesses || DEFAULT_BUSINESSES;
  const [selBiz, setSelBiz] = useState(BUSINESSES[0]);
  const [selPlatforms, setSelPlatforms] = useState(["facebook","instagram"]);
  const [selTypes, setSelTypes] = useState(["פוסט קצר"]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [postMetricsMap, setPostMetricsMap] = useState({}); // {fb_post_id: {likes,comments,shares,...}}

  function updateBiz(id, upd) { setBusinesses?.(p=>p.map(b=>b.id===id?{...b,...upd}:b)); }

  const existingBizPosts = posts.filter(p=>p.business===selBiz?.name);

  // Load per-post metrics from DB
  useEffect(()=>{
    (async()=>{
      try {
        const r = await authFetch("/api/metrics?days=30");
        if(!r.ok) return;
        const data = await r.json();
        // Group by post_id, take latest date entry
        const map = {};
        for(const m of data){
          if(!m.post_id) continue;
          if(!map[m.post_id] || m.date > map[m.post_id].date) map[m.post_id] = m;
        }
        setPostMetricsMap(map);
      } catch{}
    })();
  }, []);

  // Quick scan using Facebook Graph API + website (no Apify needed)
  async function quickScan(biz) {
    const results = { websiteContent: null, fbPosts: null, fbAbout: null };

    // 1. Read Facebook page info + recent posts via Graph API
    const fbTokens = biz.social?.facebook?.tokens;
    if (fbTokens?.META_PAGE_ID && fbTokens?.META_ACCESS_TOKEN) {
      setMsg("📖 קורא את דף הפייסבוק...");
      try {
        const pageR = await fetch(`https://graph.facebook.com/v25.0/${fbTokens.META_PAGE_ID}?fields=name,about,description,category,website,fan_count&access_token=${fbTokens.META_ACCESS_TOKEN}`);
        const pageD = await pageR.json();
        if (!pageD.error) results.fbAbout = pageD;
      } catch {}
      try {
        const postsR = await fetch(`https://graph.facebook.com/v25.0/${fbTokens.META_PAGE_ID}/posts?fields=message,created_time,likes.summary(true),comments.summary(true)&limit=20&access_token=${fbTokens.META_ACCESS_TOKEN}`);
        const postsD = await postsR.json();
        if (postsD.data) results.fbPosts = postsD.data.filter(p=>p.message).map(p=>({
          text: p.message, date: p.created_time,
          likes: p.likes?.summary?.total_count||0, comments: p.comments?.summary?.total_count||0
        }));
      } catch {}
    }

    // 2. Read website content (try fetch, fallback to Apify if available)
    if (biz.url) {
      setMsg("🌐 קורא את האתר...");
      try {
        const r = await fetch(biz.url);
        if (r.ok) {
          const html = await r.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          doc.querySelectorAll("script,style,nav,footer,header").forEach(el=>el.remove());
          results.websiteContent = (doc.body?.textContent||"").replace(/\s+/g," ").trim().slice(0,3000);
        }
      } catch {
        // CORS blocked — try Apify if available
        const keys = JSON.parse(localStorage.getItem("admin_keys")||"{}");
        if (keys.APIFY_API_TOKEN) {
          try { results.websiteContent = await scrapeWebsite(biz.url); } catch {}
        }
      }
    }

    // 3. AI analysis of everything we found
    setMsg("🧠 AI מנתח את העסק...");
    const fbAboutText = results.fbAbout ? `\nמידע מפייסבוק: ${results.fbAbout.about||""} ${results.fbAbout.description||""} (קטגוריה: ${results.fbAbout.category||""})` : "";
    const websiteText = results.websiteContent ? `\nתוכן מהאתר:\n${results.websiteContent.slice(0,1500)}` : "";
    const fbPostsText = results.fbPosts?.length > 0
      ? `\nפוסטים אחרונים בפייסבוק:\n${results.fbPosts.slice(0,8).map(p=>`- "${p.text.slice(0,120)}..." (${p.likes} לייקים, ${p.comments} תגובות)`).join("\n")}`
      : "";

    const raw = await claudeCall(`אתה מנתח שיווקי מומחה. נתח את העסק הבא באופן מקיף:
שם: "${biz.name}"${biz.url?`\nאתר: ${biz.url}`:""}${biz.description?`\nתיאור: ${biz.description}`:""}${fbAboutText}${websiteText}${fbPostsText}

נתח הכל והחזר JSON בלבד:
{"tone":"טון המותג","audience":"קהל יעד","strengths":["יתרון1","יתרון2","יתרון3"],"contentIdeas":["רעיון1","רעיון2","רעיון3","רעיון4"],"bestPlatform":"פלטפורמה מומלצת","postFrequency":"תדירות","recommendation":"המלצה אסטרטגית"}
חשוב: החזר JSON תקין בלבד, ללא טקסט נוסף.`, 800);

    const clean = raw.replace(/```json|```/g,"").trim();
    try { results.analysis = JSON.parse(clean); } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) try { results.analysis = JSON.parse(m[0]); } catch {}
    }
    if (!results.analysis) results.analysis = { tone:"לא זמין", audience:"לא זמין", strengths:[], contentIdeas:[] };

    return results;
  }

  async function generate() {
    setLoading(true); setMsg("");
    try {
      // ═══ AUTO-SCAN: learn about the business before creating content ═══
      let activeBiz = { ...selBiz };
      const scanAge = activeBiz.lastQuickScan ? Date.now() - new Date(activeBiz.lastQuickScan).getTime() : Infinity;
      const needsScan = !activeBiz.scanResult || activeBiz.scanResult.error || scanAge > 7*24*3600*1000;

      if (needsScan) {
        setMsg("🔍 לומד על העסק לפני יצירת תוכן...");
        try {
          const scanResults = await quickScan(activeBiz);
          const bizUpdate = {
            scanResult: scanResults.analysis,
            fullScanData: scanResults,
            lastQuickScan: new Date().toISOString()
          };
          updateBiz(activeBiz.id, bizUpdate);
          activeBiz = { ...activeBiz, ...bizUpdate };
          setMsg("✅ סריקה הושלמה — יוצר פוסטים...");
        } catch(e) {
          setMsg("⚠️ הסריקה נכשלה — יוצר תוכן עם המידע הקיים...");
        }
      }

      // ═══ BUILD RICH PROMPT ═══
      const platLabels = PLATFORMS.filter(p=>selPlatforms.includes(p.id)).map(p=>p.label).join(", ");
      const bizSources = sources.filter(s=>s.name===activeBiz.name||s.role==="עסק");
      const sourceInfo = bizSources.length>0 ? `\nמקורות מידע: ${bizSources.map(s=>s.url||s.name).join(", ")}` : "";
      const bizDesc = activeBiz.description ? `\nתיאור: ${activeBiz.description}` : "";
      const scanInfo = activeBiz.scanResult && !activeBiz.scanResult.error
        ? `\nטון מותג: ${activeBiz.scanResult.tone}. קהל יעד: ${activeBiz.scanResult.audience}.`
        : "";

      // Rich context from scan data (website + FB posts + strengths)
      let richContext = "";
      const fsd = activeBiz.fullScanData;
      if (fsd) {
        if (fsd.websiteContent) {
          richContext += `\n\nתוכן מהאתר של העסק (חובה ללמוד ממנו!):\n${fsd.websiteContent.slice(0,1500)}`;
        }
        if (fsd.fbAbout) {
          const fb = fsd.fbAbout;
          richContext += `\n\nמידע מפייסבוק: ${fb.about||""} ${fb.description||""} (קטגוריה: ${fb.category||""})`;
        }
        if (fsd.fbPosts?.length > 0) {
          richContext += `\n\nפוסטים אחרונים מדף הפייסבוק (למד מהסגנון!):
${fsd.fbPosts.slice(0,5).map(p=>`- "${p.text.slice(0,120)}..." → ${p.likes} לייקים, ${p.comments} תגובות`).join("\n")}`;
        }
        const analysis = activeBiz.scanResult;
        if (analysis?.strengths?.length) richContext += `\nיתרונות העסק: ${analysis.strengths.join(", ")}`;
        if (analysis?.contentIdeas?.length) richContext += `\nרעיונות תוכן מומלצים: ${analysis.contentIdeas.join(", ")}`;
      }

      const publishedPosts = existingBizPosts.filter(p=>p.published);
      const unpublishedPosts = existingBizPosts.filter(p=>!p.published);
      let existingContent = "";
      if (publishedPosts.length > 0) {
        existingContent += `\n\nפוסטים שפורסמו (למד מהם והמשך את הסגנון — אל תחזור על אותו נושא!):\n${publishedPosts.slice(0,8).map(p=>`- [${p.platform}] ${p.content.slice(0,80)}...`).join("\n")}`;
      }
      if (unpublishedPosts.length > 0) {
        existingContent += `\n\nפוסטים שנוצרו אך לא פורסמו (אל תחזור עליהם!):\n${unpublishedPosts.slice(0,5).map(p=>`- [${p.platform}] ${p.content.slice(0,60)}...`).join("\n")}`;
      }

      // Engagement insights
      let engagementHint = "";
      const bizAnalytics = analyticsData?.[activeBiz.id];
      if (bizAnalytics?.topPosts?.length > 0) {
        const top = bizAnalytics.topPosts.slice(0,3);
        engagementHint = `\n\nנתוני ביצועים (פוסטים מוצלחים):
${top.map(p=>`- "${p.message?.slice(0,50)}..." → ${p.likes} לייקים, ${p.comments} תגובות`).join("\n")}
למד מהפוסטים המוצלחים — מה הטון? מה ה-hook? מה הנושא? צור תוכן דומה באיכות אבל ייחודי.`;
      }

      // Competitor insights
      let competitorHint = "";
      if (activeBiz.competitorAnalysis) {
        const ca = activeBiz.competitorAnalysis;
        competitorHint = `\n\nתובנות ממתחרים:
נושאים חמים: ${ca.topThemes?.join(", ")||""}
Hooks שעובדים: ${ca.bestHooks?.join(", ")||""}
פערים שאפשר לנצל: ${ca.gaps?.join(", ")||""}
${ca.recommendation||""}`;
      }
      if (activeBiz.competitorData?.some(d=>d.posts?.length>0)) {
        const topCompPosts = activeBiz.competitorData.flatMap(d=>d.posts||[])
          .sort((a,b)=>(b.likes+b.comments)-(a.likes+a.comments)).slice(0,3);
        if (topCompPosts.length>0) {
          competitorHint += `\nפוסטים מובילים של מתחרים:
${topCompPosts.map(p=>`- "${p.text?.slice(0,50)}..." → ${p.likes} לייקים, ${p.comments} תגובות`).join("\n")}
צור תוכן שמתחרה ברמה הזו אבל ייחודי לעסק שלנו.`;
        }
      }

      // Brand visual identity — use it as a brand-voice anchor so posts feel consistent with media
      const brandVoiceHint = activeBiz.visual_identity
        ? `\n\nזהות מותג (משמשת גם ליצירת תמונות/סרטונים — התאם את הטון, הערכים והאסתטיקה):\n${activeBiz.visual_identity}`
        : "";

      setMsg("✍️ Claude יוצר פוסט...");
      const raw = await claudeCall(`אתה מומחה שיווק ישראלי. צור פוסט אחד בלבד חדש ושונה לעסק: ${activeBiz.name}.${bizDesc}${scanInfo}${brandVoiceHint}${richContext}${sourceInfo}
פלטפורמות: ${platLabels}. סוגים: ${selTypes.join(", ")}. מטרה: לידים.${existingContent}${engagementHint}${competitorHint}
חשוב מאוד — כללי כתיבה:
1. כתוב תמיד בגוף ראשון רבים ("אנחנו", "שלנו", "אצלנו", "הצוות שלנו") — לא "אני" או גוף יחיד.
2. התאם טון ושפה לעסק. צור תוכן ייחודי שלא דומה לפוסטים קיימים. השתמש במונחים ובשפה של העסק עצמו.
3. כל פוסט חייב לתאר נושא/מוצר/פעילות ספציפי וקונקרטי (לא "אנחנו מציעים שירותים איכותיים" — אלא משהו מוחשי שאפשר לצלם אותו).
החזר JSON בלבד: {"posts":[{"platform":"פייסבוק","type":"פוסט קצר","content":"...","hashtags":["..."]}]}
חשוב: החזר פוסט אחד בלבד. החזר JSON תקין בלבד, ללא טקסט נוסף לפני או אחרי ה-JSON.`, 2000);
      const clean = raw.replace(/```json|```/g,"").trim();
      let arr;
      try { arr = JSON.parse(clean).posts; } catch {
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { arr = JSON.parse(jsonMatch[0]).posts; } catch {
            const fixAttempt = clean.replace(/\n[^{}\[\]"]*$/, "").trim();
            try { arr = JSON.parse(fixAttempt).posts; } catch {
              throw new Error("Claude returned invalid JSON — try again");
            }
          }
        } else { throw new Error("Claude returned invalid JSON — try again"); }
      }
      let newPosts = arr.slice(0, 1).map((p,i)=>({
        id:Date.now()+i, business:activeBiz.name, ...p,
        date: new Date().toLocaleDateString("he-IL", {weekday:"short",day:"2-digit",month:"2-digit"}) + " · " + new Date().toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"}),
        approved:true, media:null, pipeline:null
      }));
      // Append CTA with shortened URL to each post if business has a URL
      if (activeBiz.url) {
        try {
          const shortUrl = await shortenUrl(activeBiz.url, activeBiz.id);
          if (shortUrl) {
            newPosts = newPosts.map(p => ({ ...p, content: `${p.content}\n\n🔗 ${shortUrl}` }));
          }
        } catch {}
      }
      setPosts(p=>[...newPosts,...p]);
      setMsg(`נוצר פוסט עבור ${selBiz.name}`);
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
        ל-{selBiz?.name} יש {existingBizPosts.length} פוסטים קיימים.
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
          {loading?<><Spinner/>מייצר...</>:`צור פוסט ל${selBiz?.name||"..."}`}
        </Btn>
        <Btn grad="linear-gradient(135deg,#4285F4,#34A853)"
          onClick={()=>existingBizPosts.filter(p=>(!p.pipeline||!p.pipeline.done&&!p.pipeline.current)).forEach(post=>{
            updatePost(post.id,{...post,pipeline:{stages:Object.fromEntries(MEDIA_STAGES.map(s=>[s.id,"pending"])),current:null,done:false}});
            runGeminiImagePipeline(post, BUSINESSES, upd=>setPosts(prev=>prev.map(p=>p.id===post.id?{...p,pipeline:upd}:p)));
          })}>
          🖼️ תמונות לכל הפוסטים
        </Btn>
        {msg&&<span style={{color:msg.includes("שגיאה")?"#EF4444":"#10B981",fontSize:12,fontWeight:600}}>{msg}</span>}
      </div>
    </Card>

    {/* Posts filtered by business */}
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {existingBizPosts.length===0
        ? <Card><div style={{textAlign:"center",color:T.textDim,padding:30}}>אין פוסטים ל-{selBiz?.name} — לחץ "צור פוסטים"</div></Card>
        : existingBizPosts.map(post=><PostCard key={post.id} post={post} businesses={BUSINESSES} allPosts={posts}
          postMetrics={post.fbPostId ? postMetricsMap[post.fbPostId] : null}
          onUpdate={upd=>setPosts(prev=>prev.map(p=>p.id===post.id?(typeof upd==="function"?upd(p):upd):p))}
          onDelete={id=>{setPosts(prev=>prev.filter(p=>p.id!==id));authFetch(`/api/content/${id}`,{method:"DELETE"}).catch(()=>{})}}
          onRegenerate={()=>generate()}/>)}
    </div>
  </div>;
}

// MEDIA AI INFO
function MediaAI() {
  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="Claude → Gemini/Veo → Meta">מדיה AI — ארכיטקטורה</SectionTitle>
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
      {[
        {step:"1",title:"Claude כותב פוסט",color:"#8B5CF6",
          desc:"סוקר את הנושאים, היסטוריית הפוסטים והעסק — וכותב פוסט ממוקד בעברית.",
          api:"Claude API → post content"},
        {step:"2",title:"Gemini מייצר תמונה או וידאו",color:"#4285F4",
          desc:"Gemini 2.5 Flash Image מייצר תמונה ישירות מהפוסט העברי, או Veo 3.0 Fast מייצר וידאו (עד 8 שניות, לאורך/לרוחב).",
          api:"Gemini 2.5 Flash Image / Veo 3.0 Fast"},
        {step:"3",title:"אישור משתמש",color:"#F59E0B",
          desc:"המדיה מוצגת לבדיקה. רק אחרי אישור המשתמש היא מועלית ל-Supabase Storage ונשלחת לפרסום.",
          api:"Supabase Storage"},
        {step:"4",title:"Meta מפרסם",color:"#1877F2",
          desc:"Photo/Video upload דרך Meta Graph API v25. תומך ב-Reels ו-Feed.",
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
      {[["Claude (פוסטים)","~$2","#8B5CF6"],["Gemini (תמונות)","~$3","#4285F4"],
        ["Veo 3.0 (סרטונים)","~$20","#4285F4"],["Meta API","חינם","#1877F2"],["סה\"כ","~$25","#10B981"]]
        .map(([k,v,c])=><div key={k} style={{display:"flex",justifyContent:"space-between",
          padding:"8px 0",borderBottom:`1px solid ${T.borderLight}`}}>
          <span style={{color:T.textSec,fontSize:12}}>{k}</span>
          <span style={{color:c,fontWeight:700,fontSize:12}}>{v}</span>
        </div>)}
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// CLAUDE MANAGED AGENTS — autonomous agents console
// ═══════════════════════════════════════════════════════════════════
const DEFAULT_AGENT_PRESETS = [
  {
    icon: "🕵️",
    name: "סייר מתחרים",
    description: "סורק מתחרים ברשת, מאתר פוסטים חדשים וזוויות שיווקיות.",
    system_prompt: "You are a competitive marketing analyst for Israeli businesses. Research competitors via web search, summarize their latest content strategies in Hebrew, and identify content gaps my business can exploit. Always respond in Hebrew.",
    default_task: "חקור 3 מתחרים בתחום טיסות זולות בישראל. סכם את 5 הפוסטים האחרונים של כל אחד ותן לי 3 רעיונות לפוסט שייבדל מהם.",
  },
  {
    icon: "💡",
    name: "מחולל רעיונות",
    description: "קורא את היסטוריית הפוסטים ומציע רעיונות חדשים.",
    system_prompt: "You are a creative content strategist. Given a business's past posts and audience, generate fresh, non-repetitive post ideas in Hebrew with hooks, angles, and hashtags.",
    default_task: "על סמך עסק 'צייד טיסות' — תן 10 רעיונות לפוסטים חדשים לשבוע הקרוב, כל רעיון עם hook, זווית ו-hashtags.",
  },
  {
    icon: "📊",
    name: "מנתח ביצועים",
    description: "סוקר ביצועי פוסטים ומסיק מה עובד.",
    system_prompt: "You are a social media performance analyst. Analyze engagement data, identify patterns in top-performing vs under-performing posts, and recommend specific changes in Hebrew.",
    default_task: "נתח את הפוסטים של השבוע האחרון. זהה מה גרם לתוצאות הטובות והמלץ על 5 שיפורים קונקרטיים.",
  },
];

function ShortLinksCard() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await authFetch("/api/shorten");
      const d = await r.json();
      setLinks(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createLink() {
    if (!newUrl.trim()) return;
    setCreating(true);
    try {
      await authFetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim() }),
      });
      setNewUrl("");
      await load();
    } catch {}
    setCreating(false);
  }

  async function deleteLink(code) {
    if (!confirm("למחוק את הלינק?")) return;
    await authFetch(`/api/shorten/${code}`, { method: "DELETE" });
    await load();
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return <Card>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>🔗 לינקים מקוצרים</div>
      <Tag label={`${links.length} לינקים`} color={T.textMuted}/>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:12}}>
      <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="https://example.com/page"
        style={{flex:1,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,
          color:T.text,padding:"10px 12px",fontSize:12,direction:"ltr",fontFamily:"inherit"}}/>
      <button onClick={createLink} disabled={creating||!newUrl.trim()}
        style={{padding:"10px 16px",borderRadius:8,border:"none",cursor:creating?"default":"pointer",
          background:creating?T.border:"#10B981",color:"#fff",fontWeight:700,fontSize:12}}>
        {creating?"...":"צור"}
      </button>
    </div>
    {loading ? <div style={{padding:14,textAlign:"center",color:T.textMuted,fontSize:12}}>טוען...</div>
      : links.length===0 ? <div style={{padding:14,textAlign:"center",color:T.textMuted,fontSize:12}}>אין לינקים עדיין</div>
      : <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto"}}>
        {links.map(l => (
          <div key={l.code} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:T.inputBg,borderRadius:8,fontSize:11}}>
            <code style={{color:"#8B5CF6",fontWeight:700,direction:"ltr"}}>/s/{l.code}</code>
            <span style={{flex:1,color:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",direction:"ltr"}}>{l.url}</span>
            <Tag label={`${l.clicks||0} קליקים`} color="#10B981"/>
            <button onClick={()=>navigator.clipboard.writeText(`${origin}/s/${l.code}`)}
              style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:10}}>העתק</button>
            <button onClick={()=>deleteLink(l.code)}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:T.textMuted}}>🗑</button>
          </div>
        ))}
      </div>
    }
  </Card>;
}

function PresetEditor({ preset, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    icon: preset?.icon || "🤖",
    name: preset?.name || "",
    description: preset?.description || "",
    system_prompt: preset?.system_prompt || "",
    default_task: preset?.default_task || "",
  }));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim() || !form.system_prompt.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return <Card accent="#8B5CF620">
    <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:12,letterSpacing:1}}>
      {preset?.id ? "✏️ ערוך סוכן" : "➕ סוכן חדש"}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:8}}>
        <input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="🤖"
          style={{width:60,textAlign:"center",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,padding:"10px",fontSize:20,fontFamily:"inherit"}}/>
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="שם הסוכן"
          style={{flex:1,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"10px 12px",fontSize:13,direction:"rtl",fontFamily:"inherit"}}/>
      </div>
      <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="תיאור קצר (מה הסוכן עושה)"
        style={{background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"10px 12px",fontSize:12,direction:"rtl",fontFamily:"inherit"}}/>
      <textarea value={form.system_prompt} onChange={e=>setForm({...form,system_prompt:e.target.value})}
        placeholder="System Prompt (באנגלית — מגדיר את אופי הסוכן)"
        style={{minHeight:100,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"10px 12px",fontSize:12,direction:"ltr",fontFamily:"monospace",resize:"vertical"}}/>
      <textarea value={form.default_task} onChange={e=>setForm({...form,default_task:e.target.value})}
        placeholder="משימה ברירת מחדל (בעברית)"
        style={{minHeight:60,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"10px 12px",fontSize:12,direction:"rtl",fontFamily:"inherit",resize:"vertical"}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={save} disabled={saving||!form.name.trim()||!form.system_prompt.trim()}
          style={{flex:1,padding:"10px",borderRadius:8,border:"none",cursor:"pointer",background:"#8B5CF6",color:"#fff",fontWeight:700,fontSize:12}}>
          {saving?"שומר...":"שמור"}
        </button>
        <button onClick={onCancel}
          style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${T.border}`,cursor:"pointer",background:T.card,color:T.text,fontWeight:700,fontSize:12}}>ביטול</button>
      </div>
    </div>
  </Card>;
}

function ManagedAgents({ businesses }) {
  const [presets, setPresets] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [environmentId, setEnvironmentId] = useState(() => localStorage.getItem("ma_env_id") || "");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [task, setTask] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [editingPreset, setEditingPreset] = useState(null); // null = closed, {} = new, {id,..} = edit
  const streamRef = useRef(null);

  async function loadPresets() {
    setLoadingPresets(true);
    try {
      const r = await authFetch("/api/agent-presets");
      let list = await r.json();
      if (!Array.isArray(list)) list = [];
      // Seed defaults on first load
      if (list.length === 0) {
        for (const p of DEFAULT_AGENT_PRESETS) {
          try {
            const cr = await authFetch("/api/agent-presets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(p),
            });
            const created = await cr.json();
            if (created && created.id) list.push(created);
          } catch {}
        }
      }
      setPresets(list);
      if (list[0]) { setSelectedPreset(list[0]); setTask(list[0].default_task || ""); }
    } catch (e) {
      setError(e.message);
    }
    setLoadingPresets(false);
  }
  useEffect(() => { loadPresets(); }, []);

  async function savePreset(form) {
    const isEdit = editingPreset && editingPreset.id;
    const url = isEdit ? `/api/agent-presets/${editingPreset.id}` : "/api/agent-presets";
    const method = isEdit ? "PUT" : "POST";
    try {
      await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditingPreset(null);
      await loadPresets();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deletePreset(id) {
    if (!confirm("למחוק את הסוכן?")) return;
    try {
      await authFetch(`/api/agent-presets/${id}`, { method: "DELETE" });
      await loadPresets();
    } catch (e) { setError(e.message); }
  }

  async function ensureEnvironment() {
    if (environmentId) return environmentId;
    const r = await authFetch("/api/managed-agents/environments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "dashboard-env",
        config: { type: "cloud", networking: { type: "unrestricted" } },
      }),
    });
    const d = await r.json();
    if (d.error || !d.id) throw new Error(d.error?.message || d.error || "Environment creation failed");
    localStorage.setItem("ma_env_id", d.id);
    setEnvironmentId(d.id);
    return d.id;
  }

  async function ensureAgent(preset) {
    // Reuse if already created for this preset
    if (preset.agent_id) return preset.agent_id;
    const r = await authFetch("/api/managed-agents/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: preset.name,
        model: "claude-sonnet-4-6",
        system: preset.system_prompt,
        tools: [{ type: "agent_toolset_20260401" }],
      }),
    });
    const d = await r.json();
    if (d.error || !d.id) throw new Error(d.error?.message || d.error || "Agent creation failed");
    // Persist agent_id back to preset
    try {
      await authFetch(`/api/agent-presets/${preset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: d.id }),
      });
      setPresets(prev => prev.map(p => p.id === preset.id ? { ...p, agent_id: d.id } : p));
    } catch {}
    return d.id;
  }

  async function runTask() {
    setRunning(true);
    setError("");
    setEvents([]);
    setSession(null);
    try {
      const envId = await ensureEnvironment();
      const agentId = await ensureAgent(selectedPreset);
      // Create session
      const sr = await authFetch("/api/managed-agents/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: agentId, environment_id: envId, title: selectedPreset?.name || "Task" }),
      });
      const sData = await sr.json();
      if (sData.error || !sData.id) throw new Error(sData.error?.message || sData.error || "Session creation failed");
      setSession(sData);
      // Open SSE stream FIRST (before sending message to avoid race condition)
      const resp = await authFetch(`/api/managed-agents/sessions/${sData.id}/stream`, {
        headers: { Accept: "text/event-stream" },
      });
      // Send user message after stream is open
      authFetch(`/api/managed-agents/sessions/${sData.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [{ type: "user.message", content: [{ type: "text", text: task }] }],
        }),
      }).catch(() => {});
      if (!resp.ok || !resp.body) throw new Error(`Stream HTTP ${resp.status}`);
      const reader = resp.body.getReader();
      streamRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            setEvents(prev => [...prev, ev]);
            if (ev.type === "status_idle" || ev.type === "session.status_idle") {
              try { reader.cancel(); } catch {}
              return;
            }
          } catch {}
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  function stopStream() {
    try { streamRef.current?.cancel(); } catch {}
    setRunning(false);
  }

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="סוכנים אוטונומיים עם כלי sandbox — Claude Managed Agents (beta 2026-04-01)">🤖 סוכנים מנוהלים</SectionTitle>

    <div className="two-col-grid" style={{display:"grid",gap:16,marginBottom:16}}>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>בחר סוכן</div>
          <button onClick={()=>setEditingPreset({})}
            style={{background:"#8B5CF615",border:`1px solid #8B5CF640`,borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#8B5CF6",fontWeight:700,fontSize:11}}>
            ➕ חדש
          </button>
        </div>
        {loadingPresets ? <div style={{padding:14,textAlign:"center",color:T.textMuted,fontSize:12}}>טוען...</div>
          : <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {presets.map(p => (
            <div key={p.id} style={{
              display:"flex",gap:8,alignItems:"stretch",
              border:`2px solid ${selectedPreset?.id===p.id?"#8B5CF6":T.border}`,
              borderRadius:10,background:selectedPreset?.id===p.id?"#8B5CF608":T.card,
              overflow:"hidden"
            }}>
              <button onClick={()=>{setSelectedPreset(p);setTask(p.default_task||"");}}
                style={{
                  flex:1,textAlign:"right",padding:"12px 14px",cursor:"pointer",
                  border:"none",background:"transparent",
                  display:"flex",gap:12,alignItems:"center",fontFamily:"inherit"
                }}>
                <span style={{fontSize:24}}>{p.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:T.text,fontWeight:700,fontSize:13}}>{p.name}</div>
                  <div style={{color:T.textMuted,fontSize:11,marginTop:2}}>{p.description}</div>
                </div>
                {p.agent_id && <Tag label="פעיל" color="#10B981"/>}
              </button>
              <div style={{display:"flex",flexDirection:"column",borderRight:`1px solid ${T.border}`}}>
                <button onClick={(e)=>{e.stopPropagation();setEditingPreset(p);}}
                  style={{flex:1,padding:"0 12px",background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:T.textMuted,borderBottom:`1px solid ${T.border}`}}>✏️</button>
                <button onClick={(e)=>{e.stopPropagation();deletePreset(p.id);}}
                  style={{flex:1,padding:"0 12px",background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:T.textMuted}}>🗑</button>
              </div>
            </div>
          ))}
          {presets.length===0 && <div style={{padding:14,textAlign:"center",color:T.textMuted,fontSize:12}}>אין סוכנים עדיין — לחץ "חדש"</div>}
        </div>}
        {environmentId && <div style={{marginTop:12,fontSize:10,color:T.textDim,direction:"ltr",textAlign:"left"}}>env: {environmentId.slice(0,24)}...</div>}
      </Card>

      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:12,letterSpacing:1}}>משימה</div>
        <textarea value={task} onChange={e=>setTask(e.target.value)}
          placeholder="מה הסוכן צריך לעשות?"
          style={{width:"100%",minHeight:140,background:T.inputBg,border:`1px solid ${T.inputBorder}`,
            borderRadius:10,color:T.text,padding:12,fontSize:13,fontFamily:"inherit",
            direction:"rtl",resize:"vertical",boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={runTask} disabled={running||!task.trim()||!selectedPreset}
            style={{flex:1,padding:"12px",borderRadius:10,border:"none",cursor:running?"not-allowed":"pointer",
              background:running?T.border:"#8B5CF6",color:"#fff",fontWeight:700,fontSize:13}}>
            {running ? <><Spinner size={12} color="#fff"/> רץ...</> : "▶ הפעל סוכן"}
          </button>
          {running && <button onClick={stopStream}
            style={{padding:"12px 16px",borderRadius:10,border:`1px solid ${T.border}`,cursor:"pointer",
              background:T.card,color:T.text,fontWeight:700,fontSize:13}}>עצור</button>}
        </div>
        {error && <div style={{marginTop:10,padding:10,borderRadius:8,background:"#EF444415",color:"#EF4444",fontSize:12}}>{error}</div>}
      </Card>
    </div>

    {(session || events.length > 0) && (
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>זרם אירועים</div>
          {session && <span style={{fontSize:10,color:T.textDim,direction:"ltr"}}>session: {session.id?.slice(0,24)}...</span>}
        </div>
        <div style={{maxHeight:500,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
          {events.map((ev, i) => {
            // Handle both new "agent.message" and old "agent" event types
            if (ev.type === "agent" || ev.type === "agent.message" || ev.type === "agent.thinking") {
              const text = (ev.content || []).filter(c=>c.type==="text").map(c=>c.text).join("");
              if (!text) return null;
              const isThinking = ev.type === "agent.thinking";
              return <div key={i} style={{padding:12,borderRadius:10,background:isThinking?"#64748B08":"#8B5CF608",border:`1px solid ${isThinking?"#64748B25":"#8B5CF625"}`}}>
                <div style={{fontSize:10,color:isThinking?"#64748B":"#8B5CF6",fontWeight:700,marginBottom:4}}>{isThinking?"💭 THINKING":"🤖 AGENT"}</div>
                <div style={{color:T.text,fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",direction:"rtl"}}>{text}</div>
              </div>;
            }
            if (ev.type === "user") {
              const text = (ev.content || []).filter(c=>c.type==="text").map(c=>c.text).join("");
              return <div key={i} style={{padding:10,borderRadius:10,background:"#10B98108",border:`1px solid #10B98125`}}>
                <div style={{fontSize:10,color:"#10B981",fontWeight:700,marginBottom:4}}>👤 USER</div>
                <div style={{color:T.textSec,fontSize:12,direction:"rtl"}}>{text}</div>
              </div>;
            }
            if (ev.type === "agent_tool_use" || ev.type === "tool_use" || ev.type === "agent.tool_use") {
              const name = ev.tool_name || ev.name || "tool";
              return <div key={i} style={{padding:"8px 12px",borderRadius:8,background:"#F59E0B12",border:`1px solid #F59E0B25`,fontSize:11,color:"#B45309",direction:"ltr",fontFamily:"monospace"}}>
                🔧 {name}{ev.input ? ` ${JSON.stringify(ev.input).slice(0,140)}` : ""}
              </div>;
            }
            if (ev.type === "agent_tool_result" || ev.type === "tool_result" || ev.type === "agent.tool_result") {
              const content = Array.isArray(ev.content) ? ev.content.map(c=>c.text||"").join("") : (typeof ev.content === "string" ? ev.content : JSON.stringify(ev.content||"").slice(0,300));
              const isErr = ev.is_error;
              return <div key={i} style={{padding:"8px 12px",borderRadius:8,background:isErr?"#EF444412":T.inputBg,border:`1px solid ${isErr?"#EF444425":T.border}`,fontSize:10,color:isErr?"#EF4444":T.textMuted,direction:"ltr",fontFamily:"monospace",whiteSpace:"pre-wrap",maxHeight:140,overflow:"auto"}}>
                {isErr?"✗":"✓"} {content.slice(0,400)}
              </div>;
            }
            if (ev.type === "status_running") {
              return <div key={i} style={{fontSize:10,color:"#3B82F6",direction:"ltr",fontFamily:"monospace",padding:"4px 8px"}}>▶ session started</div>;
            }
            if (ev.type === "model_request_start") {
              return <div key={i} style={{fontSize:10,color:T.textDim,direction:"ltr",fontFamily:"monospace",padding:"4px 8px"}}>⟳ model request...</div>;
            }
            if (ev.type === "model_request_end") {
              const u = ev.usage || {};
              return <div key={i} style={{fontSize:10,color:T.textDim,direction:"ltr",fontFamily:"monospace",padding:"4px 8px"}}>
                ✓ model done — in:{u.input_tokens||0} out:{u.output_tokens||0} {u.cache_read_input_tokens?`cache:${u.cache_read_input_tokens}`:""}
              </div>;
            }
            if (ev.type === "status_idle" || ev.type === "session.status_idle") {
              return <div key={i} style={{padding:10,borderRadius:8,background:"#10B98112",color:"#10B981",fontSize:12,fontWeight:700,textAlign:"center"}}>
                ✓ הסוכן סיים
              </div>;
            }
            return <div key={i} style={{fontSize:10,color:T.textDim,direction:"ltr",fontFamily:"monospace",padding:"2px 8px"}}>{ev.type}</div>;
          })}
          {running && events.length===0 && <div style={{padding:20,textAlign:"center",color:T.textMuted,fontSize:12}}>
            <Spinner size={14} color="#8B5CF6"/> מתחבר...
          </div>}
        </div>
      </Card>
    )}

    {editingPreset !== null && (
      <div style={{marginTop:16}}>
        <PresetEditor preset={editingPreset.id?editingPreset:null} onSave={savePreset} onCancel={()=>setEditingPreset(null)}/>
      </div>
    )}

    <div style={{marginTop:16}}>
      <ShortLinksCard/>
    </div>
  </div>;
}

// BUSINESSES
// Knowledge Base section for a business
function KnowledgeBaseSection({ biz }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function loadDocs() {
    try {
      const r = await authFetch(`/api/documents?business_id=${biz.id}`);
      if (r.ok) setDocs(await r.json());
    } catch{}
  }

  useEffect(()=>{ loadDocs(); }, [biz.id]);

  async function saveText() {
    if (!newTitle || !newContent) { alert("חסר כותרת או תוכן"); return; }
    setUploading(true);
    try {
      const r = await authFetch("/api/documents", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ business_id: biz.id, title: newTitle, content: newContent, category: newCategory || null, file_type: "text" })
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "שגיאה");
      setNewTitle(""); setNewContent(""); setNewCategory("");
      setShowAdd(false);
      loadDocs();
    } catch(e) { alert("שגיאה: " + e.message); }
    setUploading(false);
  }

  async function uploadPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("קובץ גדול מדי (מקסימום 10MB)"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await authFetch("/api/documents", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ business_id: biz.id, title: file.name.replace(/\.pdf$/i, ""), pdf_base64: base64, file_type: "pdf", category: newCategory || null })
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "שגיאה");
      setNewCategory("");
      loadDocs();
    } catch(e) { alert("שגיאה: " + e.message); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteDoc(id) {
    if (!confirm("למחוק את המסמך?")) return;
    try {
      await authFetch(`/api/documents/${id}`, { method:"DELETE" });
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch(e) { alert("שגיאה: " + e.message); }
  }

  const totalSize = docs.reduce((s,d) => s + (d.size_bytes||0), 0);

  return <div style={{background:"#3B82F608",border:`1px solid #3B82F633`,borderRadius:10,padding:12,marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
      <div style={{color:"#3B82F6",fontSize:11,fontWeight:700}}>📚 בסיס ידע — {docs.length} מסמכים ({(totalSize/1024).toFixed(1)} KB)</div>
      <Btn sm bg="#3B82F615" color="#3B82F6" onClick={()=>setShowAdd(s=>!s)}>
        {showAdd ? "סגור" : "+ הוסף מסמך"}
      </Btn>
    </div>
    <div style={{color:T.textDim,fontSize:10,marginBottom:10,lineHeight:1.5}}>
      💡 העלה מחירונים, FAQs, תיאורי שירותים, תקנון וכד'. Claude ישתמש במידע הזה כשיצור פוסטים או יענה לתגובות — <b>מידע מדויק במקום המצאות.</b>
    </div>

    {showAdd && <div style={{background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:10,padding:12,marginBottom:10}}>
      <input type="text" placeholder="כותרת (למשל: מחירון 2026)" value={newTitle} onChange={e=>setNewTitle(e.target.value)}
        style={{width:"100%",background:T.bg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"8px 10px",fontSize:12,fontFamily:"inherit",marginBottom:8,boxSizing:"border-box",direction:"rtl"}}/>
      <input type="text" placeholder="קטגוריה אופציונלית (מחירים / FAQ / שירותים / ...)" value={newCategory} onChange={e=>setNewCategory(e.target.value)}
        style={{width:"100%",background:T.bg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"8px 10px",fontSize:12,fontFamily:"inherit",marginBottom:8,boxSizing:"border-box",direction:"rtl"}}/>
      <textarea placeholder="תוכן (עברית או אנגלית)..." value={newContent} onChange={e=>setNewContent(e.target.value)}
        style={{width:"100%",minHeight:120,background:T.bg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:10,fontSize:12,fontFamily:"inherit",direction:"rtl",resize:"vertical",boxSizing:"border-box",lineHeight:1.5,marginBottom:8}}/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <Btn sm disabled={uploading} grad="linear-gradient(135deg,#3B82F6,#8B5CF6)" onClick={saveText}>
          {uploading ? <><Spinner size={10}/>שומר...</> : "שמור טקסט"}
        </Btn>
        <div style={{color:T.textDim,fontSize:11}}>או</div>
        <input type="file" ref={fileInputRef} accept=".pdf" onChange={uploadPdf} style={{display:"none"}}/>
        <Btn sm bg="#3B82F615" color="#3B82F6" disabled={uploading} onClick={()=>fileInputRef.current?.click()}>
          📄 העלה PDF
        </Btn>
      </div>
    </div>}

    {docs.length > 0 && <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {docs.map(d => <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:T.inputBg,borderRadius:8,border:`1px solid ${T.borderLight}`}}>
        <span style={{fontSize:14}}>{d.file_type === "pdf" ? "📄" : "📝"}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:T.text,fontSize:12,fontWeight:600,direction:"rtl",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
          <div style={{color:T.textDim,fontSize:10}}>
            {d.category ? `${d.category} · ` : ""}{(d.size_bytes/1024).toFixed(1)} KB · {new Date(d.created_at).toLocaleDateString("he-IL")}
          </div>
        </div>
        <button onClick={()=>deleteDoc(d.id)} style={{background:"transparent",border:"none",color:"#EF4444",fontSize:14,cursor:"pointer",padding:"4px 8px"}}>🗑️</button>
      </div>)}
    </div>}
  </div>;
}

// ── SEO Report display panel ──
function SeoReportPanel({ report }) {
  if (!report) return null;
  const scoreColor = report.score_color || (report.score >= 70 ? "#10B981" : report.score >= 50 ? "#F59E0B" : "#EF4444");
  return <div style={{background:"#34A85308",border:"1px solid #34A85322",borderRadius:12,padding:16,marginTop:8}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
      <div style={{width:56,height:56,borderRadius:"50%",background:`conic-gradient(${scoreColor} ${report.score||0}%, #e0e0e0 0)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:scoreColor}}>{report.score||0}</div>
      </div>
      <div>
        <div style={{fontSize:14,fontWeight:700,color:scoreColor}}>{report.score_label||"SEO Score"}</div>
        {report.quick_wins?.length>0&&<div style={{fontSize:11,color:T.textSec,marginTop:2}}>💡 {report.quick_wins[0]}</div>}
      </div>
    </div>
    {report.keywords?.primary?.length>0&&<div style={{marginBottom:10}}>
      <div style={{color:T.textMuted,fontSize:10,fontWeight:700,marginBottom:4}}>🎯 מילות מפתח ראשיות</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{report.keywords.primary.map((k,i)=><Tag key={i} label={k} color="#34A853"/>)}</div>
    </div>}
    {report.keywords?.missing?.length>0&&<div style={{marginBottom:10}}>
      <div style={{color:T.textMuted,fontSize:10,fontWeight:700,marginBottom:4}}>🚀 הזדמנויות (מילים חסרות)</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{report.keywords.missing.map((k,i)=><Tag key={i} label={k} color="#F59E0B"/>)}</div>
    </div>}
    {report.on_page?.length>0&&<div style={{marginBottom:10}}>
      <div style={{color:T.textMuted,fontSize:10,fontWeight:700,marginBottom:6}}>📋 On-Page</div>
      {report.on_page.slice(0,3).map((item,i)=><div key={i} style={{background:T.inputBg,borderRadius:8,padding:"8px 10px",marginBottom:6,fontSize:11}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
          <Tag label={item.priority||"בינוני"} color={item.priority==="גבוה"?"#EF4444":"#F59E0B"}/>
          <span style={{color:T.text,fontWeight:600}}>{item.issue}</span>
        </div>
        <div style={{color:"#34A853",direction:"rtl"}}>→ {item.fix}</div>
      </div>)}
    </div>}
    {report.content_gaps?.length>0&&<div style={{marginBottom:10}}>
      <div style={{color:T.textMuted,fontSize:10,fontWeight:700,marginBottom:6}}>✍️ פערי תוכן</div>
      {report.content_gaps.map((g,i)=><div key={i} style={{background:"#8B5CF608",borderRadius:8,padding:"8px 10px",marginBottom:6,fontSize:11}}>
        <div style={{color:"#8B5CF6",fontWeight:700,marginBottom:2}}>{g.topic}</div>
        <div style={{color:T.textSec,direction:"rtl",marginBottom:2}}>{g.why}</div>
        <div style={{color:T.accent,fontStyle:"italic"}}>💡 {g.idea}</div>
      </div>)}
    </div>}
    {report.local_seo&&<div style={{background:"#3B82F608",borderRadius:8,padding:10}}>
      <div style={{color:"#3B82F6",fontSize:11,fontWeight:700,marginBottom:4}}>📍 Local SEO</div>
      <div style={{color:T.textSec,fontSize:11,direction:"rtl"}}>{report.local_seo}</div>
    </div>}
  </div>;
}

function Businesses({ businesses, setBusinesses, posts }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:"", icon:BIZ_ICONS[0], color:BIZ_COLORS[0], url:"", description:"" });
  const [scanning, setScanning] = useState({});
  const [scanProgress, setScanProgress] = useState({});
  const [scrapingComp, setScrapingComp] = useState({});
  const [newCompUrl, setNewCompUrl] = useState({});
  // P2: Lead capture
  const [leadsModal, setLeadsModal] = useState(null);
  const [leadsCount, setLeadsCount] = useState({});
  // P3: SEO report
  const [seoLoading, setSeoLoading] = useState({});
  // P4: GBP
  const [gbpLoading, setGbpLoading] = useState({});
  const [gbpReviews, setGbpReviews] = useState({});

  function updateBiz(id, upd) { setBusinesses(p=>p.map(b=>b.id===id?{...b,...upd}:b)); }

  function addBiz() {
    if (!form.name.trim()) return;
    setBusinesses(p=>[...p,{ id:Date.now().toString(), ...form, social:{}, scanResult:null }]);
    setForm({ name:"", icon:BIZ_ICONS[0], color:BIZ_COLORS[0], url:"", description:"" });
    setAdding(false);
  }
  async function removeBiz(id) {
    if (!confirm("למחוק את העסק? כל הפוסטים שלו יימחקו גם")) return;
    // Delete from server FIRST, then update state
    try { await authFetch(`/api/businesses/${id}`, { method: "DELETE" }); } catch {}
    setBusinesses(p=>p.filter(b=>b.id!==id));
    setPosts(p=>p.filter(post=>{
      const biz = businesses.find(b=>b.id===id);
      return !biz || post.business !== biz.name;
    }));
  }

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
                {biz.landing_page?.enabled&&<Tag label="📋 ליד'ים" color="#3B82F6"/>}
                {biz.social?.gbp?.connected&&<Tag label="📍 GBP" color="#34A853"/>}
                {biz.scanResult?.seo_report&&<Tag label={`SEO ${biz.scanResult.seo_report.score||"?"}`} color={biz.scanResult.seo_report.score_color||"#34A853"}/>}
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
            {/* Name edit */}
            <div style={{marginBottom:14}}>
              <div style={{color:T.textMuted,fontSize:11,marginBottom:4}}>שם העסק</div>
              <input value={biz.name||""} onChange={e=>{
                const oldName = biz.name;
                const newName = e.target.value;
                updateBiz(biz.id, {name: newName});
                // Also update posts that reference this business by name
                if (oldName && newName && oldName !== newName) {
                  // Posts will be updated via the parent setPosts if needed
                }
              }}
                style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,padding:"9px 12px",color:T.text,fontSize:14,fontWeight:700,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>

            {/* Icon & Color edit */}
            <div style={{display:"flex",gap:16,marginBottom:14,flexWrap:"wrap"}}>
              <div>
                <div style={{color:T.textMuted,fontSize:11,marginBottom:6}}>אייקון</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {BIZ_ICONS.map(ic=><button key={ic} onClick={()=>updateBiz(biz.id,{icon:ic})}
                    style={{width:32,height:32,background:biz.icon===ic?"#8B5CF612":T.inputBg,
                      border:`1px solid ${biz.icon===ic?"#8B5CF6":T.inputBorder}`,borderRadius:8,cursor:"pointer",fontSize:14}}>{ic}</button>)}
                </div>
              </div>
              <div>
                <div style={{color:T.textMuted,fontSize:11,marginBottom:6}}>צבע</div>
                <div style={{display:"flex",gap:4}}>
                  {BIZ_COLORS.map(c=><button key={c} onClick={()=>updateBiz(biz.id,{color:c})}
                    style={{width:28,height:28,background:c,borderRadius:8,cursor:"pointer",
                      border:`2px solid ${biz.color===c?"#fff":"transparent"}`,boxShadow:biz.color===c?`0 0 0 2px ${c}`:""}}/>)}
                </div>
              </div>
            </div>

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

            {/* WhatsApp number */}
            <div style={{marginBottom:14}}>
              <div style={{color:T.textMuted,fontSize:11,marginBottom:4}}>📱 מספר וואטסאפ עסקי (עם קוד מדינה)</div>
              <input value={biz.whatsapp_number||""} onChange={e=>updateBiz(biz.id,{whatsapp_number:e.target.value})}
                onBlur={async()=>{try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({whatsapp_number:biz.whatsapp_number||""})});}catch{}}}
                placeholder="972501234567 (ללא + או מקפים)"
                style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,padding:"9px 12px",color:T.text,fontSize:12,fontFamily:"monospace",boxSizing:"border-box",direction:"ltr"}}/>
              <div style={{color:T.textDim,fontSize:10,marginTop:4,lineHeight:1.5}}>
                💡 יוצגו לידים ישירות אליך. Claude יוסיף לינק ל-wa.me במענים על תגובות מחיר/זמינות.
                {biz.whatsapp_number && <div style={{marginTop:4,color:"#25D366",fontWeight:600}}>✓ לינק: wa.me/{(biz.whatsapp_number||"").replace(/\D/g,"")}</div>}
              </div>
            </div>

            {/* Visual Identity — used by Gemini/Veo image/video generation */}
            <div style={{marginBottom:14,padding:12,background:"#8B5CF608",border:`1px solid #8B5CF633`,borderRadius:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:8,flexWrap:"wrap"}}>
                <div style={{color:"#8B5CF6",fontSize:11,fontWeight:700}}>🎨 זהות ויזואלית (ל-AI תמונות/סרטונים)</div>
                <Btn sm bg="#8B5CF615" color="#8B5CF6" disabled={scanning[`vi_${biz.id}`]}
                  onClick={async()=>{
                    setScanning(p=>({...p,[`vi_${biz.id}`]:true}));
                    try {
                      const historyPosts = (posts||[]).filter(p=>p.business===biz.name).slice(0,10).map(p=>p.content).join("\n---\n");
                      const r = await authFetch("/api/content/claude", {
                        method:"POST", headers:{"Content-Type":"application/json"},
                        body: JSON.stringify({
                          prompt: `You are a brand visual consultant. Based on the business info below, write a concise VISUAL IDENTITY description in English that will guide AI image/video generation. Include: what the product/service physically LOOKS LIKE (actual objects, settings, people, activities — be concrete, not abstract), signature visual elements, color palette, photographic style (cinematic/editorial/documentary/bright lifestyle/etc.), mood, and 3-5 specific visual motifs that should repeat across all media. Output ONLY the description as a single paragraph of 80-150 words, no headings, no preamble.\n\nBusiness name: ${biz.name}\nWebsite: ${biz.url||"N/A"}\nDescription: ${biz.description||"N/A"}\n\nRecent post topics (for subject clues):\n${historyPosts||"(none)"}`,
                          maxTokens: 700,
                        }),
                      });
                      const d = await r.json();
                      const vi = (d.text||"").trim();
                      if (vi) {
                        updateBiz(biz.id, { visual_identity: vi });
                        try { await authFetch(`/api/businesses/${biz.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({visual_identity: vi})}); } catch {}
                      }
                    } catch(e) { alert("שגיאה ב-auto-extract: "+e.message); }
                    setScanning(p=>({...p,[`vi_${biz.id}`]:false}));
                  }}>
                  {scanning[`vi_${biz.id}`]?<><Spinner size={10}/> מחלץ...</>:"✨ חלץ אוטומטית"}
                </Btn>
              </div>
              <textarea value={biz.visual_identity||""} onChange={e=>updateBiz(biz.id,{visual_identity:e.target.value})}
                onBlur={async()=>{try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({visual_identity:biz.visual_identity||""})});}catch{}}}
                placeholder="תיאור איך המוצר/השירות נראה פיזית, סגנון צילום, צבעים, mood, מוטיבים חוזרים... (ישמש את Imagen/Veo ליצירת תמונות/סרטונים עקביים)"
                style={{width:"100%",minHeight:80,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,padding:12,fontSize:11,fontFamily:"inherit",direction:"ltr",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
              <div style={{color:T.textDim,fontSize:10,marginTop:6}}>💡 טקסט באנגלית. ככל שיותר ספציפי ("wooden bakery counter with fresh sourdough loaves, warm golden light, hands kneading dough") — התמונות יהיו יותר מדויקות</div>
            </div>

            {/* Publish schedule per business */}
            <div style={{background:"#F59E0B08",border:`1px solid #F59E0B33`,borderRadius:10,padding:12,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
                <div style={{color:"#F59E0B",fontSize:11,fontWeight:700}}>⏰ תזמון פרסום אוטומטי</div>
                <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!biz.schedule?.enabled}
                    onChange={async e=>{
                      const sched = {...(biz.schedule||{}), enabled: e.target.checked, days: biz.schedule?.days||[0,2,4], times: biz.schedule?.times||["10:00"]};
                      updateBiz(biz.id, {schedule: sched});
                      try { await authFetch(`/api/businesses/${biz.id}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({schedule: sched})}); } catch {}
                    }}/>
                  <span style={{color:T.textSec,fontSize:11,fontWeight:600}}>{biz.schedule?.enabled ? "פעיל" : "כבוי"}</span>
                </label>
              </div>
              {biz.schedule?.enabled && <>
                <div style={{marginBottom:10}}>
                  <div style={{color:T.textSec,fontSize:11,fontWeight:600,marginBottom:6}}>ימים בשבוע:</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"].map((dayName,idx)=>{
                      const selected = (biz.schedule?.days||[]).includes(idx);
                      return <button key={idx}
                        onClick={async()=>{
                          const days = biz.schedule?.days || [];
                          const newDays = selected ? days.filter(d=>d!==idx) : [...days, idx].sort();
                          const sched = {...(biz.schedule||{}), days: newDays};
                          updateBiz(biz.id,{schedule:sched});
                          try { await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({schedule:sched})}); } catch {}
                        }}
                        style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${selected?"#F59E0B":T.border}`,background:selected?"#F59E0B":T.inputBg,color:selected?"#fff":T.textSec,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{dayName}</button>;
                    })}
                  </div>
                </div>
                <div style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{color:T.textSec,fontSize:11,fontWeight:600}}>שעות פרסום (באותם ימים):</div>
                    <Btn sm bg="#F59E0B15" color="#F59E0B"
                      onClick={async()=>{
                        const times = [...(biz.schedule?.times||[]), "12:00"];
                        const sched = {...(biz.schedule||{}), times};
                        updateBiz(biz.id,{schedule:sched});
                        try { await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({schedule:sched})}); } catch {}
                      }}>+ הוסף שעה</Btn>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {(biz.schedule?.times||[]).map((time,idx)=>
                      <div key={idx} style={{display:"flex",gap:4,alignItems:"center",background:T.inputBg,borderRadius:8,padding:"4px 8px",border:`1px solid ${T.border}`}}>
                        <input type="time" value={time}
                          onChange={async e=>{
                            const times = [...(biz.schedule?.times||[])];
                            times[idx] = e.target.value;
                            const sched = {...(biz.schedule||{}), times};
                            updateBiz(biz.id,{schedule:sched});
                          }}
                          onBlur={async()=>{
                            try { await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({schedule:biz.schedule})}); } catch {}
                          }}
                          style={{background:"transparent",border:"none",color:T.text,fontSize:12,fontFamily:"inherit",fontWeight:600}}/>
                        <button onClick={async()=>{
                          const times = (biz.schedule?.times||[]).filter((_,i)=>i!==idx);
                          const sched = {...(biz.schedule||{}), times};
                          updateBiz(biz.id,{schedule:sched});
                          try { await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({schedule:sched})}); } catch {}
                        }} style={{background:"transparent",border:"none",color:"#EF4444",cursor:"pointer",fontSize:14,padding:0}}>×</button>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{color:T.textDim,fontSize:10,marginTop:8,lineHeight:1.5}}>
                  💡 כשתיצור פוסט + מדיה ל-{biz.name}, הוא יתוזמן אוטומטית למשבצת הפנויה הבאה ויפורסם ללא אישור.
                </div>
              </>}
            </div>

            {/* Auto-reply to comments */}
            <div style={{background:"#10B98108",border:`1px solid #10B98133`,borderRadius:10,padding:12,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
                <div style={{color:"#10B981",fontSize:11,fontWeight:700}}>💬 מענה אוטומטי לתגובות</div>
                <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!biz.schedule?.auto_reply_enabled}
                    onChange={async e=>{
                      const sched = {...(biz.schedule||{}), auto_reply_enabled: e.target.checked};
                      updateBiz(biz.id, {schedule: sched});
                      try { await authFetch(`/api/businesses/${biz.id}`, {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({schedule: sched})}); } catch {}
                    }}/>
                  <span style={{color:T.textSec,fontSize:11,fontWeight:600}}>{biz.schedule?.auto_reply_enabled ? "פעיל" : "כבוי"}</span>
                </label>
              </div>
              {biz.schedule?.auto_reply_enabled && <>
                <div style={{marginBottom:10}}>
                  <div style={{color:T.textSec,fontSize:11,fontWeight:600,marginBottom:6}}>הנחיות למענה (אופציונלי):</div>
                  <textarea
                    value={biz.schedule?.auto_reply_personality||""}
                    onChange={e=>{
                      const sched = {...(biz.schedule||{}), auto_reply_personality: e.target.value};
                      updateBiz(biz.id,{schedule:sched});
                    }}
                    onBlur={async()=>{try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({schedule:biz.schedule})});}catch{}}}
                    placeholder="למשל: תמיד מזמין ליצור קשר בוואטסאפ 050-1234567, אל תדבר על מחירים, השתמש באמוג'י 🎬 לפעמים..."
                    style={{width:"100%",minHeight:60,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:10,color:T.text,padding:10,fontSize:11,fontFamily:"inherit",direction:"rtl",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                </div>
                <div style={{color:T.textDim,fontSize:10,lineHeight:1.5}}>
                  💡 Claude יענה על תגובות בפוסטים של {biz.name} בטון המותג, כל 10 דקות.
                  <br/>⚠️ דורש הרשאת <code style={{background:T.inputBg,padding:"1px 4px",borderRadius:3,fontSize:9}}>pages_manage_engagement</code> — חבר מחדש את הפייסבוק אם המענה לא עובד.
                </div>
              </>}
            </div>

            {/* Knowledge Base */}
            <KnowledgeBaseSection biz={biz} />

            {/* Landing Page (Lead Capture) */}
            <div style={{background:"#3B82F608",border:`1px solid #3B82F633`,borderRadius:10,padding:12,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
                <div style={{color:"#3B82F6",fontSize:11,fontWeight:700}}>📋 דף לידים (Landing Page)</div>
                <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!biz.landing_page?.enabled}
                    onChange={async e=>{
                      const lp={...(biz.landing_page||{}),enabled:e.target.checked};
                      updateBiz(biz.id,{landing_page:lp});
                      try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({landing_page:lp})});}catch{}
                    }}/>
                  <span style={{color:T.textSec,fontSize:11,fontWeight:600}}>{biz.landing_page?.enabled?"פעיל":"כבוי"}</span>
                </label>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <span style={{color:T.textDim,fontSize:11,whiteSpace:"nowrap"}}>/l/</span>
                <input value={biz.landing_page?.slug||""} onChange={e=>updateBiz(biz.id,{landing_page:{...(biz.landing_page||{}),slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")}})}
                  onBlur={async()=>{try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({landing_page:biz.landing_page})});}catch{}}}
                  placeholder="my-business"
                  style={{flex:1,background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,padding:"6px 10px",color:T.text,fontSize:11,fontFamily:"monospace",boxSizing:"border-box"}}/>
                {biz.landing_page?.slug&&<Btn sm bg="#3B82F615" color="#3B82F6" onClick={()=>window.open(`/l/${biz.landing_page.slug}`)}>↗ פתח</Btn>}
                {biz.landing_page?.slug&&<Btn sm bg={T.inputBg} color={T.textMuted} onClick={()=>navigator.clipboard.writeText(window.location.origin+"/l/"+biz.landing_page.slug).then(()=>alert("הועתק!"))}>העתק</Btn>}
              </div>
              <div className="two-col-grid" style={{display:"grid",gap:8,marginBottom:8}}>
                <div>
                  <div style={{color:T.textMuted,fontSize:10,marginBottom:3}}>כותרת</div>
                  <input value={biz.landing_page?.headline||""} onChange={e=>updateBiz(biz.id,{landing_page:{...(biz.landing_page||{}),headline:e.target.value}})}
                    onBlur={async()=>{try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({landing_page:biz.landing_page})});}catch{}}}
                    placeholder="השאיר פרטים ונחזור אליך!"
                    style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,padding:"6px 10px",color:T.text,fontSize:11,fontFamily:"inherit",boxSizing:"border-box",direction:"rtl"}}/>
                </div>
                <div>
                  <div style={{color:T.textMuted,fontSize:10,marginBottom:3}}>כפתור שליחה</div>
                  <input value={biz.landing_page?.cta_text||""} onChange={e=>updateBiz(biz.id,{landing_page:{...(biz.landing_page||{}),cta_text:e.target.value}})}
                    onBlur={async()=>{try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({landing_page:biz.landing_page})});}catch{}}}
                    placeholder="שלח"
                    style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,padding:"6px 10px",color:T.text,fontSize:11,fontFamily:"inherit",boxSizing:"border-box",direction:"rtl"}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10}}>
                {[{k:"collect_phone",l:"📱 טלפון"},{k:"collect_email",l:"📧 אימייל"},{k:"collect_message",l:"✉️ הודעה"}].map(f=>(
                  <label key={f.k} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:11,color:T.textSec}}>
                    <input type="checkbox" checked={biz.landing_page?.[f.k]!==false}
                      onChange={async e=>{
                        const lp={...(biz.landing_page||{}),[f.k]:e.target.checked};
                        updateBiz(biz.id,{landing_page:lp});
                        try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({landing_page:lp})});}catch{}
                      }}/>{f.l}
                  </label>
                ))}
              </div>
              <Btn sm bg="#3B82F615" color="#3B82F6" onClick={async()=>{
                try{const r=await authFetch(`/api/leads?business_id=${biz.id}`);const d=await r.json();setLeadsModal({biz,leads:Array.isArray(d)?d:[]});}catch(e){alert("שגיאה: "+e.message);}
              }}>📋 ליד'ים {leadsCount[biz.id]?`(${leadsCount[biz.id]})`:""}</Btn>
            </div>

            {/* Social connections per business */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>רשתות חברתיות — {biz.name}</div>
                {/* Facebook OAuth connect button */}
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  {biz.social?.facebook?.connected && biz.social?.facebook?.tokens?.META_ACCESS_TOKEN
                    ? <div style={{display:"flex",alignItems:"center",gap:6,background:"#10B98110",border:"1px solid #10B98122",borderRadius:8,padding:"4px 10px"}}>
                        <span style={{color:"#10B981",fontSize:10}}>●</span>
                        <span style={{color:"#10B981",fontSize:11,fontWeight:600}}>📘 {biz.social.facebook.pageName || biz.social.facebook.tokens.META_PAGE_ID}</span>
                      </div>
                    : <button onClick={()=>window.location.href='/api/auth/facebook'}
                        style={{background:"linear-gradient(135deg,#1877F2,#42A5F5)",color:"#fff",border:"none",borderRadius:8,
                          padding:"6px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                        <span>📘</span> חבר פייסבוק
                      </button>
                  }
                  {biz.social?.instagram?.connected && biz.social?.instagram?.accountId
                    ? <div style={{display:"flex",alignItems:"center",gap:6,background:"#E1306C10",border:"1px solid #E1306C22",borderRadius:8,padding:"4px 10px"}}>
                        <span style={{color:"#E1306C",fontSize:10}}>●</span>
                        <span style={{color:"#E1306C",fontSize:11,fontWeight:600}}>📸 @{biz.social.instagram.username}</span>
                      </div>
                    : biz.social?.facebook?.connected
                      ? <div style={{background:"#E1306C10",border:"1px dashed #E1306C44",borderRadius:8,padding:"4px 10px",fontSize:10,color:"#E1306C"}}>
                          📸 Instagram: חבר IG לדף FB ולחץ "חבר פייסבוק" שוב
                        </div>
                      : null
                  }
                </div>
              </div>
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
                      {plat.fields.map(f=>{
                        const isSecret = f.key.includes("TOKEN") || f.key.includes("PASSWORD") || f.key.includes("SECRET");
                        return <div key={f.key}>
                          <div style={{color:T.textDim,fontSize:9,marginBottom:2}}>{f.label}</div>
                          <input value={conn.tokens?.[f.key]||""} onChange={e=>setSocialToken(biz.id,plat.id,f.key,e.target.value)}
                            placeholder={f.hint} type={isSecret?"password":"text"}
                            style={{width:"100%",background:T.card,border:`1px solid ${T.inputBorder}`,borderRadius:8,
                              padding:"6px 8px",color:T.text,fontSize:10,fontFamily:"monospace",boxSizing:"border-box"}}/>
                        </div>;
                      })}
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

            {/* SEO Report */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>🔍 דוח SEO</div>
                <Btn sm grad="linear-gradient(135deg,#34A853,#0EA5E9)" disabled={!!seoLoading[biz.id]}
                  onClick={async()=>{
                    setSeoLoading(p=>({...p,[biz.id]:true}));
                    try{
                      const r=await authFetch(`/api/seo-report/${biz.id}`,{method:"POST"});
                      const d=await r.json();
                      if(d.ok){updateBiz(biz.id,{scanResult:{...(biz.scanResult||{}),seo_report:d.report,seo_report_at:new Date().toISOString()}});}
                      else alert("שגיאה: "+(d.error||""));
                    }catch(e){alert("שגיאה: "+e.message);}
                    setSeoLoading(p=>({...p,[biz.id]:false}));
                  }}>
                  {seoLoading[biz.id]?<><Spinner size={10}/> מנתח...</>:"✨ נתח SEO"}
                </Btn>
              </div>
              {biz.scanResult?.seo_report&&<>
                <SeoReportPanel report={biz.scanResult.seo_report}/>
                {biz.scanResult?.seo_report_at&&<div style={{color:T.textDim,fontSize:9,marginTop:4}}>
                  נוצר: {new Date(biz.scanResult.seo_report_at).toLocaleString("he-IL")}
                </div>}
              </>}
            </div>

            {/* GBP — Google Business Profile */}
            <div style={{background:"#34A85308",border:`1px solid #34A85333`,borderRadius:10,padding:12,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
                <div style={{color:"#34A853",fontSize:11,fontWeight:700}}>📍 Google Business Profile</div>
                {biz.social?.gbp?.connected
                  ?<div style={{background:"#34A85310",borderRadius:8,padding:"4px 10px",fontSize:10,color:"#34A853",fontWeight:600}}>
                      ● {biz.social.gbp.google_email||"מחובר"}
                    </div>
                  :<button onClick={()=>window.location.href=`/api/auth/google?business_id=${biz.id}`}
                      style={{background:"linear-gradient(135deg,#34A853,#0EA5E9)",color:"#fff",border:"none",borderRadius:8,
                        padding:"6px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                      🔗 חבר Google
                    </button>}
              </div>
              <div style={{color:T.textDim,fontSize:10,marginBottom:8,lineHeight:1.5}}>
                פרסם עדכוני GBP, נהל ביקורות, הופיע בגוגל מפות. מתאים גם לעסקים ניידים (SAB).
              </div>
              {biz.social?.gbp?.connected&&<>
                <div style={{marginBottom:8}}>
                  <div style={{color:T.textMuted,fontSize:10,marginBottom:3}}>Location Name (accounts/.../locations/...)</div>
                  <input value={biz.social?.gbp?.location_name||""}
                    onChange={e=>{const s={...(biz.social||{}),gbp:{...(biz.social?.gbp||{}),location_name:e.target.value}};updateBiz(biz.id,{social:s});}}
                    onBlur={async()=>{try{await authFetch(`/api/businesses/${biz.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({social:biz.social})});}catch{}}}
                    placeholder="accounts/123456789/locations/987654321"
                    style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,padding:"6px 10px",color:T.text,fontSize:10,fontFamily:"monospace",boxSizing:"border-box"}}/>
                  <div style={{color:T.textDim,fontSize:9,marginTop:3}}>מצא אותו ב-Google Business Profile Manager → Info → שם ה-URL</div>
                </div>
                <Btn sm bg="#34A85315" color="#34A853" disabled={!!gbpLoading[`rv_${biz.id}`]||!biz.social?.gbp?.location_name}
                  onClick={async()=>{
                    setGbpLoading(p=>({...p,[`rv_${biz.id}`]:true}));
                    try{const r=await authFetch(`/api/gbp/reviews/${biz.id}`);const d=await r.json();if(d.reviews)setGbpReviews(p=>({...p,[biz.id]:d}));else alert(d.error||"שגיאה");}catch(e){alert("שגיאה: "+e.message);}
                    setGbpLoading(p=>({...p,[`rv_${biz.id}`]:false}));
                  }}>
                  {gbpLoading[`rv_${biz.id}`]?<><Spinner size={10}/> טוען...</>:"⭐ טען ביקורות"}
                </Btn>
                {gbpReviews[biz.id]?.reviews?.length>0&&<div style={{marginTop:10}}>
                  <div style={{color:T.textMuted,fontSize:10,marginBottom:6}}>
                    ⭐ ממוצע: {gbpReviews[biz.id].averageRating} · {gbpReviews[biz.id].reviews.length} ביקורות
                  </div>
                  {gbpReviews[biz.id].reviews.slice(0,5).map((rv,i)=>(
                    <div key={i} style={{background:T.inputBg,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                        <span style={{color:T.text,fontSize:11,fontWeight:600}}>{rv.reviewer?.displayName||"אנונימי"}</span>
                        <span style={{color:"#F59E0B",fontSize:10}}>{"★".repeat(Math.min(rv.starRating||0,5))}</span>
                      </div>
                      <div style={{color:T.textSec,fontSize:11,direction:"rtl",marginBottom:6,lineHeight:1.4}}>{(rv.comment||"(ללא טקסט)").slice(0,120)}</div>
                      {rv.reviewReply
                        ?<div style={{background:"#34A85310",borderRadius:6,padding:"5px 8px",fontSize:10,color:"#34A853"}}>✓ {rv.reviewReply.comment?.slice(0,80)}</div>
                        :<Btn sm bg="#34A85315" color="#34A853" disabled={!!gbpLoading[`rp_${i}`]}
                            onClick={async()=>{
                              setGbpLoading(p=>({...p,[`rp_${i}`]:true}));
                              try{const r=await authFetch("/api/gbp/reviews/reply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({review_name:rv.name,generate_ai:true,review_text:rv.comment,star_rating:rv.starRating,business_name:biz.name})});const d=await r.json();if(d.ok)alert("נשלח: "+d.reply);else alert("שגיאה: "+d.error);}catch(e){alert("שגיאה: "+e.message);}
                              setGbpLoading(p=>({...p,[`rp_${i}`]:false}));
                            }}>
                          {gbpLoading[`rp_${i}`]?<><Spinner size={10}/></>:"🤖 ענה AI"}
                        </Btn>
                      }
                    </div>
                  ))}
                </div>}
              </>}
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

    {/* Leads modal */}
    {leadsModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setLeadsModal(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,padding:24,maxWidth:600,width:"100%",maxHeight:"80vh",overflow:"auto",direction:"rtl",boxShadow:T.shadowLg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,color:T.text,fontSize:16}}>📋 ליד'ים — {leadsModal.biz.name}</h3>
          <button onClick={()=>setLeadsModal(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.textDim}}>✕</button>
        </div>
        {leadsModal.leads.length===0
          ?<div style={{textAlign:"center",color:T.textDim,padding:30}}>
            אין ליד'ים עדיין.<br/>
            <span style={{fontSize:12}}>שתף את הקישור: </span>
            <code style={{background:T.inputBg,padding:"2px 8px",borderRadius:4,fontSize:11,color:"#8B5CF6"}}>
              /l/{leadsModal.biz.landing_page?.slug}
            </code>
          </div>
          :<div>
            <div style={{color:T.textMuted,fontSize:11,marginBottom:12}}>{leadsModal.leads.length} ליד'ים סה"כ</div>
            {/* ── Kanban board ── */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[
                {key:"new",       label:"חדש",      color:"#3B82F6"},
                {key:"contacted", label:"נוצר קשר", color:"#F59E0B"},
                {key:"converted", label:"הומר",     color:"#10B981"},
                {key:"closed",    label:"סגור",     color:"#6B7280"},
              ].map(col=>{
                const colLeads = leadsModal.leads.filter(l=>(l.status||"new")===col.key);
                return <div key={col.key}>
                  {/* Column header */}
                  <div style={{background:col.color+"18",borderRadius:8,padding:"5px 10px",marginBottom:6,
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:col.color,fontSize:11,fontWeight:700}}>{col.label}</span>
                    <span style={{background:col.color,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{colLeads.length}</span>
                  </div>
                  {/* Cards */}
                  {colLeads.map(lead=>(
                    <div key={lead.id} style={{background:T.card,border:`1px solid ${T.borderLight}`,
                      borderRadius:8,padding:"8px 10px",marginBottom:6,boxShadow:T.shadow}}>
                      <div style={{color:T.text,fontWeight:700,fontSize:12,marginBottom:4}}>{lead.name}</div>
                      <div style={{fontSize:10,color:T.textDim,marginBottom:6}}>
                        {new Date(lead.created_at).toLocaleDateString("he-IL")}
                      </div>
                      {/* Contact links + WhatsApp */}
                      {lead.phone&&<div style={{display:"flex",gap:4,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                        <a href={`tel:${lead.phone}`} style={{color:"#25D366",fontSize:11,textDecoration:"none"}}>📱 {lead.phone}</a>
                        <a href={`https://wa.me/972${lead.phone.replace(/^0/,"")}`} target="_blank" rel="noreferrer"
                          style={{background:"#25D36618",color:"#25D366",fontSize:10,textDecoration:"none",
                            padding:"1px 6px",borderRadius:8,border:"1px solid #25D36630"}}>💬 WA</a>
                      </div>}
                      {lead.email&&<a href={`mailto:${lead.email}`} style={{color:"#3B82F6",fontSize:11,textDecoration:"none",display:"block",marginBottom:4}}>📧 {lead.email}</a>}
                      {lead.message&&<div style={{color:T.textDim,fontSize:10,direction:"rtl",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6}}>{lead.message}</div>}
                      {/* Move buttons */}
                      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                        {[
                          {key:"new",       label:"חדש",  color:"#3B82F6"},
                          {key:"contacted", label:"📞",   color:"#F59E0B"},
                          {key:"converted", label:"✅",   color:"#10B981"},
                          {key:"closed",    label:"🔒",   color:"#6B7280"},
                        ].filter(s=>s.key!==col.key).map(s=>(
                          <button key={s.key} onClick={async()=>{
                            try{
                              await authFetch(`/api/leads/${lead.id}`,{method:"PUT",
                                headers:{"Content-Type":"application/json"},
                                body:JSON.stringify({status:s.key})});
                              setLeadsModal(p=>({...p,leads:p.leads.map(l=>l.id===lead.id?{...l,status:s.key}:l)}));
                            }catch{}
                          }} style={{background:s.color+"18",color:s.color,
                            border:`1px solid ${s.color}30`,borderRadius:6,
                            padding:"2px 6px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>;
              })}
            </div>
          </div>
        }
      </div>
    </div>}
  </div>;
}

// PUBLISH
function Publish({ posts, setPosts, businesses }) {
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
      const contentHasHashtags = (post.hashtags||[]).some(h=>post.content.includes(h));
      const message = contentHasHashtags ? post.content : post.content + (hashtags ? "\n\n" + hashtags : "");

      if (platformId === "facebook") {
        const pageId = tokens.META_PAGE_ID;
        const accessToken = tokens.META_ACCESS_TOKEN;
        if (!pageId || !accessToken) throw new Error("חסר Page ID או Access Token");
        const videoUrl = post.video_url || post.pipeline?.videoUrl;
        const imageUrl = post.image_url || post.pipeline?.imageUrl;
        let endpoint, body;
        if (videoUrl) {
          endpoint = `https://graph.facebook.com/v25.0/${pageId}/videos`;
          body = { file_url: videoUrl, description: message, access_token: accessToken };
        } else if (imageUrl) {
          endpoint = `https://graph.facebook.com/v25.0/${pageId}/photos`;
          body = { url: imageUrl, message, access_token: accessToken };
        } else {
          endpoint = `https://graph.facebook.com/v25.0/${pageId}/feed`;
          body = { message, access_token: accessToken };
        }
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const d = await r.json();
        if (d.id || d.post_id) {
          const fbPostId = d.post_id||d.id;
          setResults(p=>({...p,[key]:{status:"ok",postId:fbPostId}}));
          setPosts?.(prev=>prev.map(p=>p.id===post.id?{...p, fbPostId, publishedAt:new Date().toISOString(), published:true}:p));
        } else {
          setResults(p=>({...p,[key]:{status:"error",msg: d.error?.message || "שגיאה בפרסום"}}));
        }
      } else if (platformId === "instagram") {
        const igUserId = tokens.META_IG_USER_ID;
        const accessToken = tokens.META_ACCESS_TOKEN;
        if (!igUserId || !accessToken) throw new Error("חסר IG User ID או Access Token");
        const videoUrl = post.video_url || post.pipeline?.videoUrl;
        const imageUrl = post.image_url || post.pipeline?.imageUrl;
        if (!imageUrl && !videoUrl) throw new Error("אינסטגרם דורש תמונה או וידאו — צור מדיה AI קודם");

        // Step 1: Create media container
        const containerBody = videoUrl
          ? { video_url: videoUrl, caption: message, media_type: "REELS", access_token: accessToken }
          : { image_url: imageUrl, caption: message, access_token: accessToken };
        const containerR = await fetch(`https://graph.facebook.com/v25.0/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(containerBody)
        });
        const container = await containerR.json();
        if (container.error) throw new Error(container.error.message);
        const creationId = container.id;
        if (!creationId) throw new Error("Instagram: missing creation ID");

        // Step 2: Wait for container to be ready, then publish
        await sleep(3000);
        const pubR = await fetch(`https://graph.facebook.com/v25.0/${igUserId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: creationId, access_token: accessToken })
        });
        const pubD = await pubR.json();
        if (pubD.error) throw new Error(pubD.error.message);
        if (pubD.id) {
          setResults(p=>({...p,[key]:{status:"ok",postId:pubD.id}}));
          setPosts?.(prev=>prev.map(p=>p.id===post.id?{...p, igPostId:pubD.id, publishedAt:new Date().toISOString(), published:true}:p));
        } else {
          setResults(p=>({...p,[key]:{status:"error",msg:"שגיאה לא צפויה"}}));
        }
      } else if (platformId === "wordpress") {
        const wpUrl = tokens.WORDPRESS_URL;
        const wpPassword = tokens.WORDPRESS_APP_PASSWORD;
        if (!wpUrl || !wpPassword) throw new Error("חסר WordPress URL או App Password");
        // WordPress REST API — create a post
        const wpR = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Basic " + btoa("admin:" + wpPassword)
          },
          body: JSON.stringify({
            title: post.content.split("\n")[0].replace(/[#🎬✈️🍕💇🏋️🏠🚗📸🎵🛍️💻🎓🏥⚖️]/g,"").trim(),
            content: post.content.replace(/\n/g, "<br/>"),
            status: "publish"
          })
        });
        const wpD = await wpR.json();
        if (wpD.id) {
          setResults(p=>({...p,[key]:{status:"ok",postId:wpD.id, wpLink: wpD.link}}));
          setPosts?.(prev=>prev.map(p=>p.id===post.id?{...p, wpPostId:wpD.id, publishedAt:new Date().toISOString(), published:true}:p));
        } else {
          setResults(p=>({...p,[key]:{status:"error",msg: wpD.message||"שגיאה ב-WordPress"}}));
        }
      } else if (platformId === "tiktok") {
        const accessToken = tokens.TIKTOK_ACCESS_TOKEN;
        if (!accessToken) throw new Error("חסר TIKTOK_ACCESS_TOKEN");
        const r = await authFetch("/api/publish/tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: post.id, access_token: accessToken, privacy_level: "FOLLOWER_OF_CREATOR" })
        });
        const d = await r.json();
        if (d.ok) {
          setResults(p=>({...p,[key]:{status:"ok",postId:d.publish_id}}));
          setPosts?.(prev=>prev.map(p=>p.id===post.id?{...p,publishedAt:new Date().toISOString(),published:true}:p));
        } else {
          setResults(p=>({...p,[key]:{status:"error",msg:d.error||"שגיאת TikTok"}}));
        }
      } else if (platformId === "linkedin") {
        const accessToken = tokens.LINKEDIN_ACCESS_TOKEN;
        const authorUrn = tokens.LINKEDIN_AUTHOR_URN;
        if (!accessToken || !authorUrn) throw new Error("חסר LinkedIn Access Token או Author URN");
        const r = await authFetch("/api/publish/linkedin", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: post.id, access_token: accessToken, author_urn: authorUrn })
        });
        const d = await r.json();
        if (d.ok) {
          setResults(p=>({...p,[key]:{status:"ok",postId:d.id}}));
          setPosts?.(prev=>prev.map(p=>p.id===post.id?{...p,publishedAt:new Date().toISOString(),published:true}:p));
        } else {
          setResults(p=>({...p,[key]:{status:"error",msg:d.error||"שגיאת לינקדאין"}}));
        }
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
          פוסטים לפרסום — {selBiz.name} ({approved.length})
        </div>
        {approved.length===0
          ? <div style={{textAlign:"center",color:T.textDim,padding:30}}>אין פוסטים לפרסום ל-{selBiz.name} — צור פוסטים בדף תוכן</div>
          : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {approved.map(post=>{
              const platMatch = PLATFORMS.find(p=>post.platform?.includes(p.label.split(" ")[0]));
              return <div key={post.id} style={{background:T.inputBg,borderRadius:12,padding:14,border:`1px solid ${T.borderLight}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                  <Tag label={post.platform} color={platMatch?.color||"#888"}/>
                  <Tag label={post.type||"פוסט"} color={T.textMuted}/>
                  {post.pipeline?.done&&<Tag label="מדיה" color="#F59E0B"/>}
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

// ── Smart-scheduling helper: find top posting hours from published data ──
function computeBestPostHours(publishedPosts) {
  if (!publishedPosts.length) return null;
  const hourCounts = Array(24).fill(0);
  publishedPosts.forEach(p => {
    const ts = p.publishedAt || p.scheduled_at;
    if (ts) hourCounts[new Date(ts).getHours()]++;
  });
  const top = hourCounts
    .map((c,h)=>({h,c}))
    .filter(x=>x.c>0)
    .sort((a,b)=>b.c-a.c)
    .slice(0,3);
  return top.length ? top : null;
}

// SCHEDULE
function Schedule({ posts, setPosts, businesses, setPage }) {
  const DAY_NAMES = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
  const DAY_SHORT = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
  const [publishingId, setPublishingId] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [replies, setReplies] = useState([]);
  const [triggeringReplies, setTriggeringReplies] = useState(false);
  const [replyResult, setReplyResult] = useState(null);

  // Content calendar state
  const [calBizId, setCalBizId] = useState((businesses||[])[0]?.id || "");
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calCount, setCalCount] = useState(10);
  const [calGenerating, setCalGenerating] = useState(false);
  const [calResult, setCalResult] = useState(null);
  const [calApproving, setCalApproving] = useState(false);
  const MONTHS_HEB = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

  async function generateCalendar() {
    if (!calBizId) { alert("בחר עסק"); return; }
    setCalGenerating(true);
    setCalResult(null);
    try {
      const r = await authFetch("/api/calendars/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: calBizId, year: calYear, month: calMonth, posts_count: calCount }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "שגיאה");
      setCalResult(d);
    } catch(e) { alert("שגיאה ביצירת לוח: " + e.message); }
    setCalGenerating(false);
  }

  const [mediaProgress, setMediaProgress] = useState(null); // {total, done, failed, current}
  const [autoGenMedia, setAutoGenMedia] = useState(true);

  async function approveCalendar() {
    if (!calResult?.posts?.length) return;
    const msg = autoGenMedia
      ? `צור ${calResult.posts.length} פוסטים + מדיה אוטומטית? (~${calResult.posts.length * 45} שניות)`
      : `צור ${calResult.posts.length} פוסטים ב-DB? (תצטרך לייצר מדיה לכל אחד ידנית)`;
    if (!confirm(msg)) return;
    setCalApproving(true);
    try {
      const r = await authFetch("/api/calendars/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: calBizId, posts: calResult.posts }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "שגיאה");
      const createdIds = (d.created || []).filter(c => c.id).map(c => c.id);

      if (autoGenMedia && createdIds.length > 0) {
        // Generate media for each post sequentially (shows progress)
        // First generate all images (fast), then videos (slow)
        const postsWithMeta = createdIds.map((id, i) => ({
          id,
          theme: d.created[i]?.theme || "",
          isVideo: calResult.posts[i]?.media_type === "video",
        }));
        const images = postsWithMeta.filter(p => !p.isVideo);
        const videos = postsWithMeta.filter(p => p.isVideo);
        const ordered = [...images, ...videos]; // images first

        setMediaProgress({ total: ordered.length, done: 0, failed: 0, current: null, videos: videos.length });
        for (const item of ordered) {
          setMediaProgress(p => ({ ...p, current: (item.isVideo ? "🎬 " : "🖼️ ") + item.theme }));
          const endpoint = item.isVideo ? `/api/posts/${item.id}/generate-video` : `/api/posts/${item.id}/generate-media`;
          try {
            const mr = await authFetch(endpoint, { method: "POST" });
            const md = await mr.json();
            if (md.ok) setMediaProgress(p => ({ ...p, done: p.done + 1 }));
            else setMediaProgress(p => ({ ...p, failed: p.failed + 1 }));
          } catch {
            setMediaProgress(p => ({ ...p, failed: p.failed + 1 }));
          }
        }
        setTimeout(() => setMediaProgress(null), 4000);
      }

      alert(`✅ ${d.message}!${autoGenMedia ? "\nמדיה: נוצרה אוטומטית" : "\nעבור לעמוד \"תוכן\" כדי לייצר מדיה."}`);
      setCalResult(null);
      // Trigger page reload to refresh posts
      window.location.reload();
    } catch(e) { alert("שגיאה: " + e.message); }
    setCalApproving(false);
  }

  // Batch media generation for all pending posts
  const [batchGen, setBatchGen] = useState(false);
  async function generateAllPendingMedia() {
    if (!confirm("ייצר תמונות לכל הפוסטים המתוזמנים ללא מדיה? זה ייקח כמה דקות.")) return;
    setBatchGen(true);
    try {
      const r = await authFetch("/api/posts/pending-media");
      const d = await r.json();
      const pending = d.posts || [];
      if (!pending.length) { alert("אין פוסטים ממתינים"); setBatchGen(false); return; }
      setMediaProgress({ total: pending.length, done: 0, failed: 0, current: null });
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        setMediaProgress(pr => ({ ...pr, current: (p.content || "").slice(0, 40) }));
        try {
          const mr = await authFetch(`/api/posts/${p.id}/generate-media`, { method: "POST" });
          const md = await mr.json();
          if (md.ok) setMediaProgress(pr => ({ ...pr, done: pr.done + 1 }));
          else setMediaProgress(pr => ({ ...pr, failed: pr.failed + 1 }));
        } catch { setMediaProgress(pr => ({ ...pr, failed: pr.failed + 1 })); }
      }
      alert(`✅ הסתיים!`);
      window.location.reload();
    } catch(e) { alert("שגיאה: " + e.message); }
    setBatchGen(false);
    setTimeout(() => setMediaProgress(null), 4000);
  }

  function removeCalendarPost(idx) {
    setCalResult(prev => ({ ...prev, posts: prev.posts.filter((_, i) => i !== idx) }));
  }

  // Load recent auto-replies
  useEffect(()=>{
    (async()=>{
      try {
        const r = await authFetch("/api/replies?days=7");
        if (r.ok) setReplies(await r.json());
      } catch{}
    })();
  }, []);

  async function triggerRepliesCron() {
    setTriggeringReplies(true);
    setReplyResult(null);
    try {
      const r = await authFetch("/api/cron/replies");
      const d = await r.json();
      setReplyResult(d);
      // Reload replies
      try { const rr = await authFetch("/api/replies?days=7"); if (rr.ok) setReplies(await rr.json()); } catch{}
    } catch(e) { setReplyResult({ error: e.message }); }
    setTriggeringReplies(false);
    setTimeout(() => setReplyResult(null), 6000);
  }

  async function deleteReply(reply) {
    if (!confirm("למחוק את התגובה מהמערכת ומפייסבוק?")) return;
    try {
      await authFetch(`/api/replies/${reply.id}`, { method: "DELETE" });
      setReplies(prev => prev.filter(r => r.id !== reply.id));
    } catch(e) { alert("שגיאה: " + e.message); }
  }

  async function markHandled(reply) {
    try {
      await authFetch(`/api/replies/${reply.id}/handle`, { method: "POST" });
      setReplies(prev => prev.map(r => r.id === reply.id ? {...r, needs_attention: false, status: "handled"} : r));
    } catch(e) { alert("שגיאה: " + e.message); }
  }

  // Filter categories
  const scheduled = posts.filter(p => p.scheduled_at && !p.published)
    .sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const readyUnscheduled = posts.filter(p => !p.published && !p.scheduled_at && (p.image_url || p.video_url || p.pipeline?.readyToPublish));
  const publishedLast7 = posts.filter(p => p.published && p.publishedAt &&
    (Date.now() - new Date(p.publishedAt).getTime() < 7*86400000))
    .sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  async function publishNow(post) {
    setPublishingId(post.id);
    try {
      const biz = businesses.find(b => b.name === post.business);
      const fbTokens = biz?.social?.facebook?.tokens;
      if (!fbTokens?.META_PAGE_ID || !fbTokens?.META_ACCESS_TOKEN) throw new Error("חסר טוקן פייסבוק");
      const pageId = fbTokens.META_PAGE_ID;
      const accessToken = fbTokens.META_ACCESS_TOKEN;
      const hashtags = (post.hashtags || []).map(h => h.startsWith("#") ? h : `#${h}`).join(" ");
      const contentHasHashtags = (post.hashtags || []).some(h => post.content.includes(h));
      const message = contentHasHashtags ? post.content : post.content + (hashtags ? "\n\n" + hashtags : "");
      const videoUrl = post.video_url || post.pipeline?.videoUrl;
      const imageUrl = post.image_url || post.pipeline?.imageUrl;
      let endpoint, body;
      if (videoUrl) {
        endpoint = `https://graph.facebook.com/v25.0/${pageId}/videos`;
        body = { file_url: videoUrl, description: message, access_token: accessToken };
      } else if (imageUrl) {
        endpoint = `https://graph.facebook.com/v25.0/${pageId}/photos`;
        body = { url: imageUrl, message, access_token: accessToken };
      } else {
        endpoint = `https://graph.facebook.com/v25.0/${pageId}/feed`;
        body = { message, access_token: accessToken };
      }
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.id || d.post_id) {
        const fbId = d.post_id || d.id;
        const now = new Date().toISOString();
        setPosts?.(prev => prev.map(p => p.id === post.id ? { ...p, fbPostId: fbId, publishedAt: now, published: true, scheduled_at: null } : p));
        if (typeof post.id === 'string' && post.id.length > 20) {
          try {
            await authFetch(`/api/content/${post.id}`, {
              method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "published", published_at: now, fb_post_id: fbId, scheduled_at: null })
            });
          } catch {}
        }
      } else {
        throw new Error(d.error?.message || "שגיאה בפרסום");
      }
    } catch (e) { alert("שגיאה: " + e.message); }
    setPublishingId(null);
  }

  async function cancelSchedule(post) {
    setPosts?.(prev => prev.map(p => p.id === post.id ? { ...p, scheduled_at: null } : p));
    if (typeof post.id === 'string' && post.id.length > 20) {
      try {
        await authFetch(`/api/content/${post.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_at: null })
        });
      } catch {}
    }
  }

  async function triggerCronNow() {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const r = await authFetch("/api/cron/publish");
      const d = await r.json();
      setTriggerResult(d);
    } catch (e) { setTriggerResult({ error: e.message }); }
    setTriggering(false);
    setTimeout(() => setTriggerResult(null), 5000);
  }

  // Group scheduled posts by date
  const scheduledByDate = {};
  scheduled.forEach(p => {
    const key = new Date(p.scheduled_at).toLocaleDateString("he-IL", { weekday:"long", day:"2-digit", month:"2-digit" });
    if (!scheduledByDate[key]) scheduledByDate[key] = [];
    scheduledByDate[key].push(p);
  });

  const bizWithSchedule = (businesses || []).filter(b => b.schedule?.enabled && (b.schedule?.days?.length > 0) && (b.schedule?.times?.length > 0));
  const bizWithoutSchedule = (businesses || []).filter(b => !b.schedule?.enabled || !(b.schedule?.days?.length > 0) || !(b.schedule?.times?.length > 0));

  return <div style={{ animation: "fadeUp 0.3s ease" }}>
    <SectionTitle sub="סקירה כללית של תזמוני פרסום — מחושב מהדאטהבייס, מתעדכן אוטומטית">📅 לוח פרסומים</SectionTitle>

    {/* Media generation progress bar (global) */}
    {mediaProgress && <Card style={{marginBottom:20,background:"#8B5CF608",border:"1px solid #8B5CF633"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}>
        <div style={{color:"#8B5CF6",fontSize:12,fontWeight:700}}>🎨 יצירת מדיה — {mediaProgress.done}/{mediaProgress.total}</div>
        <div style={{color:T.textDim,fontSize:11}}>
          ✅ {mediaProgress.done} · {mediaProgress.failed > 0 ? `❌ ${mediaProgress.failed}` : ""}
        </div>
      </div>
      <div style={{height:8,background:T.inputBg,borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${((mediaProgress.done + mediaProgress.failed) / mediaProgress.total) * 100}%`,background:"linear-gradient(90deg,#8B5CF6,#3B82F6)",transition:"width 0.3s"}}/>
      </div>
      {mediaProgress.current && <div style={{color:T.textMuted,fontSize:11,marginTop:6,direction:"rtl",lineHeight:1.4}}>
        <Spinner size={10}/> {mediaProgress.current}...
      </div>}
    </Card>}

    {/* Batch media gen button */}
    {!mediaProgress && posts.filter(p => p.scheduled_at && !p.published && !p.image_url && !p.video_url).length > 0 && <Card style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div>
          <div style={{color:T.text,fontSize:13,fontWeight:700,marginBottom:2}}>
            🎨 {posts.filter(p => p.scheduled_at && !p.published && !p.image_url && !p.video_url).length} פוסטים ממתינים למדיה
          </div>
          <div style={{color:T.textDim,fontSize:11}}>צור תמונות אוטומטית לכל הפוסטים המתוזמנים</div>
        </div>
        <Btn disabled={batchGen} grad="linear-gradient(135deg,#8B5CF6,#3B82F6)" onClick={generateAllPendingMedia}>
          {batchGen ? <><Spinner size={12}/>מייצר...</> : "⚡ ייצר מדיה לכולם"}
        </Btn>
      </div>
    </Card>}

    {/* ── M4: Smart scheduling insight ── */}
    {(()=>{
      const allPubs = posts.filter(p=>p.published && (p.publishedAt||p.scheduled_at));
      const top = computeBestPostHours(allPubs);
      if (!top) return null;
      const SLOT_COLORS = ["#10B981","#3B82F6","#8B5CF6"];
      return <Card style={{marginBottom:16,background:"#F59E0B08",border:"1px solid #F59E0B33"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
          <div style={{color:"#F59E0B",fontSize:12,fontWeight:700}}>⚡ שעות מיטביות לפרסום</div>
          <div style={{color:T.textDim,fontSize:10}}>מבוסס על {allPubs.length} פרסומים קיימים</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {top.map(({h,c},i)=>(
            <div key={h} style={{background:SLOT_COLORS[i]+"15",border:`1px solid ${SLOT_COLORS[i]}33`,
              borderRadius:10,padding:"8px 14px",textAlign:"center",minWidth:70}}>
              <div style={{color:SLOT_COLORS[i],fontWeight:800,fontSize:18,lineHeight:1}}>
                {String(h).padStart(2,"0")}:00
              </div>
              <div style={{color:T.textDim,fontSize:10,marginTop:3}}>{c} פוסטים</div>
              {i===0&&<div style={{color:SLOT_COLORS[i],fontSize:9,fontWeight:600,marginTop:2}}>מומלץ ⭐</div>}
            </div>
          ))}
          <div style={{color:T.textDim,fontSize:11,alignSelf:"center",maxWidth:160,lineHeight:1.4}}>
            תזמן פוסטים חדשים בשעות אלו לביצועים מיטביים
          </div>
        </div>
      </Card>;
    })()}

    {/* Content Calendar AI */}
    <Card style={{marginBottom:20,background:"linear-gradient(135deg,#8B5CF608,#3B82F608)",border:"1px solid #8B5CF633"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{color:"#8B5CF6",fontSize:14,fontWeight:700,marginBottom:3}}>🤖 תכנון תוכן חודשי עם AI</div>
          <div style={{color:T.textMuted,fontSize:11}}>צור לוח תוכן מגוון לחודש שלם — מחובר לחגים ואירועים</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:12}}>
        <div>
          <div style={{color:T.textDim,fontSize:10,fontWeight:600,marginBottom:4}}>עסק</div>
          <select value={calBizId} onChange={e=>setCalBizId(e.target.value)}
            style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"8px 10px",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>
            {(businesses||[]).map(b=><option key={b.id} value={b.id}>{b.icon||""} {b.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:T.textDim,fontSize:10,fontWeight:600,marginBottom:4}}>חודש</div>
          <select value={calMonth} onChange={e=>setCalMonth(Number(e.target.value))}
            style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"8px 10px",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>
            {MONTHS_HEB.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:T.textDim,fontSize:10,fontWeight:600,marginBottom:4}}>שנה</div>
          <select value={calYear} onChange={e=>setCalYear(Number(e.target.value))}
            style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"8px 10px",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>
            {[0,1,2].map(off=>{const y=new Date().getFullYear()+off;return <option key={y} value={y}>{y}</option>})}
          </select>
        </div>
        <div>
          <div style={{color:T.textDim,fontSize:10,fontWeight:600,marginBottom:4}}>כמות פוסטים</div>
          <input type="number" min="4" max="20" value={calCount} onChange={e=>setCalCount(Number(e.target.value))}
            style={{width:"100%",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:8,color:T.text,padding:"8px 10px",fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",alignItems:"flex-end"}}>
          <Btn disabled={calGenerating||!calBizId}
            grad={calGenerating||!calBizId?undefined:"linear-gradient(135deg,#8B5CF6,#3B82F6)"}
            onClick={generateCalendar} style={{width:"100%"}}>
            {calGenerating ? <><Spinner size={12}/>מתכנן...</> : "✨ צור לוח תוכן"}
          </Btn>
        </div>
      </div>

      {calResult && <div style={{marginTop:16}}>
        {calResult.events?.length > 0 && <div style={{background:"#F59E0B08",border:"1px solid #F59E0B33",borderRadius:10,padding:10,marginBottom:12}}>
          <div style={{color:"#F59E0B",fontSize:11,fontWeight:700,marginBottom:6}}>📆 אירועים ב{MONTHS_HEB[calMonth-1]}:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {calResult.events.map((e,i)=><Tag key={i} label={`${e.date.slice(3)}: ${e.name}`} color="#F59E0B"/>)}
          </div>
        </div>}
        {calResult.trends?.length > 0 && <div style={{background:"#EF444408",border:"1px solid #EF444433",borderRadius:10,padding:10,marginBottom:12}}>
          <div style={{color:"#EF4444",fontSize:11,fontWeight:700,marginBottom:6}}>🔥 טרנדים חמים בישראל שנלקחו בחשבון:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {calResult.trends.slice(0,8).map((t,i)=><Tag key={i} label={t.length > 30 ? t.slice(0,30)+'...' : t} color="#EF4444"/>)}
          </div>
        </div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div style={{color:T.textMuted,fontSize:12,fontWeight:700}}>
            תצוגה מקדימה: {calResult.posts?.length || 0} פוסטים
          </div>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",background:T.inputBg,padding:"6px 10px",borderRadius:8,border:`1px solid ${T.border}`}}>
            <input type="checkbox" checked={autoGenMedia} onChange={e=>setAutoGenMedia(e.target.checked)}/>
            <span style={{color:T.textSec,fontSize:11,fontWeight:600}}>🎨 צור מדיה אוטומטית</span>
          </label>
          <Btn disabled={calApproving||!calResult.posts?.length}
            grad={calApproving?undefined:"linear-gradient(135deg,#10B981,#3B82F6)"}
            onClick={approveCalendar}>
            {calApproving ? <><Spinner size={12}/>יוצר...</> : `✅ צור ${calResult.posts?.length || 0} פוסטים${autoGenMedia?" + מדיה":""}`}
          </Btn>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
          {(calResult.posts||[]).map((p,i)=>{
            const d = new Date(p.date);
            const dateStr = d.toLocaleDateString("he-IL",{weekday:"short",day:"2-digit",month:"short"});
            return <div key={i} style={{background:T.card,border:`1px solid ${T.borderLight}`,borderRadius:10,padding:12,position:"relative"}}>
              <button onClick={()=>removeCalendarPost(i)} title="הסר"
                style={{position:"absolute",top:6,left:6,background:"transparent",border:"none",color:"#EF4444",fontSize:16,cursor:"pointer",padding:0,width:20,height:20}}>×</button>
              <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                <Tag label={dateStr} color="#8B5CF6"/>
                <Tag label={p.type} color="#3B82F6"/>
                {p.media_type === "video"
                  ? <Tag label="🎬 סרטון" color="#34A853"/>
                  : <Tag label="🖼️ תמונה" color="#4285F4"/>}
                <button onClick={()=>{
                  setCalResult(prev => ({ ...prev, posts: prev.posts.map((x,j)=>j===i?{...x, media_type: x.media_type==="video"?"image":"video"}:x) }));
                }} title="החלף מדיה"
                  style={{background:"transparent",border:"none",color:T.textDim,fontSize:11,cursor:"pointer",padding:0,fontFamily:"inherit",textDecoration:"underline"}}>
                  החלף
                </button>
              </div>
              <div style={{color:T.text,fontSize:13,fontWeight:700,marginBottom:6,direction:"rtl",lineHeight:1.4}}>
                {p.theme}
              </div>
              {p.hook && <div style={{color:T.textSec,fontSize:12,marginBottom:6,direction:"rtl",fontStyle:"italic",lineHeight:1.4}}>
                "{p.hook}"
              </div>}
              {p.angle && <div style={{color:T.textMuted,fontSize:11,marginBottom:6,direction:"rtl",lineHeight:1.4}}>
                💡 {p.angle}
              </div>}
              {p.visual_concept && <div style={{background:T.inputBg,borderRadius:6,padding:"6px 8px",marginTop:8}}>
                <div style={{color:T.textDim,fontSize:9,fontWeight:600,marginBottom:2}}>🎨 קונספט ויזואלי:</div>
                <div style={{color:T.textSec,fontSize:10,direction:"rtl",lineHeight:1.3}}>{p.visual_concept}</div>
              </div>}
              {p.rationale && <div style={{color:T.textDim,fontSize:10,marginTop:6,direction:"rtl",lineHeight:1.3}}>
                <span style={{fontWeight:600}}>למה:</span> {p.rationale}
              </div>}
            </div>;
          })}
        </div>
      </div>}
    </Card>

    {/* Stats */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
      {[
        { label:"מתוזמנים", value: scheduled.length, color:"#F59E0B", icon:"⏰" },
        { label:"מוכנים — ללא תזמון", value: readyUnscheduled.length, color:"#8B5CF6", icon:"📝" },
        { label:"פורסמו השבוע", value: publishedLast7.length, color:"#10B981", icon:"📡" },
        { label:"דורש התייחסות", value: replies.filter(r => r.needs_attention).length, color:"#EF4444", icon:"🚨" },
        { label:"עסקים פעילים", value: bizWithSchedule.length, color:"#3B82F6", icon:"🏢" },
      ].map(s => <Card key={s.label} style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ fontSize:20 }}>{s.icon}</div>
          <div>
            <div style={{ color:s.color, fontSize:22, fontWeight:700, lineHeight:1 }}>{s.value}</div>
            <div style={{ color:T.textDim, fontSize:10, marginTop:3 }}>{s.label}</div>
          </div>
        </div>
      </Card>)}
    </div>

    {/* Per-business schedule config */}
    <Card style={{ marginBottom:20 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8 }}>
        <div style={{ color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1 }}>⏰ תזמון לפי עסק</div>
        <Btn sm bg="#F59E0B15" color="#F59E0B" onClick={triggerCronNow} disabled={triggering}>
          {triggering ? <><Spinner size={10}/>בודק...</> : "🚀 הפעל פרסום עכשיו"}
        </Btn>
      </div>
      {triggerResult && <div style={{ padding:"10px 12px", background:triggerResult.error?"#EF444410":"#10B98110", border:`1px solid ${triggerResult.error?"#EF444433":"#10B98133"}`, borderRadius:8, marginBottom:12, color:triggerResult.error?"#EF4444":"#10B981", fontSize:11, fontWeight:600 }}>
        {triggerResult.error ? "שגיאה: "+triggerResult.error : (triggerResult.message || "הפעלה הסתיימה") + (triggerResult.published != null ? " • פורסמו: "+triggerResult.published : "")}
      </div>}
      {bizWithSchedule.length === 0 && bizWithoutSchedule.length === 0
        ? <div style={{ color:T.textDim,fontSize:12,textAlign:"center",padding:20 }}>אין עסקים. הוסף עסק בעמוד "עסקים".</div>
        : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:10 }}>
            {[...bizWithSchedule, ...bizWithoutSchedule].map(biz => {
              const enabled = biz.schedule?.enabled && biz.schedule?.days?.length > 0 && biz.schedule?.times?.length > 0;
              return <div key={biz.id} style={{ background:enabled?"#F59E0B08":T.inputBg, border:`1px solid ${enabled?"#F59E0B33":T.border}`, borderRadius:10, padding:12 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:enabled?8:0,gap:6 }}>
                  <div style={{ color:T.text,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6 }}>
                    <span>{biz.icon || "🏢"}</span>{biz.name}
                  </div>
                  {enabled
                    ? <Tag label="פעיל" color="#10B981"/>
                    : <Tag label="ללא תזמון" color={T.textDim}/>}
                </div>
                {enabled && <>
                  <div style={{ display:"flex",gap:3,flexWrap:"wrap",marginBottom:6 }}>
                    {DAY_SHORT.map((d, i) => <span key={i} style={{
                      width:22,height:22,borderRadius:"50%",fontSize:10,fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      background: biz.schedule.days.includes(i) ? "#F59E0B" : T.border,
                      color: biz.schedule.days.includes(i) ? "#fff" : T.textDim
                    }}>{d}</span>)}
                  </div>
                  <div style={{ color:T.textSec,fontSize:11,marginBottom:4 }}>
                    🕐 {biz.schedule.times.join(" · ")}
                  </div>
                  <div style={{ color:T.textDim,fontSize:10 }}>
                    {(biz.schedule.days.length * biz.schedule.times.length)} משבצות בשבוע
                  </div>
                </>}
                {setPage && <button onClick={() => setPage("businesses")} style={{
                  background:"transparent",border:"none",color:"#F59E0B",fontSize:10,fontWeight:600,cursor:"pointer",padding:"6px 0 0",fontFamily:"inherit"
                }}>{enabled ? "ערוך תזמון ↗" : "הגדר תזמון ↗"}</button>}
              </div>;
            })}
          </div>
      }
    </Card>

    {/* Scheduled posts grouped by date */}
    {scheduled.length > 0 && <Card style={{ marginBottom:20 }}>
      <div style={{ color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1 }}>
        ⏰ פוסטים מתוזמנים ({scheduled.length})
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        {Object.entries(scheduledByDate).map(([dateKey, postsOnDate]) => <div key={dateKey}>
          <div style={{ color:"#F59E0B",fontSize:12,fontWeight:700,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${T.border}` }}>
            {dateKey}
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {postsOnDate.map(post => {
              const schedDate = new Date(post.scheduled_at);
              const timeStr = schedDate.toLocaleTimeString("he-IL", { hour:"2-digit", minute:"2-digit" });
              const isPast = schedDate < new Date();
              const pl = PLATFORMS.find(p => post.platform?.includes(p.label.split(" ")[0])) || PLATFORMS[0];
              const biz = businesses.find(b => b.name === post.business);
              return <div key={post.id} style={{
                display:"flex",alignItems:"center",gap:12,padding:12,
                background:isPast?"#F59E0B08":T.inputBg,borderRadius:10,
                border:`1px solid ${isPast?"#F59E0B33":T.borderLight}`,flexWrap:"wrap"
              }}>
                <div style={{ width:54,textAlign:"center",flexShrink:0 }}>
                  <div style={{ color:T.text,fontSize:18,fontWeight:700,lineHeight:1 }}>{timeStr}</div>
                  {isPast && <div style={{ color:"#F59E0B",fontSize:9,fontWeight:700,marginTop:4 }}>מאחר</div>}
                </div>
                {(post.image_url || post.video_url) && <div style={{ width:44,height:44,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#000" }}>
                  {post.video_url
                    ? <video src={post.video_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                    : <img src={post.image_url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>}
                </div>}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",gap:6,marginBottom:4,flexWrap:"wrap" }}>
                    <Tag label={post.platform || "פייסבוק"} color={pl.color}/>
                    <Tag label={post.business} color={biz?.color || T.textMuted}/>
                    {post.video_url && <Tag label="🎬 סרטון" color="#34A853"/>}
                    {!post.video_url && post.image_url && <Tag label="🖼️ תמונה" color="#4285F4"/>}
                  </div>
                  <p style={{ color:T.textSec,fontSize:12,margin:0,direction:"rtl",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                    {(post.content || "").split("\n")[0]}
                  </p>
                </div>
                <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                  <Btn sm disabled={publishingId === post.id}
                    grad={isPast ? "linear-gradient(135deg,#F59E0B,#EF4444)" : "linear-gradient(135deg,#10B981,#3B82F6)"}
                    onClick={() => publishNow(post)}>
                    {publishingId === post.id ? <Spinner size={10}/> : isPast ? "פרסם עכשיו" : "פרסם מוקדם"}
                  </Btn>
                  <Btn sm bg="#EF444415" color="#EF4444" onClick={() => cancelSchedule(post)}>בטל</Btn>
                </div>
              </div>;
            })}
          </div>
        </div>)}
      </div>
    </Card>}

    {/* Ready but unscheduled */}
    {readyUnscheduled.length > 0 && <Card style={{ marginBottom:20 }}>
      <div style={{ color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1 }}>
        📝 מוכנים — ללא תזמון ({readyUnscheduled.length})
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {readyUnscheduled.map(post => {
          const pl = PLATFORMS.find(p => post.platform?.includes(p.label.split(" ")[0])) || PLATFORMS[0];
          const biz = businesses.find(b => b.name === post.business);
          const bizHasSchedule = biz?.schedule?.enabled;
          return <div key={post.id} style={{
            display:"flex",alignItems:"center",gap:12,padding:12,
            background:T.inputBg,borderRadius:10,border:`1px solid ${T.borderLight}`,flexWrap:"wrap"
          }}>
            {(post.image_url || post.video_url) && <div style={{ width:44,height:44,borderRadius:8,overflow:"hidden",flexShrink:0,background:"#000" }}>
              {post.video_url
                ? <video src={post.video_url} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                : <img src={post.image_url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>}
            </div>}
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:"flex",gap:6,marginBottom:4,flexWrap:"wrap" }}>
                <Tag label={post.platform || "פייסבוק"} color={pl.color}/>
                <Tag label={post.business} color={biz?.color || T.textMuted}/>
                {!bizHasSchedule && <Tag label="עסק ללא תזמון" color="#EF4444"/>}
              </div>
              <p style={{ color:T.textSec,fontSize:12,margin:0,direction:"rtl",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                {(post.content || "").split("\n")[0]}
              </p>
            </div>
            <Btn sm disabled={publishingId === post.id} grad="linear-gradient(135deg,#10B981,#3B82F6)"
              onClick={() => publishNow(post)}>
              {publishingId === post.id ? <Spinner size={10}/> : "פרסם עכשיו"}
            </Btn>
          </div>;
        })}
      </div>
    </Card>}

    {/* Published this week */}
    {publishedLast7.length > 0 && <Card>
      <div style={{ color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:14,letterSpacing:1 }}>
        📡 פורסמו השבוע ({publishedLast7.length})
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
        {publishedLast7.slice(0, 15).map(post => {
          const pubDate = post.publishedAt ? new Date(post.publishedAt) : null;
          const pl = PLATFORMS.find(p => post.platform?.includes(p.label.split(" ")[0])) || PLATFORMS[0];
          const biz = businesses.find(b => b.name === post.business);
          return <div key={post.id} style={{
            display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
            background:T.inputBg,borderRadius:8,border:`1px solid ${T.borderLight}`,flexWrap:"wrap"
          }}>
            <div style={{ width:50,textAlign:"center",flexShrink:0 }}>
              <div style={{ color:"#10B981",fontSize:10,fontWeight:700 }}>{pubDate?.toLocaleDateString("he-IL",{day:"2-digit",month:"short"})}</div>
              <div style={{ color:T.textSec,fontSize:10 }}>{pubDate?.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"})}</div>
            </div>
            <Tag label={post.platform || "פייסבוק"} color={pl.color}/>
            <Tag label={post.business} color={biz?.color || T.textMuted}/>
            <span style={{ flex:1,minWidth:0,color:T.textSec,fontSize:11,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",direction:"rtl" }}>
              {(post.content || "").split("\n")[0]}
            </span>
            {post.fbPostId && <a href={`https://facebook.com/${post.fbPostId}`} target="_blank" rel="noreferrer"
              style={{ color:"#1877F2",fontSize:10,fontWeight:600,textDecoration:"none",flexShrink:0 }}>
              צפה ↗
            </a>}
          </div>;
        })}
      </div>
    </Card>}

    {/* Attention needed — complaints / negative comments */}
    {replies.filter(r => r.needs_attention).length > 0 && <Card style={{marginBottom:20,background:"#EF444408",border:"2px solid #EF444433"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{color:"#EF4444",fontSize:13,fontWeight:700,letterSpacing:0.5}}>
          🚨 תגובות שדורשות את תשומת ליבך ({replies.filter(r => r.needs_attention).length})
        </div>
      </div>
      <div style={{color:T.textMuted,fontSize:11,marginBottom:12,lineHeight:1.5}}>
        המערכת זיהתה תגובות שליליות, תלונות או שאלות קריטיות. <b>לא נענה להן אוטומטית.</b> ענה אישית לפני שהלקוח ירגיש מוזנח.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {replies.filter(r => r.needs_attention).map(reply => {
          const biz = businesses.find(b => b.name === reply.business_name);
          const date = reply.created_at ? new Date(reply.created_at) : null;
          const sentColor = reply.sentiment_label === "complaint" ? "#EF4444" : reply.sentiment_label === "negative" ? "#F59E0B" : "#8B5CF6";
          return <div key={reply.id} style={{background:T.card,border:`1px solid ${sentColor}44`,borderRadius:10,padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:6,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <Tag label={reply.business_name} color={biz?.color || T.textMuted}/>
                <Tag label={reply.sentiment_label || "לא מסווג"} color={sentColor}/>
                {reply.sentiment_score != null && <span style={{color:T.textDim,fontSize:10}}>ציון: {Number(reply.sentiment_score).toFixed(2)}</span>}
                {reply.commenter_name && <span style={{color:T.textSec,fontSize:11,fontWeight:600}}>👤 {reply.commenter_name}</span>}
              </div>
              <span style={{color:T.textDim,fontSize:10}}>{date?.toLocaleString("he-IL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
            </div>
            <div style={{background:T.inputBg,borderRadius:8,padding:"10px 12px",marginBottom:8,borderRight:`3px solid ${sentColor}`}}>
              <div style={{color:T.textDim,fontSize:9,fontWeight:600,marginBottom:3}}>תגובה מקורית:</div>
              <div style={{color:T.text,fontSize:13,direction:"rtl",lineHeight:1.5}}>{reply.original_text}</div>
            </div>
            {reply.skip_reason && <div style={{color:T.textMuted,fontSize:10,marginBottom:8,direction:"rtl"}}>
              🤖 סיבת הדילוג: <span style={{color:sentColor,fontWeight:600}}>{reply.skip_reason}</span>
            </div>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {reply.fb_post_id && <a href={`https://facebook.com/${reply.fb_post_id}`} target="_blank" rel="noreferrer"
                style={{background:"#1877F215",color:"#1877F2",padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:600,textDecoration:"none"}}>
                📝 ענה בפייסבוק ↗
              </a>}
              <Btn sm bg="#10B98115" color="#10B981" onClick={()=>markHandled(reply)}>✓ טופל</Btn>
            </div>
          </div>;
        })}
      </div>
    </Card>}

    {/* Auto-replies */}
    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>
          💬 מענים אוטומטיים לתגובות ({replies.filter(r => r.status === "replied").length} השבוע)
        </div>
        <Btn sm bg="#10B98115" color="#10B981" onClick={triggerRepliesCron} disabled={triggeringReplies}>
          {triggeringReplies ? <><Spinner size={10}/>בודק תגובות...</> : "🔍 בדוק תגובות עכשיו"}
        </Btn>
      </div>
      {replyResult && <div style={{padding:"10px 12px",background:replyResult.error?"#EF444410":"#10B98110",border:`1px solid ${replyResult.error?"#EF444433":"#10B98133"}`,borderRadius:8,marginBottom:12,color:replyResult.error?"#EF4444":"#10B981",fontSize:11,fontWeight:600}}>
        {replyResult.error ? "שגיאה: "+replyResult.error : (replyResult.message || "")}
      </div>}
      {replies.length === 0
        ? <div style={{color:T.textDim,fontSize:12,textAlign:"center",padding:20,lineHeight:1.6}}>
            {(businesses||[]).some(b => b.schedule?.auto_reply_enabled)
              ? <>אין עדיין מענים אוטומטיים. המערכת בודקת כל 10 דקות.<br/>או לחץ "🔍 בדוק עכשיו" כדי לרוץ מיד.</>
              : <>הפעל "מענה אוטומטי" באחד העסקים כדי להתחיל. {setPage && <button onClick={()=>setPage("businesses")} style={{background:"transparent",border:"none",color:"#10B981",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>לעמוד עסקים ↗</button>}</>}
          </div>
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {replies.filter(r => r.status !== "deleted").slice(0, 10).map(reply => {
              const biz = businesses.find(b => b.name === reply.business_name);
              const date = reply.created_at ? new Date(reply.created_at) : null;
              const isFailed = reply.status === "failed";
              return <div key={reply.id} style={{background:isFailed?"#EF444408":T.inputBg,border:`1px solid ${isFailed?"#EF444433":T.borderLight}`,borderRadius:10,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:6,flexWrap:"wrap"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    <Tag label={reply.business_name} color={biz?.color || T.textMuted}/>
                    {isFailed && <Tag label="נכשל" color="#EF4444"/>}
                    {reply.commenter_name && <span style={{color:T.textSec,fontSize:11,fontWeight:600}}>👤 {reply.commenter_name}</span>}
                  </div>
                  <span style={{color:T.textDim,fontSize:10}}>{date?.toLocaleString("he-IL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
                <div style={{background:T.bg,borderRadius:8,padding:"8px 10px",marginBottom:6,borderRight:`3px solid ${T.border}`}}>
                  <div style={{color:T.textDim,fontSize:9,fontWeight:600,marginBottom:3}}>תגובה מקורית:</div>
                  <div style={{color:T.textSec,fontSize:12,direction:"rtl",lineHeight:1.4}}>{reply.original_text}</div>
                </div>
                <div style={{background:"#10B98108",borderRadius:8,padding:"8px 10px",borderRight:`3px solid #10B981`}}>
                  <div style={{color:"#10B981",fontSize:9,fontWeight:600,marginBottom:3}}>🤖 המענה שלנו:</div>
                  <div style={{color:T.text,fontSize:12,direction:"rtl",lineHeight:1.4}}>{reply.reply_text}</div>
                  {isFailed && reply.skip_reason && <div style={{color:"#EF4444",fontSize:10,marginTop:4}}>⚠️ {reply.skip_reason}</div>}
                </div>
                {!isFailed && <div style={{display:"flex",justifyContent:"flex-end",marginTop:6,gap:6}}>
                  <button onClick={()=>deleteReply(reply)} style={{background:"transparent",border:"none",color:"#EF4444",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>🗑️ מחק מענה</button>
                </div>}
              </div>;
            })}
          </div>
      }
    </Card>

    {scheduled.length === 0 && readyUnscheduled.length === 0 && publishedLast7.length === 0 && replies.length === 0 && <Card>
      <div style={{ textAlign:"center",color:T.textDim,padding:30 }}>
        <div style={{ fontSize:32,marginBottom:8 }}>📭</div>
        <div style={{ color:T.textSec,fontSize:13,fontWeight:600,marginBottom:4 }}>אין עדיין פוסטים</div>
        <div style={{ fontSize:11 }}>צור פוסט בעמוד "תוכן", הגדר תזמון בעמוד "עסקים" — והכל יתוזמן אוטומטית</div>
      </div>
    </Card>}
  </div>;
}

// ANALYTICS — REAL DATA FROM META
// ── Chart helpers ──
function BarChart({ bars, height=80, color="#8B5CF6", showValues=false }) {
  const max = Math.max(...bars.map(b=>b.value), 1);
  return <div style={{display:"flex",gap:4,alignItems:"flex-end",height:height+24}}>
    {bars.map((bar,i)=>(
      <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,minWidth:0}}>
        {showValues&&bar.value>0&&<div style={{fontSize:9,color:color,fontWeight:700,marginBottom:2}}>{bar.value}</div>}
        <div style={{
          height:max>0?Math.max((bar.value/max)*height,bar.value>0?3:0):0,
          background:typeof color==="function"?color(i,bar):color,
          borderRadius:"3px 3px 0 0",width:"100%",transition:"height 0.4s ease",
          minHeight:bar.value>0?"3px":0,
        }}/>
        <div style={{fontSize:9,color:T.textDim,marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",textAlign:"center"}}>{bar.label}</div>
      </div>
    ))}
  </div>;
}

function HBarChart({ bars, color="#8B5CF6" }) {
  const max = Math.max(...bars.map(b=>b.value), 1);
  return <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {bars.map((bar,i)=>(
      <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:80,fontSize:11,color:T.textSec,textAlign:"right",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bar.label}</div>
        <div style={{flex:1,background:T.inputBg,borderRadius:4,height:18,position:"relative"}}>
          <div style={{
            height:"100%",width:`${(bar.value/max)*100}%`,
            background:typeof color==="function"?color(i,bar):color,
            borderRadius:4,transition:"width 0.4s ease",minWidth:bar.value>0?3:0
          }}/>
        </div>
        <div style={{width:28,fontSize:10,color:T.textSec,fontWeight:600,flexShrink:0}}>{bar.value}</div>
      </div>
    ))}
  </div>;
}

function MiniLineChart({ points, color="#8B5CF6", height=64 }) {
  if (!points?.length) return null;
  const W=300, H=height;
  const max = Math.max(...points.map(p=>p.value), 1);
  const xs = points.map((_,i) => i/(points.length-1||1)*W);
  const ys = points.map(p => H - Math.max((p.value/max)*(H-8), 0) - 4);
  const polyPts = points.map((_,i)=>`${xs[i]},${ys[i]}`).join(" ");
  const fillPts = `0,${H} ${polyPts} ${W},${H}`;
  return <div>
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height,overflow:"visible"}} preserveAspectRatio="none">
      <polygon points={fillPts} fill={color+"18"}/>
      <polyline points={polyPts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {points.map((_,i)=><circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill={color} stroke="#fff" strokeWidth="1.5"/>)}
    </svg>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
      {points.map((p,i)=><div key={i} style={{fontSize:9,color:T.textDim,textAlign:"center"}}>{p.label}</div>)}
    </div>
  </div>;
}

function Analytics({ posts, businesses, analyticsData, setAnalyticsData }) {
  const [loading, setLoading] = useState(false);
  const [selBizId, setSelBizId] = useState(businesses?.[0]?.id||"");
  const [aiInsight, setAiInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const selBiz = businesses?.find(b=>b.id===selBizId);

  const bizData = analyticsData?.[selBizId] || {};
  const done = posts.filter(p=>p.pipeline?.done).length;

  // ── Compute local charts from posts array ──
  const selBizPosts = posts.filter(p => !selBizId || p.business === selBiz?.name);
  const publishedPosts = selBizPosts.filter(p => p.published && p.publishedAt);

  // Weekly posts (last 8 weeks)
  const weeklyBars = (() => {
    const now = Date.now();
    return Array.from({length:8},(_,i)=>{
      const weekStart = new Date(now - (7-i)*7*86400000);
      const weekEnd = new Date(weekStart.getTime() + 7*86400000);
      const label = weekStart.toLocaleDateString("he-IL",{day:"2-digit",month:"2-digit"});
      const value = publishedPosts.filter(p=>{
        const d = new Date(p.publishedAt);
        return d >= weekStart && d < weekEnd;
      }).length;
      return {label, value};
    });
  })();

  // Platform distribution
  const platformBars = (() => {
    const counts = {};
    publishedPosts.forEach(p => { counts[p.platform||"פייסבוק"] = (counts[p.platform||"פייסבוק"]||0)+1; });
    return Object.entries(counts).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
  })();

  // Best time (hour of day)
  const hourBars = (() => {
    const slots = Array.from({length:6},(_,i)=>({label:`${i*4}-${i*4+4}`,value:0,range:[i*4,i*4+4]}));
    publishedPosts.forEach(p => {
      const h = new Date(p.publishedAt).getHours();
      const slot = slots.find(s=>h>=s.range[0]&&h<s.range[1]);
      if (slot) slot.value++;
    });
    return slots;
  })();

  // Weekly engagement trend (from FB data)
  const engagementTrend = (() => {
    if (!bizData.posts?.length) return [];
    const sorted = [...bizData.posts].sort((a,b)=>new Date(a.created_time||0)-new Date(b.created_time||0));
    const chunkSize = Math.max(1, Math.floor(sorted.length/6));
    return Array.from({length:Math.min(6,sorted.length)},(_,i)=>{
      const chunk = sorted.slice(i*chunkSize,(i+1)*chunkSize);
      const avg = chunk.reduce((s,p)=>s+p.likes+p.comments+p.shares,0)/chunk.length;
      return {label:`${i+1}`, value: Math.round(avg||0)};
    });
  })();

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
      <Btn sm bg={T.card} color={T.textSec} onClick={()=>{
        const selBiz = businesses?.find(b=>b.id===selBizId);
        const win = window.open("","_blank","width=800,height=900");
        win.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
<title>דוח ביצועים — ${selBiz?.name||""}</title>
<style>
  body{font-family:-apple-system,'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;padding:32px;direction:rtl;}
  h1{font-size:22px;margin-bottom:4px;}
  .sub{color:#888;font-size:13px;margin-bottom:24px;}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
  .card{background:#f7f8fc;border-radius:12px;padding:16px;text-align:center;}
  .num{font-size:28px;font-weight:700;}
  .label{font-size:12px;color:#888;margin-top:4px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{background:#f0f0f7;padding:8px 12px;text-align:right;font-weight:600;}
  td{padding:8px 12px;border-bottom:1px solid #eee;}
  @media print{body{padding:16px;}button{display:none;}}
</style>
</head><body>
<h1>${selBiz?.icon||"📊"} ${selBiz?.name||"עסק"} — דוח ביצועים</h1>
<div class="sub">הופק ב-${new Date().toLocaleString("he-IL")} · AI Marketing Platform</div>
<div class="grid">
  <div class="card"><div class="num" style="color:#EC4899">${bizData.totalLikes||0}</div><div class="label">סה"כ לייקים</div></div>
  <div class="card"><div class="num" style="color:#8B5CF6">${bizData.totalComments||0}</div><div class="label">סה"כ תגובות</div></div>
  <div class="card"><div class="num" style="color:#3B82F6">${bizData.totalShares||0}</div><div class="label">סה"כ שיתופים</div></div>
  <div class="card"><div class="num" style="color:#10B981">${bizData.avgEngagement||0}</div><div class="label">ממוצע אינטראקציות</div></div>
  <div class="card"><div class="num" style="color:#F59E0B">${bizData.posts?.length||0}</div><div class="label">פוסטים שנבדקו</div></div>
  <div class="card"><div class="num" style="color:#06B6D4">${publishedPosts.length}</div><div class="label">פרסומים סה"כ</div></div>
</div>
${bizData.topPosts?.length?`
<h2 style="font-size:15px;margin-bottom:8px;">פוסטים מובילים</h2>
<table>
  <tr><th>#</th><th>תוכן</th><th>לייקים</th><th>תגובות</th><th>שיתופים</th></tr>
  ${bizData.topPosts.slice(0,5).map((p,i)=>`<tr><td>${i+1}</td><td>${(p.message||"").slice(0,60)}</td><td>${p.likes}</td><td>${p.comments}</td><td>${p.shares}</td></tr>`).join("")}
</table>`:""}
<br/><button onclick="window.print()" style="background:#8B5CF6;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;">🖨️ הדפס / שמור PDF</button>
</body></html>`);
        win.document.close();
      }}>🖨️ PDF</Btn>
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

    {/* Charts row */}
    <div className="two-col-grid" style={{display:"grid",gap:14,marginBottom:20}}>
      {/* Weekly publication frequency */}
      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:12}}>📅 פרסומים שבועיים (8 שבועות)</div>
        {publishedPosts.length > 0
          ? <BarChart bars={weeklyBars} height={70} color="#8B5CF6" showValues={true}/>
          : <div style={{color:T.textDim,fontSize:12,textAlign:"center",padding:"20px 0"}}>
              אין פוסטים מפורסמים עדיין<br/><span style={{fontSize:10}}>פרסם פוסטים כדי לראות גרף</span>
            </div>
        }
      </Card>

      {/* Best time to post */}
      <Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:12}}>⏰ שעות פרסום</div>
        {publishedPosts.length > 0
          ? <BarChart bars={hourBars} height={70} color={(_,b)=>{
              const maxV=Math.max(...hourBars.map(h=>h.value));
              return b.value===maxV&&maxV>0?"#F59E0B":"#3B82F6";
            }}/>
          : <div style={{color:T.textDim,fontSize:12,textAlign:"center",padding:"20px 0"}}>
              פרסם פוסטים כדי לראות שעות מומלצות
            </div>
        }
        {publishedPosts.length>0&&<div style={{color:T.textDim,fontSize:9,marginTop:4,textAlign:"center"}}>
          🟡 = שעה עם הכי הרבה פרסומים
        </div>}
      </Card>
    </div>

    {/* Platform distribution + Engagement trend */}
    {(platformBars.length>0||engagementTrend.length>0)&&<div className="two-col-grid" style={{display:"grid",gap:14,marginBottom:20}}>
      {platformBars.length>0&&<Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:12}}>📡 פילוח לפי פלטפורמה</div>
        <HBarChart bars={platformBars} color={(_,b)=>{
          const platColors={"פייסבוק":"#1877F2","אינסטגרם":"#E1306C","WordPress":"#21759B","TikTok":"#010101","בלוג SEO":"#34A853","לינקדאין":"#0A66C2"};
          return platColors[b.label]||"#8B5CF6";
        }}/>
      </Card>}
      {engagementTrend.length>1&&<Card>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:12}}>📈 טרנד מעורבות (ממוצע לפוסט)</div>
        <MiniLineChart points={engagementTrend} color="#10B981"/>
        <div style={{color:T.textDim,fontSize:9,marginTop:4,textAlign:"center"}}>קבוצות פוסטים כרונולוגיות</div>
      </Card>}
    </div>}

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
      {/* Engagement horizontal bar chart */}
      {bizData.topPosts?.length>0&&<div style={{marginTop:16,paddingTop:12,borderTop:`1px solid ${T.borderLight}`}}>
        <div style={{color:T.textMuted,fontSize:10,fontWeight:700,marginBottom:8}}>מעורבות לפי פוסט</div>
        <HBarChart color="#EC4899" bars={bizData.topPosts.slice(0,5).map((p,i)=>({
          label:`פוסט ${i+1}`,
          value: p.likes+p.comments+p.shares
        }))}/>
      </div>}
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
        ["סוג תוכן מוביל","סרטוני Veo","#10B981"]]
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
  { id:"NOTIFICATION_EMAIL",     label:"מייל להתראות",           service:"דוחות + ליד'ים", color:"#8B5CF6", hint:"your@email.com", isContact: true },
  { id:"NOTIFICATION_PHONE",     label:"טלפון / וואטסאפ",        service:"כל העסקים",      color:"#25D366", hint:"972542070020",   isContact: true },
  { id:"ANTHROPIC_API_KEY",      label:"Claude API Key",        service:"Anthropic",    color:"#8B5CF6", hint:"sk-ant-..." },
  { id:"GEMINI_API_KEY",         label:"Gemini API Key",        service:"Images + Veo Video", color:"#4285F4", hint:"AIza..." },
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
  const [keys, setKeys] = useState({});
  const [serverKeys, setServerKeys] = useState({}); // masked values from server
  const [visible, setVisible] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ email:"", role:"viewer" });
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(true);

  // Load keys from server on mount
  useEffect(()=>{
    (async()=>{
      try {
        const r = await authFetch("/api/admin/keys");
        const d = await r.json();
        setServerKeys(d.keys || {});
      } catch {}
      setLoadingKeys(false);
    })();
  }, []);

  async function saveKey(keyId, value) {
    setSaving(p=>({...p,[keyId]:true}));
    try {
      const r = await authFetch(`/api/admin/keys/${keyId}`, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ value })
      });
      const d = await r.json();
      if (d.ok) {
        setSaved(true);
        setTimeout(()=>setSaved(false), 2000);
        // Update server keys display
        if (value) {
          setServerKeys(p=>({...p,[keyId]:{ masked: value.slice(0,4)+'••••'+value.slice(-4), updatedAt: new Date().toISOString() }}));
        } else {
          setServerKeys(p=>{const n={...p}; delete n[keyId]; return n;});
        }
        // Clear local input after save
        setKeys(p=>({...p,[keyId]:""}));
        setTestResults(p=>({...p,[keyId]:"ok"}));
      }
    } catch(e) { setTestResults(p=>({...p,[keyId]:e.message})); }
    setSaving(p=>({...p,[keyId]:false}));
  }

  async function testKey(keyId) {
    setTesting(p=>({...p,[keyId]:true}));
    const val = keys[keyId];
    try {
      const r = await authFetch("/api/admin/test-key", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ keyId, value: val || undefined })
      });
      const d = await r.json();
      setTestResults(p=>({...p,[keyId]: d.ok ? "ok" : d.error||"failed"}));
    } catch(e) {
      setTestResults(p=>({...p,[keyId]: e.message || "שגיאה"}));
    }
    setTesting(p=>({...p,[keyId]:false}));
  }

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const r = await authFetch("/api/admin/users");
      if (!r.ok) throw new Error("backend unavailable");
      const d = await r.json();
      if (Array.isArray(d)) { setUsers(d); }
      else {
        // Backend returned error or no Supabase — load from localStorage
        const local = JSON.parse(localStorage.getItem("local_users")||"[]");
        setUsers(local);
      }
    } catch {
      // Backend unavailable — use localStorage
      const local = JSON.parse(localStorage.getItem("local_users")||"[]");
      setUsers(local);
    }
    setLoadingUsers(false);
  }

  async function inviteUser() {
    if (!newUser.email.trim()) return;
    try {
      const r = await authFetch("/api/admin/users/invite", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(newUser)
      });
      if (!r.ok) throw new Error("backend");
    } catch {
      // Backend unavailable — save locally
      const u = { id: Date.now().toString(), email: newUser.email, role: newUser.role, created_at: new Date().toISOString() };
      const updated = [...users, u];
      setUsers(updated);
      localStorage.setItem("local_users", JSON.stringify(updated));
    }
    setNewUser({ email:"", role:"viewer" });
    loadUsers();
  }

  async function removeUser(id) {
    try {
      const r = await authFetch(`/api/admin/users/${id}`, { method:"DELETE" });
      if (!r.ok) throw new Error("backend");
    } catch {
      // Remove locally
      const updated = users.filter(u=>u.id!==id);
      localStorage.setItem("local_users", JSON.stringify(updated));
    }
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
      {loadingKeys ? <div style={{textAlign:"center",padding:20}}><Spinner size={16}/> <span style={{color:T.textMuted,fontSize:12}}>טוען מפתחות...</span></div> :
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {API_KEYS_CONFIG.map(k=>{
          const val = keys[k.id]||"";
          const srv = serverKeys[k.id];
          const result = testResults[k.id];
          const hasSaved = !!srv;
          return <div key={k.id} style={{background:T.inputBg,border:`1px solid ${hasSaved?"#10B98122":T.borderLight}`,borderRadius:12,padding:"10px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:hasSaved?"#10B981":T.border,flexShrink:0}}/>
              <div style={{color:T.text,fontSize:12,fontWeight:600,flex:1}}>{k.label}</div>
              <span style={{color:k.color,fontSize:10,background:k.color+"10",padding:"2px 8px",borderRadius:6}}>{k.service}</span>
            </div>
            {hasSaved && <div style={{color:T.textDim,fontSize:10,marginBottom:6,fontFamily:"monospace",paddingRight:16}}>
              שמור: {srv.masked}
            </div>}
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <div style={{flex:1,position:"relative"}}>
                <input
                  type={visible[k.id]?"text":"password"}
                  value={val}
                  placeholder={hasSaved ? "הכנס ערך חדש לעדכון..." : k.hint}
                  onChange={e=>setKeys(p=>({...p,[k.id]:e.target.value}))}
                  style={{width:"100%",background:T.card,border:`1px solid ${T.inputBorder}`,
                    borderRadius:8,padding:"7px 28px 7px 10px",color:T.text,fontSize:11,
                    fontFamily:"monospace",boxSizing:"border-box"}}
                />
                <button onClick={()=>setVisible(p=>({...p,[k.id]:!p[k.id]}))}
                  style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",
                    background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:11}}>
                  {visible[k.id]?"🙈":"👁"}
                </button>
              </div>
              <Btn sm disabled={!val||saving[k.id]} onClick={()=>saveKey(k.id, val)}
                grad="linear-gradient(135deg,#10B981,#3B82F6)">
                {saving[k.id]?<Spinner size={10}/>:"שמור"}
              </Btn>
              <Btn sm disabled={(!val&&!hasSaved)||testing[k.id]} onClick={()=>testKey(k.id)}
                bg={result==="ok"?"#10B98110":result?"#EF444410":T.card}
                color={result==="ok"?"#10B981":result?"#EF4444":T.textMuted}>
                {testing[k.id]?<Spinner size={10}/>:result==="ok"?"✓":result?"✗":"בדוק"}
              </Btn>
            </div>
          </div>;
        })}
      </div>}
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
// SUPER ADMIN — Platform Management
// ═══════════════════════════════════════════════════════════════════
function SuperAdmin() {
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [editConfig, setEditConfig] = useState(null);

  useEffect(()=>{
    (async()=>{
      try {
        const [usersRes, configRes] = await Promise.all([
          authFetch("/api/superadmin/users"),
          authFetch("/api/superadmin/config")
        ]);
        const usersData = await usersRes.json();
        const configData = await configRes.json();
        if (Array.isArray(usersData)) setUsers(usersData);
        if (configData?.id) { setConfig(configData); setEditConfig(configData); }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function saveConfig() {
    if (!editConfig) return;
    setSavingConfig(true);
    try {
      const r = await authFetch("/api/superadmin/config", {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(editConfig)
      });
      const d = await r.json();
      if (d.id) { setConfig(d); setEditConfig(d); setConfigSaved(true); setTimeout(()=>setConfigSaved(false),2000); }
    } catch {}
    setSavingConfig(false);
  }

  async function togglePlan(userId, currentPlan) {
    const newPlan = currentPlan === 'pro' ? 'free' : 'pro';
    try {
      await authFetch(`/api/superadmin/users/${userId}/plan`, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ plan: newPlan })
      });
      setUsers(prev=>prev.map(u=>u.id===userId?{...u,plan:newPlan}:u));
    } catch {}
  }

  if (loading) return <div style={{textAlign:"center",padding:40}}><Spinner size={20}/></div>;

  const totalUsers = users.length;
  const proUsers = users.filter(u=>u.plan==='pro').length;
  const totalBiz = users.reduce((s,u)=>s+u.businesses,0);
  const totalPosts = users.reduce((s,u)=>s+u.posts,0);

  return <div style={{animation:"fadeUp 0.3s ease"}}>
    <SectionTitle sub="ניהול משתמשים, תוכניות ותמחור">👑 ניהול פלטפורמה</SectionTitle>

    {/* Stats Overview */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
      {[
        {label:"משתמשים",value:totalUsers,icon:"👥",color:"#8B5CF6"},
        {label:"Pro",value:proUsers,icon:"⭐",color:"#F59E0B"},
        {label:"עסקים",value:totalBiz,icon:"🏪",color:"#3B82F6"},
        {label:"פוסטים",value:totalPosts,icon:"📝",color:"#10B981"},
      ].map(s=><Card key={s.label} style={{textAlign:"center",padding:"16px 12px"}}>
        <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
        <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.value}</div>
        <div style={{fontSize:11,color:T.textMuted}}>{s.label}</div>
      </Card>)}
    </div>

    {/* Plan Config */}
    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:700,letterSpacing:1}}>הגדרות תוכניות</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {configSaved&&<span style={{color:"#10B981",fontSize:11}}>נשמר ✓</span>}
          <Btn sm grad="linear-gradient(135deg,#8B5CF6,#EC4899)" disabled={savingConfig} onClick={saveConfig}>
            {savingConfig?<Spinner size={10}/>:"שמור שינויים"}
          </Btn>
        </div>
      </div>

      {editConfig && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Free Plan */}
        <div style={{background:T.inputBg,borderRadius:12,padding:16,border:`1px solid ${T.borderLight}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:28,height:28,borderRadius:8,background:"#10B98115",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🆓</div>
            <div style={{fontWeight:700,fontSize:14,color:T.text}}>תוכנית חינם</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <label style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
              מקסימום עסקים
              <input type="number" value={editConfig.free_max_businesses} onChange={e=>setEditConfig(p=>({...p,free_max_businesses:parseInt(e.target.value)||0}))}
                style={{display:"block",width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,border:`1px solid ${T.inputBorder}`,background:T.card,color:T.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </label>
            <label style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
              מקסימום פוסטים בחודש
              <input type="number" value={editConfig.free_max_posts_month} onChange={e=>setEditConfig(p=>({...p,free_max_posts_month:parseInt(e.target.value)||0}))}
                style={{display:"block",width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,border:`1px solid ${T.inputBorder}`,background:T.card,color:T.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </label>
          </div>
        </div>

        {/* Pro Plan */}
        <div style={{background:T.inputBg,borderRadius:12,padding:16,border:`1px solid #F59E0B33`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:28,height:28,borderRadius:8,background:"#F59E0B15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⭐</div>
            <div style={{fontWeight:700,fontSize:14,color:T.text}}>תוכנית Pro</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <label style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
              מחיר (₪ לחודש)
              <input type="number" value={editConfig.pro_price_ils} onChange={e=>setEditConfig(p=>({...p,pro_price_ils:parseInt(e.target.value)||0}))}
                style={{display:"block",width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,border:`1px solid ${T.inputBorder}`,background:T.card,color:T.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </label>
            <label style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
              מקסימום עסקים
              <input type="number" value={editConfig.pro_max_businesses} onChange={e=>setEditConfig(p=>({...p,pro_max_businesses:parseInt(e.target.value)||0}))}
                style={{display:"block",width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,border:`1px solid ${T.inputBorder}`,background:T.card,color:T.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </label>
            <label style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
              מקסימום פוסטים בחודש
              <input type="number" value={editConfig.pro_max_posts_month} onChange={e=>setEditConfig(p=>({...p,pro_max_posts_month:parseInt(e.target.value)||0}))}
                style={{display:"block",width:"100%",marginTop:4,padding:"8px 10px",borderRadius:8,border:`1px solid ${T.inputBorder}`,background:T.card,color:T.text,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </label>
          </div>
        </div>
      </div>}
    </Card>

    {/* Users Table */}
    <Card>
      <div style={{color:T.textMuted,fontSize:11,fontWeight:700,marginBottom:16,letterSpacing:1}}>
        משתמשים ({totalUsers})
      </div>
      {users.length===0
        ? <div style={{color:T.textDim,fontSize:12,textAlign:"center",padding:20}}>אין משתמשים רשומים</div>
        : <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {users.map(u=>{
              const planColor = u.plan==='pro'?'#F59E0B':'#10B981';
              const isMe = u.isAdmin;
              return <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,
                padding:"12px 14px",background:T.inputBg,borderRadius:12,
                border:`1px solid ${isMe?'#8B5CF622':T.borderLight}`}}>
                {/* Avatar */}
                <div style={{width:36,height:36,borderRadius:"50%",
                  background:isMe?"linear-gradient(135deg,#8B5CF6,#EC4899)":"#3B82F615",
                  border:`1px solid ${isMe?"#8B5CF633":"#3B82F633"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:isMe?"#fff":"#3B82F6",fontSize:14,fontWeight:700,flexShrink:0}}>
                  {(u.email||"?")[0].toUpperCase()}
                </div>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:T.text,fontSize:13,fontWeight:600}}>{u.email}</span>
                    {isMe&&<span style={{fontSize:9,color:"#8B5CF6",background:"#8B5CF610",padding:"1px 6px",borderRadius:4,fontWeight:600}}>אתה</span>}
                  </div>
                  <div style={{display:"flex",gap:12,marginTop:3}}>
                    <span style={{color:T.textDim,fontSize:10}}>🏪 {u.businesses} עסקים</span>
                    <span style={{color:T.textDim,fontSize:10}}>📝 {u.posts} פוסטים</span>
                    <span style={{color:T.textDim,fontSize:10}}>📅 {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("he-IL") : "—"}</span>
                  </div>
                </div>
                {/* Plan badge + toggle */}
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Tag label={u.plan==='pro'?'Pro':'חינם'} color={planColor}/>
                  {!u.isAdmin && <Btn sm
                    bg={u.plan==='pro'?"#EF444410":"#F59E0B10"}
                    color={u.plan==='pro'?"#EF4444":"#F59E0B"}
                    onClick={()=>togglePlan(u.id, u.plan)}>
                    {u.plan==='pro'?'הורד ל-Free':'שדרג ל-Pro'}
                  </Btn>}
                </div>
              </div>;
            })}
          </div>
      }
    </Card>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════
export default function App({ session }) {
  const [page, setPage] = useState("dashboard");
  const [posts, setPosts] = useState([]);
  const [sources, setSources] = useState(SOURCES_INIT);
  const [businesses, setBusinesses] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("analytics_data")||"{}"); } catch { return {}; }
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Load from Supabase on startup, localStorage as fallback ──
  useEffect(()=>{
    let cancelled = false;
    async function loadFromServer() {
      try {
        // Claim orphan data on first login (assigns null user_id rows to current user)
        try { await authFetch("/api/claim-data", { method: "POST" }); } catch {}
        // Check if user is platform admin
        try { const ar = await authFetch("/api/superadmin/me"); const ad = await ar.json(); if (!cancelled) setIsAdmin(!!ad.isAdmin); } catch {}

        // Load businesses from API
        const bizRes = await authFetch("/api/businesses");
        if (bizRes.ok) {
          const bizData = await bizRes.json();
          if (!cancelled && Array.isArray(bizData) && bizData.length > 0) {
            // Convert DB format to frontend format
            const mapped = bizData.map(b => ({
              id: b.id,
              name: b.name,
              icon: b.icon || "🏢",
              color: b.color || "#6B7280",
              url: b.url || "",
              description: b.description || "",
              social: b.social || {},
              scanResult: b.scan_result || null,
              fullScanData: b.full_scan_data || null,
              competitorAnalysis: b.competitor_analysis || null,
              competitors: b.competitors || [],
              schedule: b.schedule || {},
            }));
            setBusinesses(mapped);
            console.log("[db] Loaded", mapped.length, "businesses from Supabase");
          }
        }

        // Load posts from API
        const postsRes = await authFetch("/api/content");
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          if (!cancelled && Array.isArray(postsData) && postsData.length > 0) {
            const mapped = postsData.map(p => ({
              id: p.id,
              business: p.business_name || "",
              platform: p.platform || "פייסבוק",
              type: p.type || "פוסט קצר",
              content: p.content || "",
              hashtags: p.hashtags || [],
              date: p.date_label || "",
              approved: p.status === "approved" || p.status === "published",
              published: p.status === "published",
              fbPostId: p.fb_post_id || null,
              publishedAt: p.published_at || null,
              media: p.media || null,
              pipeline: p.pipeline_status || null,
              image_url: p.image_url || null,
              video_url: p.video_url || null,
              image_variants: p.image_variants || [],
              content_variants: p.content_variants || [],
              scheduled_at: p.scheduled_at || null,
              hashtags: p.hashtags || [],
            }));
            setPosts(mapped);
            console.log("[db] Loaded", mapped.length, "posts from Supabase");
          }
        }

        if (!cancelled) setDbReady(true);
      } catch(e) {
        console.warn("[db] Server unavailable, using localStorage:", e.message);
        if (!cancelled) setDbReady(true);
      }
    }
    loadFromServer();
    return () => { cancelled = true; };
  }, []);

  // ── Save to localStorage (cache only after DB loaded) ──
  useEffect(()=>{ if (dbReady) localStorage.setItem("posts",JSON.stringify(posts)); },[posts, dbReady]);
  useEffect(()=>{ if (dbReady) localStorage.setItem("businesses",JSON.stringify(businesses)); },[businesses, dbReady]);

  // ── Sync individual business updates to Supabase (not bulk sync to avoid re-creating deleted items) ──
  const bizSyncRef = useRef(false);
  const prevBizRef = useRef(businesses);
  useEffect(()=>{
    if (!dbReady) return;
    if (!bizSyncRef.current) { bizSyncRef.current = true; prevBizRef.current = businesses; return; }
    const prev = prevBizRef.current;
    prevBizRef.current = businesses;
    // Only sync businesses that changed (not deleted ones)
    const changed = businesses.filter(b => {
      const old = prev.find(p => p.id === b.id);
      return !old || JSON.stringify(old) !== JSON.stringify(b);
    });
    if (changed.length === 0) return;
    const timer = setTimeout(()=>{
      changed.forEach(b => {
        authFetch(`/api/businesses/${b.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: b.name, url: b.url, icon: b.icon, color: b.color,
            description: b.description, social: b.social,
            scan_result: b.scanResult, full_scan_data: b.fullScanData,
            competitor_analysis: b.competitorAnalysis,
          })
        }).catch(()=>{});
      });
    }, 2000);
    return ()=>clearTimeout(timer);
  },[businesses, dbReady]);

  // ── Sync posts to Supabase when they change ──
  const postsSyncRef = useRef(false);
  const syncingRef = useRef(false);
  useEffect(()=>{
    if (!dbReady) return;
    if (!postsSyncRef.current) { postsSyncRef.current = true; return; }
    const timer = setTimeout(()=>{
      // Only sync new posts that don't have a UUID id (meaning they were created locally)
      const localPosts = posts.filter(p => typeof p.id === 'number');
      if (localPosts.length === 0 || syncingRef.current) return;
      syncingRef.current = true;
      authFetch("/api/content/sync", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ posts: localPosts })
      }).then(r=>r.json()).then(saved=>{
        if (Array.isArray(saved) && saved.length > 0) {
          // Replace local numeric IDs with server UUIDs to prevent re-syncing
          setPosts(prev => {
            const updated = [...prev];
            localPosts.forEach((lp, i) => {
              if (saved[i]?.id) {
                const idx = updated.findIndex(p => p.id === lp.id);
                if (idx !== -1) updated[idx] = { ...updated[idx], id: saved[i].id };
              }
            });
            return updated;
          });
          console.log("[db] Synced", saved.length, "posts to Supabase");
        }
      }).catch(()=>{}).finally(()=>{ syncingRef.current = false; });
    }, 2000);
    return ()=>clearTimeout(timer);
  },[posts, dbReady]);

  // Facebook OAuth callback handler
  const [fbPages, setFbPages] = useState(null); // pages returned from OAuth
  const [fbAssigning, setFbAssigning] = useState(false);

  useEffect(()=>{
    const hash = window.location.hash;
    // Handle FB OAuth pages callback
    if (hash.startsWith('#fb-pages=')) {
      try {
        const encoded = hash.slice('#fb-pages='.length);
        const data = JSON.parse(atob(encoded));
        if (data.type === 'fb-oauth' && data.pages) {
          setFbPages(data.pages);
          console.log('FB OAuth: received', data.pages.length, 'pages');
        }
      } catch(e) { console.error('FB OAuth parse error:', e); }
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Handle FB OAuth error
    if (hash.startsWith('#fb-error=')) {
      const err = decodeURIComponent(hash.slice('#fb-error='.length));
      alert('שגיאת חיבור פייסבוק: ' + err);
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Handle Google OAuth callback
    if (hash.startsWith('#google-connected=true')) {
      const params = new URLSearchParams(hash.slice(1));
      const email = decodeURIComponent(params.get('email')||'');
      const accounts = params.get('accounts')||'0';
      const bizId = params.get('bizId')||'';
      alert(`✅ חיבור Google הצליח!\n📧 ${email}\n📍 ${accounts} חשבונות GBP`);
      // Update business social if bizId returned
      if (bizId) {
        setBusinesses(prev=>prev.map(b=>b.id===bizId?{...b,social:{...b.social,gbp:{...(b.social?.gbp||{}),connected:true,google_email:email,account_count:+accounts}}}:b));
      }
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (hash.startsWith('#google-error=')) {
      const err = decodeURIComponent(hash.slice('#google-error='.length));
      alert('שגיאת חיבור Google: ' + err);
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Legacy token-update support
    if (hash.startsWith('#token-update:')) {
      try {
        const encoded = hash.slice('#token-update:'.length);
        const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
        if (data.type === 'updateTokens' && data.pages) {
          setBusinesses(prev => {
            const updated = prev.map(b => ({...b, social:{...b.social, facebook:{...b.social?.facebook, tokens:{...b.social?.facebook?.tokens}}}}));
            for (const page of data.pages) {
              const biz = updated.find(b => b.name === page.name);
              if (biz) {
                biz.social.facebook.tokens.META_ACCESS_TOKEN = page.token;
                biz.social.facebook.pageId = page.id;
              }
            }
            return updated;
          });
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch(e) { console.error('Token update error:', e); }
    }
  }, []);

  // Assign FB page to a business
  async function assignFbPage(businessId, page) {
    setFbAssigning(true);
    try {
      const r = await authFetch('/api/auth/facebook/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          pageId: page.id,
          pageName: page.name,
          pageToken: page.token
        })
      });
      const d = await r.json();
      if (d.ok) {
        // Update local state
        setBusinesses(prev => prev.map(b => {
          if (b.id === businessId) {
            return { ...b, social: d.social };
          }
          return b;
        }));
        setFbPages(prev => prev.filter(p => p.id !== page.id));
        if (fbPages.length <= 1) setFbPages(null);
      } else {
        alert('שגיאה: ' + (d.error || 'unknown'));
      }
    } catch(e) { alert('שגיאה: ' + e.message); }
    setFbAssigning(false);
  }

  const running = posts.filter(p=>(p.pipeline&&!p.pipeline.done)).length;
  const published = posts.filter(p=>p.pipeline?.done).length;

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
        flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0,boxShadow:"2px 0 8px rgba(0,0,0,0.03)",zIndex:60}}>
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
          {NAV_ITEMS.filter(item=>!item.adminOnly||isAdmin).map(item=><button key={item.id} onClick={()=>setPage(item.id)} style={{
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
        {/* User + Logout */}
        <div style={{padding:"10px 12px",borderTop:`1px solid ${T.borderLight}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{color:T.textDim,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>
            {session?.user?.email}
          </div>
          <button onClick={()=>supabase.auth.signOut()} style={{
            background:"none",border:"none",color:"#EF4444",fontSize:11,cursor:"pointer",fontWeight:600,fontFamily:"inherit",padding:"4px 8px",borderRadius:6,
          }}>יציאה</button>
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
            <div style={{background:"#1877F210",border:"1px solid #1877F222",
              color:"#1877F2",borderRadius:10,padding:"5px 12px",fontSize:11,fontWeight:600}}>
              {posts.filter(p=>p.published).length} פורסמו
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

        {/* FB OAuth Page Assignment Modal */}
        {fbPages && fbPages.length > 0 && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>setFbPages(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,padding:24,maxWidth:500,width:"100%",
            boxShadow:"0 20px 60px rgba(0,0,0,0.3)",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <span style={{fontSize:24}}>📘</span>
              <div>
                <div style={{color:T.text,fontSize:16,fontWeight:700}}>חבר עמודי פייסבוק</div>
                <div style={{color:T.textMuted,fontSize:12}}>נמצאו {fbPages.length} עמודים — שייך כל עמוד לעסק</div>
              </div>
            </div>
            {fbPages.map(page=><div key={page.id} style={{background:T.inputBg,border:`1px solid ${T.borderLight}`,
              borderRadius:12,padding:14,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{color:"#1877F2",fontWeight:700,fontSize:14}}>{page.name}</span>
                <span style={{color:T.textDim,fontSize:10}}>ID: {page.id}</span>
                {page.category && <span style={{background:"#1877F210",color:"#1877F2",fontSize:9,padding:"2px 6px",borderRadius:6}}>{page.category}</span>}
              </div>
              <div style={{color:T.textMuted,fontSize:11,marginBottom:6}}>שייך לעסק:</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {businesses.map(biz=><button key={biz.id} onClick={()=>assignFbPage(biz.id, page)}
                  disabled={fbAssigning}
                  style={{background:biz.color+"15",border:`1px solid ${biz.color}33`,borderRadius:8,
                    padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,color:T.text,fontFamily:"inherit",
                    display:"flex",alignItems:"center",gap:4,opacity:fbAssigning?0.5:1}}>
                  <span>{biz.icon}</span> {biz.name}
                </button>)}
              </div>
            </div>)}
            <button onClick={()=>setFbPages(null)} style={{width:"100%",marginTop:10,background:T.inputBg,border:`1px solid ${T.borderLight}`,
              borderRadius:10,padding:"10px",cursor:"pointer",color:T.textMuted,fontSize:12,fontFamily:"inherit"}}>סגור</button>
          </div>
        </div>}

        <div style={{padding:"20px",maxWidth:920,margin:"0 auto"}}>
          {page==="dashboard"&&<Dashboard posts={posts} sources={sources} businesses={businesses}/>}
          {page==="businesses"&&<Businesses businesses={businesses} setBusinesses={setBusinesses} posts={posts}/>}
          {page==="sources"&&<Sources sources={sources} setSources={setSources}/>}
          {page==="content"&&<Content posts={posts} setPosts={setPosts} sources={sources} businesses={businesses} setBusinesses={setBusinesses} analyticsData={analyticsData}/>}
          {page==="media"&&<MediaAI/>}
          {page==="agents"&&<ManagedAgents businesses={businesses}/>}
          {page==="publish"&&<Publish posts={posts} setPosts={setPosts} businesses={businesses}/>}
          {page==="schedule"&&<Schedule posts={posts} setPosts={setPosts} businesses={businesses} setPage={setPage}/>}
          {page==="analytics"&&<Analytics posts={posts} businesses={businesses} analyticsData={analyticsData} setAnalyticsData={setAnalyticsData}/>}
          {page==="admin"&&<Admin/>}
          {page==="superadmin"&&isAdmin&&<SuperAdmin/>}
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
