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
  const resp = await fetch(url, {credentials: 'include'});
  if (!resp.ok) return {error: 'HTTP ' + resp.status, hint: 'Make sure a google.com tab is open'};
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const results = [];
  const newsContainers = doc.querySelectorAll('div.SoaBEf');

  for (const container of newsContainers) {
    const linkEl = container.querySelector('a.WlydOe');
    if (!linkEl) continue;
    const link = linkEl.getAttribute('href');
    if (!link || !link.startsWith('http')) continue;

    const titleEl = container.querySelector('div.n0jPhd');
    const title = titleEl ? titleEl.textContent.trim() : '';

    const sourceEl = container.querySelector('div.MgUUmf span');
    const source = sourceEl ? sourceEl.textContent.trim() : '';

    const snippetEl = container.querySelector('div.UqSP2b');
    const snippet = snippetEl ? snippetEl.textContent.trim() : '';

    const timeEl = container.querySelector('div.OSrXXb span[data-ts]');
    const timestamp = timeEl ? timeEl.getAttribute('data-ts') : null;
    const timeText = timeEl ? timeEl.textContent.trim() : '';

    results.push({
      title,
      url: link,
      source,
      snippet,
      time: timeText,
      timestamp: timestamp ? parseInt(timestamp) : null
    });
  }

  return {query: args.query, count: results.length, results};
}
