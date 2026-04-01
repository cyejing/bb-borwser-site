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

  const runtimeKey = '__bbTwitterSearchRuntime';
  const runtime = window[runtimeKey] || (window[runtimeKey] = {
    webpackRequire: null,
    txGenerator: null,
    txGeneratorModuleId: null,
    queryId: 'GcXk9vN_d1jUfHNqLacXQA',
    cacheVersion: 1
  });

  const bearer = decodeURIComponent('AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA');
  const defaultFeatures = {
    rweb_video_screen_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    responsive_web_profile_redirect_enabled: false,
    rweb_tipjar_consumption_enabled: false,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: true,
    responsive_web_grok_share_attachment_enabled: true,
    responsive_web_grok_annotations_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    content_disclosure_indicator_enabled: true,
    content_disclosure_ai_generated_indicator_enabled: true,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    post_ctas_fetch_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: false,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_grok_imagine_annotation_enabled: true,
    responsive_web_grok_community_note_auto_translation_is_enabled: false,
    responsive_web_enhance_cards_enabled: false
  };

  function getWebpackRequire() {
    if (runtime.webpackRequire) return runtime.webpackRequire;
    try {
      let localRequire = null;
      const chunkId = '__bb_search_runtime__' + Date.now() + '_' + Math.random().toString(36).slice(2);
      window.webpackChunk_twitter_responsive_web.push([[chunkId], {}, (req) => { localRequire = req; }]);
      if (localRequire) runtime.webpackRequire = localRequire;
      return runtime.webpackRequire;
    } catch (_) {}
    return null;
  }

  function discoverSearchOperation(req) {
    const ids = Object.keys(req?.m || {});
    for (const id of ids) {
      try {
        const mod = req(id);
        if (mod?.operationName === 'SearchTimeline' && mod?.queryId) return mod;
      } catch (_) {}
    }
    return null;
  }

  function discoverTransactionIdGenerator(req) {
    if (runtime.txGenerator) return runtime.txGenerator;

    if (runtime.txGeneratorModuleId != null) {
      try {
        const fn = req?.(runtime.txGeneratorModuleId)?.jJ;
        if (typeof fn === 'function') {
          runtime.txGenerator = fn;
          return fn;
        }
      } catch (_) {}
    }

    const preferred = [938838, 83914];
    for (const id of preferred) {
      try {
        const fn = req?.(id)?.jJ;
        if (typeof fn === 'function') {
          runtime.txGenerator = fn;
          runtime.txGeneratorModuleId = id;
          return fn;
        }
      } catch (_) {}
    }

    const ids = Object.keys(req?.m || {});
    for (const id of ids) {
      try {
        const mod = req(id);
        const fn = mod?.jJ;
        if (typeof fn !== 'function') continue;
        const src = String(fn);
        if (src.includes('x-client-transaction-id') || src.includes('btoa(`e:${e}`)')) {
          runtime.txGenerator = fn;
          runtime.txGeneratorModuleId = id;
          return fn;
        }
      } catch (_) {}
    }
    return null;
  }

  function invalidateRuntime(options) {
    if (options?.queryId) runtime.queryId = 'GcXk9vN_d1jUfHNqLacXQA';
    if (options?.tx) {
      runtime.txGenerator = null;
      runtime.txGeneratorModuleId = null;
    }
    if (options?.webpack) runtime.webpackRequire = null;
  }

  async function getTransactionId(path, allowDiscovery) {
    const req = getWebpackRequire();
    if (!req) return null;

    const txGenerator = discoverTransactionIdGenerator(req);
    if (typeof txGenerator === 'function') {
      try {
        return await txGenerator('x.com', path, 'GET');
      } catch (_) {
        invalidateRuntime({tx: true});
      }
    }

    if (!allowDiscovery) return null;
    invalidateRuntime({webpack: true, tx: true});
    const freshReq = getWebpackRequire();
    const freshGenerator = discoverTransactionIdGenerator(freshReq);
    if (typeof freshGenerator !== 'function') return null;
    try {
      return await freshGenerator('x.com', path, 'GET');
    } catch (_) {
      invalidateRuntime({tx: true});
      return null;
    }
  }

  function buildVariables(product, count) {
    return JSON.stringify({
      rawQuery: args.query,
      count,
      querySource: 'typed_query',
      product,
      withGrokTranslatedBio: false
    });
  }

  function buildHeaders(path, txId, referer) {
    const headers = {
      'Authorization': 'Bearer ' + bearer,
      'X-Csrf-Token': ct0,
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'X-Twitter-Active-User': 'no',
      'X-Twitter-Client-Language': (navigator.language || 'en').toLowerCase(),
      'Content-Type': 'application/json',
      'Referer': referer
    };
    if (txId) headers['X-Client-Transaction-Id'] = txId;
    return headers;
  }

  async function fetchWithTimeout(url, headers) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      return await fetch(url, {headers, credentials: 'include', signal: ctrl.signal});
    } catch (error) {
      if (error && error.name === 'AbortError') {
        return {timeout: true};
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function parseTweets(d) {
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
        tweets.push({
          id: tw.rest_id,
          author: screenName,
          name: u?.legacy?.name || u?.core?.name,
          url: 'https://x.com/' + (screenName || '_') + '/status/' + tw.rest_id,
          text: nt || l.full_text || '',
          likes: l.favorite_count,
          retweets: l.retweet_count,
          in_reply_to: l.in_reply_to_status_id_str || undefined,
          created_at: l.created_at
        });
      }
    }
    return tweets;
  }

  async function executeSearch(forceRefresh) {
    const count = Math.min(parseInt(args.count) || 20, 50);
    const product = (args.type === 'top') ? 'Top' : 'Latest';

    if (forceRefresh) {
      invalidateRuntime({queryId: true, tx: true, webpack: true});
      const req = getWebpackRequire();
      const op = discoverSearchOperation(req);
      if (op?.queryId) runtime.queryId = op.queryId;
    }

    const path = '/i/api/graphql/' + runtime.queryId + '/SearchTimeline';
    const txId = await getTransactionId(path, !forceRefresh);
    const variables = buildVariables(product, count);
    const features = JSON.stringify(defaultFeatures);
    const referer = 'https://x.com/search?q=' + encodeURIComponent(args.query) + '&src=typed_query&f=' + (product === 'Top' ? 'top' : 'live');
    const url = path + '?variables=' + encodeURIComponent(variables) + '&features=' + encodeURIComponent(features);
    const resp = await fetchWithTimeout(url, buildHeaders(path, txId, referer));

    if (resp && resp.timeout) return {error: 'Request timed out', hint: 'SearchTimeline did not respond within 8 seconds'};
    if (!resp.ok) {
      return {
        error: 'HTTP ' + resp.status,
        hint: resp.status === 400 || resp.status === 404 ? 'SearchTimeline query id or request contract may have changed' : 'Search request failed'
      };
    }

    const d = await resp.json();
    const tweets = parseTweets(d);
    if (!d.data?.search_by_raw_query?.search_timeline?.timeline?.instructions) {
      return {error: 'Unexpected response payload', hint: 'SearchTimeline returned an unexpected shape'};
    }

    return {query: args.query, product, count: tweets.length, tweets};
  }

  let result = await executeSearch(false);
  if (result && result.error && /query id|contract/i.test(result.hint || '')) {
    result = await executeSearch(true);
  }
  if (result && result.error) return result;

  return result;
}
