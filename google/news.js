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
  const doc = await new Promise((resolve, reject) => {
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
        clearTimeout(timer);
        cleanup();
        resolve(loadedDoc);
      } catch (error) {
        clearTimeout(timer);
        cleanup();
        reject(error);
      }
    };

    document.body.appendChild(iframe);
  });

  function firstText(root, selectors) {
    for (const selector of selectors) {
      const el = root.querySelector(selector);
      const text = el && el.textContent ? el.textContent.trim() : '';
      if (text) return text;
    }
    return '';
  }

  function parseTimestamp(text) {
    const seconds = Number(text);
    return Number.isFinite(seconds) ? seconds : null;
  }

  function parseFromAnchor(anchor) {
    const lines = (anchor.innerText || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => s !== '.');

    const title = firstText(anchor, ['[role="heading"]', 'h3', 'h4', 'div[aria-level="3"]'])
      || lines.find(s => s.length > 12)
      || '';

    const time = lines.find(s => /(\d+\s*(分钟|小时|天|周|个月|年)前)|(\d{4}年\d{1,2}月\d{1,2}日)/.test(s)) || '';
    const source = lines.find(s => s && s !== title && s !== time) || '';
    const snippet = lines.find(s => s && s !== source && s !== title && s !== time && s.length > 20) || '';
    const tsEl = anchor.querySelector('[data-ts]');
    const timestamp = tsEl ? parseTimestamp(tsEl.getAttribute('data-ts')) : null;

    return { title, source, snippet, time, timestamp };
  }

  const results = [];
  const seenUrls = new Set();
  const newsContainers = Array.from(doc.querySelectorAll('div.SoaBEf'));

  for (const container of newsContainers) {
    const linkEl = container.querySelector('a.WlydOe, a[href^="http"]');
    if (!linkEl) continue;
    const link = linkEl.getAttribute('href');
    if (!link || !link.startsWith('http') || seenUrls.has(link)) continue;

    const parsed = parseFromAnchor(linkEl);
    const title = firstText(container, ['div.n0jPhd', '[role="heading"]', 'h3', 'h4']) || parsed.title;
    const source = firstText(container, ['div.MgUUmf span', 'span']) || parsed.source;
    const snippet = firstText(container, ['div.UqSP2b', 'div:last-of-type']) || parsed.snippet;
    const timeEl = container.querySelector('div.OSrXXb span[data-ts], [data-ts]');
    const timestamp = timeEl ? parseTimestamp(timeEl.getAttribute('data-ts')) : parsed.timestamp;
    const timeText = timeEl && timeEl.textContent ? timeEl.textContent.trim() : parsed.time;

    seenUrls.add(link);

    results.push({
      title,
      url: link,
      source,
      snippet,
      time: timeText,
      timestamp
    });
  }

  if (results.length === 0) {
    const anchors = Array.from(doc.querySelectorAll('a[href^="http"]'));
    for (const anchor of anchors) {
      const link = anchor.getAttribute('href');
      if (!link || seenUrls.has(link)) continue;
      const parsed = parseFromAnchor(anchor);
      if (!parsed.title || !parsed.source) continue;

      seenUrls.add(link);
      results.push({
        title: parsed.title,
        url: link,
        source: parsed.source,
        snippet: parsed.snippet,
        time: parsed.time,
        timestamp: parsed.timestamp
      });

      if (results.length >= num) break;
    }
  }

  return {query: args.query, count: results.length, results};
}
