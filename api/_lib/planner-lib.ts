// Content-planner helpers: exact Hebrew calendar, search keyword bank, near-duplicate guard.
// Pure functions (no DB, no network) so they can be unit-tested.

// ══════════════════════════════════════════════════════════════
// HEBREW CALENDAR — exact, computed, never guessed.
//
// Every holiday post used to go out AFTER its holiday: Rosh Hashana (12.9)
// published on 20.9, Yom Kippur (21.9) on 1.10, Sukkot (ended 2.10) on 8.10.
// The cause was ISRAELI_EVENTS below — a fixed Gregorian table that literally
// told the model "Purim (varies) — March 20". Intl's hebrew calendar gives the
// real date for any year, so derive it instead of maintaining a table.
// ══════════════════════════════════════════════════════════════

export const HEB_FMT = new Intl.DateTimeFormat('en-u-ca-hebrew', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

export function hebrewParts(d: Date): { day: number; month: string; year: string } {
  const parts = HEB_FMT.formatToParts(d);
  const get = (t: string) => parts.find(x => x.type === t)?.value || '';
  return { day: parseInt(get('day'), 10), month: get('month'), year: get('year') };
}

// Hebrew month/day -> holiday name. Yom HaZikaron and Yom HaAtzmaut shift when
// they would land on a weekend, so they are marked approximate downstream.
export function holidayOn(d: Date): string | null {
  const { day, month } = hebrewParts(d);
  if (month === 'Tishri') {
    if (day === 1 || day === 2) return 'ראש השנה';
    if (day === 10) return 'יום כיפור';
    if (day >= 15 && day <= 21) return 'סוכות';
    if (day === 22 || day === 23) return 'שמחת תורה';
  }
  if (month === 'Kislev' && day >= 25) return 'חנוכה';
  // Hanukkah is 8 days: it ends on 2 Tevet when Kislev has 30 days, 3 Tevet when Kislev has 29.
  if (month === 'Tevet' && (day <= 2 || (day === 3 && hebrewParts(new Date(d.getTime() - 3 * 86_400_000)).day === 29))) return 'חנוכה';
  if (month === 'Shevat' && day === 15) return 'ט"ו בשבט';
  // In a leap year Intl reports "Adar I" / "Adar II" and Purim falls in Adar II.
  if ((month === 'Adar' || month === 'Adar II') && day === 14) return 'פורים';
  if (month === 'Nisan') {
    if (day >= 15 && day <= 21) return 'פסח';
    if (day === 27) return 'יום הזיכרון לשואה ולגבורה';
  }
  if (month === 'Iyar') {
    if (day === 4) return 'יום הזיכרון';
    if (day === 5) return 'יום העצמאות';
    if (day === 18) return 'ל"ג בעומר';
    if (day === 28) return 'יום ירושלים';
  }
  if (month === 'Sivan' && day === 6) return 'שבועות';
  if (month === 'Av') {
    if (day === 9) return 'תשעה באב';
    if (day === 15) return 'ט"ו באב';
  }
  return null;
}

export const APPROX_HOLIDAYS = new Set(['יום הזיכרון', 'יום העצמאות', 'יום הזיכרון לשואה ולגבורה']);

// How far ahead a holiday post is still useful. A bookable event needs weeks of
// lead time; a greeting is worthless the day after.
// Generous for the bookable holidays: schools and municipalities close dates
// months out, so Chanukah copy in early October is early-bird, not premature.
export const HOLIDAY_LEAD_DAYS: Record<string, number> = {
  'פסח': 70, 'חנוכה': 60, 'סוכות': 50, 'ראש השנה': 50, 'פורים': 45,
  'שבועות': 35, 'יום העצמאות': 35, 'ל"ג בעומר': 21, 'ט"ו בשבט': 21,
  'שמחת תורה': 21, 'יום כיפור': 14, 'יום ירושלים': 14, 'ט"ו באב': 14,
  'יום הזיכרון': 14, 'יום הזיכרון לשואה ולגבורה': 14, 'תשעה באב': 7,
};

export type HolidaySpan = { name: string; from: string; to: string; approx: boolean };

export const DAY_MS = 86_400_000;
export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const atNoonUTC = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00Z');

// Every holiday span touching [fromISO - lookbackDays, fromISO + aheadDays].
export function holidaySpans(fromISO: string, lookbackDays: number, aheadDays: number): HolidaySpan[] {
  const base = atNoonUTC(fromISO).getTime();
  const spans: HolidaySpan[] = [];
  for (let i = -lookbackDays; i <= aheadDays; i++) {
    const d = new Date(base + i * DAY_MS);
    const name = holidayOn(d);
    if (!name) continue;
    const iso = isoDay(d);
    const last = spans[spans.length - 1];
    if (last && last.name === name && atNoonUTC(last.to).getTime() + DAY_MS >= d.getTime()) {
      last.to = iso;
    } else {
      spans.push({ name, from: iso, to: iso, approx: APPROX_HOLIDAYS.has(name) });
    }
  }
  return spans;
}

export const heDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}.${Number(m)}.${y.slice(2)}`;
};

export const daysBetween = (fromISO: string, toISO: string) =>
  Math.round((atNoonUTC(toISO).getTime() - atNoonUTC(fromISO).getTime()) / DAY_MS);

// The calendar block handed to the content planner. States what already passed
// as emphatically as what is coming, because the failure mode was always
// writing about a holiday that was already over.
export function hebrewCalendarBrief(todayISO: string, windowFromISO: string, windowToISO: string): string {
  const { day, month, year } = hebrewParts(atNoonUTC(todayISO));
  const spans = holidaySpans(todayISO, 120, 200);
  const passed = spans.filter(s => s.to < todayISO).slice(-5);
  const ahead = spans.filter(s => s.to >= todayISO);
  const inWindow = ahead.filter(s => s.from <= windowToISO);
  const L: string[] = [];

  L.push('📅 לוח השנה העברי — נתון מחושב מדויק. אל תנחש תאריכי חגים ואל תסתמך על זיכרון.');
  L.push(`היום: ${todayISO} (${day} ${month} ${year}).`);
  L.push(`חלון הפרסום של הלוח הזה: ${windowFromISO} עד ${windowToISO}.`);

  if (passed.length) {
    L.push('');
    L.push('⛔ חגים שכבר עברו — אסור בשום אופן לכתוב עליהם כאירוע עתידי או קרוב:');
    for (const s of passed) {
      const when = s.from === s.to ? heDate(s.from) : `${heDate(s.from)}-${heDate(s.to)}`;
      L.push(`   • ${s.name} — ${when} (עבר)`);
    }
  }

  if (ahead.length) {
    L.push('');
    L.push('✅ חגים שלפנינו:');
    for (const s of ahead.slice(0, 6)) {
      const away = daysBetween(todayISO, s.from);
      const lead = HOLIDAY_LEAD_DAYS[s.name] ?? 14;
      const verdict = s.from <= windowToISO && s.from >= windowFromISO
        ? 'בתוך חלון הלוח — מותר לכתוב עליו ישירות'
        : (away <= lead
          ? `מחוץ לחלון אבל בתוך חלון ההזמנה (${lead} יום מראש) — כן לקדם סגירת תאריכים מוקדמת`
          : 'רחוק מדי — לא לגעת');
      const when = s.from === s.to ? heDate(s.from) : `${heDate(s.from)}-${heDate(s.to)}`;
      L.push(`   • ${s.name} — ${when}${s.approx ? ' (תאריך מקורב)' : ''}, בעוד ${away} יום. ${verdict}`);
    }
  }

  if (!inWindow.length) {
    L.push('');
    L.push('⚠️ אין אף חג בתוך חלון הפרסום עצמו. אל תמציא עוגן חגיגי. במקום זה:');
    L.push('   - אפשר לקדם הזמנה מוקדמת לחג הבא שבתוך חלון ההזמנה למעלה ("סוגרים תאריכים ל...").');
    L.push('   - או עוגנים אמיתיים אחרים: קצב שנת הלימודים, תחילת/סוף חודש, עונה, חופשה.');
  }

  L.push('');
  L.push('🔒 חוקי ברזל:');
  L.push('   1. פוסט שמקדם שירות לחג חייב להתפרסם לפני תחילת החג, בתוך חלון ההזמנה שלו.');
  L.push('   2. אסור להזכיר חג שעבר בלשון הווה/עתיד. "מחפשים פעילות לסוכות?" ב-8.10 — פסול.');
  L.push('   3. ברכת חג נשלחת לפני החג או ביומו הראשון, לא אחריו.');
  L.push('   4. אם אין חג רלוונטי — עדיף פוסט בלי חג מאשר פוסט על חג לא נכון.');
  return L.join('\n');
}

// Wording that pins copy to a specific holiday. A bare holiday name is not
// enough: "בסוכה הקהילתית" never says "סוכות", and "הקפות" never says
// "שמחת תורה", yet both date the post just as precisely.
export const HOLIDAY_ALIASES: Record<string, string[]> = {
  'סוכות': ['סוכות', 'סוכה', 'חג האסיף'],
  'שמחת תורה': ['שמחת תורה', 'שמיני עצרת', 'הקפות'],
  'ראש השנה': ['ראש השנה', 'שנה טובה', 'ליל הסדר של ראש השנה'],
  'יום כיפור': ['יום כיפור', 'יום הכיפורים', 'גמר חתימה טובה', 'צום כיפור'],
  'חנוכה': ['חנוכה', 'חנוכיה', 'חנוכייה', 'סופגניות'],
  'פסח': ['פסח', 'ליל הסדר', 'אפיקומן', 'חג החירות'],
  'פורים': ['פורים', 'משלוח מנות', 'מגילת אסתר'],
  'שבועות': ['חג השבועות'],  // "שבועות" alone is just the word for "weeks"
  'תשעה באב': ['תשעה באב', "ט'באב"],
};

// Hebrew glues prepositions onto the next word (לסוכות, בסוכה, ומהסוכות), so
// allow up to two prefix letters while still refusing a match that sits inside
// a longer word — which is what kept "סיפורים" from reading as "פורים".
export const HEB_LETTER = '\\u05d0-\\u05ea';
export function mentionsTerm(content: string, term: string): boolean {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![${HEB_LETTER}])[בהוכלמשו]{0,2}${esc}(?![${HEB_LETTER}])`).test(content);
}

