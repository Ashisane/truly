/**
 * Truly - Main Process
 * With hide-from-capture and smart AI prompts
 */
import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, screen, desktopCapturer } from 'electron';

declare const OVERLAY_WINDOW_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const settings = {
    geminiApiKey: '',
    position: { x: -1, y: -1 },
    size: { width: 420, height: 480 },
};

let overlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isVisible = false;

// Smart system prompt for auto-deducing what user needs help with
const SYSTEM_PROMPT = `You are an intelligent screen assistant. Analyze the screenshot and determine what the user likely needs help with.

Guidelines:
- If it's a quiz/test question: Identify the question and provide the correct answer with brief explanation
- If it's code with an error: Explain the error and how to fix it  
- If it's a form or application: Explain what needs to be filled in
- If it's a document: Summarize key points or answer implied questions
- If it's a chat/email: Suggest appropriate responses

Be concise and directly helpful. Start with the most important information.`;

function createWindow() {
    const display = screen.getPrimaryDisplay();
    const { width: sw } = display.workAreaSize;
    const x = settings.position.x >= 0 ? settings.position.x : sw - settings.size.width - 20;
    const y = settings.position.y >= 0 ? settings.position.y : 60;

    overlayWindow = new BrowserWindow({
        width: settings.size.width,
        height: settings.size.height,
        x, y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        hasShadow: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY,
        },
    });

    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);

    // Hide from screen capture using Windows API
    hideFromCapture(overlayWindow);

    overlayWindow.loadURL(OVERLAY_WINDOW_WEBPACK_ENTRY);

    overlayWindow.on('moved', () => {
        if (!overlayWindow) return;
        const [px, py] = overlayWindow.getPosition();
        settings.position = { x: px, y: py };
    });

    overlayWindow.on('resized', () => {
        if (!overlayWindow) return;
        const [w, h] = overlayWindow.getSize();
        settings.size = { width: w, height: h };
    });
}

// Hide window from screen capture/sharing using Windows API
function hideFromCapture(win: BrowserWindow) {
    try {
        // WDA_EXCLUDEFROMCAPTURE = 0x00000011 (Windows 10 2004+)
        const WDA_EXCLUDEFROMCAPTURE = 0x00000011;
        const hwnd = win.getNativeWindowHandle();

        // Try using koffi if available
        try {
            const koffi = require('koffi');
            const user32 = koffi.load('user32.dll');
            const SetWindowDisplayAffinity = user32.func('SetWindowDisplayAffinity', 'bool', ['pointer', 'uint32']);
            const result = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
            console.log('Hide from capture:', result ? 'enabled' : 'failed');
        } catch {
            // Koffi not available - use setContentProtection as fallback
            win.setContentProtection(true);
            console.log('Hide from capture: using content protection fallback');
        }
    } catch (error) {
        console.warn('Could not hide from capture:', error);
    }
}

function toggle() {
    if (!overlayWindow) return;
    if (isVisible) {
        overlayWindow.hide();
        isVisible = false;
    } else {
        overlayWindow.show();
        overlayWindow.focus();
        isVisible = true;
    }
}

function setupTray() {
    const icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAP0lEQVR4nGNgGAWjYBQMNcDIyPg/LS3tf2Ji4n9GRkYGRkZGBgYGBoaEhIT/aWlp/xkZGRlGXTEKRsEoGGoAAKM3C9HO8y4HAAAAAElFTkSuQmCC'
    );
    tray = new Tray(icon);
    tray.setToolTip('Truly AI');
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Show/Hide (Ctrl+Shift+Space)', click: toggle },
        { type: 'separator' },
        { label: 'Settings', click: () => overlayWindow?.webContents.send('open-settings') },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
    ]));
    tray.on('click', toggle);
}

function setupIPC() {
    ipcMain.handle('get-api-key', () => settings.geminiApiKey);
    ipcMain.handle('set-api-key', (_, key: string) => {
        settings.geminiApiKey = key;
        return true;
    });

    // Screen capture - temporarily hide overlay while capturing
    ipcMain.handle('capture-screen', async () => {
        // Hide the overlay before capture
        const wasVisible = isVisible;
        if (wasVisible && overlayWindow) {
            overlayWindow.hide();
            await new Promise(r => setTimeout(r, 100)); // Wait for hide
        }

        try {
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1920, height: 1080 }
            });

            if (sources.length === 0) throw new Error('No screen found');

            const screenshot = sources[0].thumbnail.toJPEG(85);
            return screenshot.toString('base64');
        } finally {
            // Restore overlay visibility
            if (wasVisible && overlayWindow) {
                overlayWindow.show();
            }
        }
    });

    // Gemini with smart prompting
    ipcMain.handle('ask-gemini', async (_, userQuestion: string, screenshotBase64?: string) => {
        if (!settings.geminiApiKey) throw new Error('No API key configured');

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(settings.geminiApiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: SYSTEM_PROMPT,
        });

        // Build prompt - auto-deduce if no question provided
        const prompt = userQuestion?.trim() || 'Analyze this screen and help me with what I\'m looking at.';

        const parts: any[] = [];
        if (screenshotBase64) {
            parts.push({ inlineData: { data: screenshotBase64, mimeType: 'image/jpeg' } });
        }
        parts.push(prompt);

        const result = await model.generateContent(parts);
        return result.response.text();
    });

    ipcMain.on('hide-overlay', () => { if (isVisible) toggle(); });
}

function setupShortcuts() {
    globalShortcut.register('CommandOrControl+Shift+Space', toggle);
    globalShortcut.register('CommandOrControl+Shift+C', async () => {
        // Trigger capture even if hidden
        overlayWindow?.webContents.send('trigger-capture');
        if (!isVisible) toggle();
    });
}

app.whenReady().then(() => {
    console.log('🚀 Starting Truly...');
    createWindow();
    setupTray();
    setupIPC();
    setupShortcuts();
    overlayWindow?.show();
    isVisible = true;
    console.log('✅ Truly ready! (Ctrl+Shift+Space to toggle)');
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => globalShortcut.unregisterAll());
