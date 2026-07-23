/**
 * Aeon.co → ActiveCampaign demo sync
 *
 * 1. Whitelist subscriber-behavior event names
 * 2. Post sample events for contact Rebecca (201)
 * 3. Create 3 HTML message variables (article email sections)
 *
 * Usage:
 *   cp .env.example .env   # fill AC_* vars including ACTID + EVENT_KEY
 *   npm run sync:aeon
 */
import { loadEnv } from "./load-env.js";
import { createAcClient } from "./ac-client.js";

loadEnv();

const CONTACT_ID = "201";
const CONTACT_EMAIL = "a.A@a.com";
const LIST_IDS = "5"; // New Subscribers

const ARTICLES = [
  {
    slug: "intelligence-goals",
    tag: "aeon-article-intelligence",
    name: "Aeon — Intelligence as goals",
    url: "https://aeon.co/videos/why-we-should-think-of-intelligence-in-terms-of-goals-not-brains",
    title: "Why we should think of intelligence in terms of goals, not brains",
    dek: "Biologist Michael Levin argues intelligence is the capacity to pursue goals — a continuum from cells to humans, not just brains in bodies.",
    topic: "Cognition & intelligence",
    cta: "Watch the video",
  },
  {
    slug: "bergson-einstein",
    tag: "aeon-article-time",
    name: "Aeon — Bergson vs Einstein on time",
    url: "https://aeon.co/essays/who-really-won-when-bergson-and-einstein-debated-time",
    title: "Who really won when Bergson and Einstein debated time?",
    dek: "Henri Bergson and Albert Einstein clashed over clock time versus lived duration — a debate that still shapes how we think about science and experience.",
    topic: "Philosophy of science",
    cta: "Read the essay",
  },
  {
    slug: "blind-spot",
    tag: "aeon-article-blind-spot",
    name: "Aeon — Science’s blind spot",
    url: "https://aeon.co/essays/the-blind-spot-of-science-is-the-neglect-of-lived-experience",
    title: "The blind spot of science is the neglect of lived experience",
    dek: "It’s tempting to think science gives a God’s-eye view of reality. But forgetting human experience puts our deepest puzzles out of reach.",
    topic: "Science & culture",
    cta: "Read the essay",
  },
];

