import { chromium } from 'playwright';

export interface ScrapedData {
  title: string;
  description: string;
  services: string[];
  prices: string[];
  testimonials: string[];
  ctas: string[];
  headings: string[];
  rawText: string;
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const data = await page.evaluate(() => {
      const getText = (sel: string) =>
        Array.from(document.querySelectorAll(sel))
          .map(el => el.textContent?.trim())
          .filter(Boolean) as string[];

      return {
        title: document.title,
        description: (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '',
        headings: getText('h1, h2, h3').slice(0, 20),
        ctas: getText('button, .cta, [class*="cta"], a[class*="btn"]').slice(0, 10),
        rawText: document.body.innerText.slice(0, 5000),
        prices: getText('[class*="price"], [class*="cost"], [class*="tarif"]').slice(0, 10),
        testimonials: getText('[class*="testimonial"], [class*="review"], blockquote').slice(0, 5),
        services: getText('[class*="service"], [class*="product"], [class*="feature"]').slice(0, 15),
      };
    });

    return data;
  } finally {
    await browser.close();
  }
}

export async function buildBusinessProfile(
  scrapedData: ScrapedData,
  competitorData: ScrapedData[] = []
): Promise<Record<string, unknown>> {
  return {
    name: scrapedData.title,
    description: scrapedData.description,
    services: scrapedData.services,
    pricing: scrapedData.prices,
    testimonials: scrapedData.testimonials,
    ctas: scrapedData.ctas,
    competitors: competitorData.map(c => ({ title: c.title, ctas: c.ctas })),
    scannedAt: new Date().toISOString(),
  };
}
