'use strict';

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const { startServer } = require('./server');

let win = null;
let tray = null;
let alwaysOnTop = true;

function toggleAlwaysOnTop() {
  alwaysOnTop = !alwaysOnTop;
  if (win) win.setAlwaysOnTop(alwaysOnTop);
  if (tray) tray.setToolTip(alwaysOnTop ? 'trae-pet（已置顶）' : 'trae-pet（未置顶）');
  return alwaysOnTop;
}

function showContextMenu() {
  const menu = Menu.buildFromTemplate([
    { label: '切换置顶', type: 'checkbox', checked: alwaysOnTop, click: () => toggleAlwaysOnTop() },
    { label: '重新加载', click: () => win && win.reload() },
    { label: '打开浏览器版', click: () => { if (win) win.loadURL('http://localhost:8787/'); } },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  menu.popup({ window: win });
}

function createWindow(url) {
  win = new BrowserWindow({
    width: 220,
    height: 260,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(url);
  win.on('closed', () => { win = null; });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('trae-pet');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示宠物', click: () => { if (win) { win.show(); } } },
    { label: '切换置顶', click: () => toggleAlwaysOnTop() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]));
  tray.on('double-click', () => { if (win) { win.show(); } });
}

ipcMain.handle('pet:getPersist', () => ({ alwaysOnTop }));
ipcMain.on('pet:right-click', () => showContextMenu());
ipcMain.on('pet:quit', () => app.quit());

app.whenReady().then(async () => {
  const { port } = await startServer();
  const baseUrl = `http://localhost:${port}`;
  createWindow(baseUrl + '/desktop.html');
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(baseUrl + '/desktop.html');
    }
  });
});
