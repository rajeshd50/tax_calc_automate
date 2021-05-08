/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { EVENTS } from './constants/events';
import TaxProcessor from './processor/processor'
const sqlite3 = require('sqlite3')

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let mainProcessor: TaxProcessor | null = null;

let userDataFolder = app.getPath('userData')

let dbFolderPath = path.join(userDataFolder, 'tax_calculator_excel')
let dbFilePath = path.join(userDataFolder, 'tax_calculator_excel', 'db_v1.db')

if (!fs.existsSync(dbFolderPath)) {
  fs.mkdirSync(dbFolderPath)
}
if (!fs.existsSync(dbFilePath)) {
  let fd = fs.openSync(dbFilePath, 'w')
  fs.closeSync(fd)
}

const db = new sqlite3.Database(dbFilePath);

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS process_data (gstin TEXT, process_id TEXT, name TEXT, cgst REAL, sgst REAL, cesc REAL, year INTEGER)');
})
db.close()

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  mainWindow.setMenu(null)

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  mainProcessor = new TaxProcessor(mainWindow)


  ipcMain.on(EVENTS.OPEN_SOURCE_CHOOSER, async (event, args) => {
    if (mainWindow) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      })
      event.reply(EVENTS.OPEN_SOURCE_CHOOSER_RESULT, result)
    }
  })
  ipcMain.on(EVENTS.OPEN_DESTINATION_CHOOSER, async (event, args) => {
    if (mainWindow) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      })
      event.reply(EVENTS.OPEN_DESTINATION_CHOOSER_RESULT, result)
    }
  })
  ipcMain.on(EVENTS.START_PROCESSING,  async (event, args) => {
    mainProcessor?.startProcessing(args.input, args.output);
  })
  ipcMain.on(EVENTS.CANCEL_PROCESSING,  async (event, args) => {
    mainProcessor?.stopProcessing();
  })

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});