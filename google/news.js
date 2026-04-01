/* @meta
{
  "name": "google/news",
  "description": "Google 新闻搜索",
  "domain": "www.google.com",
  "args": {
    "query": {"required": true, "description": "Search query"},
    "count": {"required": false, "description": "Number of results (default 10)"}
  },
  "readOnly": true,
  "example": "bb-browser site google/news \"特斯拉\""
}
*/

async function(args) {
  if (!args.query) return {error: 'Missing argument: query', hint: 'Provide a search query string'};
  const num = args.count || 10;
  const url = 'https://www.google.com/search?q=' + encodeURIComponent(args.query) + '&tbm=nws&num=' + num;

  async function loadViaFetch() {
    const resp = await fetch(url, {credentials: 'include'});
    if (!resp.ok) return {error: 'HTTP ' + resp.status, hint: 'Make sure a google.com tab is open'};
    const html = await resp.text();
    return {
      html,
      doc: new DOMParser().parseFromString(html, 'text/html'),
      mode: 'fetch'
    };
  }

  async function loadViaIframe() {
    return await new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;

      const cleanup = () => iframe.remove();
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out loading Google news results'));
      }, 8000);

      iframe.onload = () => {
        try {
          const loadedDoc = iframe.contentDocument;
          if (!loadedDoc) throw new Error('No iframe document');
          const html = loadedDoc.documentElement ? loadedDoc.documentElement.outerHTML : '';
          clearTimeout(timer);
          cleanup();
          resolve({html, doc: loadedDoc, mode: 'iframe'});
        } catch (error) {
          clearTimeout(timer);
          cleanup();
          reject(error);
        }
      };

      iframe.onerror = () => {
        clearTimeout(timer);
        cleanup();
        reject(new Error('Failed to load Google news iframe'));
      };

      document.body.appendChild(iframe);
    });
  }

  let loaded;
  try {
    loaded = await loadViaFetch();
  } catch (_) {
    try {
      loaded = await loadViaIframe();
    } catch (fallbackError) {
      return {
        error: String(fallbackError),
        hint: 'Open https://www.google.com in your browser, make sure you are logged in, then retry.'
      };
    }
  }

  if (loaded.error) return loaded;

  const html = loaded.html;
  const doc = loaded.doc;

  function textOf(el) {
    return el && el.textContent ? el.textContent.trim() : '';
  }

  function firstText(root, selectors) {
    for (const selector of selectors) {
      const el = root.querySelector(selector);
      const text = textOf(el);
      if (text) return text;
    }
    return '';
  }

  function normalizeWhitespace(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function parseTimestamp(text) {
    const seconds = Number(text);
    return Number.isFinite(seconds) ? seconds : null;
  }

  function isTimeText(text) {
    return /(\d+\s*(分钟|小时|天|周|个月|年)前)|(\d{4}年\d{1,2}月\d{1,2}日)|(\d+\s*(min|hour|day|week|month|year)s?\s+ago)|(\b\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}\b)/i.test(text);
  }

  function isLikelySource(text) {
    if (!text) return false;
    if (text.length > 80) return false;
    if (isTimeText(text)) return false;
    if (/^https?:\/\//i.test(text)) return false;
    if (/^(Sign in|Tools|Images|Videos|Maps|Shopping|News|More)$/i.test(text)) return false;
    return true;
  }

  function isLikelySnippet(text, title, source) {
    if (!text) return false;
    if (text.length < 25) return false;
    if (text === title || text === source) return false;
    if (isTimeText(text)) return false;
    return true;
  }

  function normalizeUrl(link) {
    try {
      const parsed = new URL(link, url);
      if (!/^https?:$/.test(parsed.protocol)) return null;
      if (parsed.hostname.endsWith('google.com')) return null;
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  }

  function collectLines(root) {
    return normalizeWhitespace(root.innerText || root.textContent || '')
      .split('\n')
      .map(s => normalizeWhitespace(s))
      .filter(Boolean)
      .filter(s => s !== '.');
  }

  function findTitle(root, anchor, lines) {
    return normalizeWhitespace(
      firstText(root, ['[role="heading"]', 'h3', 'h4', 'div[aria-level="3"]'])
      || firstText(anchor, ['[role="heading"]', 'h3', 'h4', 'div[aria-level="3"]'])
      || lines.find(s => s.length > 12)
      || textOf(anchor)
    );
  }

  function findMeta(root, anchor, title) {
    const sourceSelectors = [
      'div.MgUUmf span',
      'div.CEMjEf span',
      '[data-news-source] span',
      'cite',
      'span'
    ];
    const timeSelectors = [
      'div.OSrXXb span[data-ts]',
      '[data-ts]',
      'time'
    ];

    const sourceCandidates = [];
    for (const selector of sourceSelectors) {
      for (const el of root.querySelectorAll(selector)) {
        const text = normalizeWhitespace(textOf(el));
        if (isLikelySource(text) && text !== title) sourceCandidates.push(text);
      }
    }

    const lines = collectLines(root);
    let source = sourceCandidates[0] || '';
    if (!source) {
      source = lines.find(s => isLikelySource(s) && s !== title) || '';
    }

    let time = '';
    let timestamp = null;
    for (const selector of timeSelectors) {
      const el = root.querySelector(selector) || anchor.querySelector(selector);
      if (!el) continue;
      const text = normalizeWhitespace(textOf(el));
      const ts = el.getAttribute && el.getAttribute('data-ts');
      if (!time && text && isTimeText(text)) time = text;
      if (timestamp == null && ts) timestamp = parseTimestamp(ts);
      if (time || timestamp != null) break;
    }

    if (!time) {
      time = lines.find(isTimeText) || '';
    }

    return {source, time, timestamp, lines};
  }

  function findSnippet(root, title, source, time, lines) {
    const snippetSelectors = ['div.UqSP2b', 'div:last-of-type', 'span'];
    for (const selector of snippetSelectors) {
      for (const el of root.querySelectorAll(selector)) {
        const text = normalizeWhitespace(textOf(el));
        if (isLikelySnippet(text, title, source) && text !== time) return text;
      }
    }
    return lines.find(s => isLikelySnippet(s, title, source) && s !== time) || '';
  }

  function findContainer(anchor) {
    let current = anchor;
    let steps = 0;
    while (current && current.parentElement && current.parentElement.tagName !== 'BODY' && steps < 6) {
      const parent = current.parentElement;
      if (parent.querySelectorAll('a[href^="http"]').length > 3) break;
      current = parent;
      steps += 1;
    }
    return current || anchor;
  }

  function parseCandidate(container, anchor) {
    const normalizedUrl = normalizeUrl(anchor.getAttribute('href'));
    if (!normalizedUrl) return null;

    const lines = collectLines(container);
    const title = findTitle(container, anchor, lines);
    if (!title) return null;

    const meta = findMeta(container, anchor, title);
    if (!meta.source) return null;

    return {
      title,
      url: normalizedUrl,
      source: meta.source,
      snippet: findSnippet(container, title, meta.source, meta.time, meta.lines),
      time: meta.time || '',
      timestamp: meta.timestamp
    };
  }

  const looksLikeGoogleResults =
    /<title>.*Google/i.test(html) ||
    !!doc.querySelector('form[action="/search"], input[name="q"], div#search');
  if (!looksLikeGoogleResults) {
    return {error: 'Unexpected Google response', hint: 'Google returned a non-search page or an interstitial'};
  }

  const results = [];
  const seenUrls = new Set();

  function addResult(candidate) {
    if (!candidate || seenUrls.has(candidate.url)) return;
    seenUrls.add(candidate.url);
    results.push(candidate);
  }

  const newsContainers = Array.from(doc.querySelectorAll('div.SoaBEf'));
  for (const container of newsContainers) {
    const anchor = container.querySelector('a.WlydOe, a[href^="http"]');
    if (!anchor) continue;
    addResult(parseCandidate(container, anchor));
    if (results.length >= num) break;
  }

  if (results.length < num) {
    const anchors = Array.from(doc.querySelectorAll('a[href^="http"]'));
    for (const anchor of anchors) {
      const container = findContainer(anchor);
      addResult(parseCandidate(container, anchor));
      if (results.length >= num) break;
    }
  }

  if (results.length === 0 && loaded.mode === 'fetch') {
    try {
      const iframeLoaded = await loadViaIframe();
      const iframeDoc = iframeLoaded.doc;
      const iframeResults = [];
      const iframeSeenUrls = new Set();

      function addIframeResult(candidate) {
        if (!candidate || iframeSeenUrls.has(candidate.url)) return;
        iframeSeenUrls.add(candidate.url);
        iframeResults.push(candidate);
      }

      const iframeNewsContainers = Array.from(iframeDoc.querySelectorAll('div.SoaBEf'));
      for (const container of iframeNewsContainers) {
        const anchor = container.querySelector('a.WlydOe, a[href^="http"]');
        if (!anchor) continue;
        addIframeResult(parseCandidate(container, anchor));
        if (iframeResults.length >= num) break;
      }

      if (iframeResults.length < num) {
        const iframeAnchors = Array.from(iframeDoc.querySelectorAll('a[href^="http"]'));
        for (const anchor of iframeAnchors) {
          const container = findContainer(anchor);
          addIframeResult(parseCandidate(container, anchor));
          if (iframeResults.length >= num) break;
        }
      }

      if (iframeResults.length > 0) {
        return {query: args.query, count: iframeResults.length, results: iframeResults};
      }
    } catch (_) {}
  }

  if (results.length === 0) {
    return {error: 'No parseable news results found', hint: 'Google returned a results page, but no stable news cards could be extracted'};
  }

  return {query: args.query, count: results.length, results};
}
