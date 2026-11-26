// Public privacy policy and terms (required by Google to publish the sign-in app).
// Kept short and factual: what the sign-in receives and what it is used for.
const CONTACT = "t.marchum@gmail.com";
const UPDATED = "26.11.2026";

const box = { maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "'Assistant','Segoe UI',Arial,sans-serif", lineHeight: 1.8, color: "#1a1a2e" };
const h2 = { fontSize: 18, margin: "28px 0 6px" };

export function PrivacyPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={box} dir="rtl">
        <h1 style={{ fontSize: 28 }}>מדיניות פרטיות — AI Marketing</h1>
        <p style={{ color: "#6b7280" }}>עודכן: {UPDATED}</p>

        <h2 style={h2}>מה זה</h2>
        <p>AI Marketing היא מערכת לניהול שיווק ברשתות חברתיות של עסקים. הגישה אליה בהזמנה בלבד, ומשתמשים נכנסים אליה עם חשבון Google.</p>

        <h2 style={h2}>איזה מידע אנחנו מקבלים</h2>
        <p>בהתחברות עם Google אנחנו מקבלים את כתובת האימייל, השם ותמונת הפרופיל של החשבון, ותו לא. איננו ניגשים לדואר, ליומן, לקבצים או לכל מידע אחר בחשבון Google שלך.</p>

        <h2 style={h2}>לשם מה</h2>
        <p>המידע משמש אך ורק כדי לזהות אותך, לבדוק שהוזמנת, ולהציג לך את העסקים שהוגדרו לך. איננו מוכרים אותו, איננו משתפים אותו עם צד שלישי לצורכי פרסום, ואיננו משתמשים בו לפרסום.</p>

        <h2 style={h2}>איפה הוא נשמר</h2>
        <p>פרטי החשבון נשמרים אצל ספקי התשתית של המערכת: Supabase (מסד נתונים והתחברות) ו-Vercel (אחסון). הם מעבדים את המידע עבורנו ואינם משתמשים בו לצרכים משלהם.</p>

        <h2 style={h2}>שמירה ומחיקה</h2>
        <p>הפרטים נשמרים כל עוד יש לך גישה למערכת. מנהל המערכת יכול להסיר אותך בכל עת, והחשבון נמחק. אפשר גם לבקש מחיקה בפנייה לכתובת למטה.</p>

        <h2 style={h2}>יצירת קשר</h2>
        <p>שאלות או בקשות מחיקה: <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>

        <hr style={{ margin: "36px 0", border: 0, borderTop: "1px solid #e5e7eb" }} />

        <div dir="ltr" style={{ textAlign: "left" }}>
          <h1 style={{ fontSize: 24 }}>Privacy Policy — AI Marketing</h1>
          <p>AI Marketing is an invitation-only tool for managing businesses' social media marketing. Users sign in with a Google account.</p>
          <p><b>Data we receive.</b> When you sign in with Google we receive your email address, name and profile picture. We do not access your mail, calendar, files or any other Google data.</p>
          <p><b>How we use it.</b> Only to identify you, verify that you were invited, and show you the businesses assigned to you. We do not sell it, share it for advertising, or use it for advertising.</p>
          <p><b>Where it is stored.</b> With our infrastructure providers, Supabase (database and authentication) and Vercel (hosting), who process it on our behalf.</p>
          <p><b>Retention and deletion.</b> Data is kept while you have access. An administrator can remove you at any time, which deletes the account. You can also request deletion at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <div style={box} dir="rtl">
        <h1 style={{ fontSize: 28 }}>תנאי שימוש — AI Marketing</h1>
        <p style={{ color: "#6b7280" }}>עודכן: {UPDATED}</p>
        <p>המערכת מיועדת למשתמשים שהוזמנו על ידי מנהל המערכת. הגישה לעסקים מוגבלת לעסקים שהוגדרו לכל משתמש.</p>
        <p>אסור להשתמש במערכת לפרסום תוכן מטעה, פוגעני או בניגוד לחוק, ואסור לנסות לגשת לעסקים או למידע שלא הוגדרו לך.</p>
        <p>המערכת ניתנת כפי שהיא. מנהל המערכת רשאי לחסום גישה או להסיר משתמש בכל עת.</p>
        <p>שאלות: <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
        <hr style={{ margin: "36px 0", border: 0, borderTop: "1px solid #e5e7eb" }} />
        <div dir="ltr" style={{ textAlign: "left" }}>
          <h1 style={{ fontSize: 24 }}>Terms of Service — AI Marketing</h1>
          <p>The service is for users invited by the administrator, with access limited to the businesses assigned to each user. Do not use it to publish misleading, harmful or unlawful content, or to try to reach businesses or data not assigned to you. The service is provided as is, and the administrator may block or remove any user at any time. Contact: <a href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
        </div>
      </div>
    </div>
  );
}
