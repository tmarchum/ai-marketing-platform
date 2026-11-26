// Run: npm test   (inside /api)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  holidaySpans, staleHolidayRefs, hebrewAnchorsBrief, hebrewCalendarBrief,
  CINEMA_KEYWORD_BANK, CORE_KEYWORDS, keywordBankFor, keywordBankBrief,
  textShingles, shingleSimilarity, POST_SIMILARITY_LIMIT,
} from './planner-lib.js';

const span = (from: string, name: string) =>
  holidaySpans(from, 0, 400).find(s => s.name === name)!;

test('Hanukkah is exactly 8 days (30-day Kislev, 2026)', () => {
  const s = span('2026-11-26', 'חנוכה');
  assert.equal(s.from, '2026-12-05');
  assert.equal(s.to, '2026-12-12');
});

test('Hanukkah is exactly 8 days (29-day Kislev, 2024)', () => {
  const s = span('2024-11-26', 'חנוכה');
  assert.equal(s.from, '2024-12-26');
  assert.equal(s.to, '2025-01-02');
});

test('Pesach 2027 starts 22.4 and lasts a week', () => {
  const s = span('2027-03-01', 'פסח');
  assert.equal(s.from, '2027-04-22');
  assert.equal(s.to, '2027-04-28');
});

test('stale holiday: Sukkot mentioned after it ended is flagged', () => {
  assert.ok(staleHolidayRefs('מחפשים פעילות לסוכות?', '2026-10-08').length > 0);
});

test('not stale: early-booking copy for the next Hanukkah', () => {
  assert.equal(staleHolidayRefs('סוגרים תאריכים לחנוכה', '2026-11-26').length, 0);
});

test('anchors: Rosh Chodesh Tevet falls on 10-11 Dec 2026', () => {
  const brief = hebrewAnchorsBrief('2026-12-01', '2026-12-31');
  assert.match(brief, /10\.12\.26/);
  assert.match(brief, /11\.12\.26/);
});

test('calendar brief says Hanukkah is allowed inside the December window', () => {
  const brief = hebrewCalendarBrief('2026-11-26', '2026-12-01', '2026-12-31');
  assert.match(brief, /חנוכה — 5\.12\.26-12\.12\.26/);
  assert.match(brief, /ט"ו בשבט.*רחוק מדי/);
});

test('near-duplicate guard: reworded copy collides, a different topic does not', () => {
  const a = 'אנחנו מקרינים סרטים בחוץ עם מסך מתנפח גדול וצוות מלא שמקים ומפעיל לכל אירוע של רשות מקומית בפארק';
  const b = 'אנחנו מקרינים סרטים בחוץ עם מסך מתנפח גדול וצוות מלא שמקים ומפעיל לכל אירוע קהילתי בגינה';
  const c = 'מסיבת סיום בחצר בית הספר? מסך גדול, סאונד ורישיון הקרנה, ואתם רק מביאים פופקורן וילדים מרוצים';
  assert.ok(shingleSimilarity(textShingles(a), textShingles(b)) >= POST_SIMILARITY_LIMIT);
  assert.ok(shingleSimilarity(textShingles(a), textShingles(c)) < POST_SIMILARITY_LIMIT);
});

test('keyword bank: rental terms are never shared with a full-service group', () => {
  const rental = CINEMA_KEYWORD_BANK.find(g => g.landing === '/EquipmentRental')!;
  const others = CINEMA_KEYWORD_BANK.filter(g => g !== rental).flatMap(g => g.terms);
  for (const t of rental.terms) assert.ok(!others.includes(t), `${t} appears in a non-rental group`);
});

test('keyword bank: no duplicate terms and every group points at a landing page', () => {
  const all = CINEMA_KEYWORD_BANK.flatMap(g => g.terms);
  assert.equal(new Set(all).size, all.length);
  for (const g of CINEMA_KEYWORD_BANK) assert.match(g.landing, /^\/[A-Za-z]+$/);
});

test('keyword bank is chosen by business name; others fall back to their SEO report', () => {
  assert.equal(keywordBankFor({ name: 'הקולנוע הנודד' }), CINEMA_KEYWORD_BANK);
  assert.equal(keywordBankFor({ name: 'צייד טיסות' }).length, 0);
  const g = keywordBankFor({ name: 'צייד טיסות', scan_result: { seo_report: { keywords: { primary: ['טיסות זולות'] } } } });
  assert.deepEqual(g[0].terms, ['טיסות זולות']);
  assert.equal(keywordBankBrief([]), '');
});

test('core keywords exist in the bank and are demanded in the brief', () => {
  const all = CINEMA_KEYWORD_BANK.flatMap(g => g.terms);
  for (const k of CORE_KEYWORDS) assert.ok(all.includes(k), `${k} missing from bank`);
  assert.match(keywordBankBrief(CINEMA_KEYWORD_BANK), /ביטויי ליבה/);
});