// Holidays referenced in copy that have just been missed.
//
// Naive "has this holiday ended?" is wrong for an annual event: last year's
// Chanukah has always ended, so "סוגרים תאריכים לחנוכה" would be flagged while
// it is in fact exactly the early-booking copy we want. A mention is only stale
// when the holiday wrapped up recently AND the next one is too far off for the
// copy to plausibly be about it.
export const STALE_WINDOW_DAYS = 45;

export function staleHolidayRefs(content: string, todayISO: string): string[] {
  const spans = holidaySpans(todayISO, 400, 400);
  const names = [...new Set(spans.map(s => s.name))];
  const stale: string[] = [];

  for (const name of names) {
    const terms = HOLIDAY_ALIASES[name] || [name];
    if (!terms.some(t => mentionsTerm(content, t))) continue;

    const mine = spans.filter(s => s.name === name);
    const lastEnded = mine.filter(s => s.to < todayISO).map(s => s.to).sort().pop();
    const nextStarts = mine.filter(s => s.from >= todayISO).map(s => s.from).sort()[0];
    if (!lastEnded) continue;

    const sinceEnd = daysBetween(lastEnded, todayISO);
    const untilNext = nextStarts ? daysBetween(todayISO, nextStarts) : Infinity;
    const lead = HOLIDAY_LEAD_DAYS[name] ?? 14;

    if (sinceEnd <= STALE_WINDOW_DAYS && untilNext > lead) {
      stale.push(`${name} (הסתיים ${lastEnded}, לפני ${sinceEnd} יום)`);
    }
  }
  return stale;
}

