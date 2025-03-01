const { AtpAgent } = require("@atproto/api");

async function BlueSky(username) {
  const bskyErrors = [];

  const agent = new AtpAgent({
    service: "https://bsky.social",
  });

  await agent.login({
    identifier: process.env.BLUESKY_HANDLER,
    password: process.env.BLUESKY_PASSWORD,
  });

  async function getUserDID() {
    try {
      const { data } = await agent.resolveHandle({ handle: username });

      return data.did;
    } catch (err) {
      bskyErrors.push({
        status: err.status,
        message: err.error,
        platform: "bluesky",
      });
    }
  }

  async function getUserPosts() {
    try {
      const userID = await getUserDID();

      if (!userID) return;

      const { data } = await agent.getAuthorFeed({
        actor: userID,
        filter: "posts_no_replies",
        limit: 10,
      });

      const { feed } = data;

      return feed;
    } catch (err) {
      bskyErrors.push({
        status: err.status,
        message: err.error,
        platform: "bluesky",
      });
    }
  }

  return {
    feed: await getUserPosts(),
    bskyErrors,
  };
}

module.exports = { BlueSky };
