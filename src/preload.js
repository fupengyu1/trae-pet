'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('traePet', {
  getPersist: () => ipcRenderer.invoke('pet:getPersist'),
  closePanel: () => ipcRenderer.send('pet:panel-close'),
  openBrowser: () => ipcRenderer.send('pet:open-browser'),
  quit: () => ipcRenderer.send('pet:quit'),
});