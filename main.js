const { app, BrowserWindow, ipcMain, shell } = require("electron");
const rfs = require("rotating-file-stream");
const path = require("path");
const { mkdir, appendFile } = require("fs/promises");

const { initializeDB } = require("./database.js");

const { Twitter } = require("./api/Twitter/index.js");
const { BlueSky } = require("./api/Bluesky/index.js");

require("dotenv").config();

const db = initializeDB();

// Creates and manages app windows
// In Electron, BrowserWindows can only be created after the app module's ready event is fired.
// You can wait for this event by using the app.whenReady() API and calling createWindow() once its promise is fulfilled.
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); // Abre no navegador padrão
    return { action: "deny" }; // Impede que o Electron tente abrir internamente
  });
}

/* 
  Loga mensagens de erro no diretório de 
  logs do sistema operacional do usuário. 
  Geralmente 'AppData/Local'
*/
async function logger(message) {
  try {
    const username = process.env.USER || process.env.USERNAME;
    const logDir = `C:/Users/${username}/AppData/Local/Alloy/Logs/`;

    // Garante que a pasta de logs existe
    await mkdir(logDir, { recursive: true });

    const logStream = rfs.createStream("alloy.log", {
      compress: "gzip",
      path: logDir,
      maxSize: "10M",
      maxFiles: 14,
      interval: "14d",
    });
    // Formata a mensagem do log com timestamp
    const logMessage = `[${new Date().toISOString()}] ${JSON.stringify(
      message
    )}\n`;

    // Adiciona a mensagem ao arquivo de log
    logStream.write(logMessage);

    console.log("Log gravado:", logMessage.trim());
  } catch (err) {
    console.error("Erro ao gravar o log:", err);
  }
}

/* Chama a função 'logger' */
ipcMain.handle("logger", (event, message) => logger(message));

/* Abre links externos */
ipcMain.handle("open-external-link", async (event, url) => {
  await shell.openExternal(url);
});

/* 
  Listen for 'get-profiles' event.
  Return all profiles from db.
*/
ipcMain.handle("get-profiles", () => {
  return db.prepare("SELECT * FROM profiles").all();
});

/* 
  Listen for 'add-profile' event.
  Receives data from the frontend
  (plataform, username) and saves it
  into the database.
*/
ipcMain.handle("add-profile", (event, { platform, formatUsername }) => {
  try {
    db.prepare("INSERT INTO profiles (platform, username) VALUES (?, ?)").run(
      platform,
      formatUsername
    );
  } catch (err) {
    console.error("Algo aconteceu ao gravar dados no banco de dados", err);
    logger(err);
  }
});

/* 
  Listen for 'remove-profile' event.
  Receives data from the frontend
  (plataform, username) and delete user
  from the database.
*/
ipcMain.handle("remove-profile", (event, { platform, username }) => {
  db.prepare("DELETE FROM profiles WHERE platform = ? AND username = ?").run(
    platform,
    username
  );
});

/* Handles Twitter API */
ipcMain.handle(
  "get-twitter-posts",
  async (event, username) => await Twitter(username)
);

/* Handles BlueSky API */
ipcMain.handle(
  "get-bsky-posts",
  async (event, username) => await BlueSky(username)
);

// Initialize app (controls application's event lifecycle)
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Close app on Windows and Linux
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

module.exports = app;
