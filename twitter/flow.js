/* @meta
{
  "name": "twitter/flow",
  "description": "关注一个 Twitter/X 用户",
  "domain": "x.com",
  "args": {
    "screen_name": {"required": true, "description": "Twitter handle (without @), or profile URL"}
  },
  "capabilities": ["network"],
  "readOnly": false,
  "example": "bb-browser site twitter/flow AnthropicAI"
}
*/

async function(args) {
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function parseHandle(input) {
    if (!input) return '';
    const raw = String(input).trim();
    const urlMatch = raw.match(/x\.com\/([^/?#]+)|twitter\.com\/([^/?#]+)/i);
    const handle = (urlMatch?.[1] || urlMatch?.[2] || raw).replace(/^@/, '').trim();
    return handle.replace(/\/+$/, '');
  }

  async function waitFor(predicate, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const value = predicate();
      if (value) return value;
      await sleep(250);
    }
    return null;
  }

  function getAuthHeaders(ct0) {
    const bearer = decodeURIComponent('AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA');
    return {
      'Authorization': 'Bearer ' + bearer,
      'X-Csrf-Token': ct0,
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'X-Twitter-Active-User': 'yes'
    };
  }

  function getUserProfile(user, fallbackHandle) {
    const legacy = user?.legacy || {};
    const core = user?.core || {};
    return {
      id: user?.rest_id,
      legacy,
      name: legacy.name || core.name,
      screenName: legacy.screen_name || core.screen_name || fallbackHandle,
      bio: legacy.description,
      following: user?.following ?? legacy.following ?? core.following
    };
  }

  async function getUser(screenName, headers) {
    const variables = JSON.stringify({screen_name: screenName, withSafetyModeUserFields: true});
    const features = JSON.stringify({
      hidden_profile_subscriptions_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true
    });
    const url = '/i/api/graphql/pLsOiyHJ1eFwPJlNmLp4Bg/UserByScreenName?variables=' + encodeURIComponent(variables) + '&features=' + encodeURIComponent(features);
    const resp = await fetch(url, {headers, credentials: 'include'});
    if (!resp.ok) return {error: 'Failed to resolve user: HTTP ' + resp.status};
    const data = await resp.json();
    const user = data.data?.user?.result;
    if (!user?.rest_id) return {error: 'User not found', hint: 'Check spelling: @' + screenName};
    return {user};
  }

  async function followByApi(screenName, userId, headers) {
    const body = new URLSearchParams({
      screen_name: screenName,
      user_id: userId,
      include_profile_interstitial_type: '1',
      include_blocking: '1',
      include_blocked_by: '1',
      include_followed_by: '1',
      include_want_retweets: '1',
      include_mute_edge: '1',
      include_can_dm: '1',
      include_can_media_tag: '1',
      include_ext_is_blue_verified: '1',
      include_ext_verified_type: '1',
      include_ext_profile_image_shape: '1',
      skip_status: '1'
    });
    const resp = await fetch('/i/api/1.1/friendships/create.json', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      credentials: 'include',
      body: body.toString()
    });
    if (!resp.ok) {
      let details = '';
      try {
        const text = await resp.text();
        details = text ? ': ' + text.slice(0, 200) : '';
      } catch (_) {}
      return {error: 'HTTP ' + resp.status + details};
    }
    const data = await resp.json().catch(() => null);
    return {data};
  }

  function isFollowingButton(button) {
    const text = (button?.innerText || button?.textContent || '').replace(/\s+/g, ' ').trim();
    const label = (button?.getAttribute?.('aria-label') || '').trim();
    const merged = (text + ' ' + label).trim();
    return /(Following|Requested|Unfollow|已关注|已请求|取消关注|正在关注)/i.test(merged);
  }

  function isFollowButton(button) {
    const text = (button?.innerText || button?.textContent || '').replace(/\s+/g, ' ').trim();
    const label = (button?.getAttribute?.('aria-label') || '').trim();
    const merged = (text + ' ' + label).trim();
    if (!merged) return false;
    if (isFollowingButton(button)) return false;
    return /(^|\s)(Follow|关注)($|\s)/i.test(merged);
  }

  function findProfileFollowButton() {
    const primary = document.querySelector('[data-testid="primaryColumn"]') || document;
    const buttons = Array.from(primary.querySelectorAll('button, [role="button"]'));
    for (const button of buttons) {
      if (isFollowButton(button)) return button;
    }
    return null;
  }

  function findProfileFollowingButton() {
    const primary = document.querySelector('[data-testid="primaryColumn"]') || document;
    const buttons = Array.from(primary.querySelectorAll('button, [role="button"]'));
    for (const button of buttons) {
      if (isFollowingButton(button)) return button;
    }
    return null;
  }

  async function followByDom(screenName) {
    const targetUrl = 'https://x.com/' + screenName;
    if (!location.href.startsWith(targetUrl)) {
      location.href = targetUrl;
      await sleep(1500);
    }

    const button = await waitFor(() => findProfileFollowButton() || (findProfileFollowingButton() ? 'already' : null), 12000);
    if (!button) return {error: 'Profile page not ready', hint: 'Open https://x.com/' + screenName + ' and retry'};
    if (button === 'already') return {action: 'already_following'};

    button.click();
    await sleep(1500);

    const after = findProfileFollowButton();
    if (!after) {
      const followingState = await waitFor(() => findProfileFollowingButton(), 5000);
      if (followingState) return {action: 'followed'};
    }
    if (after && isFollowButton(after)) return {error: 'Follow button click did not take effect', hint: 'Account may require confirmation or the page layout changed'};
    return {action: 'followed'};
  }

  const screenName = parseHandle(args.screen_name);
  if (!screenName) return {error: 'Missing argument: screen_name', hint: 'Provide a Twitter handle such as AnthropicAI'};

  const ct0 = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('ct0='))?.split('=')[1];
  if (!ct0) return {error: 'No ct0 cookie', hint: 'Please log in to https://x.com first.'};

  const headers = getAuthHeaders(ct0);
  const resolved = await getUser(screenName, headers);
  if (resolved.error) return resolved;

  const user = resolved.user;
  const profile = getUserProfile(user, screenName);
  if (profile.following) {
    return {
      action: 'already_following',
      id: profile.id,
      screen_name: profile.screenName,
      name: profile.name,
      url: 'https://x.com/' + profile.screenName
    };
  }

  const apiResult = await followByApi(profile.screenName, profile.id, headers);
  if (!apiResult.error) {
    const followed = apiResult.data || {};
    return {
      action: followed.following ? 'followed' : 'requested',
      id: followed.id_str || profile.id,
      screen_name: followed.screen_name || profile.screenName,
      name: followed.name || profile.name,
      following: !!followed.following,
      url: 'https://x.com/' + (followed.screen_name || profile.screenName)
    };
  }

  const domResult = await followByDom(profile.screenName);
  if (domResult.error) {
    return {
      error: 'Follow failed via API and DOM fallback',
      hint: apiResult.error + '; ' + domResult.error
    };
  }

  return {
    action: domResult.action,
    id: profile.id,
    screen_name: profile.screenName,
    name: profile.name,
    url: 'https://x.com/' + profile.screenName
  };
}
