'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('traePet', {
  notifyRightClick: () => ipcRenderer.send('pet:right-click'),
  quit: () => ipcRenderer.send('pet:quit'),
  getPersist: () => ipcRenderer.invoke('pet:getPersist'),
});
