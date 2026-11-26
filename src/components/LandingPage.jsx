import { useState } from "react";

export default function LandingPage({ onGetStarted }) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const openForm = () => { setFormOpen(true); setSent(false); setFormError(""); };

  async function submitInquiry(e) {
    e.preventDefault();
    setFormError("");
    setSending(true);
    try {
      const r = await fetch("/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "השליחה נכשלה, נסו שוב");
      setSent(true);
      setForm({ name: "", phone: "", email: "", message: "", website: "" });
    } catch (err) {
      setFormError(err.message || "השליחה נכשלה, נסו שוב");
    }
    setSending(false);
  }

  const FEATURES = [
    { icon: "🤖", title: "תוכן AI חכם", desc: "Claude יוצר פוסטים מותאמים לעסק שלך — בעברית, בטון הנכון, עם האשטגים רלוונטיים" },
    { icon: "🎨", title: "מדיה AI", desc: "תמונות מקצועיות עם Flux ווידאו עם Runway — בלחיצת כפתור" },
    { icon: "🎭", title: "אווטאר UGC", desc: "סרטוני המלצה עם אווטארים דוברי עברית — בלי צלמים ובלי שחקנים" },
    { icon: "📊", title: "אנליטיקס ומתחרים", desc: "ניתוח ביצועים, סריקת מתחרים ותובנות AI לשיפור התוכן" },
    { icon: "📘", title: "חיבור ישיר לפייסבוק", desc: "OAuth מאובטח — חבר עמודים, פרסם ישירות, עקוב אחרי תגובות" },
    { icon: "🔑", title: "מפתחות API שלך", desc: "BYOK — השתמש במפתחות שלך או במפתחות המערכת. שליטה מלאה" },
  ];

  const STEPS = [
    { num: "1", title: "הוסף את העסק", desc: "שם, תיאור, לוגו — וחבר את עמוד הפייסבוק" },
    { num: "2", title: "AI יוצר תוכן", desc: "בלחיצה אחת — פוסטים, תמונות, סרטונים ואווטארים" },
    { num: "3", title: "אשר ופרסם", desc: "בדוק, ערוך אם צריך, ופרסם ישירות מהממשק" },
  ];

  const FAQS = [
    { q: "איך מצטרפים?", a: "הגישה למערכת בהזמנה. השאירו פרטים ונחזור אליכם עם מידע והצעה מותאמת." },
    { q: "האם צריך ידע טכני?", a: "ממש לא. הממשק בעברית, פשוט ואינטואיטיבי. ה-AI עושה את העבודה הקשה." },
    { q: "איך מתחברים לפייסבוק?", a: "בלחיצה אחת — חיבור OAuth מאובטח של Meta. לא צריך להעתיק טוקנים ידנית." },
    { q: "מה קורה עם התוכן לפני פרסום?", a: "שום דבר לא מתפרסם בלי אישור שלך. תמיד אתה מחליט מה עולה." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a", color: "#fff", fontFamily: "'IBM Plex Sans Hebrew','Assistant',sans-serif", direction: "rtl" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .land-btn { transition: all 0.2s; }
        .land-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(139,92,246,0.4); }
        .feature-card { transition: all 0.2s; }
        .feature-card:hover { transform: translateY(-4px); border-color: rgba(139,92,246,0.3) !important; }
        .faq-item { transition: all 0.2s; cursor: pointer; }
        .faq-item:hover { background: rgba(255,255,255,0.05) !important; }
      `}</style>

      {/* NAV */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#EC4899,#8B5CF6,#F59E0B)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>AI Marketing</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onGetStarted} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: 10, padding: "8px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
            התחברות
          </button>
          <button onClick={openForm} className="land-btn" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
            border: "none", color: "#fff", borderRadius: 10, padding: "8px 24px", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
            קבלת מידע
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: "center", padding: "80px 24px 60px", maxWidth: 800, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
        <div style={{ display: "inline-block", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: 20, padding: "4px 16px", fontSize: 13, color: "#a78bfa", marginBottom: 20, fontWeight: 600 }}>
          פלטפורמת שיווק AI לעסקים בישראל
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 20,
          background: "linear-gradient(135deg, #fff 0%, #a78bfa 50%, #f472b6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          תוכן שיווקי מקצועי
          <br />בלחיצת כפתור
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "clamp(16px, 2vw, 20px)", lineHeight: 1.7, marginBottom: 36, maxWidth: 600, margin: "0 auto 36px" }}>
          AI יוצר לך פוסטים, תמונות, סרטונים ואווטארים — בעברית, מותאם לעסק שלך, מוכן לפרסום בפייסבוק ואינסטגרם.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={openForm} className="land-btn" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
            border: "none", color: "#fff", borderRadius: 14, padding: "14px 40px", cursor: "pointer", fontSize: 18, fontWeight: 700, fontFamily: "inherit",
            boxShadow: "0 4px 20px rgba(139,92,246,0.3)" }}>
            השאירו פרטים לקבלת מידע
          </button>
        </div>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 14 }}>
          נחזור אליכם בהקדם. ללא התחייבות.
        </p>
      </section>

      {/* DEMO VISUAL */}
      <section style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))",
          border: "1px solid rgba(139,92,246,0.2)", borderRadius: 20, padding: 3 }}>
          <div style={{ background: "#12122a", borderRadius: 18, padding: "40px 32px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
              {[
                { emoji: "🎬", label: "הקולנוע הנודד", stat: "12 פוסטים", color: "#F59E0B" },
                { emoji: "✈️", label: "צייד טיסות", stat: "8 פוסטים", color: "#3B82F6" },
                { emoji: "🧩", label: "החידונאים", stat: "5 פוסטים", color: "#EC4899" },
              ].map((b, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${b.color}33`, borderRadius: 14,
                  padding: "20px 28px", minWidth: 160, animation: `float 3s ease infinite ${i * 0.3}s` }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{b.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{b.label}</div>
                  <div style={{ color: b.color, fontSize: 12, fontWeight: 600 }}>{b.stat}</div>
                </div>
              ))}
            </div>
            <p style={{ color: "#64748b", fontSize: 12, marginTop: 20 }}>ממשק הניהול — נראה ככה מבפנים</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: 1100, margin: "0 auto 80px", padding: "0 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 12 }}>הכל במקום אחד</h2>
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 16, marginBottom: 48, maxWidth: 500, margin: "0 auto 48px" }}>
          כל מה שצריך כדי לשווק את העסק ברשתות — מונע על ידי AI
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 800, margin: "0 auto 80px", padding: "0 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48 }}>איך זה עובד?</h2>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: "1 1 200px", maxWidth: 240, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, margin: "0 auto 16px" }}>
                {s.num}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ACCESS */}
      <section style={{ maxWidth: 620, margin: "0 auto 80px", padding: "0 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 12 }}>גישה בהזמנה</h2>
        <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, marginBottom: 32 }}>המערכת פתוחה כרגע למשתמשים מוזמנים. השאירו פרטים ונחזור אליכם עם מידע והצעה מותאמת לעסק שלכם.</p>
        <div style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))",
          border: "1px solid rgba(139,92,246,0.3)", borderRadius: 20, padding: 28, textAlign: "center" }}>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, alignItems: "center" }}>
            {["יצירת פוסטים ותמונות AI בעברית", "תזמון ופרסום בפייסבוק ואינסטגרם", "ניתוח ביצועים ומתחרים", "תמיכה ישירה"].map((f, i) => (
              <li key={i} style={{ color: "#c4b5fd", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#a78bfa" }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <button onClick={openForm} className="land-btn" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
            border: "none", color: "#fff", borderRadius: 12, padding: "12px 32px", cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "inherit" }}>
            השאירו פרטים
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 700, margin: "0 auto 80px", padding: "0 24px" }}>
        <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 40 }}>שאלות נפוצות</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((f, i) => (
            <details key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, overflow: "hidden" }}>
              <summary className="faq-item" style={{ padding: "16px 20px", fontSize: 15, fontWeight: 600, listStyle: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {f.q}
                <span style={{ color: "#64748b", fontSize: 18, flexShrink: 0, marginRight: 12 }}>+</span>
              </summary>
              <div style={{ padding: "0 20px 16px", color: "#94a3b8", fontSize: 14, lineHeight: 1.7 }}>{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "60px 24px 40px",
        background: "linear-gradient(180deg, transparent, rgba(139,92,246,0.08))" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>רוצים לשמוע עוד?</h2>
        <p style={{ color: "#94a3b8", fontSize: 16, marginBottom: 28 }}>הצטרף לעסקים שכבר משתמשים ב-AI לשיווק חכם יותר</p>
        <button onClick={openForm} className="land-btn" style={{ background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
          border: "none", color: "#fff", borderRadius: 14, padding: "14px 40px", cursor: "pointer", fontSize: 18, fontWeight: 700, fontFamily: "inherit",
          boxShadow: "0 4px 20px rgba(139,92,246,0.3)" }}>
          השאירו פרטים לקבלת מידע
        </button>
      </section>

      {/* INQUIRY MODAL */}
      {formOpen && (
        <div onClick={() => setFormOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#12122a", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 18,
            padding: 28, width: "100%", maxWidth: 420, maxHeight: "92vh", overflowY: "auto" }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>תודה, קיבלנו!</h3>
                <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>נחזור אליכם בהקדם עם מידע.</p>
                <button onClick={() => setFormOpen(false)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", borderRadius: 10, padding: "10px 28px", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>סגירה</button>
              </div>
            ) : (
              <form onSubmit={submitInquiry}>
                <h3 style={{ fontSize: 20, marginBottom: 6 }}>השאירו פרטים לקבלת מידע</h3>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 18 }}>נחזור אליכם בהקדם. מספיק טלפון או אימייל.</p>
                {[
                  { k: "name", label: "שם", type: "text", req: true, ph: "השם שלך" },
                  { k: "phone", label: "טלפון", type: "tel", ph: "050-0000000" },
                  { k: "email", label: "אימייל", type: "email", ph: "name@email.com" },
                ].map(f => (
                  <label key={f.k} style={{ display: "block", marginBottom: 12, fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>
                    {f.label}{f.req ? " *" : ""}
                    <input type={f.type} value={form[f.k]} required={f.req} maxLength={f.k === "email" ? 120 : f.k === "phone" ? 30 : 80}
                      placeholder={f.ph} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                      style={{ display: "block", width: "100%", marginTop: 5, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, fontFamily: "inherit", direction: f.k === "name" ? "rtl" : "ltr", textAlign: "right" }} />
                  </label>
                ))}
                <label style={{ display: "block", marginBottom: 12, fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>
                  במה אתם מעוניינים? (לא חובה)
                  <textarea value={form.message} maxLength={1000} rows={3} onChange={e => setForm({ ...form, message: e.target.value })}
                    style={{ display: "block", width: "100%", marginTop: 5, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
                </label>
                {/* honeypot: hidden from people, bots fill it */}
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website}
                  onChange={e => setForm({ ...form, website: e.target.value })}
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
                {formError && <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5",
                  borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>{formError}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" disabled={sending} className="land-btn" style={{ flex: 1, background: "linear-gradient(135deg,#8B5CF6,#EC4899)",
                    border: "none", color: "#fff", borderRadius: 10, padding: "11px", cursor: sending ? "wait" : "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
                    {sending ? "שולח..." : "שליחה"}
                  </button>
                  <button type="button" onClick={() => setFormOpen(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff", borderRadius: 10, padding: "11px 18px", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>ביטול</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px", textAlign: "center" }}>
        <p style={{ color: "#475569", fontSize: 12 }}>AI Marketing Platform &copy; {new Date().getFullYear()} — כל הזכויות שמורות</p>
      </footer>
    </div>
  );
}
