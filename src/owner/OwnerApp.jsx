import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "../lib/supabase";
import "./owner.css";

// The owner's interface: five screens, one job each. Everything here reads
// from /api/owner/* and acts through the same server endpoints the publisher
// uses, so nothing lives only in the browser.

const TABS = [
  { id: "home", label: "סקירה", icon: "layout-dashboard" },
  { id: "queue", label: "לאישור", icon: "circle-check" },
  { id: "leads", label: "פניות", icon: "address-book" },
  { id: "calendar", label: "לוח פרסום", icon: "calendar-event" },
  { id: "ads", label: "פרסום ממומן", icon: "speakerphone" },
  { id: "settings", label: "הגדרות", icon: "settings" },
];

const he = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" });
const heShort = new Intl.DateTimeFormat("he-IL", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const heHebrew = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", { day: "numeric", month: "long" });

// Local preview only (vite dev + ?demo): read a snapshot instead of the API so
// the screens can be checked without signing in. Stripped from production builds.
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has("demo");

async function api(path, opts = {}) {
  if (DEMO) {
    const snap = await (await fetch("/owner-demo.json")).json();
    const key = Object.keys(snap).find(k => path.startsWith(k));
    return key ? snap[key] : { ok: true };
  }
  const r = await authFetch(path, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `שגיאה ${r.status}`);
  return d;
}
const post = (path, body) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });

// Same rules as the server's holidayOn: exact Hebrew dates from Intl.
const HEB = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long", timeZone: "UTC" });
function holidayOn(iso) {
  const parts = HEB.formatToParts(new Date(iso + "T12:00:00Z"));
  const day = +parts.find(p => p.type === "day").value, month = parts.find(p => p.type === "month").value;
  if (month === "Tishri") { if (day <= 2) return "ראש השנה"; if (day === 10) return "יום כיפור"; if (day >= 15 && day <= 21) return "סוכות"; if (day === 22) return "שמחת תורה"; }
  if ((month === "Kislev" && day >= 25) || (month === "Tevet" && day <= 2)) return "חנוכה";
  if (month === "Shevat" && day === 15) return 'ט"ו בשבט';
  if ((month === "Adar" || month === "Adar II") && day === 14) return "פורים";
  if (month === "Nisan" && day >= 15 && day <= 21) return "פסח";
  if (month === "Iyar" && day === 5) return "יום העצמאות";
  if (month === "Iyar" && day === 18) return 'ל"ג בעומר';
  if (month === "Sivan" && day === 6) return "שבועות";
  return null;
}

