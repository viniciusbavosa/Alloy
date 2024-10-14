import { app, BrowserWindow } from "electron";

// Creates and manages app windows
// In Electron, BrowserWindows can only be created after the app module's ready event is fired.
// You can wait for this event by using the app.whenReady() API and calling createWindow() once its promise is fulfilled.
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  });

  win.loadFile('index.html');
};

// Initialize app (controls application's event lifecycle)
app.whenReady()
  .then(() => createWindow());