/* @meta
{
  "name": "reddit/search",
  "description": "搜索 Reddit 帖子",
  "domain": "www.reddit.com",
  "args": {
    "query": {"required": true, "description": "Search query"},
    "subreddit": {"required": false, "description": "Limit search to a subreddit (without r/ prefix)"},
    "sort": {"required": false, "description": "Sort order: relevance (default), hot, top, new, comments"},
    "time": {"required": false, "description": "Time filter: all (default), hour, day, week, month, year"},
    "count": {"required": false, "description": "Number of results (default 25, max 100)"},
    "after": {"required": false, "description": "Fullname of the last item for pagination"}
  },
  "capabilities": ["network"],
  "readOnly": true,
  "example": "bb-browser site reddit/search \"claude code\" --sort top --time week"
}
*/

async function(args) {
  if (!args.query) return {error: 'Missing argument: query', hint: 'Provide a search query'};

  const validSorts = new Set(['relevance', 'hot', 'top', 'new', 'comments']);
  const validTimes = new Set(['all', 'hour', 'day', 'week', 'month', 'year']);
  const isNumberLike = v => /^\d+$/.test(String(v || '').trim());

  let subreddit = args.subreddit;
  let sort = args.sort;
  let time = args.time;
  let count = args.count;

  // bb-browser may shift optional flags left into positional optional args.
  if (!count && isNumberLike(time)) {
    count = time;
    time = undefined;
  }
  if (!count && isNumberLike(sort)) {
    count = sort;
    sort = undefined;
  }
  if (!count && isNumberLike(subreddit)) {
    count = subreddit;
    subreddit = undefined;
  }
  if (!time && validTimes.has(String(sort || '').trim())) {
    time = sort;
    sort = undefined;
  }
  if (!time && validTimes.has(String(subreddit || '').trim())) {
    time = subreddit;
    subreddit = undefined;
  }
  if (!sort && validSorts.has(String(subreddit || '').trim())) {
    sort = subreddit;
    subreddit = undefined;
  }

  count = Math.min(parseInt(count) || 25, 100);
  sort = sort || 'relevance';
  time = time || 'all';

  let url;
  if (subreddit) {
    url = '/r/' + subreddit + '/search.json?restrict_sr=on&q=' + encodeURIComponent(args.query);
  } else {
    url = '/search.json?q=' + encodeURIComponent(args.query);
  }
  url += '&sort=' + sort + '&t=' + time + '&limit=' + count + '&raw_json=1';
  if (args.after) url += '&after=' + args.after;

  const resp = await fetch(url, {credentials: 'include'});
  if (!resp.ok) return {error: 'HTTP ' + resp.status, hint: resp.status === 404 ? 'Subreddit not found' : 'API error'};
  const d = await resp.json();
  if (!d.data?.children) return {error: 'Unexpected response', hint: 'Reddit may be rate-limiting or returning a login page'};

  const posts = d.data.children.map(c => ({
    id: c.data.name,
    title: c.data.title,
    author: c.data.author,
    subreddit: c.data.subreddit_name_prefixed,
    score: c.data.score,
    num_comments: c.data.num_comments,
    created_utc: c.data.created_utc,
    url: c.data.url,
    permalink: 'https://www.reddit.com' + c.data.permalink,
    selftext_preview: (c.data.selftext || '').substring(0, 200),
    is_self: c.data.is_self,
    link_flair_text: c.data.link_flair_text || null
  }));

  return {
    query: args.query,
    subreddit: subreddit || null,
    sort,
    time,
    count: posts.length,
    after: d.data.after || null,
    posts
  };
}
