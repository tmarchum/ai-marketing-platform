import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "../lib/supabase";
import "./owner.css";

// The owner's interface: five screens, one job each. Everything here reads
// from /api/owner/* and acts through the same server endpoints the publisher
// uses, so nothing lives only in the browser.

const TABS = [
  { id: "home", label: "סקירה", icon: "layout-dashboard" },
  { id: "growth", label: "צמיחה", icon: "trending-up" },
  { id: "queue", label: "לאישור", icon: "circle-check" },
  { id: "leads", label: "פניות", icon: "address-book" },
  { id: "calendar", label: "לוח פרסום", icon: "calendar-event" },
  { id: "ads", label: "פרסום ממומן", icon: "speakerphone", admin: true },
  { id: "users", label: "משתמשים", icon: "users", admin: true },
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

export default function OwnerApp({ session }) {
  const [tab, setTab] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { api("/api/superadmin/me").then(d => setIsAdmin(!!d.isAdmin)).catch(() => {}); }, []);
  const visibleTabs = TABS.filter(t => !t.admin || isAdmin);
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
          {visibleTabs.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              <i className={`ti ti-${t.icon}`} aria-hidden="true" /> {t.label}
              {t.id === "queue" && needsYou > 0 && <b className="o-dot">{needsYou}</b>}
            </button>
          ))}
        </nav>
      </header>

      <main className="o-main">
        {err && <div className="o-err">{err} <button onClick={load}>נסה שוב</button></div>}
        {!overview && !err && <div className="o-loading">טוען את השבוע שלך…</div>}
        {overview && tab === "home" && <Home overview={overview} onOpenPost={openPost} onGo={setTab} />}
        {overview && tab === "growth" && <Growth />}
        {overview && tab === "queue" && <Queue posts={posts || []} businesses={overview.businesses} focus={focusPost} onChange={replacePost} reload={load} />}
        {overview && tab === "leads" && <Leads businesses={overview.businesses} />}
        {overview && tab === "calendar" && <Calendar posts={posts || []} businesses={overview.businesses} onOpenPost={openPost} />}
        {overview && tab === "ads" && isAdmin && <Ads />}
        {overview && tab === "users" && isAdmin && <Users />}
        {overview && tab === "settings" && <Settings businesses={overview.businesses} isAdmin={isAdmin} />}
      </main>

      <nav className="o-bottom">
        {visibleTabs.map(t => (
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
            ? <>
              <label className="o-ghost o-file">{busy === "up" ? "מעלה…" : "העלה צילום"}<input type="file" accept="image/*" onChange={e => { upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
              <button className="o-btn" disabled={!!busy} onClick={() => act("restore")}>החזר לתור</button>
            </>
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

// ── 2. צמיחה ────────────────────────────────────────────────────────────────
const OWNER_LABEL = { you: "אתה", me: "אני", base44: "בייס 44" };
const STATUS_NEXT = { todo: "doing", doing: "done", done: "todo" };
const STATUS_LABEL = { todo: "לא התחיל", doing: "בתהליך", done: "בוצע" };

function Growth() {
  const [g, setG] = useState(null);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => api("/api/owner/growth").then(setG).catch(e => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  if (err) return <div className="o-err">{err}</div>;
  if (!g) return <div className="o-loading">טוען מדדים…</div>;

  const cycle = async (b, c) => {
    const status = STATUS_NEXT[c.status];
    setG(x => ({ ...x, businesses: x.businesses.map(y => y.id !== b.id ? y : { ...y, channels: y.channels.map(z => z.key === c.key ? { ...z, status } : z) }) }));
    try { await post(`/api/owner/growth/${b.id}/channel`, { key: c.key, status }); } catch (e) { setErr(e.message); }
  };
  const daysIn = g.businesses[0]?.daysIn ?? 0;

  return (
    <>
      <div className="o-hello">
        <h1>צמיחה</h1>
        <span>יום {Math.min(daysIn, 60)} מתוך 60 · המטרה: פי 5 בפניות</span>
      </div>
      <div className="o-actions" style={{ marginBottom: 16 }}>
        <button className="o-btn" onClick={() => setAdding(a => !a)}><i className="ti ti-phone-plus" aria-hidden="true" /> רישום פנייה מטלפון / וואטסאפ</button>
        <span className="o-muted">רוב הפניות מגיעות בטלפון. רישום עם המקור הוא מה שמראה איזה ערוץ עובד.</span>
      </div>
      {adding && <AddLead businesses={g.businesses} sources={g.sources} onDone={() => { setAdding(false); load(); }} />}

      <div className="o-growth">
        {g.businesses.map(b => {
          const pct = Math.min(100, Math.round((b.last30 / b.goal) * 100));
          const max = Math.max(1, ...b.weeks.map(w => w.n));
          const sources = Object.entries(b.bySource).sort((x, y) => y[1] - x[1]);
          const ai = b.aiChecks[b.aiChecks.length - 1];
          const done = b.channels.filter(c => c.status === "done").length;
          return (
            <article key={b.id} className="o-gcard" style={{ "--c": b.color }}>
              <h2>{b.name}</h2>
              <div className="o-gnum">
                <div><b>{b.last30}</b><span>פניות ב-30 הימים האחרונים</span></div>
                <div><b>{b.goal}</b><span>המטרה (לפני: {b.baseline})</span></div>
              </div>
              <div className="o-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>

              <div className="o-weeks" aria-label="פניות לפי שבוע, 12 שבועות">
                {b.weeks.map(w => <i key={w.from} title={`שבוע מ-${w.from}: ${w.n}`} style={{ height: `${Math.max(4, (w.n / max) * 100)}%` }} className={w.from >= g.start ? "after" : ""} />)}
              </div>
              <div className="o-muted">12 שבועות אחרונים · בצבע: מאז תחילת התוכנית</div>

              <h3 className="o-gh">מאיפה הגיעו הפניות</h3>
              {sources.length === 0
                ? <p className="o-muted">עדיין אין פניות מאז {g.start.split("-").reverse().join(".")}.</p>
                : <ul className="o-src">{sources.map(([k, n]) => <li key={k}><span>{g.sources[k] || k}</span><b>{n}</b></li>)}</ul>}

              <h3 className="o-gh">נראות בעוזרי AI</h3>
              <p className="o-muted">בדיקה אחרונה ({ai.date.split("-").reverse().join(".")}): הופיע ב-{ai.found} מתוך {ai.total} שאלות. הבדיקה הבאה ב-28.11.</p>

              <h3 className="o-gh">ערוצים · {done}/{b.channels.length} בוצעו</h3>
              <ul className="o-chan">
                {b.channels.map(c => (
                  <li key={c.key}>
                    <button className={`o-st ${c.status}`} onClick={() => cycle(b, c)} title="לחץ לעדכון סטטוס">
                      <i className={`ti ti-${c.status === "done" ? "circle-check" : c.status === "doing" ? "progress" : "circle"}`} aria-hidden="true" />
                    </button>
                    <span className={c.status === "done" ? "o-done" : ""}>{c.label}</span>
                    <small className={`o-who ${c.owner}`}>{OWNER_LABEL[c.owner]}</small>
                    <small className="o-muted">{STATUS_LABEL[c.status]}</small>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}

function AddLead({ businesses, sources, onDone }) {
  const [f, setF] = useState({ businessId: businesses[0]?.id, source: "google", name: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const u = (k, v) => setF(x => ({ ...x, [k]: v }));
  const save = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try { await post("/api/owner/leads", f); onDone(); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <form className="o-addlead" onSubmit={save}>
      <label>עסק<select value={f.businessId} onChange={e => u("businessId", e.target.value)}>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>איך הגיע אליך?<select value={f.source} onChange={e => u("source", e.target.value)}>{Object.entries(sources).filter(([k]) => k !== "site").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>שם<input value={f.name} onChange={e => u("name", e.target.value)} placeholder="לא חובה" /></label>
      <label>טלפון<input value={f.phone} onChange={e => u("phone", e.target.value)} inputMode="tel" placeholder="לא חובה" /></label>
      <label className="wide">מה ביקש<input value={f.message} onChange={e => u("message", e.target.value)} placeholder="למשל: הקרנה לקיבוץ בחנוכה, 200 איש" /></label>
      <div className="o-actions wide"><button className="o-btn" disabled={busy}>{busy ? "שומר…" : "שמור פנייה"}</button>{err && <span className="o-err">{err}</span>}</div>
    </form>
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
              <div className="o-lead-meta">{heShort.format(new Date(l.created_at))}{l.source?.startsWith("manual:") ? " · נרשם ידנית" : l.utm_source ? ` · מקור: ${l.utm_source}` : ""}</div>
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
// Who runs which paid channel. One owner per channel, so two agents never bid
// against each other or spend from the same cap. Organic posting stays here.
const CHANNELS = [
  { id: "google", name: "Google Ads", sub: "חיפוש בגוגל · הקולנוע הנודד", icon: "brand-google", status: "on", owner: "Claude (המערכת הזו)",
    note: "2 קמפיינים: השכרת ציוד הקרנה ₪15 ליום, הקרנה לאירועים ₪20 ליום. חיפה עד באר שבע. ניסוי 1.11–15.11, נעצר אוטומטית." },
  { id: "meta", name: "מטא ממומן", sub: "קמפיינים בפייסבוק ואינסטגרם", icon: "brand-meta", status: "external", owner: "בוט Grok",
    note: "הקמפיינים הממומנים במטא מנוהלים ע\"י בוטי Grok (הקולנוע הנודד, שיווק החידונאים). הפוסטים האורגניים ממשיכים לצאת מכאן." },
  { id: "tiktok", name: "טיקטוק", sub: "TikTok Ads", icon: "brand-tiktok", status: "off", owner: "—",
    note: "לא מחובר. דורש חשבון TikTok for Business, פיקסל טיקטוק באתרים, וסרטונים אנכיים קצרים." },
];
const GOOGLE_DAILY = 35;
const META_MONTHLY_CAP = 750;

function Ads() {
  return (
    <>
      <div className="o-hello"><h1>פרסום ממומן</h1><span>ערוץ אחד — מנהל אחד. שום שקל לא יוצא בלי אישור שלך</span></div>

      <div className="o-kpis">
        <div><span>Google Ads ליום</span><b>₪{GOOGLE_DAILY}</b></div>
        <div><span>Google Ads לניסוי (עד 15.11)</span><b>₪{GOOGLE_DAILY * 15}</b></div>
        <div><span>תקרת החשבון במטא (בוט Grok)</span><b>₪{META_MONTHLY_CAP}</b></div>
      </div>

      <h2 className="o-h2">ערוצים</h2>
      <div className="o-channels">
        {CHANNELS.map(c => (
          <article key={c.id} className="o-channel">
            <div className="o-channel-head">
              <span className="o-channel-icon"><i className={`ti ti-${c.icon}`} aria-hidden="true" /></span>
              <div><h3>{c.name}</h3><small>{c.sub}</small></div>
              <span className={`o-status ${c.status === "on" ? "good" : c.status === "external" ? "warn" : "neutral"}`}>
                {c.status === "on" ? "פעיל" : c.status === "external" ? "מנוהל חיצונית" : "לא מחובר"}
              </span>
            </div>
            <p>{c.note}</p>
            <p className="o-muted">מנהל: {c.owner}</p>
          </article>
        ))}
      </div>
    </>
  );
}

// ── משתמשים (מנהל בלבד) ─────────────────────────────────────────────────────
const put = (path, body) => api(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
const toggleId = (list, id) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

function BizChecks({ biz, value, onChange, disabled }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {biz.map(b => (
        <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, opacity: disabled ? 0.5 : 1 }}>
          <input type="checkbox" disabled={disabled} checked={value.includes(b.id)} onChange={() => onChange(toggleId(value, b.id))} />
          <span style={{ color: b.color || "inherit", fontWeight: 600 }}>{b.name}</span>
        </label>
      ))}
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState(null);
  const [biz, setBiz] = useState([]);
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [pick, setPick] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, b] = await Promise.all([api("/api/superadmin/users"), api("/api/superadmin/businesses")]);
      setUsers(Array.isArray(u) ? u : []); setBiz(Array.isArray(b) ? b : []);
    } catch (e) { setMsg(String(e.message || e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function invite() {
    setBusy(true); setMsg("");
    try {
      const d = await post("/api/superadmin/users/invite", { email: email.trim(), businessIds: pick });
      setMsg(d.invited ? `נשלחה הזמנה ל-${email.trim()}` : `${email.trim()} כבר רשום, והגישה שלו עודכנה`);
      setEmail(""); setPick([]); await load();
    } catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  }
  async function saveBiz(u, ids) {
    setUsers(us => us.map(x => x.id === u.id ? { ...x, businessIds: ids } : x));
    try { await put(`/api/superadmin/users/${u.id}/businesses`, { businessIds: ids }); setMsg(""); }
    catch (e) { setMsg(String(e.message || e)); load(); }
  }
  async function setAccess(u, approved) {
    if (!approved && !confirm(`לחסום את ${u.email}? הוא לא יוכל להיכנס עד שתשחרר.`)) return;
    try { await put(`/api/superadmin/users/${u.id}/access`, { approved }); await load(); }
    catch (e) { setMsg(String(e.message || e)); }
  }

  return (
    <>
      <div className="o-hello"><h1>משתמשים</h1><span>הכניסה למערכת בהזמנה בלבד. כל משתמש רואה רק את העסקים שסימנת לו</span></div>

      <div className="o-boost" style={{ display: "block" }}>
        <h3>הוספת משתמש</h3>
        <p>תישלח הזמנה במייל. בחר לאילו עסקים תהיה לו גישה (אפשר לשנות אחר כך).</p>
        <input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com"
          style={{ width: "100%", padding: 10, margin: "6px 0 10px" }} />
        <BizChecks biz={biz} value={pick} onChange={setPick} />
        <div style={{ marginTop: 12 }}>
          <button className="o-btn" disabled={busy || !email.trim()} onClick={invite}>{busy ? "שולח…" : "שלח הזמנה"}</button>
        </div>
      </div>
      {msg && <p className="o-msg">{msg}</p>}

      <h2 className="o-h2">משתמשים קיימים</h2>
      {!users && <div className="o-loading">טוען…</div>}
      <div className="o-set">
        {(users || []).map(u => (
          <article key={u.id} className="o-set-row">
            <h3 dir="ltr" style={{ textAlign: "right" }}>{u.email}</h3>
            <div className="o-set-items">
              <span className={u.isAdmin ? "good" : u.blocked ? "bad" : ""}>{u.isAdmin ? "אדמין" : u.blocked ? "חסום" : "מוזמן"}</span>
              <span>{u.lastLogin ? `כניסה אחרונה: ${u.lastLogin.slice(0, 10)}` : "עוד לא נכנס"}</span>
            </div>
            {u.isAdmin ? <p className="o-muted">גישה מלאה לכל העסקים.</p> : (
              <>
                <BizChecks biz={biz} value={u.businessIds || []} onChange={ids => saveBiz(u, ids)} disabled={u.blocked} />
                {!(u.businessIds || []).length && !u.blocked && <p className="o-muted">אין עסקים מסומנים: המשתמש יראה מסך ריק.</p>}
                <div style={{ marginTop: 10 }}>
                  <button className="o-ghost" onClick={() => setAccess(u, !!u.blocked)}>{u.blocked ? "שחרר גישה" : "חסום גישה"}</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

// ── 5. הגדרות ───────────────────────────────────────────────────────────────
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
// Direct Meta ads access for the bots: save the system-user token once, hand the bots a key.
function AdsAccess() {
  const [st, setSt] = useState(null);
  const [tok, setTok] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api("/api/owner/ads-status").then(setSt).catch(e => setMsg(String(e.message || e)));
  useEffect(() => { load(); }, []);
  const save = async () => {
    setBusy(true); setMsg("");
    try { const d = await post("/api/owner/ads-token", { token: tok.trim() }); setTok(""); setMsg(`נשמר. הרשאות: ${(d.scopes || []).join(", ")}`); await load(); }
    catch (e) { setMsg(String(e.message || e)); }
    setBusy(false);
  };
  const copy = () => { try { navigator.clipboard.writeText(st.key); setMsg("המפתח הועתק"); } catch { setMsg("לא הצלחתי להעתיק"); } };
  return (
    <div className="o-boost" style={{ display: "block" }}>
      <h3>גישה ישירה לפרסום ב-Meta (בלי התחברות בדפדפן)</h3>
      <p>{!st ? "טוען…" : !st.set ? "עדיין לא נשמר טוקן. הדבק כאן את הטוקן של משתמש המערכת (עם ads_management)." : st.accounts?.length ? `מחובר. חשבונות מודעות נגישים: ${st.accounts.map(a => `${a.name} (${a.id})`).join(" · ")}` : `הטוקן נשמר, אבל אין חשבונות נגישים. ${st.error || "שייך חשבונות מודעות למשתמש המערכת ב-Business Settings."}`}</p>
      <input type="password" value={tok} onChange={e => setTok(e.target.value)} placeholder="טוקן משתמש מערכת" autoComplete="off" style={{ width: "100%", padding: 10, margin: "6px 0" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="o-btn" disabled={busy || tok.trim().length < 40} onClick={save}>{busy ? "בודק…" : "שמור טוקן"}</button>
        {st?.key && <button className="o-ghost" onClick={copy}>העתק מפתח לבוטים</button>}
      </div>
      {msg && <p className="o-msg">{msg}</p>}
    </div>
  );
}

function Settings({ businesses, isAdmin }) {
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
      {isAdmin && <AdsAccess />}
      {isAdmin && (
        <div className="o-boost">
          <div className="o-idea-icon"><i className="ti ti-adjustments" aria-hidden="true" /></div>
          <div>
            <h3>כלי ניהול מתקדמים</h3>
            <p>בסיס הידע, זהות ויזואלית, מענה אוטומטי, דף נחיתה ומפתחות עדיין נערכים במסך ניהול נפרד, למנהל בלבד.</p>
            <a className="o-btn" href="?classic=1">פתח כלי ניהול</a>
          </div>
        </div>
      )}
    </>
  );
}