// ══════════════════════════════════════════════════════════════
// SEARCH KEYWORD BANK
// Posts never used the search terms people actually type. The bank below is
// built from Search Console queries, live Google IL results and the competitor
// review for movingcinema.co.il. It is deliberately a BANK, not a list to paste:
// each post weaves 2-3 terms for ITS OWN service naturally, and the terms rotate
// across the month. Stuffing every term into every post reads as spam and
// hurts reach. Terms are grouped per service so the two price tiers (rental vs
// full service) are never mixed.
// ══════════════════════════════════════════════════════════════
export type KeywordGroup = { service: string; landing: string; note?: string; terms: string[] };

export const CINEMA_KEYWORD_BANK: KeywordGroup[] = [
  { service: 'הקרנות סרטים בחוץ (שירות מלא)', landing: '/OutdoorCinema',
    terms: ['הקרנת סרטים בחוץ', 'קולנוע בחוץ', 'הקרנת סרט בחוץ', 'קולנוע בגינה', 'קולנוע בפארק', 'קולנוע בחצר', 'ערב סרט בחוץ'] },
  { service: 'מסך מתנפח (שירות מלא)', landing: '/InflatableScreen',
    terms: ['מסך מתנפח', 'מסך מתנפח להקרנה', 'מסך מתנפח לאירוע', 'מסך מתנפח למקרן', 'מסך הקרנה ענק'] },
  { service: 'רשויות מקומיות ואירועי קהילה', landing: '/Municipalities',
    terms: ['הקרנה לרשות מקומית', 'אירוע קהילתי לתושבים', 'קולנוע קהילתי', 'אירועי תרבות לרשויות', 'רישיון להקרנה פומבית'] },
  { service: 'מסיבות סיום בבתי ספר', landing: '/SchoolEvents',
    terms: ['מסיבת סיום', 'מסך גדול למסיבת סיום', 'הקרנה בחצר בית הספר', 'מסיבת סיום לוועד הורים', 'הקרנת סרטון מחזור'] },
  { service: 'טקסים וסרטוני מחזור', landing: '/Ceremonies',
    terms: ['טקס סיום', 'סרטון מחזור', 'מסך ענק לטקס', 'מצגת זיכרונות על מסך ענק'] },
  { service: 'אירועי חברה וכנסים', landing: '/CorporateEvents',
    terms: ['אירוע חברה', 'ערב גיבוש לעובדים', 'כנס עובדים', 'הקרנה לאירוע חברה'] },
  { service: 'ערבי סרט לילדים', landing: '/KidsMovieNight',
    terms: ['ערב סרט לילדים', 'הקרנה ליום הולדת', 'סרט לילדים בחוץ'] },
  { service: 'הקרנות לגיל השלישי', landing: '/SeniorScreenings',
    terms: ['סרטים לגיל השלישי', 'הקרנה למועדון קשישים', 'סרטים לגיל הזהב'] },
  { service: 'השכרת ציוד הקרנה (מסלול נפרד, מחיר נפרד, בלי צוות)', landing: '/EquipmentRental',
    note: 'מסלול ההשכרה בלבד. אסור לערבב במחיר או בניסוח עם השירות המלא.',
    terms: ['השכרת מקרן ומסך', 'השכרת מסך למקרן', 'השכרת ציוד הקרנה', 'מקרן להשכרה', 'השכרת מסך גדול'] },
];

