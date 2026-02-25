// ===== RankPilot Chrome Extension — popup.js =====

// 🔗 Live site URL (Cloudflare Workers)
const RANKPILOT_URL = 'https://seo.nipun-magotra21.workers.dev';


const CORS_PROXIES = [
    { url: 'https://api.allorigins.win/raw?url=', encode: true },
    { url: 'https://corsproxy.io/?', encode: false },
    { url: 'https://api.codetabs.com/v1/proxy?quest=', encode: false },
    { url: 'https://api.allorigins.win/get?url=', encode: true, json: true }
];

let currentTabUrl = '';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabUrl = tab?.url || '';

    // Show URL
    const urlEl = document.getElementById('url-text');
    if (urlEl) {
        try {
            const u = new URL(currentTabUrl);
            urlEl.textContent = u.hostname + (u.pathname !== '/' ? u.pathname : '');
        } catch {
            urlEl.textContent = currentTabUrl.slice(0, 50);
        }
    }

    // Skip non-http pages
    if (!currentTabUrl.startsWith('http')) {
        showError('Open a website to scan it.');
        return;
    }

    await runScan(currentTabUrl);

    document.getElementById('retry-btn')?.addEventListener('click', () => {
        showScanning();
        runScan(currentTabUrl);
    });

    document.getElementById('full-detail-btn')?.addEventListener('click', () => {
        const targetUrl = RANKPILOT_URL + '?url=' + encodeURIComponent(currentTabUrl);
        chrome.tabs.create({ url: targetUrl });
    });
});

// ===== SCAN =====
async function runScan(url) {
    showScanning();
    setScanStep(1);

    try {
        const html = await fetchHTML(url);
        setScanStep(2);

        const doc = new DOMParser().parseFromString(html, 'text/html');

        const meta = analyzeMeta(doc);
        const headings = analyzeHeadings(doc);
        const content = analyzeContent(doc);

        setScanStep(3);
        const technical = analyzeTechnical(doc, html);
        const ai = analyzeAICompatibility(doc, html);

        setScanStep(4);
        await wait(400);

        const scores = calculateScores({ meta, headings, content, technical, ai });
        showResults(scores, { meta, headings, content, technical, ai });

    } catch (err) {
        showError(err.message || 'Failed to scan this page.');
    }
}

// ===== FETCH =====
async function fetchHTML(url) {
    for (const proxy of CORS_PROXIES) {
        const targetUrl = proxy.encode ? encodeURIComponent(url) : url;
        try {
            const resp = await fetch(proxy.url + targetUrl, {
                headers: { 'Accept': 'text/html' },
                signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
            });
            if (!resp.ok) continue;
            let html = await resp.text();
            if (proxy.json) { try { html = JSON.parse(html).contents; } catch { } }
            if (!html || html.length < 50) continue;
            return html;
        } catch { continue; }
    }
    throw new Error('Could not fetch page. It may block external requests.');
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== ANALYZERS (mirrors main.js) =====
function analyzeMeta(doc) {
    const results = [];
    const t = doc.querySelector('title')?.textContent?.trim() || '';
    if (!t) results.push({ status: 'fail', title: 'Missing Title', detail: 'No <title> tag found.' });
    else if (t.length < 20 || t.length > 60) results.push({ status: 'warn', title: 'Title Length', detail: `${t.length} chars (aim 50–60).` });
    else results.push({ status: 'pass', title: 'Title Tag', detail: `${t.length} chars — optimal.` });

    const d = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
    if (!d) results.push({ status: 'fail', title: 'Missing Meta Desc', detail: 'No meta description.' });
    else if (d.length < 70 || d.length > 160) results.push({ status: 'warn', title: 'Meta Description', detail: `${d.length} chars (aim 120–160).` });
    else results.push({ status: 'pass', title: 'Meta Description', detail: `${d.length} chars — good.` });

    const hasOG = doc.querySelector('meta[property="og:title"]');
    results.push(hasOG
        ? { status: 'pass', title: 'OG Tags', detail: 'Open Graph present.' }
        : { status: 'warn', title: 'No OG Tags', detail: 'Social sharing won\'t have preview.' });

    return results;
}

function analyzeHeadings(doc) {
    const results = [];
    const h1s = doc.querySelectorAll('h1');
    if (h1s.length === 0) results.push({ status: 'fail', title: 'Missing H1', detail: 'No H1 heading found.' });
    else if (h1s.length > 1) results.push({ status: 'warn', title: 'Multiple H1s', detail: `${h1s.length} H1 tags found.` });
    else results.push({ status: 'pass', title: 'H1 Heading', detail: h1s[0].textContent.trim().slice(0, 50) });
    return results;
}

function analyzeContent(doc) {
    const results = [];
    const body = doc.body?.cloneNode(true);
    if (!body) return results;
    body.querySelectorAll('script,style,noscript').forEach(e => e.remove());
    const wc = body.textContent.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wc < 100) results.push({ status: 'fail', title: 'Thin Content', detail: `${wc} words (aim 300+).` });
    else if (wc < 300) results.push({ status: 'warn', title: 'Moderate Content', detail: `${wc} words.` });
    else results.push({ status: 'pass', title: 'Content Length', detail: `${wc.toLocaleString()} words.` });
    return results;
}

