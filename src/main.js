'use strict';
/**
 * trae-pet（macOS 菜单栏宠物）
 * 宠物常驻系统菜单栏，点击托盘图标弹出宠物面板，根据 TraeCode Hook 状态实时反馈。
 */
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const { startServer } = require('./server');

let win = null;
let tray = null;
let baseUrl = '';
let alwaysOnTop = true;
let isQuitting = false;

const PANEL = { width: 320, height: 400 };

function toggleAlwaysOnTop() {
  alwaysOnTop = !alwaysOnTop;
  if (win) win.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
  return alwaysOnTop;
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: '显示 / 隐藏宠物', click: () => toggleWindow() },
    { label: '切换置顶', type: 'checkbox', checked: alwaysOnTop, click: () => toggleAlwaysOnTop() },
    { label: '重新加载', click: () => win && win.reload() },
    { label: '打开浏览器版', click: () => { openBrowser(); } },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } },
  ]);
}

function openBrowser() {
  // 用系统默认浏览器打开宠物面板
  require('child_process').exec(`open '${baseUrl}/desktop.html'`);
}

function positionPanel() {
  const winBounds = win.getBounds();
  const trayBounds = tray.getBounds();
  const display =
    screen.getDisplayMatching(
      trayBounds.x || trayBounds.width
        ? trayBounds
        : { x: 0, y: 0, width: 1, height: 1 }
    );
  const wa = display.workArea;
  // macOS 菜单栏在顶部：面板贴菜单栏下方，水平对齐托盘图标
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
  let y = Math.round(wa.y + 8);
  x = Math.max(wa.x + 8, Math.min(x, wa.x + wa.width - winBounds.width - 8));
  win.setPosition(x, y, false);
}

function showWindow() {
  if (!win) createWindow();
  positionPanel();
  win.show();
  win.focus();
}

function hideWindow() {
  if (win && win.isVisible()) win.hide();
}

function toggleWindow() {
  if (win && win.isVisible()) hideWindow();
  else showWindow();
}

function createWindow() {
  win = new BrowserWindow({
    width: PANEL.width,
    height: PANEL.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
  win.loadURL(baseUrl + '/desktop.html');
  win.hide();
  // 失焦自动收起（菜单栏面板的常见行为）
  win.on('blur', () => { if (!isQuitting) hideWindow(); });
  win.on('closed', () => { win = null; });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'pet-tray.png'));
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip('trae-pet');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => toggleWindow());
  tray.on('right-click', () => tray.popUpContextMenu(buildTrayMenu()));
}

// ---- IPC ----
ipcMain.handle('pet:getPersist', () => ({ alwaysOnTop }));
ipcMain.on('pet:panel-close', () => hideWindow());
ipcMain.on('pet:quit', () => { isQuitting = true; app.quit(); });
ipcMain.on('pet:open-browser', () => openBrowser());

// 单实例：避免重复启动多个宠物
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());

  // macOS：隐藏 Dock 图标，做成纯菜单栏应用
  if (process.platform === 'darwin' && app.dock) app.dock.hide();

  app.whenReady().then(async () => {
    const { port } = await startServer();
    baseUrl = `http://localhost:${port}`;
    createWindow();
    createTray();
    app.on('activate', showWindow);
  });

  app.on('before-quit', () => { isQuitting = true; });
  app.on('window-all-closed', () => { /* 菜单栏应用常驻，不退出 */ });
}