// Cinema gets the researched bank. Other businesses reuse the keywords from
// their own cached SEO report when one exists; otherwise no bank is forced.
export function keywordBankFor(biz: any): KeywordGroup[] {
  if (/קולנוע/.test(biz?.name || '')) return CINEMA_KEYWORD_BANK;
  const k = biz?.scan_result?.seo_report?.keywords;
  const terms = [...(k?.primary || []), ...(k?.long_tail || []), ...(k?.missing || [])]
    .filter((t: any) => typeof t === 'string' && t.trim().length >= 3);
  return terms.length ? [{ service: 'כללי', landing: '', terms }] : [];
}

export function keywordBankBrief(bank: KeywordGroup[]): string {
  if (!bank.length) return '';
  const L: string[] = ['', '🔎 בנק מילות חיפוש (מה שאנשים באמת מקלידים בגוגל):'];
  for (const g of bank) {
    L.push(`• ${g.service}${g.landing ? ` [${g.landing}]` : ''}: ${g.terms.join(' | ')}${g.note ? `  — ${g.note}` : ''}`);
  }
  L.push('חוקים: בכל פוסט שדה "keywords" עם 2-3 ביטויים מהקבוצה של אותו שירות בלבד. פרוס את כל הביטויים על פני החודש כך שכמה שיותר מהבנק יכוסה, ואל תחזור על אותו ביטוי בפוסטים סמוכים. אין להכניס ביטויי מסלול השכרה לפוסט של שירות מלא ולהפך. הביטוי ייכנס לטקסט בצורה טבעית, לא כרשימה.');
  return L.join('\n');
}

// Optional Hebrew-calendar hooks beyond holidays: Rosh Chodesh and Shabbat.
// Not required by the planner, just available as real anchors.
export function hebrewAnchorsBrief(fromISO: string, toISO: string): string {
  const roshChodesh: string[] = [];
  const fridays: string[] = [];
  const total = daysBetween(fromISO, toISO);
  for (let i = 0; i <= total; i++) {
    const d = new Date(atNoonUTC(fromISO).getTime() + i * DAY_MS);
    const { day, month } = hebrewParts(d);
    if ((day === 1 && month !== 'Tishri') || day === 30) roshChodesh.push(heDate(isoDay(d)));
    if (d.getUTCDay() === 5) fridays.push(heDate(isoDay(d)));
  }
  const L: string[] = [];
  if (roshChodesh.length) L.push(`ראש חודש (עוגן אופציונלי, חודש עברי חדש): ${roshChodesh.join(', ')}`);
  if (fridays.length) L.push(`ימי שישי (ערב שבת, עוגן אופציונלי לתוכן רגוע/משפחתי): ${fridays.join(', ')}`);
  return L.length ? `\n🗓️ עוגנים נוספים מהלוח העברי:\n${L.map(x => '• ' + x).join('\n')}` : '';
}

// Near-duplicate guard. Compares 3-word shingles so two posts that reuse the
// same sentences in different order still collide.
export function textShingles(s: string): Set<string> {
  const words = (s || '').replace(/https?:\/\/\S+/g, ' ').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 2);
  const out = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) out.add(words.slice(i, i + 3).join(' '));
  return out;
}
export function shingleSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
export const POST_SIMILARITY_LIMIT = 0.3;

