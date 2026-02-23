// ===== RankPilot — SEO Audit Engine =====
// ===== RankPilot — SEO Audit Engine =====

// Fix 4: More proxies + per-proxy URL formatting
const CORS_PROXIES = [
    { url: 'https://api.allorigins.win/raw?url=', encode: true },
    { url: 'https://corsproxy.io/?', encode: false },
    { url: 'https://api.codetabs.com/v1/proxy?quest=', encode: false },
    { url: 'https://thingproxy.freeboard.io/fetch/', encode: false },
    { url: 'https://api.allorigins.win/get?url=', encode: true, json: true },
    { url: 'https://corsproxy.org/?', encode: false }
];
let currentProxyIndex = 0;
const proxyHealth = new Map(); // track failures per proxy
let lastAuditUrl = ''; // for retry

// ===== UTILITY =====

function newAudit() {
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('loading-section').style.display = 'none';
    const searchBox = document.getElementById('search-box');
    searchBox.style.display = 'block';
    searchBox.classList.remove('search-fadeout');
    document.getElementById('url-input').value = '';
    document.getElementById('url-input').disabled = false;
    document.getElementById('url-input').focus();
    resetProgressSteps();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function normalizeUrl(url) {
    url = url.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); return url; } catch { return null; }
}

// Fix 2: Better error UX with retry button
function showError(msg, showRetry = false) {
    const el = document.getElementById('error-message');
    if (showRetry && lastAuditUrl) {
        el.innerHTML = `${msg} <button onclick="retryAudit()" style="margin-left:8px;padding:4px 14px;background:var(--blue);color:white;border:none;border-radius:4px;font-size:0.82rem;font-weight:600;cursor:pointer;">↻ Retry</button>`;
    } else {
        el.textContent = msg;
    }
    el.style.display = 'block';
    if (!showRetry) setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function retryAudit() {
    document.getElementById('url-input').value = lastAuditUrl;
    document.getElementById('error-message').style.display = 'none';
    startAudit();
}

// ===== LOADING ANIMATION =====

function resetProgressSteps() {
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById('step-' + i);
        step.classList.remove('step-active', 'step-done');
    }
}

function setStep(stepNum) {
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById('step-' + i);
        if (i < stepNum) {
            step.classList.remove('step-active');
            step.classList.add('step-done');
        } else if (i === stepNum) {
            step.classList.remove('step-done');
            step.classList.add('step-active');
        } else {
            step.classList.remove('step-active', 'step-done');
        }
    }
}

