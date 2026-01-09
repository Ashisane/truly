/**
 * Truly - Main Process
 * With hide-from-capture and smart AI prompts
 */
import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, screen, desktopCapturer, Notification } from 'electron';
import Store from 'electron-store';

declare const OVERLAY_WINDOW_WEBPACK_ENTRY: string;
declare const OVERLAY_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Persistent storage
const store = new Store({
    defaults: {
        geminiApiKey: '',
        position: { x: -1, y: -1 },
        size: { width: 420, height: 480 },
    }
});

const settings = {
    geminiApiKey: store.get('geminiApiKey') as string,
    position: store.get('position') as { x: number; y: number },
    size: store.get('size') as { width: number; height: number },
};

let overlayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isVisible = false;
let analysisNotification: Notification | null = null;
let isClickThrough = true; // Start in click-through mode

// Smart system prompt for direct, actionable answers
const SYSTEM_PROMPT = `You are a direct and efficient screen assistant. Analyze screenshots and provide immediate, actionable answers.

Critical Rules:
- NEVER describe what you see on screen - the user can already see it
- Give ONLY the answer, not observations or descriptions
- For questions/quizzes: Identify and answer ALL questions shown
- For multiple questions: Answer each one separately, numbered
- Be extremely concise - 1-3 sentences per answer maximum
- Answer first, explain second (if needed)

Format for multiple questions:
1. [Answer to Q1]. [Brief reason if helpful]
2. [Answer to Q2]. [Brief reason if helpful]

Example responses:
❌ "I can see a quiz with 3 questions about biology. Question 1 asks about..."
✅ "1. C) Chloroplasts - they contain chlorophyll
2. B) Mitochondria - produces ATP
3. A) Ribosomes - protein synthesis"

❌ "Looking at your screen, there appears to be a Python error on line 12..."
✅ "Add colon after line 12's if statement. Python requires ':' for code blocks."

❌ "This screen shows a coding problem with multiple questions..."
✅ "1. O(n log n) - uses merge sort
2. Space: O(n) - temporary array needed
3. Yes, stable - preserves order"`;

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

    // Set click-through after window loads, based on whether API key exists
    overlayWindow.webContents.on('did-finish-load', () => {
        if (!overlayWindow) return;

        // If no API key, disable click-through so user can enter it
        if (!settings.geminiApiKey) {
            isClickThrough = false;
            overlayWindow.setIgnoreMouseEvents(false);
            overlayWindow.webContents.send('click-through-changed', false);
        } else {
            // If API key exists, enable click-through
            isClickThrough = true;
            overlayWindow.setIgnoreMouseEvents(true, { forward: true });
            overlayWindow.webContents.send('click-through-changed', true);
        }
    });

    overlayWindow.on('moved', () => {
        if (!overlayWindow) return;
        const [px, py] = overlayWindow.getPosition();
        settings.position = { x: px, y: py };
        store.set('position', settings.position); // Persist
    });

    overlayWindow.on('resized', () => {
        if (!overlayWindow) return;
        const [w, h] = overlayWindow.getSize();
        settings.size = { width: w, height: h };
        store.set('size', settings.size); // Persist
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
        { label: 'Quick Analyze (Ctrl+Shift+Q)', click: () => overlayWindow?.webContents.send('trigger-capture') },
        { label: 'Toggle Click-Through (Ctrl+Shift+X)', click: toggleClickThrough },
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
        store.set('geminiApiKey', key); // Persist to disk

        // Enable click-through automatically after setting API key
        if (overlayWindow && key) {
            isClickThrough = true;
            overlayWindow.setIgnoreMouseEvents(true, { forward: true });
            overlayWindow.webContents.send('click-through-changed', true);
        }

        return true;
    });

    // Screen capture - no need to hide since WDA_EXCLUDEFROMCAPTURE handles it
    ipcMain.handle('capture-screen', async () => {
        try {
            const sources = await desktopCapturer.getSources({
                types: ['screen'],
                thumbnailSize: { width: 1920, height: 1080 }
            });

            if (sources.length === 0) throw new Error('No screen found');

            const screenshot = sources[0].thumbnail.toJPEG(85);
            return screenshot.toString('base64');
        } catch (error) {
            console.error('Screen capture failed:', error);
            throw error;
        }
    });

    // Gemini with smart prompting - using Gemini 3.0 with 2.0 fallback
    ipcMain.handle('ask-gemini', async (_, userQuestion: string, screenshotBase64?: string) => {
        if (!settings.geminiApiKey) throw new Error('No API key configured');

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(settings.geminiApiKey);

        // Build prompt - auto-deduce if no question provided
        const prompt = userQuestion?.trim() || 'Analyze this screen and help me with what I\'m looking at.';

        const parts: any[] = [];
        if (screenshotBase64) {
            parts.push({ inlineData: { data: screenshotBase64, mimeType: 'image/jpeg' } });
        }
        parts.push(prompt);

        // Try Gemini 3 Flash Preview first (best quality, has rate limits)
        try {
            const model3 = genAI.getGenerativeModel({
                model: 'gemini-3-flash-preview',
                systemInstruction: SYSTEM_PROMPT,
            });
            const result = await model3.generateContent(parts);
            console.log('✓ Used Gemini 3 Flash Preview');
            return result.response.text();
        } catch (error: any) {
            console.warn('⚠ Gemini 3 failed, falling back to 2.5:', error.message);

            // Fallback to Gemini 2.5 Flash
            try {
                const model25 = genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    systemInstruction: SYSTEM_PROMPT,
                });
                const result = await model25.generateContent(parts);
                console.log('✓ Used Gemini 2.5 Flash (fallback)');
                return result.response.text();
            } catch (fallbackError: any) {
                throw new Error(`Both models failed. Last error: ${fallbackError.message}`);
            }
        }
    });

    ipcMain.on('hide-overlay', () => { if (isVisible) toggle(); });

    // Toggle click-through mode
    ipcMain.on('set-ignore-mouse-events', (_, ignore: boolean) => {
        if (overlayWindow) {
            overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
        }
    });

    // Listen for analysis completion to close notification
    ipcMain.on('analysis-complete', () => {
        if (analysisNotification) {
            analysisNotification.close();
            analysisNotification = null;
        }

        // Show completion notification if window is hidden
        if (!isVisible) {
            const completeNotif = new Notification({
                title: 'Truly',
                body: 'Analysis complete! Press Ctrl+Shift+Space to view',
                silent: true
            });
            completeNotif.show();
        }
    });
}

function toggleClickThrough() {
    if (!overlayWindow) return;
    isClickThrough = !isClickThrough;
    overlayWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });

    // Notify renderer about the state change
    overlayWindow.webContents.send('click-through-changed', isClickThrough);

    console.log(`Click-through: ${isClickThrough ? 'ENABLED (transparent)' : 'DISABLED (interactive)'}`);
}

function setupShortcuts() {
    globalShortcut.register('CommandOrControl+Shift+Space', toggle);

    // Toggle click-through mode with Ctrl+Shift+X
    globalShortcut.register('CommandOrControl+Shift+X', toggleClickThrough);

    globalShortcut.register('CommandOrControl+Shift+Q', async () => {
        // Quick analyze: Trigger capture and auto-analyze silently
        overlayWindow?.webContents.send('trigger-capture');

        // Show subtle notification if window is hidden
        if (!isVisible) {
            analysisNotification = new Notification({
                title: 'Truly',
                body: 'Analyzing screen...',
                silent: true,
                timeoutType: 'never'
            });
            analysisNotification.show();
        }
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
