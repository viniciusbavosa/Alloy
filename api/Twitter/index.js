async function Twitter(username) {
  const twitterErrors = [];
  const twitterLimits = [];

  /* 
    App token da API do X
  */
  const appToken = process.env.TWITTER_BEARER_TOKEN;

  async function getUserID() {
    const endpointURL = `https://api.twitter.com/2/users/by/username/${username}`;

    const options = {
      method: "GET",
      headers: {
        "User-Agent": "v2UserLookupJS",
        authorization: `Bearer ${appToken}`,
      },
    };

    const response = await fetch(endpointURL, options);

    !response.ok &&
      twitterErrors.push({
        status: response.status,
        message: `[${response.statusText}] at getUserId function`,
        waitTime: response.headers.get("X-Rate-Limit-Reset"),
        platform: "twitter",
      });

    const { data } = response.ok && (await response.json());

    if (!data) return;

    return data.id;
  }

  async function getUserPosts() {
    const userID = await getUserID();

    if (!userID) return { twitterErrors, twitterLimits };

    const url = `https://api.twitter.com/2/users/${userID}/tweets`;

    const options = {
      method: "GET",
      headers: {
        "User-Agent": "v2UserTweetsJS",
        authorization: `Bearer ${appToken}`,
      },
    };

    const response = await fetch(url, options);

    twitterLimits.push({
      remaining: response.headers.get("X-Rate-Limit-Remaining"),
      message: `Você ainda pode buscar ${response.headers.get(
        "X-Rate-Limit-Remaining"
      )} perfis no Twitter.`,
      platform: "twitter",
    });

    !response.ok &&
      twitterErrors.push({
        status: response.status,
        message: `[${response.statusText}] at getUserPosts function`,
        waitTime: response.headers.get("X-Rate-Limit-Reset"),
        platform: "twitter",
      });

    /* 
      Posts do usuário
    */
    const { data } = response.ok && (await response.json());

    return {
      twitterErrors,
      twitterLimits,
      data: data ? data : null,
    };
  }

  /* 
    Retorna um objeto contendo os posts do usuário e
    erros se houver
  */
  return await getUserPosts();
}

module.exports = { Twitter };