function showLoading(url) {
    // Fade out search box
    const searchBox = document.getElementById('search-box');
    searchBox.classList.add('search-fadeout');

    setTimeout(() => {
        searchBox.style.display = 'none';
        // Show loading
        const loadingSection = document.getElementById('loading-section');
        loadingSection.style.display = 'block';
        loadingSection.classList.add('loading-fadein');
        // Fix 2: show which URL is being analyzed
        const urlLabel = document.getElementById('loading-url');
        if (urlLabel) urlLabel.textContent = url || '';
        resetProgressSteps();
        setStep(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
}

function hideLoading() {
    const loadingSection = document.getElementById('loading-section');
    loadingSection.classList.remove('loading-fadein');
    loadingSection.style.display = 'none';
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== FETCH (Fix 1 + Fix 4) =====
function makeAbortSignal(ms) {
    // Fix 4: fallback for browsers without AbortSignal.timeout
    if (AbortSignal.timeout) return AbortSignal.timeout(ms);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
}

async function fetchHTML(url) {
    const sortedProxies = [...CORS_PROXIES.keys()]
        .sort((a, b) => (proxyHealth.get(a) || 0) - (proxyHealth.get(b) || 0));

    for (const i of sortedProxies) {
        const proxy = CORS_PROXIES[i];
        // Fix 1: per-proxy URL formatting — some need encoded, some don't
        const targetUrl = proxy.encode ? encodeURIComponent(url) : url;
        try {
            const resp = await fetch(proxy.url + targetUrl, {
                headers: { 'Accept': 'text/html' },
                signal: makeAbortSignal(12000)
            });
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            let html = await resp.text();
            // Handle JSON-wrapped proxies (allorigins /get endpoint)
            if (proxy.json) {
                try { html = JSON.parse(html).contents; } catch { }
            }
            // Valid HTML check — must have at least a tag
            if (!html || html.length < 50 || (!html.includes('<') && !html.includes('>'))) throw new Error('Invalid response');
            proxyHealth.set(i, 0); // reset failure count on success
            currentProxyIndex = i;
            return html;
        } catch {
            proxyHealth.set(i, (proxyHealth.get(i) || 0) + 1);
            continue;
        }
    }
    throw new Error('Could not fetch the page. The site may be blocking requests or is offline.');
}

// ===== MAIN =====
async function startAudit() {
    const url = normalizeUrl(document.getElementById('url-input').value);
    if (!url) { showError('Please enter a valid URL (e.g., example.com)'); return; }

    lastAuditUrl = document.getElementById('url-input').value; // Fix 2: save for retry
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('url-input').disabled = true;
    showLoading(url); // Fix 2: pass URL to show during loading

    try {
        // Step 1: Fetching
        await wait(400);
        const html = await fetchHTML(url);

        // Step 2: Analyzing meta
        setStep(2);
        await wait(600);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const meta = analyzeMeta(doc, url);

        // Step 3: Content & headings
        setStep(3);
        await wait(600);
        const headings = analyzeHeadings(doc);
        const content = analyzeContent(doc);

        // Step 4: Technical
        setStep(4);
        await wait(600);
        const technical = analyzeTechnical(doc, html);

        // Step 5: Generating report
        setStep(5);
        await wait(500);

        const results = { meta, headings, content, technical };
        const scores = calculateScores(results);
        renderResults(url, results, scores);

        // Transition: hide loading, show results with staggered reveal
        hideLoading();
        const resultsSection = document.getElementById('results-section');
        resultsSection.style.display = 'block';

        // Staggered reveal animation
        revealResultCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        hideLoading();
        const searchBox = document.getElementById('search-box');
        searchBox.style.display = 'block';
        searchBox.classList.remove('search-fadeout');
        document.getElementById('url-input').disabled = false;
        showError(err.message || 'Failed to analyze. Try another URL.', true); // Fix 2: show retry
    }
}

function revealResultCards() {
    // Score bar
    const scoreBar = document.getElementById('score-bar');
    scoreBar.classList.add('score-reveal');

    // Cards + ad slots + export row
    const items = document.querySelectorAll('#results-section .card, #results-section .ad-slot-inline, #results-section .export-row');
    items.forEach((item, i) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(16px)';
        setTimeout(() => {
            item.classList.add('card-reveal');
            item.style.opacity = '';
            item.style.transform = '';
        }, 200 + (i * 120));
    });
}

document.getElementById('url-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') startAudit();
});

// ===== ANALYZERS =====
function analyzeMeta(doc) {
    const results = [];
    const title = doc.querySelector('title');
    const t = title ? title.textContent.trim() : '';
    if (!t) results.push({ status: 'fail', title: 'Missing Title Tag', detail: 'No <title> tag found. Critical for SEO.', value: null });
    else if (t.length < 20) results.push({ status: 'warn', title: 'Title Too Short', detail: `${t.length} chars — aim for 50-60.`, value: t });
    else if (t.length > 60) results.push({ status: 'warn', title: 'Title Too Long', detail: `${t.length} chars — may be truncated. Aim for ≤60.`, value: t });
    else results.push({ status: 'pass', title: 'Title Tag', detail: `${t.length} chars — optimal.`, value: t });

    const desc = doc.querySelector('meta[name="description"]');
    const d = desc ? desc.getAttribute('content')?.trim() : '';
    if (!d) results.push({ status: 'fail', title: 'Missing Meta Description', detail: 'No meta description. Search engines may auto-generate one.', value: null });
    else if (d.length < 70) results.push({ status: 'warn', title: 'Meta Description Short', detail: `${d.length} chars — aim for 120-160.`, value: d });
    else if (d.length > 160) results.push({ status: 'warn', title: 'Meta Description Long', detail: `${d.length} chars — may be truncated.`, value: d });
    else results.push({ status: 'pass', title: 'Meta Description', detail: `${d.length} chars — good.`, value: d });

    const og = (sel, name, failMsg) => {
        const el = doc.querySelector(sel);
        if (el) results.push({ status: 'pass', title: name, detail: `${name} found.`, value: el.getAttribute('content') });
        else results.push({ status: 'warn', title: `Missing ${name}`, detail: failMsg, value: null });
    };
    og('meta[property="og:title"]', 'OG Title', 'Social shares won\'t have a custom title.');
    og('meta[property="og:description"]', 'OG Description', 'Social cards will lack context.');
    og('meta[property="og:image"]', 'OG Image', 'Social shares won\'t have a preview image.');

    const tw = doc.querySelector('meta[name="twitter:card"]');
    if (tw) results.push({ status: 'pass', title: 'Twitter Card', detail: 'Twitter Card found.', value: tw.getAttribute('content') });
    else results.push({ status: 'info', title: 'No Twitter Card', detail: 'Optional but recommended for X/Twitter.', value: null });

    return results;
}

function analyzeHeadings(doc) {
    const results = [];
    const headings = doc.querySelectorAll('h1,h2,h3,h4,h5,h6');
    const h1s = doc.querySelectorAll('h1');

    if (h1s.length === 0) results.push({ status: 'fail', title: 'Missing H1', detail: 'Every page needs exactly one H1.', value: null });
    else if (h1s.length > 1) results.push({ status: 'warn', title: 'Multiple H1s', detail: `Found ${h1s.length} H1 tags. Best practice is one.`, value: Array.from(h1s).map(h => h.textContent.trim().substring(0, 50)).join(' | ') });
    else results.push({ status: 'pass', title: 'H1 Found', detail: 'Single H1 present.', value: h1s[0].textContent.trim().substring(0, 80) });

    if (headings.length === 0) results.push({ status: 'fail', title: 'No Headings', detail: 'Use headings to structure content.', value: null });
    else results.push({ status: 'pass', title: `${headings.length} Headings`, detail: 'Content has heading structure.', value: null });

    let prev = 0, issues = 0;
    headings.forEach(h => { const l = parseInt(h.tagName[1]); if (prev > 0 && l > prev + 1) issues++; prev = l; });
    if (issues > 0) results.push({ status: 'warn', title: 'Hierarchy Issues', detail: `${issues} skip(s) in heading levels.`, value: null });
    else if (headings.length > 0) results.push({ status: 'pass', title: 'Hierarchy OK', detail: 'Headings follow proper order.', value: null });

    const dist = {};
    headings.forEach(h => { dist[h.tagName] = (dist[h.tagName] || 0) + 1; });
    const dt = Object.entries(dist).map(([k, v]) => `${k}: ${v}`).join(', ');
    if (dt) results.push({ status: 'info', title: 'Distribution', detail: 'Heading tag breakdown.', value: dt });

    return results;
}

function analyzeContent(doc) {
    const results = [];
    const body = doc.body.cloneNode(true);
    body.querySelectorAll('script,style,noscript').forEach(el => el.remove());
    const text = body.textContent.replace(/\s+/g, ' ').trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wc = words.length;

    if (wc < 100) results.push({ status: 'fail', title: 'Very Thin Content', detail: `${wc} words. Aim for ≥300.`, value: null });
    else if (wc < 300) results.push({ status: 'warn', title: 'Thin Content', detail: `${wc} words. Aim for 300+.`, value: null });
    else results.push({ status: 'pass', title: 'Content Length', detail: `${wc.toLocaleString()} words.`, value: null });

    const links = doc.querySelectorAll('a[href]');
    const internal = Array.from(links).filter(l => { const h = l.getAttribute('href'); return h && (h.startsWith('/') || h.startsWith('#') || h.startsWith('./')); });
    const external = Array.from(links).filter(l => { const h = l.getAttribute('href'); return h && /^https?:\/\//.test(h); });
    results.push({ status: 'info', title: 'Links', detail: `${links.length} total: ${internal.length} internal, ${external.length} external.`, value: null });

    const stop = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'has', 'was', 'one', 'our', 'out', 'with', 'this', 'that', 'from', 'they', 'been', 'have', 'will', 'each', 'make', 'like', 'long', 'look', 'many', 'some', 'than', 'them', 'then', 'these', 'two', 'way', 'who', 'did', 'get', 'how', 'its', 'let', 'may', 'new', 'now', 'old', 'see', 'time', 'very', 'when', 'come', 'here', 'just', 'know', 'take', 'where', 'into', 'your', 'what', 'about', 'more', 'also', 'back', 'could', 'other', 'their', 'there', 'which', 'would', 'after', 'should', 'most', 'much', 'over', 'such', 'only', 'well', 'does']);
    const freq = {};
    words.forEach(w => { const l = w.toLowerCase().replace(/[^a-z0-9]/g, ''); if (l.length >= 3 && !stop.has(l)) freq[l] = (freq[l] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, c]) => `"${w}" (${c}x, ${((c / wc) * 100).toFixed(1)}%)`);
    if (top.length > 0) results.push({ status: 'info', title: 'Top Keywords', detail: 'Most used words.', value: top.join('\n') });

    const topDensity = Object.values(freq).sort((a, b) => b - a)[0];
    if (topDensity && (topDensity / wc * 100) > 5) results.push({ status: 'warn', title: 'Keyword Stuffing', detail: `Top keyword at ${(topDensity / wc * 100).toFixed(1)}%. Keep below 3%.`, value: null });

    const imgs = doc.querySelectorAll('img');
    const noAlt = Array.from(imgs).filter(i => !i.getAttribute('alt')?.trim());
    if (imgs.length > 0) {
        if (noAlt.length === 0) results.push({ status: 'pass', title: 'Image Alt Text', detail: `All ${imgs.length} images have alt text.`, value: null });
        else results.push({ status: 'warn', title: 'Missing Alt Text', detail: `${noAlt.length}/${imgs.length} images missing alt.`, value: null });
    }
    return results;
}

function analyzeTechnical(doc, html) {
    const results = [];
    const vp = doc.querySelector('meta[name="viewport"]');
    if (vp) results.push({ status: 'pass', title: 'Viewport', detail: 'Mobile viewport set.', value: vp.getAttribute('content') });
    else results.push({ status: 'fail', title: 'Missing Viewport', detail: 'Page won\'t render properly on mobile.', value: null });

    const cs = doc.querySelector('meta[charset]');
    if (cs) results.push({ status: 'pass', title: 'Charset', detail: 'Encoding specified.', value: cs.getAttribute('charset') });
    else results.push({ status: 'warn', title: 'Missing Charset', detail: 'Add <meta charset="UTF-8">.', value: null });

    const can = doc.querySelector('link[rel="canonical"]');
    if (can) results.push({ status: 'pass', title: 'Canonical', detail: 'Canonical URL found.', value: can.getAttribute('href') });
    else results.push({ status: 'warn', title: 'Missing Canonical', detail: 'May lead to duplicate content.', value: null });

    const rob = doc.querySelector('meta[name="robots"]');
    if (rob) {
        const c = rob.getAttribute('content');
        if (c && (c.includes('noindex') || c.includes('nofollow'))) results.push({ status: 'warn', title: 'Robots Restriction', detail: 'Page has noindex/nofollow.', value: c });
        else results.push({ status: 'pass', title: 'Robots', detail: 'No restrictions.', value: c });
    } else results.push({ status: 'info', title: 'No Robots Meta', detail: 'Page indexed by default (fine).', value: null });

    const lang = doc.documentElement.getAttribute('lang');
    if (lang) results.push({ status: 'pass', title: 'Language', detail: `Set to "${lang}".`, value: null });
    else results.push({ status: 'warn', title: 'Missing Language', detail: 'Add lang attribute.', value: null });

    const fav = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (fav) results.push({ status: 'pass', title: 'Favicon', detail: 'Found.', value: fav.getAttribute('href') });
    else results.push({ status: 'info', title: 'No Favicon', detail: 'May exist at /favicon.ico.', value: null });

    const ld = doc.querySelectorAll('script[type="application/ld+json"]');
    if (ld.length > 0) results.push({ status: 'pass', title: 'Structured Data', detail: `${ld.length} JSON-LD schema(s).`, value: null });
    else results.push({ status: 'warn', title: 'No Structured Data', detail: 'Add JSON-LD for rich snippets.', value: null });

    const size = (new Blob([html]).size / 1024).toFixed(0);
    if (size > 500) results.push({ status: 'warn', title: 'Large HTML', detail: `${size}KB — consider reducing.`, value: null });
    else results.push({ status: 'pass', title: 'HTML Size', detail: `${size}KB.`, value: null });

    return results;
}

// ===== SCORING =====
function calculateScores(results) {
    function sc(items) {
        if (!items.length) return 100;
        let pts = 0, max = 0;
        items.forEach(i => {
            if (i.status === 'pass') { pts += 10; max += 10; }
            else if (i.status === 'warn') { pts += 5; max += 10; }
            else if (i.status === 'fail') { max += 10; }
            else if (i.status === 'info') { pts += 8; max += 10; }
        });
        return max > 0 ? Math.round((pts / max) * 100) : 100;
    }
    const meta = sc(results.meta), headings = sc(results.headings), content = sc(results.content), technical = sc(results.technical);
    return { overall: Math.round(meta * 0.3 + headings * 0.2 + content * 0.2 + technical * 0.3), meta, headings, content, technical };
}

// ===== RENDER =====
function renderResults(url, results, scores) {
    // Score circle
    const circle = document.getElementById('score-circle');
    circle.className = 'score-circle' + (scores.overall >= 80 ? ' score-good' : scores.overall >= 50 ? ' score-ok' : ' score-bad');
    animateNumber('score-number', scores.overall);
    document.getElementById('score-url').textContent = url;

    // Fix 3: Add audit timestamp
    const timestampEl = document.getElementById('score-timestamp');
    if (timestampEl) {
        timestampEl.textContent = 'Audited on ' + new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    const titleEl = document.getElementById('score-title');
    if (scores.overall >= 80) titleEl.textContent = 'Excellent SEO';
    else if (scores.overall >= 60) titleEl.textContent = 'Good — Room to Improve';
    else if (scores.overall >= 40) titleEl.textContent = 'Needs Work';
    else titleEl.textContent = 'Poor — Fix Critical Issues';

    // Badges
    const badgeClass = s => s >= 80 ? 'badge-good' : s >= 50 ? 'badge-ok' : 'badge-bad';
    document.getElementById('score-badges').innerHTML = [
        { n: 'Meta', s: scores.meta }, { n: 'Headings', s: scores.headings },
        { n: 'Content', s: scores.content }, { n: 'Technical', s: scores.technical }
    ].map(b => `<span class="score-badge ${badgeClass(b.s)}">${b.n}: ${b.s}</span>`).join('');

    // Card scores
    const setScore = (id, s) => {
        const el = document.getElementById(id);
        el.textContent = `${s}/100`;
        el.style.color = s >= 80 ? 'var(--green)' : s >= 50 ? 'var(--yellow)' : 'var(--red)';
    };
    setScore('meta-score', scores.meta);
    setScore('headings-score', scores.headings);
    setScore('content-score', scores.content);
    setScore('technical-score', scores.technical);

    renderCheckItems('meta-results', results.meta);
    renderCheckItems('headings-results', results.headings);
    renderCheckItems('content-results', results.content);
    renderCheckItems('technical-results', results.technical);
    renderRecommendations(results);
}

function renderCheckItems(id, items) {
    document.getElementById(id).innerHTML = items.map(i => {
        const cls = { pass: 'check-pass', warn: 'check-warn', fail: 'check-fail', info: 'check-info-icon' }[i.status];
        const ico = { pass: '✓', warn: '!', fail: '✕', info: 'i' }[i.status];
        return `<div class="check-item">
            <div class="check-icon ${cls}">${ico}</div>
            <div class="check-content">
                <div class="check-title">${i.title}</div>
                <div class="check-detail">${i.detail}</div>
                ${i.value ? `<span class="check-value">${escapeHTML(i.value)}</span>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderRecommendations(results) {
    const all = [...results.meta, ...results.headings, ...results.content, ...results.technical];
    const recs = [];
    all.filter(r => r.status === 'fail').forEach(r => recs.push({ priority: 'high', title: r.title, detail: r.detail, impact: 'High Impact' }));
    all.filter(r => r.status === 'warn').forEach(r => recs.push({ priority: 'medium', title: r.title, detail: r.detail, impact: 'Medium Impact' }));

    const container = document.getElementById('recommendations-list');
    if (recs.length === 0) {
        container.innerHTML = '<div class="recommendation-item" style="justify-content:center;text-align:center;padding:20px;"><div><strong style="color:var(--green)">🎉 No critical issues found!</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">Your page is well-optimized.</span></div></div>';
        return;
    }
    container.innerHTML = recs.slice(0, 8).map((r, i) => `
        <div class="recommendation-item">
            <div class="rec-num rec-${r.priority}">${i + 1}</div>
            <div class="rec-content">
                <h4>${r.title}</h4>
                <p>${r.detail}</p>
                <span class="rec-impact impact-${r.priority}">${r.impact}</span>
            </div>
        </div>`).join('');
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    const start = performance.now();
    (function update(now) {
        const p = Math.min((now - start) / 1200, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(update);
    })(start);
}

function escapeHTML(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ===== EXPORT =====
function exportReport() {
    const score = document.getElementById('score-number').textContent;
    const url = document.getElementById('score-url').textContent;
    const sections = ['meta-results', 'headings-results', 'content-results', 'technical-results'];
    const names = ['META TAGS', 'HEADINGS', 'CONTENT', 'TECHNICAL SEO'];
    let report = `RANKPILOT SEO AUDIT REPORT\n${'='.repeat(40)}\nURL: ${url}\nDate: ${new Date().toLocaleDateString()}\nScore: ${score}/100\n`;
    sections.forEach((sid, i) => {
        report += `\n--- ${names[i]} ---\n`;
        document.querySelectorAll(`#${sid} .check-item`).forEach(item => {
            const st = item.querySelector('.check-pass') ? 'PASS' : item.querySelector('.check-warn') ? 'WARN' : item.querySelector('.check-fail') ? 'FAIL' : 'INFO';
            report += `[${st}] ${item.querySelector('.check-title').textContent}: ${item.querySelector('.check-detail').textContent}\n`;
            const v = item.querySelector('.check-value');
            if (v) report += `  → ${v.textContent}\n`;
        });
    });
    report += `\n${'='.repeat(40)}\nGenerated by RankPilot\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
    a.download = `seo-audit-${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
