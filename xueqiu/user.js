/* @meta
{
  "name": "xueqiu/user",
  "description": "获取雪球用户动态（默认段永平 1247347556）",
  "domain": "xueqiu.com",
  "args": {
    "user_id": {"required": false, "description": "雪球用户 ID，默认 1247347556（段永平）"},
    "count": {"required": false, "description": "返回数量，默认 20，最大 40"}
  },
  "readOnly": true,
  "example": "bb-browser site xueqiu/user 1247347556 20"
}
*/

async function(args) {
  var userId = String(args.user_id || '1247347556');
  var count = Math.min(parseInt(args.count) || 20, 40);

  var resp = await fetch('https://xueqiu.com/v4/statuses/user_timeline.json?user_id=' + userId + '&page=1', {credentials: 'include'});
  if (!resp.ok) return {error: 'HTTP ' + resp.status, hint: 'Not logged in to xueqiu?'};
  var d = await resp.json();

  var strip = function(html) {
    return (html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  };

  var list = d.list || d.statuses || [];
  var items = list.slice(0, count).map(function(item) {
    var user = item.user || {};
    var text = strip(item.description || item.text || item.title);
    // 转发动态：补充原文摘要
    var retweeted = item.retweeted_status;
    if (retweeted) {
      var rtUser = retweeted.user || {};
      text += ' // @' + (rtUser.screen_name || '') + ': ' + strip(retweeted.description || retweeted.text || '').substring(0, 120);
    }
    return {
      id: item.id,
      text: text.substring(0, 300),
      url: 'https://xueqiu.com/' + user.id + '/' + item.id,
      author: user.screen_name,
      author_id: user.id,
      verified: user.verified_description || null,
      likes: item.fav_count,
      retweets: item.retweet_count,
      replies: item.reply_count,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null
    };
  });

  return {user_id: userId, count: items.length, items: items};
}
