import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GeneratedPost {
  platform: string;
  type: string;
  content: string;
  hashtags: string[];
  cta: string;
  image_prompt: string;
  motion_prompt: string;
  ugc_script: string;
  scheduled_date: string;
}

export async function generatePosts(
  businessName: string,
  businessProfile: Record<string, unknown>,
  platforms: string[],
  count = 2,
  learnings = ''
): Promise<GeneratedPost[]> {
  const prompt = `אתה מומחה שיווק דיגיטלי ישראלי בכיר. צור ${count} פוסטים שיווקיים בעברית.

עסק: ${businessName}
פרופיל: ${JSON.stringify(businessProfile, null, 2)}
פלטפורמות: ${platforms.join(', ')}
${learnings ? `תובנות מניסיון קודם:\n${learnings}` : ''}

כללים:
- עברית טבעית, לא פרסומית
- hook חזק בשורה ראשונה
- CTA ברור
- hashtags רלוונטיים
- image_prompt באנגלית מקצועית (Flux)
- motion_prompt באנגלית לסרטון 5 שניות (Runway)
- ugc_script בעברית מדוברת, 90-110 מילים

החזר JSON בלבד:
{
  "posts": [
    {
      "platform": "פייסבוק|אינסטגרם|בלוג SEO",
      "type": "פוסט קצר|סטורי|מאמר SEO|מודעה",
      "content": "...",
      "hashtags": ["..."],
      "cta": "...",
      "image_prompt": "...",
      "motion_prompt": "...",
      "ugc_script": "...",
      "scheduled_date": "ISO8601"
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.map(c => (c.type === 'text' ? c.text : '')).join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean).posts as GeneratedPost[];
}

export async function buildImagePrompt(postContent: string, businessName: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Build a professional Flux image prompt for this Hebrew marketing post.
Business: ${businessName}
Post: ${postContent}

Requirements: photorealistic, commercial photography style, warm lighting, Israeli audience.
Return only the prompt in English.`,
    }],
  });
  return response.content.map(c => (c.type === 'text' ? c.text : '')).join('').trim();
}

export async function buildMotionPrompt(imagePrompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Create a Runway Gen-3 motion prompt for a 5-second video based on: "${imagePrompt}".
Describe subtle, natural camera movement. Return only the motion prompt in English.`,
    }],
  });
  return response.content.map(c => (c.type === 'text' ? c.text : '')).join('').trim();
}

export async function writeUGCScript(
  businessName: string,
  avatarDesc: string,
  businessProfile: Record<string, unknown>
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `כתוב סקריפט UGC לסרטון 30-40 שניות בעברית מדוברת.

דמות: ${avatarDesc}
עסק: ${businessName}
פרופיל: ${JSON.stringify(businessProfile)}

כללים: 90-110 מילים, שיחתי, לא פרסומי, hook אישי, נקודת כאב אחת, CTA רך: "קישור בביו".
החזר רק את הסקריפט.`,
    }],
  });
  return response.content.map(c => (c.type === 'text' ? c.text : '')).join('').trim();
}

export async function analyzePerformance(posts: Record<string, unknown>[]): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `נתח את ביצועי 20 הפוסטים האחרונים ובנה תובנות לפרומפט הבא.

פוסטים: ${JSON.stringify(posts, null, 2)}

זהה: hook טוב, CTA עובד, פלטפורמה מוצלחת, שעה אופטימלית, סוג תוכן מוביל.
החזר סיכום קצר בעברית לשימוש בפרומפט הבא.`,
    }],
  });
  return response.content.map(c => (c.type === 'text' ? c.text : '')).join('').trim();
}

export async function rawCall(prompt: string, maxTokens = 800): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content.map(c => (c.type === 'text' ? c.text : '')).join('').trim();
}