function analyzeTechnical(doc, html) {
    const results = [];
    const vp = doc.querySelector('meta[name="viewport"]');
    results.push(vp
        ? { status: 'pass', title: 'Viewport', detail: 'Mobile viewport set.' }
        : { status: 'fail', title: 'Missing Viewport', detail: 'Add viewport meta.' });

    const can = doc.querySelector('link[rel="canonical"]');
    results.push(can
        ? { status: 'pass', title: 'Canonical URL', detail: 'Canonical tag found.' }
        : { status: 'warn', title: 'No Canonical', detail: 'May cause duplicate content.' });

    const ld = doc.querySelectorAll('script[type="application/ld+json"]');
    results.push(ld.length > 0
        ? { status: 'pass', title: 'Structured Data', detail: `${ld.length} JSON-LD schema(s).` }
        : { status: 'warn', title: 'No Structured Data', detail: 'Add JSON-LD schema.' });

    return results;
}

function analyzeAICompatibility(doc, html) {
    const results = [];

    const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    const schemaTypes = [];
    ldScripts.forEach(s => {
        try {
            const d = JSON.parse(s.textContent);
            const t = d['@type'] || '';
            if (t) schemaTypes.push(t);
        } catch { }
    });

    if (schemaTypes.length > 0) {
        results.push({ status: 'pass', title: 'Schema Markup', detail: schemaTypes.join(', '), ai: true, weight: 15 });
        const hasFAQ = schemaTypes.some(t => /faq/i.test(t));
        results.push(hasFAQ
            ? { status: 'pass', title: 'FAQ Schema', detail: 'AI engines can extract Q&A.', ai: true, weight: 12 }
            : { status: 'warn', title: 'No FAQ Schema', detail: 'Add FAQPage schema for AI answers.', ai: true, weight: 12 });
    } else {
        results.push({ status: 'fail', title: 'No Schema Markup', detail: 'AI engines need structured data.', ai: true, weight: 15 });
    }

    const body = doc.body?.cloneNode(true);
    body?.querySelectorAll('script,style,noscript,nav,footer').forEach(e => e.remove());
    const wc = body?.textContent.trim().split(/\s+/).filter(w => w.length > 0).length || 0;
    if (wc >= 1500) results.push({ status: 'pass', title: 'Content Depth', detail: `${wc.toLocaleString()} words — great for AI.`, ai: true, weight: 12 });
    else if (wc >= 600) results.push({ status: 'warn', title: 'Content Depth', detail: `${wc.toLocaleString()} words. AI prefers 1,500+.`, ai: true, weight: 12 });
    else results.push({ status: 'fail', title: 'Thin Content', detail: `${wc} words. AI rarely cites thin pages.`, ai: true, weight: 12 });

    const allH = Array.from(doc.querySelectorAll('h1,h2,h3'));
    const qHeadings = allH.filter(h => /\?|what|how|why|when|who|where/i.test(h.textContent)).length;
    results.push(qHeadings >= 2
        ? { status: 'pass', title: 'Q&A Headings', detail: `${qHeadings} question-style headings.`, ai: true, weight: 10 }
        : { status: 'warn', title: 'No Q&A Headings', detail: 'Use "What/How/Why" headings.', ai: true, weight: 10 });

    const dateEl = doc.querySelector('time[datetime], meta[property="article:modified_time"]');
    results.push(dateEl
        ? { status: 'pass', title: 'Date Markup', detail: 'Freshness signal found.', ai: true, weight: 8 }
        : { status: 'warn', title: 'No Date Markup', detail: 'Add <time datetime="..."> for freshness.', ai: true, weight: 8 });

    return results;
}

// ===== SCORING =====
function calculateScores(results) {
    function sc(items) {
        if (!items || !items.length) return 100;
        let pts = 0, max = 0;
        items.forEach(i => {
            const w = i.weight || 10;
            if (i.status === 'pass') { pts += w; max += w; }
            else if (i.status === 'warn') { pts += w * 0.5; max += w; }
            else if (i.status === 'fail') { max += w; }
            else { pts += w * 0.8; max += w; }
        });
        return max > 0 ? Math.round((pts / max) * 100) : 100;
    }
    const meta = sc(results.meta), headings = sc(results.headings),
        content = sc(results.content), technical = sc(results.technical);
    const overall = Math.round(meta * 0.3 + headings * 0.2 + content * 0.2 + technical * 0.3);
    const ai = sc(results.ai);
    return { overall, meta, headings, content, technical, ai };
}

