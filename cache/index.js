export default function Cache() {
  const cacheErrors = [];

  const setCache = ({ platform, username, posts }) => {
    if (!platform || !username || !posts)
      cacheErrors.push({ status: "ERRORDATACACHED" });

    localStorage.setItem(
      `${platform.concat(`-${username}`)}`,
      JSON.stringify(posts)
    );
  };

  const getCache = (platform, username) => {
    if (!platform || !username) cacheErrors.push({ status: "ERRORGETCACHE" });
    return JSON.parse(
      localStorage.getItem(`${platform.concat(`-${username}`)}`)
    );
  };

  const deleteCache = (platform, username) => {
    if (!platform || !username)
      cacheErrors.push({ status: "ERRORDELETECACHE" });

    localStorage.removeItem(`${platform.concat(`-${username}`)}`);
  };

  const isCached = (platform, username) => {
    if (!platform || !username) cacheErrors.push({ status: "ERRORCHECKCACHE" });

    if (!localStorage.getItem(`${platform.concat(`-${username}`)}`)) {
      return false;
    } else {
      return true;
    }
  };

  const clearCache = () => {
    localStorage.clear();
  };

  return {
    cacheErrors,
    setCache,
    getCache,
    deleteCache,
    isCached,
    clearCache,
  };
}
