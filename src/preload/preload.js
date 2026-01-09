// Preload script - Plain JavaScript (not TypeScript) to avoid webpack bundling issues
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('truly', {
    getApiKey: function () {
        return ipcRenderer.invoke('get-api-key');
    },
    setApiKey: function (key) {
        return ipcRenderer.invoke('set-api-key', key);
    },
    captureScreen: function (mode) {
        return ipcRenderer.invoke('capture-screen', mode);
    },
    askGemini: function (question, screenshot) {
        return ipcRenderer.invoke('ask-gemini', question, screenshot);
    },
    hideOverlay: function () {
        ipcRenderer.send('hide-overlay');
    },
    notifyAnalysisComplete: function () {
        ipcRenderer.send('analysis-complete');
    },
    setIgnoreMouseEvents: function (ignore) {
        ipcRenderer.send('set-ignore-mouse-events', ignore);
    },
    onTriggerCapture: function (callback) {
        ipcRenderer.on('trigger-capture', callback);
    },
    onOpenSettings: function (callback) {
        ipcRenderer.on('open-settings', callback);
    },
    onClickThroughChanged: function (callback) {
        ipcRenderer.on('click-through-changed', callback);
    },
    removeAllListeners: function (channel) {
        ipcRenderer.removeAllListeners(channel);
    }
});