export default function OwnerApp({ session, onClassic }) {
  const [tab, setTab] = useState("home");
  const [overview, setOverview] = useState(null);
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  const [focusPost, setFocusPost] = useState(null);

  const load = useCallback(async () => {
    setErr("");
    try {
      const [o, p] = await Promise.all([api("/api/owner/overview"), api("/api/owner/posts?days=49&back=7")]);
      setOverview(o); setPosts(p.posts);
    } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const replacePost = useCallback(np => setPosts(ps => (ps || []).map(p => p.id === np.id ? { ...p, ...np } : p)), []);
  const needsYou = useMemo(() => (overview?.businesses || []).reduce((n, b) => n + b.attention.length, 0), [overview]);
  const openPost = id => { setFocusPost(id); setTab("queue"); };

  return (
    <div className="o-app" dir="rtl">
      <header className="o-top">
        <div className="o-brand"><span className="o-logo"><i className="ti ti-chart-arrows-vertical" aria-hidden="true" /></span>מרכז השיווק</div>
        <nav className="o-tabs">
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              <i className={`ti ti-${t.icon}`} aria-hidden="true" /> {t.label}
              {t.id === "queue" && needsYou > 0 && <b className="o-dot">{needsYou}</b>}
            </button>
          ))}
        </nav>
        <button className="o-ghost" onClick={onClassic}>ממשק קודם</button>
      </header>

      <main className="o-main">
        {err && <div className="o-err">{err} <button onClick={load}>נסה שוב</button></div>}
        {!overview && !err && <div className="o-loading">טוען את השבוע שלך…</div>}
        {overview && tab === "home" && <Home overview={overview} onOpenPost={openPost} onGo={setTab} />}
        {overview && tab === "queue" && <Queue posts={posts || []} businesses={overview.businesses} focus={focusPost} onChange={replacePost} reload={load} />}
        {overview && tab === "leads" && <Leads businesses={overview.businesses} />}
        {overview && tab === "calendar" && <Calendar posts={posts || []} businesses={overview.businesses} onOpenPost={openPost} />}
        {overview && tab === "ads" && <Ads businesses={overview.businesses} />}
        {overview && tab === "settings" && <Settings businesses={overview.businesses} onClassic={onClassic} />}
      </main>

      <nav className="o-bottom">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            <i className={`ti ti-${t.icon}`} aria-hidden="true" /><small>{t.label}</small>
            {t.id === "queue" && needsYou > 0 && <b className="o-dot">{needsYou}</b>}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── 1. השבוע שלי ────────────────────────────────────────────────────────────
function Home({ overview, onOpenPost, onGo }) {
  const today = new Date(overview.today + "T12:00:00");
  const s = overview.suggestion;
  return (
    <>
      <div className="o-hello">
        <h1>{he.format(today)}</h1>
        <span>{heHebrew.format(today)}</span>
      </div>

      {s && (
        <div className="o-idea">
          <div className="o-idea-icon"><i className="ti ti-calendar-star" aria-hidden="true" /></div>
          <div>
            <span className="o-eyebrow">הזדמנות לפי לוח השנה</span>
            <h3>{s.holiday} בעוד {s.daysAway} ימים</h3>
            <p>מוסדות, ועדי הורים ורשויות סוגרים בימים אלה את אירועי {s.holiday}. מומלץ פוסט של סגירת תאריכים לכל עסק.</p>
            <button className="o-btn" onClick={() => onGo("calendar")}>פתח לוח פרסום</button>
          </div>
        </div>
      )}

      <div className="o-biz-grid">
        {overview.businesses.map(b => (
          <article key={b.id} className="o-biz" style={{ "--c": b.color }}>
            <div className="o-biz-img" style={b.next?.image ? { backgroundImage: `url(${b.next.image})` } : undefined}>
              {!b.next?.image && <span>אין פוסט קרוב</span>}
              {b.next && <em>הבא: {heShort.format(new Date(b.next.scheduledAt))}</em>}
            </div>
            <div className="o-biz-body">
              <h2>{b.name}</h2>
              <div className="o-stats">
                <Stat n={b.leadsThisWeek} label="פניות השבוע" prev={b.leadsLastWeek} />
                <Stat n={b.publishedThisWeek} label="פורסמו" />
                <Stat n={b.scheduledNextWeek} label="מתוכננים" />
              </div>
              {b.attention.length === 0
                ? <div className="o-ok"><i className="ti ti-circle-check" aria-hidden="true" /> מוכן לשבוע</div>
                : b.attention.slice(0, 3).map(a => (
                  <button key={a.postId} className={`o-alert ${a.level}`} onClick={() => onOpenPost(a.postId)}>
                    <i className="ti ti-alert-triangle" aria-hidden="true" /><span>{a.text}</span><small>{heShort.format(new Date(a.scheduledAt))}</small>
                  </button>
                ))}
            </div>
          </article>
        ))}
      </div>

    </>
  );
}

function Stat({ n, label, prev }) {
  const trend = prev == null ? null : n > prev ? "up" : n < prev ? "down" : null;
  return (
    <div className="o-stat">
      <b>{n}{trend === "up" && <i className="up">▲</i>}{trend === "down" && <i className="down">▼</i>}</b>
      <span>{label}</span>
    </div>
  );
}

// ── 2. לאישור ───────────────────────────────────────────────────────────────
function Queue({ posts, businesses, focus, onChange, reload }) {
  const [biz, setBiz] = useState("all");
  const [showSkipped, setShowSkipped] = useState(false);
  const now = new Date().toISOString();
  const list = posts
    .filter(p => !p.publishedAt && p.scheduledAt >= now.slice(0, 10))
    .filter(p => biz === "all" || p.business === biz)
    .filter(p => showSkipped || !p.skipped);
  const skippedCount = posts.filter(p => !p.publishedAt && p.skipped && (biz === "all" || p.business === biz)).length;

  useEffect(() => {
    if (focus) document.getElementById(`post-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus]);

  return (
    <>
      <div className="o-chips">
        <button className={biz === "all" ? "on" : ""} onClick={() => setBiz("all")}>הכל</button>
        {businesses.map(b => (
          <button key={b.id} className={biz === b.name ? "on" : ""} style={{ "--c": b.color }} onClick={() => setBiz(b.name)}>{b.name}</button>
        ))}
        {skippedCount > 0 && <button className="o-ghost" onClick={() => setShowSkipped(v => !v)}>{showSkipped ? "הסתר מדולגים" : `${skippedCount} מדולגים`}</button>}
      </div>
      {list.length === 0 && <div className="o-empty">אין פוסטים מתוכננים כאן. הלוח החודשי יתמלא אוטומטית.</div>}
      <div className="o-feed">
        {list.map(p => <PostCard key={p.id} p={p} color={businesses.find(b => b.name === p.business)?.color} focused={focus === p.id} onChange={onChange} reload={reload} />)}
      </div>
    </>
  );
}

function PostCard({ p, color, focused, onChange, reload }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(p.content);
  const [open, setOpen] = useState(false);

  const act = async (action, extra) => {
    setBusy(action); setMsg("");
    try { const d = await post(`/api/owner/posts/${p.id}`, { action, ...extra }); onChange(d.post); if (action === "edit") setEditing(false); }
    catch (e) { setMsg(e.message); }
    setBusy("");
  };
  const newImage = async () => {
    setBusy("img"); setMsg("");
    try {
      const d = await post(`/api/posts/${p.id}/generate-media?force=1&variants=2`);
      onChange({ id: p.id, image: d.url, gallery: d.variants });
      await reload();
    } catch (e) { setMsg("יצירת התמונה נכשלה: " + e.message); }
    setBusy("");
  };
  const pick = async url => {
    onChange({ id: p.id, image: url, qc: null });
    try { await post(`/api/posts/${p.id}/select-variant`, { variant_url: url }); } catch {}
  };
  const upload = async file => {
    if (!file) return;
    setBusy("up"); setMsg("");
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const d = await post(`/api/posts/${p.id}/upload-image`, { data_url: c.toDataURL("image/jpeg", 0.88) });
      onChange({ id: p.id, image: d.url, gallery: d.variants, qc: null });
    } catch (e) { setMsg("ההעלאה נכשלה: " + e.message); }
    setBusy("");
  };

  const status = p.skipped ? { cls: "muted", t: "מדולג — לא יתפרסם" }
    : p.blocked ? { cls: "bad", t: "הפרסום נכשל ונעצר" }
    : p.qc && !p.qc.pass && !p.approved ? { cls: "bad", t: "התמונה נכשלה בבדיקה — מחכה לך" }
    : p.approved ? { cls: "good", t: "אושר ✓" }
    : { cls: "neutral", t: p.qc ? `תמונה עברה · ${p.qc.score}/10` : "יתפרסם אוטומטית" };
  const first = p.content.split("\n")[0];

  return (
    <article id={`post-${p.id}`} className={`o-post ${focused ? "focus" : ""} ${p.skipped ? "dim" : ""}`} style={{ "--c": color }}>
      <div className="o-post-img" style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}>
        {!p.image && <span>אין תמונה</span>}
      </div>
      <div className="o-post-body">
        <div className="o-post-meta">
          <span className="o-tag">{p.business}</span>
          <span>{heShort.format(new Date(p.scheduledAt))}</span>
        </div>
        <span className={`o-status ${status.cls}`}>{status.t}</span>
        {/* Verdicts from before the judge wrote Hebrew are left out rather than shown in English. */}
        {p.qc && !p.qc.pass && !p.skipped && (() => {
          const why = (p.qc.problems || []).filter(t => /[֐-׿]/.test(t)).slice(0, 2);
          return why.length > 0 && <p className="o-why">למה: {why.join(" · ")}</p>;
        })()}

        {editing
          ? <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={8} />
          : <p className="o-text">{open ? p.content : first}{!open && p.content.length > first.length && <button className="o-link" onClick={() => setOpen(true)}> …עוד</button>}</p>}

        {p.gallery.length > 1 && !p.skipped && (
          <div className="o-gallery" aria-label="תמונות לבחירה">
            {p.gallery.slice(0, 8).map(u => (
              <button key={u} className={u === p.image ? "sel" : ""} onClick={() => u !== p.image && pick(u)} style={{ backgroundImage: `url(${u})` }} aria-label={u === p.image ? "התמונה שתתפרסם" : "בחר תמונה זו"} />
            ))}
          </div>
        )}

        {msg && <p className="o-msg">{msg}</p>}

        <div className="o-actions">
          {p.skipped
            ? <button className="o-btn" disabled={!!busy} onClick={() => act("restore")}>החזר לתור</button>
            : editing
              ? <><button className="o-btn" disabled={!!busy} onClick={() => act("edit", { content: txt })}>שמור</button><button className="o-ghost" onClick={() => { setEditing(false); setTxt(p.content); }}>ביטול</button></>
              : <>
                {!p.approved && <button className="o-btn" disabled={!!busy} onClick={() => act("approve")}>{busy === "approve" ? "…" : "אשר"}</button>}
                <button className="o-ghost" disabled={!!busy} onClick={newImage}>{busy === "img" ? "יוצר תמונה…" : "תמונה חדשה"}</button>
                <label className="o-ghost o-file">{busy === "up" ? "מעלה…" : "העלה צילום"}<input type="file" accept="image/*" onChange={e => { upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
                <button className="o-ghost" onClick={() => { setEditing(true); setOpen(true); }}>ערוך</button>
                <button className="o-ghost danger" disabled={!!busy} onClick={() => act("skip")}>דלג</button>
              </>}
        </div>
      </div>
    </article>
  );
}

// ── 3. פניות ────────────────────────────────────────────────────────────────
const LEAD_STATUS = { new: "חדשה", contacted: "דיברנו", converted: "נסגר ✓", closed: "לא רלוונטי" };

function Leads({ businesses }) {
  const [leads, setLeads] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/owner/leads").then(d => setLeads(d.leads)).catch(e => setErr(e.message)); }, []);
  const setStatus = async (id, status) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    try { await post(`/api/owner/leads/${id}`, { status }); } catch (e) { setErr(e.message); }
  };
  if (err) return <div className="o-err">{err}</div>;
  if (!leads) return <div className="o-loading">טוען פניות…</div>;
  const color = id => businesses.find(b => b.id === id)?.color;
  const open = leads.filter(l => l.status === "new" || !l.status).length;
  return (
    <>
      <div className="o-hello"><h1>פניות</h1><span>{open} פתוחות · {leads.length} בסך הכל</span></div>
      {leads.length === 0 && <div className="o-empty">עדיין אין פניות מטופס האתר. פניות מוואטסאפ ומטלפון נמדדות בפיקסל ויופיעו בסיכום השבועי.</div>}
      <div className="o-leads">
        {leads.map(l => {
          const phone = (l.phone || "").replace(/\D/g, "");
          const wa = phone ? `https://wa.me/972${phone.replace(/^0/, "")}` : null;
          return (
            <article key={l.id} className={`o-lead ${l.status === "new" || !l.status ? "new" : ""}`} style={{ "--c": color(l.business_id) }}>
              <div className="o-lead-head">
                <h3>{l.name || "ללא שם"}</h3>
                <span className="o-tag">{l.business_name}</span>
              </div>
              {l.message && <p>{l.message}</p>}
              <div className="o-lead-meta">{heShort.format(new Date(l.created_at))}{l.utm_source ? ` · מקור: ${l.utm_source}` : ""}</div>
              <div className="o-actions">
                {wa && <a className="o-btn" href={wa} target="_blank" rel="noreferrer">וואטסאפ</a>}
                {phone && <a className="o-ghost" href={`tel:${phone}`}>התקשר</a>}
                <select value={l.status || "new"} onChange={e => setStatus(l.id, e.target.value)}>
                  {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ── 4. לוח ──────────────────────────────────────────────────────────────────
function Calendar({ posts, businesses, onOpenPost }) {
  const color = name => businesses.find(b => b.name === name)?.color || "#888";
  const start = new Date(); start.setHours(12, 0, 0, 0); start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 49 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const byDay = {};
  posts.forEach(p => { const k = new Date(p.scheduledAt).toLocaleDateString("en-CA"); (byDay[k] ||= []).push(p); });
  const todayKey = new Date().toLocaleDateString("en-CA");
  return (
    <>
      <div className="o-hello"><h1>הלוח</h1><span>7 השבועות הקרובים · חגים מסומנים לפי הלוח העברי</span></div>
      <div className="o-legend">{businesses.map(b => <span key={b.id}><i style={{ background: b.color }} />{b.name}</span>)}</div>
      <div className="o-cal">
        {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map(d => <div key={d} className="o-cal-h">{d}</div>)}
        {days.map(d => {
          const k = d.toLocaleDateString("en-CA");
          const hol = holidayOn(k);
          const items = (byDay[k] || []).filter(p => !p.skipped);
          return (
            <div key={k} className={`o-cal-d ${k === todayKey ? "today" : ""} ${k < todayKey ? "past" : ""}`}>
              <div className="o-cal-n">{d.getDate()}{hol && <em>{hol}</em>}</div>
              {items.map(p => (
                <button key={p.id} className={`o-cal-p ${p.publishedAt ? "done" : ""}`} onClick={() => !p.publishedAt && onOpenPost(p.id)}
                  style={{ "--c": color(p.business), backgroundImage: p.image ? `url(${p.image})` : undefined }}
                  title={`${p.business} · ${p.content.split("\n")[0]}`} />
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}


// ── פרסום ממומן ─────────────────────────────────────────────────────────────
// Channels and the weekly plan. Nothing here spends: a proposal becomes a
// campaign only on the owner's click, and only once a channel is connected.
const CHANNELS = [
  { id: "meta", name: "מטא", sub: "פייסבוק ואינסטגרם", icon: "brand-meta", status: "pending",
    note: "חסר טוקן פרסום (ads_management). הפיקסל כבר מותקן ומודד פניות בשלושת האתרים." },
  { id: "tiktok", name: "טיקטוק", sub: "TikTok Ads", icon: "brand-tiktok", status: "off",
    note: "לא מחובר. דורש חשבון TikTok for Business, פיקסל טיקטוק באתרים, וסרטונים אנכיים קצרים." },
];
const BOOST_PLAN = [
  { biz: "הקולנוע הנודד", daily: 25, days: 5 },
  { biz: "החידונאים", daily: 25, days: 5 },
];
const MONTHLY_CAP = 750;

function Ads({ businesses }) {
  const weekly = BOOST_PLAN.reduce((n, b) => n + b.daily * b.days, 0);
  const over = weekly * 4 > MONTHLY_CAP;
  return (
    <>
      <div className="o-hello"><h1>פרסום ממומן</h1><span>שום שקל לא יוצא בלי אישור שלך</span></div>

      <div className="o-kpis">
        <div><span>תקציב שבועי מתוכנן</span><b>₪{weekly}</b></div>
        <div><span>חודשי בקירוב</span><b>₪{weekly * 4}</b></div>
        <div className={over ? "warn" : ""}><span>תקרת החשבון במטא</span><b>₪{MONTHLY_CAP}</b></div>
      </div>
      {over && <p className="o-note"><i className="ti ti-info-circle" aria-hidden="true" /> התוכנית החודשית גבוהה מתקרת החשבון. קידום שחוצה את התקרה לא יאושר עד שהתקרה תעלה.</p>}

      <h2 className="o-h2">ערוצים</h2>
      <div className="o-channels">
        {CHANNELS.map(c => (
          <article key={c.id} className="o-channel">
            <div className="o-channel-head">
              <span className="o-channel-icon"><i className={`ti ti-${c.icon}`} aria-hidden="true" /></span>
              <div><h3>{c.name}</h3><small>{c.sub}</small></div>
              <span className={`o-status ${c.status === "on" ? "good" : c.status === "pending" ? "warn" : "neutral"}`}>
                {c.status === "on" ? "פעיל" : c.status === "pending" ? "ממתין לחיבור" : "לא מחובר"}
              </span>
            </div>
            <p>{c.note}</p>
          </article>
        ))}
      </div>

      <h2 className="o-h2">תוכנית הקידום השבועית</h2>
      <div className="o-plan">
        {BOOST_PLAN.map(p => {
          const b = businesses.find(x => x.name === p.biz);
          return (
            <article key={p.biz} className="o-plan-row" style={{ "--c": b?.color }}>
              <div className="o-plan-img" style={b?.next?.image ? { backgroundImage: `url(${b.next.image})` } : undefined} />
              <div className="o-plan-body">
                <h3>{p.biz}</h3>
                <p>הפוסט החזק של השבוע ייבחר לפי ביצועים ואיכות. ₪{p.daily} ליום × {p.days} ימים = ₪{p.daily * p.days}.</p>
                <div className="o-actions"><button className="o-btn" disabled>אשר קידום</button><span className="o-muted">יופעל אחרי חיבור ערוץ</span></div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ── 5. הגדרות ───────────────────────────────────────────────────────────────
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
function Settings({ businesses, onClassic }) {
  return (
    <>
      <div className="o-hello"><h1>הגדרות</h1><span>חיבורים וקצב פרסום</span></div>
      <div className="o-set">
        {businesses.map(b => (
          <article key={b.id} className="o-set-row" style={{ "--c": b.color }}>
            <h3>{b.name}</h3>
            <div className="o-set-items">
              <span className={b.fbConnected ? "good" : "bad"}><i className="ti ti-brand-facebook" aria-hidden="true" /> {b.fbConnected ? "מחובר" : "לא מחובר"}</span>
              <span className={b.igConnected ? "good" : "bad"}><i className="ti ti-brand-instagram" aria-hidden="true" /> {b.igConnected ? "מחובר" : "לא מחובר"}</span>
              <span><i className="ti ti-calendar-repeat" aria-hidden="true" /> {(b.schedule?.days || []).map(d => DAYS[d]).join(" ו") || "לא מוגדר"}{b.schedule?.times?.[0] ? ` · ${b.schedule.times[0]}` : ""}</span>
              {b.url && <a href={/^https?:/.test(b.url) ? b.url : `https://${b.url}`} target="_blank" rel="noreferrer"><i className="ti ti-world" aria-hidden="true" /> {b.url}</a>}
            </div>
          </article>
        ))}
      </div>
      <div className="o-boost">
        <div className="o-idea-icon"><i className="ti ti-adjustments" aria-hidden="true" /></div>
        <div>
          <h3>הגדרות מתקדמות</h3>
          <p>בסיס הידע, זהות ויזואלית, מענה אוטומטי, דף נחיתה ומפתחות — נמצאים עדיין בממשק הקודם.</p>
          <button className="o-btn" onClick={onClassic}>פתח את הממשק הקודם</button>
        </div>
      </div>
    </>
  );
}
