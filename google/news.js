/* @meta
{
  "name": "google/news",
  "description": "Google 新闻搜索（基于 Google News RSS，不受 Google 人机验证影响）",
  "domain": "news.google.com",
  "args": {
    "query": {"required": true, "description": "Search query"},
    "count": {"required": false, "description": "Number of results (default 10)"},
    "lang": {"required": false, "description": "Language/region, e.g. zh-CN (default en-US)"}
  },
  "readOnly": true,
  "example": "bb-browser site google/news \"特斯拉\""
}
*/

async function(args) {
  if (!args.query) return {error: 'Missing argument: query', hint: 'Provide a search query string'};
  const num = args.count || 10;
  const lang = args.lang || 'en-US';
  const [hl, gl] = lang.split('-');
  const url = '/rss/search?q=' + encodeURIComponent(args.query)
    + '&hl=' + (hl || 'en') + '&gl=' + (gl || 'US')
    + '&ceid=' + (gl || 'US') + ':' + (hl || 'en');

  let xml;
  try {
    const resp = await fetch(url, {credentials: 'include'});
    if (!resp.ok) return {error: 'HTTP ' + resp.status, hint: 'Make sure news.google.com is reachable'};
    xml = await resp.text();
  } catch (e) {
    return {error: String(e), hint: 'Open https://news.google.com in your browser once, then retry.'};
  }

  // news.google.com enforces Trusted-Types CSP, so parse the RSS with regex instead of DOMParser
  const decode = (s) => s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const tag = (block, name) => {
    const m = block.match(new RegExp('<' + name + '>([\\s\\S]*?)</' + name + '>', 'i'))
           || block.match(new RegExp('<' + name + ' [^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
    return m ? decode(m[1]).trim() : '';
  };

  const blocks = xml.split(/<item>/i).slice(1).map(b => b.split(/<\/item>/i)[0]);
  const results = [];
  for (const block of blocks.slice(0, num)) {
    let title = tag(block, 'title');
    let source = '';
    const m = title.match(/^(.*)\s+-\s+([^-]+)$/);
    if (m) { title = m[1].trim(); source = m[2].trim(); }

    // RSS description can be double-escaped; decode & strip tags repeatedly until stable
    let snippet = tag(block, 'description');
    for (let i = 0; i < 4; i++) {
      const next = decode(snippet).replace(/<[^>]+>/g, ' ').replace(/&nbsp;|\s+/g, ' ').trim();
      if (next === snippet) break;
      snippet = next;
    }
    if (snippet === title) snippet = '';

    const pubDate = tag(block, 'pubDate');
    let timestamp = null;
    if (pubDate) {
      const t = Date.parse(pubDate);
      if (Number.isFinite(t)) timestamp = Math.floor(t / 1000);
    }

    results.push({title, url: tag(block, 'link'), source, snippet, time: pubDate, timestamp});
  }

  if (results.length === 0) {
    return {error: 'No news results found', hint: 'RSS feed returned no items for this query'};
  }
  return {query: args.query, count: results.length, results};
}
