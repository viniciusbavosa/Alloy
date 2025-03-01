const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  logger: (message) => ipcRenderer.invoke("logger", message),
  openExternalLink: (url) => ipcRenderer.invoke("open-external-link", url),
  getProfiles: () => ipcRenderer.invoke("get-profiles"),
  addProfile: (profile) => ipcRenderer.invoke("add-profile", profile),
  removeProfile: (profile) => ipcRenderer.invoke("remove-profile", profile),
  //prettier-ignore
  getTwitterPosts: async (username) => await ipcRenderer.invoke("get-twitter-posts", username),
  //prettier-ignore
  getBSkyPosts: async (username) => await ipcRenderer.invoke("get-bsky-posts", username),
});