// ===== UI STATE =====
function showScanning() {
    document.getElementById('scanning-state').style.display = 'flex';
    document.getElementById('results-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    // Reset scan steps
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('ss-' + i);
        if (el) { el.classList.remove('active', 'done'); }
    }
}

function setScanStep(n) {
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('ss-' + i);
        if (!el) continue;
        el.classList.remove('active', 'done');
        if (i < n) el.classList.add('done');
        else if (i === n) el.classList.add('active');
    }
}

function showError(msg) {
    document.getElementById('scanning-state').style.display = 'none';
    document.getElementById('results-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'flex';
    document.getElementById('error-msg').textContent = msg;
}

function showResults(scores, results) {
    document.getElementById('scanning-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('results-state').style.display = 'block';

    // --- SEO ring ---
    animateRing('seo-circle-fill', scores.overall);
    animateNum('seo-num', scores.overall);
    const seoGradeEl = document.getElementById('seo-grade');
    seoGradeEl.textContent = gradeLabel(scores.overall);
    seoGradeEl.className = 'pill-grade ' + gradeClass(scores.overall);

    // --- AI ring ---
    animateRing('ai-circle-fill', scores.ai);
    animateNum('ai-num', scores.ai);
    const aiGradeEl = document.getElementById('ai-grade');
    aiGradeEl.textContent = aiGradeLabel(scores.ai);
    aiGradeEl.className = 'pill-grade ai-grade ' + gradeClass(scores.ai);

    // --- Quick badges ---
    const badges = document.getElementById('quick-badges');
    badges.innerHTML = [
        { n: 'Meta', s: scores.meta },
        { n: 'Headings', s: scores.headings },
        { n: 'Content', s: scores.content },
        { n: 'Technical', s: scores.technical },
        { n: '✦ AI', s: scores.ai, ai: true }
    ].map(b => {
        const cls = b.ai ? 'qb qb-ai' : `qb ${b.s >= 80 ? 'qb-pass' : b.s >= 50 ? 'qb-warn' : 'qb-fail'}`;
        return `<span class="${cls}">${b.n} ${b.s}</span>`;
    }).join('');

    // --- Mini checks: top items from all sections ---
    const allItems = [
        ...results.meta.map(i => ({ ...i, tag: 'SEO' })),
        ...results.technical.map(i => ({ ...i, tag: 'Tech' })),
        ...results.ai.map(i => ({ ...i, tag: 'AI' }))
    ];

    // Show 1 fail, then 1 warn, then 1 pass as highlights
    const priority = ['fail', 'warn', 'pass'];
    const shown = [];
    for (const p of priority) {
        const found = allItems.find(i => i.status === p && !shown.includes(i));
        if (found) shown.push(found);
        if (shown.length >= 5) break;
    }
    // Fill remaining
    for (const item of allItems) {
        if (!shown.includes(item) && shown.length < 5) shown.push(item);
    }

    const container = document.getElementById('mini-checks');
    container.innerHTML = shown.slice(0, 5).map(i => {
        const isAI = i.ai;
        const icoMap = { pass: '✓', warn: '!', fail: '✕' };
        const ico = icoMap[i.status] || 'i';
        let iconClass = '';
        if (isAI) {
            iconClass = i.status === 'pass' ? 'mc-ai-pass' : i.status === 'warn' ? 'mc-ai-warn' : 'mc-ai-fail';
        } else {
            iconClass = i.status === 'pass' ? 'mc-pass' : i.status === 'warn' ? 'mc-warn' : 'mc-fail';
        }
        return `<div class="mc-item">
            <div class="mc-icon ${iconClass}">${ico}</div>
            <span class="mc-text">${i.title}</span>
            <span class="mc-tag">${i.tag || (isAI ? 'AI' : 'SEO')}</span>
        </div>`;
    }).join('');
}

// ===== HELPERS =====
function animateRing(id, score) {
    const el = document.getElementById(id);
    if (!el) return;
    const circumference = 150.8;
    const offset = circumference - (score / 100) * circumference;
    // Color
    el.style.stroke = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
    setTimeout(() => {
        el.style.strokeDashoffset = offset;
    }, 100);
}

function animateNum(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let cur = 0;
    const step = () => {
        cur = Math.min(cur + Math.ceil(target / 30), target);
        el.textContent = cur;
        if (cur < target) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function gradeLabel(s) {
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    return 'Poor';
}

function aiGradeLabel(s) {
    if (s >= 80) return 'AI-Ready';
    if (s >= 60) return 'Partial';
    if (s >= 40) return 'Needs Work';
    return 'Not Ready';
}

function gradeClass(s) {
    if (s >= 80) return 'grade-good';
    if (s >= 50) return 'grade-ok';
    return 'grade-bad';
}
