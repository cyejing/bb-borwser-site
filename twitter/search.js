/* @meta
{
  "name": "twitter/search",
  "description": "搜索推文",
  "domain": "x.com",
  "args": {
    "query": {"required": true, "description": "Search query"},
    "count": {"required": false, "description": "Number of results (default 20, max 50)"},
    "type": {"required": false, "description": "Result type: latest (default) or top"}
  },
  "capabilities": ["network"],
  "readOnly": true,
  "example": "bb-browser site twitter/search \"claude code\""
}
*/

async function(args) {
  if (!args.query) return {error: 'Missing argument: query', hint: 'Provide a search query'};
  const ct0 = document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('ct0='))?.split('=')[1];
  if (!ct0) return {error: 'No ct0 cookie', hint: 'Please log in to https://x.com first.'};

  function getWebpackRequire() {
    try {
      let __webpack_require__;
      const chunkId = '__bb_s_' + Date.now();
      window.webpackChunk_twitter_responsive_web.push([[chunkId], {}, (req) => { __webpack_require__ = req; }]);
      return __webpack_require__;
    } catch (_) {}
    return null;
  }

  function getSearchOperation(req) {
    const ids = Object.keys(req?.m || {});
    for (const id of ids) {
      try {
        const mod = req(id);
        if (mod?.operationName === 'SearchTimeline' && mod?.queryId) return mod;
      } catch (_) {}
    }
    return null;
  }

  function getTransactionIdGenerator(req) {
    const preferred = [938838, 83914];
    for (const id of preferred) {
      try {
        const fn = req?.(id)?.jJ;
        if (typeof fn === 'function') return fn;
      } catch (_) {}
    }
    const ids = Object.keys(req?.m || {});
    for (const id of ids) {
      try {
        const mod = req(id);
        const fn = mod?.jJ;
        if (typeof fn !== 'function') continue;
        const src = String(fn);
        if (src.includes('x-client-transaction-id') || src.includes('btoa(`e:${e}`)')) return fn;
      } catch (_) {}
    }
    return null;
  }

  async function getTransactionId(req, path) {
    try {
      const genTxId = getTransactionIdGenerator(req);
      if (typeof genTxId === 'function') return await genTxId('x.com', path, 'GET');
    } catch (_) {}
    return null;
  }

  const bearer = decodeURIComponent('AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA');
  const req = getWebpackRequire();
  const op = getSearchOperation(req);
  const queryId = op?.queryId || 'GcXk9vN_d1jUfHNqLacXQA';
  const path = '/i/api/graphql/' + queryId + '/SearchTimeline';
  const txId = await getTransactionId(req, path);

  const _h = {
    'Authorization': 'Bearer ' + bearer, 'X-Csrf-Token': ct0,
    'X-Twitter-Auth-Type': 'OAuth2Session', 'X-Twitter-Active-User': 'yes'
  };
  if (txId) _h['X-Client-Transaction-Id'] = txId;

  const count = Math.min(parseInt(args.count) || 20, 50);
  const product = (args.type === 'top') ? 'Top' : 'Latest';
  const variables = JSON.stringify({
    rawQuery: args.query,
    count,
    querySource: 'typed_query',
    product,
    withGrokTranslatedBio: product === 'Top' || product === 'People' ? false : undefined
  });
  const features = JSON.stringify({
    rweb_video_screen_enabled: false, profile_label_improvements_pcf_label_in_post_enabled: true,
    responsive_web_profile_redirect_enabled: false, rweb_tipjar_consumption_enabled: false,
    verified_phone_label_enabled: false, creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false, communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true, responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true, longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    content_disclosure_indicator_enabled: true, content_disclosure_ai_generated_indicator_enabled: true,
    freedom_of_speech_not_reach_fetch_enabled: true, standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true, longform_notetweets_inline_media_enabled: false,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: true,
    responsive_web_grok_share_attachment_enabled: true,
    responsive_web_grok_annotations_enabled: true,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    post_ctas_fetch_enabled: true,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_grok_imagine_annotation_enabled: true,
    responsive_web_grok_community_note_auto_translation_is_enabled: false,
    responsive_web_enhance_cards_enabled: false
  });
  const url = path + '?variables=' + encodeURIComponent(variables) + '&features=' + encodeURIComponent(features);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const resp = await fetch(url, {headers: _h, credentials: 'include', signal: ctrl.signal}).finally(() => clearTimeout(timer));
  if (!resp.ok) return {error: 'HTTP ' + resp.status, hint: 'queryId may have changed'};
  const d = await resp.json();

  const instructions = d.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || [];
  let tweets = [];
  for (const inst of instructions) {
    for (const entry of (inst.entries || [])) {
      const r = entry.content?.itemContent?.tweet_results?.result;
      if (!r) continue;
      const tw = r.tweet || r;
      const l = tw.legacy || {};
      if (!tw.rest_id) continue;
      const u = tw.core?.user_results?.result;
      const nt = tw.note_tweet?.note_tweet_results?.result?.text;
      const screenName = u?.legacy?.screen_name || u?.core?.screen_name;
      tweets.push({id: tw.rest_id, author: screenName,
        name: u?.legacy?.name || u?.core?.name,
        url: 'https://x.com/' + (screenName || '_') + '/status/' + tw.rest_id,
        text: nt || l.full_text || '', likes: l.favorite_count, retweets: l.retweet_count,
        in_reply_to: l.in_reply_to_status_id_str || undefined, created_at: l.created_at});
    }
  }

  return {query: args.query, product, count: tweets.length, tweets};
}