/** Event names must be ≤32 characters for trackcmp.net */
const EVENT_NAMES = [
  "page_visit",
  "article_abandon",
  "article_read",
  "video_play",
  "scroll_depth",
  "bookmark_article",
  "share_article",
  "topic_follow",
  "search_query",
  "newsletter_click",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function articleEmailHtml(article) {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
  <tr>
    <td style="padding:24px 0 8px 0;">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6b6b6b;">
        Aeon · ${escapeHtml(article.topic)}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 0 12px 0;">
      <h2 style="margin:0;font-size:22px;line-height:1.35;font-weight:normal;">
        <a href="${escapeHtml(article.url)}" style="color:#1a1a1a;text-decoration:none;">
          ${escapeHtml(article.title)}
        </a>
      </h2>
    </td>
  </tr>
  <tr>
    <td style="padding:0 0 20px 0;">
      <p style="margin:0;font-size:16px;line-height:1.55;color:#333333;">
        ${escapeHtml(article.dek)}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 0 8px 0;">
      <a href="${escapeHtml(article.url)}"
         style="display:inline-block;padding:12px 20px;background:#111111;color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.04em;text-decoration:none;">
        ${escapeHtml(article.cta)} →
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 0 0 0;border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#888888;">
        From <a href="https://aeon.co" style="color:#888888;">Aeon.co</a> — ideas that change how you see the world.
      </p>
    </td>
  </tr>
</table>
`.trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function ensureEventTrackingEnabled(ac) {
  const status = await ac.get("/eventTracking");
  if (status.eventTracking?.enabled) {
    console.log("Event tracking already enabled");
    return;
  }
  await ac.post("/eventTracking", { eventTracking: { enabled: true } });
  console.log("Enabled event tracking");
}

async function whitelistEvents(ac) {
  const existing = await ac.get("/eventTrackingEvents");
  const known = new Set(
    (existing.eventTrackingEvents || []).map((e) => e.name)
  );

  for (const name of EVENT_NAMES) {
    if (known.has(name)) {
      console.log(`  event already whitelisted: ${name}`);
      continue;
    }
    await ac.post("/eventTrackingEvents", {
      eventTrackingEvent: { name },
    });
    console.log(`  whitelisted event: ${name}`);
  }
}

async function trackEvent({ actid, key, event, eventdata, email }) {
  const body = new URLSearchParams({
    actid,
    key,
    event,
    eventdata:
      typeof eventdata === "string" ? eventdata : JSON.stringify(eventdata),
    visit: JSON.stringify({ email }),
  });

  const res = await fetch("https://trackcmp.net/event", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok || data.success !== 1) {
    throw new Error(
      `trackcmp event "${event}" failed (${res.status}): ${text}`
    );
  }
  return data;
}

function buildDemoEvents() {
  const [intelligence, time, blindSpot] = ARTICLES;
  return [
    {
      event: "page_visit",
      eventdata: { url: "https://aeon.co/", referrer: "newsletter" },
    },
    {
      event: "page_visit",
      eventdata: {
        url: intelligence.url,
        title: intelligence.title,
        topic: intelligence.topic,
      },
    },
    {
      event: "video_play",
      eventdata: {
        url: intelligence.url,
        title: intelligence.title,
        progress_pct: 12,
      },
    },
    {
      event: "scroll_depth",
      eventdata: {
        url: intelligence.url,
        depth_pct: 35,
      },
    },
    {
      event: "article_abandon",
      eventdata: {
        url: intelligence.url,
        title: intelligence.title,
        scroll_pct: 35,
        seconds_on_page: 48,
      },
    },
    {
      event: "page_visit",
      eventdata: {
        url: time.url,
        title: time.title,
        topic: time.topic,
      },
    },
    {
      event: "scroll_depth",
      eventdata: { url: time.url, depth_pct: 100 },
    },
    {
      event: "article_read",
      eventdata: {
        url: time.url,
        title: time.title,
        seconds_on_page: 412,
        completion: "full",
      },
    },
    {
      event: "bookmark_article",
      eventdata: { url: time.url, title: time.title },
    },
    {
      event: "share_article",
      eventdata: {
        url: time.url,
        channel: "email",
      },
    },
    {
      event: "page_visit",
      eventdata: {
        url: blindSpot.url,
        title: blindSpot.title,
        topic: blindSpot.topic,
      },
    },
    {
      event: "article_read",
      eventdata: {
        url: blindSpot.url,
        title: blindSpot.title,
        seconds_on_page: 380,
        completion: "full",
      },
    },
    {
      event: "topic_follow",
      eventdata: {
        topic: "Philosophy of science",
        source: "article_footer",
      },
    },
    {
      event: "search_query",
      eventdata: {
        query: "consciousness and lived experience",
        results: 24,
      },
    },
    {
      event: "newsletter_click",
      eventdata: {
        campaign: "aeon-weekly-digest",
        article_url: intelligence.url,
      },
    },
  ];
}

async function postDemoEvents({ actid, key, email }) {
  const events = buildDemoEvents();
  for (const { event, eventdata } of events) {
    const result = await trackEvent({ actid, key, event, eventdata, email });
    console.log(`  ${event}: ${result.message}`);
  }
  return events.length;
}

async function createMessageVariables(ac) {
  const existing = await ac.get("/personalizations?limit=100");
  const byTag = new Map(
    (existing.personalizations || []).map((p) => [p.tag, p])
  );

  const created = [];
  for (const article of ARTICLES) {
    if (byTag.has(article.tag)) {
      console.log(
        `  variable already exists: %${article.tag}% (id=${byTag.get(article.tag).id})`
      );
      created.push(byTag.get(article.tag));
      continue;
    }

    const res = await ac.post("/personalizations", {
      personalization: {
        tag: article.tag,
        name: article.name,
        format: "html",
        content: articleEmailHtml(article),
        listids: LIST_IDS,
      },
    });
    console.log(
      `  created %${res.personalization.tag}% (id=${res.personalization.id})`
    );
    created.push(res.personalization);
  }
  return created;
}

async function verify(ac) {
  const logs = await ac.get(`/contacts/${CONTACT_ID}/trackingLogs`);
  const vars = await ac.get("/personalizations?limit=100");
  const aeonVars = (vars.personalizations || []).filter((p) =>
    String(p.tag || "").startsWith("aeon-article-")
  );

  console.log("\nVerification");
  console.log(
    `  trackingLogs for contact ${CONTACT_ID}: ${logs.trackingLogs?.length ?? 0}`
  );
  for (const log of logs.trackingLogs || []) {
    console.log(`    - ${log.type}: ${String(log.value).slice(0, 80)}`);
  }
  console.log(`  aeon message variables: ${aeonVars.length}`);
  for (const v of aeonVars) {
    console.log(`    - %${v.tag}% (${v.name})`);
  }

  return {
    eventCount: logs.trackingLogs?.length ?? 0,
    variableCount: aeonVars.length,
  };
}

async function main() {
  const apiUrl = requireEnv("AC_API_URL");
  const apiToken = requireEnv("AC_API_TOKEN");
  const actid = requireEnv("AC_ACTID");
  const eventKey = requireEnv("AC_EVENT_KEY");

  const ac = createAcClient({ apiUrl, apiToken });

  console.log("Aeon.co → ActiveCampaign demo sync\n");
  console.log(`Contact ${CONTACT_ID} <${CONTACT_EMAIL}>\n`);

  console.log("1. Event tracking");
  await ensureEventTrackingEnabled(ac);

  console.log("\n2. Whitelist event names");
  await whitelistEvents(ac);

  console.log("\n3. Post subscriber behavior events");
  const posted = await postDemoEvents({
    actid,
    key: eventKey,
    email: CONTACT_EMAIL,
  });
  console.log(`  posted ${posted} events`);

  // trackcmp is eventually consistent; brief pause before verify
  await new Promise((r) => setTimeout(r, 5000));

  console.log("\n4. Create HTML message variables");
  await createMessageVariables(ac);

  await verify(ac);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
