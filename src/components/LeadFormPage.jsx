import { useState, useEffect } from "react";

export default function LeadFormPage({ slug }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/landing/${slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setConfig(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("שם הוא שדה חובה"); return; }
    setSubmitting(true);
    setError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: config.id,
          business_name: config.name,
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          message: form.message || null,
          source: "landing_page",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "שגיאה");
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6fa" }}>
      <div style={{ color: "#666", fontSize: 16 }}>טוען...</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6fa", direction: "rtl" }}>
      <div style={{ textAlign: "center", color: "#888" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>דף זה אינו קיים</div>
      </div>
    </div>
  );

  const { name, icon, color, landing } = config;
  const lp = landing || {};

  if (done) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${color}11 0%, #f5f6fa 100%)`, direction: "rtl", fontFamily: "'Assistant', 'Segoe UI', sans-serif" }}>
      <div style={{ textAlign: "center", padding: 40, maxWidth: 420, width: "100%" }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>
          {lp.success_message || "תודה! ניצור קשר בהקדם"}
        </div>
        <div style={{ color: "#666", fontSize: 14 }}>{name}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${color}18 0%, #f5f6fa 60%, #fff 100%)`, direction: "rtl", fontFamily: "'Assistant', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        input, textarea { outline: none; }
        input:focus, textarea:focus { border-color: ${color} !important; box-shadow: 0 0 0 3px ${color}22; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px ${color}44; }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        @media(max-width:480px) { .form-card { padding: 28px 20px !important; } }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, padding: "32px 20px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>{icon}</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{name}</div>
      </div>

      {/* Form card */}
      <div style={{ display: "flex", justifyContent: "center", padding: "32px 16px 60px" }}>
        <div className="form-card" style={{
          background: "#fff", borderRadius: 20, padding: "40px 36px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)", maxWidth: 440, width: "100%"
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px", textAlign: "center" }}>
            {lp.headline || "צרו קשר איתנו"}
          </h1>
          {lp.subheadline && (
            <p style={{ fontSize: 14, color: "#666", margin: "0 0 28px", textAlign: "center", lineHeight: 1.6 }}>
              {lp.subheadline}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                שם מלא *
              </label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="ישראל ישראלי"
                required
                style={{ width: "100%", padding: "12px 14px", fontSize: 14, border: "1.5px solid #e0e0e0", borderRadius: 10, fontFamily: "inherit", color: "#1a1a2e", transition: "all 0.2s" }}
              />
            </div>

            {/* Phone */}
            {(lp.collect_phone !== false) && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                  טלפון {lp.phone_required ? "*" : ""}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="05X-XXXXXXX"
                  required={!!lp.phone_required}
                  style={{ width: "100%", padding: "12px 14px", fontSize: 14, border: "1.5px solid #e0e0e0", borderRadius: 10, fontFamily: "inherit", color: "#1a1a2e", direction: "ltr", textAlign: "right", transition: "all 0.2s" }}
                />
              </div>
            )}

            {/* Email */}
            {(lp.collect_email !== false) && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                  אימייל
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com"
                  style={{ width: "100%", padding: "12px 14px", fontSize: 14, border: "1.5px solid #e0e0e0", borderRadius: 10, fontFamily: "inherit", color: "#1a1a2e", direction: "ltr", transition: "all 0.2s" }}
                />
              </div>
            )}

            {/* Message */}
            {lp.collect_message && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                  {lp.message_label || "הודעה"}
                </label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder={lp.message_placeholder || "ספרו לנו במה נוכל לעזור..."}
                  rows={3}
                  style={{ width: "100%", padding: "12px 14px", fontSize: 14, border: "1.5px solid #e0e0e0", borderRadius: 10, fontFamily: "inherit", color: "#1a1a2e", resize: "none", direction: "rtl", transition: "all 0.2s" }}
                />
              </div>
            )}

            {error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#EF4444", fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="submit-btn"
              style={{
                width: "100%", padding: "14px", fontSize: 15, fontWeight: 700,
                background: submitting ? "#ccc" : `linear-gradient(135deg, ${color}, ${color}cc)`,
                color: "#fff", border: "none", borderRadius: 12, cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.2s", marginTop: 4
              }}
            >
              {submitting ? "שולח..." : (lp.cta_text || "שלח")}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#aaa", fontSize: 11, margin: "20px 0 0" }}>
            פרטיך שמורים ואינם מועברים לצד שלישי 🔒
          </p>
        </div>
      </div>
    </div>
  );
}
