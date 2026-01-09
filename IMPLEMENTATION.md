# Truly - Cluely Clone Implementation Plan

> **An AI-powered screen overlay assistant for Windows, using Google Gemini API**

---

## 1. Project Overview

### 1.1 What We're Building
Truly is a Windows desktop application that overlays on top of any application, reads screen content, and provides AI-powered answers to user questions using Google Gemini API. The key differentiator is the **undetectability feature** - the overlay remains invisible to screen recording and sharing applications.

### 1.2 Core Value Proposition
- **Instant AI Assistance**: Get AI-powered answers based on your current screen content
- **Invisible to Capture**: Overlay is hidden from screen recordings, screenshots, and screen sharing
- **Non-Intrusive**: Minimal footprint, keyboard-driven interface
- **Privacy-First**: Local processing where possible, encrypted communication

---

## 2. Technology Stack

### 2.1 Core Technologies

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Desktop Framework** | Electron | Cross-platform capable, mature ecosystem, easy transparent/overlay windows |
| **Language** | TypeScript | Type safety, better tooling, maintainability |
| **UI Framework** | React 18+ | Component-based, efficient updates, large ecosystem |
| **Styling** | Tailwind CSS + Framer Motion | Rapid UI development, smooth animations |
| **AI Backend** | Google Gemini API | Your available API key, strong multimodal capabilities |
| **Screen Capture** | Windows API (native addon) + screenshot-desktop | For self-capture, not affected by WDA |
| **Build Tool** | Electron Forge | Modern, well-maintained Electron build tool |
| **Package Manager** | npm/pnpm | Standard package management |

### 2.2 Native Windows Integration

| Feature | Technology |
|---------|------------|
| **Hide from Capture** | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` via node-ffi-napi |
| **Global Hotkeys** | `electron-globalShortcut` + `uiohook-napi` |
| **Window Management** | Electron BrowserWindow API |
| **System Tray** | Electron Tray API |

### 2.3 Advanced Libraries

```
electron-forge           - Build and packaging
@electron/remote         - IPC simplification
electron-store           - Persistent settings
screenshot-desktop       - Cross-platform screen capture
node-ffi-napi           - Windows API calls
ref-napi                - Native data types
sharp                   - Image processing/compression
@google/generative-ai   - Gemini API client
```

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         TRULY APPLICATION                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐      ┌─────────────────┐      ┌────────────┐ │
│  │  OVERLAY WINDOW │      │   MAIN PROCESS  │      │  SETTINGS  │ │
│  │   (Renderer)    │◄────►│    (Node.js)    │◄────►│   WINDOW   │ │
│  │                 │ IPC  │                 │ IPC  │ (Renderer) │ │
│  │  • Chat UI      │      │  • Screen Cap   │      │            │ │
│  │  • Answers      │      │  • Gemini API   │      │  • Config  │ │
│  │  • Shortcuts    │      │  • Window Mgmt  │      │  • Hotkeys │ │
│  └─────────────────┘      │  • Native FFI   │      └────────────┘ │
│                           └────────┬────────┘                      │
│                                    │                               │
│                           ┌────────▼────────┐                      │
│                           │  NATIVE ADDON   │                      │
│                           │  (Windows API)  │                      │
│                           │                 │                      │
│                           │  • SetWindow    │                      │
│                           │    DisplayAff.  │                      │
│                           │  • Screen Cap   │                      │
│                           └─────────────────┘                      │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

                                    │
                                    │ HTTPS (Encrypted)
                                    ▼
                         ┌─────────────────────┐
                         │  GOOGLE GEMINI API  │
                         │                     │
                         │  • gemini-2.0-flash │
                         │  • Vision/Text      │
                         └─────────────────────┘
```

### 3.2 Process Architecture

#### Main Process (Node.js)
- Window lifecycle management
- Screen capture coordination
- Gemini API communication
- Native Windows API calls
- Global hotkey handling
- Settings persistence

#### Overlay Renderer (React)
- Transparent overlay UI
- Chat interface
- Answer rendering (Markdown)
- Keyboard shortcut handling
- Smooth animations

#### Settings Renderer (React)
- Configuration UI
- API key management
- Hotkey customization
- Appearance settings

### 3.3 Data Flow

```
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  User     │    │  Screen   │    │  Gemini   │    │  Display  │
│  Input    │───►│  Capture  │───►│  API      │───►│  Answer   │
│           │    │           │    │           │    │           │
└───────────┘    └───────────┘    └───────────┘    └───────────┘
                      │
                      ▼
               ┌─────────────┐
               │  Compress   │
               │  & Encode   │
               │  (Sharp)    │
               └─────────────┘
```

---

## 4. Feature Specifications

### 4.1 Screen Overlay System

#### 4.1.1 Overlay Window Configuration
```typescript
const overlayWindow = new BrowserWindow({
  width: 400,
  height: 600,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: true,
  hasShadow: false,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
  }
});

// Critical: Always on top, even over fullscreen apps
overlayWindow.setAlwaysOnTop(true, 'screen-saver');

// Critical: Hide from screen capture
// This is done via native addon (see section 4.2)
```

#### 4.1.2 Overlay Features
- **Toggle Visibility**: `Ctrl+Shift+Space` (default)
- **Position**: Draggable, remembers last position
- **Size**: Resizable, min 300x400, max 800x900
- **Opacity**: Adjustable (0.8 - 1.0)
- **Click-through Mode**: Toggle for transparent areas

### 4.2 Hide from Screen Capture (Critical Feature)

#### 4.2.1 Windows API Approach
Using `SetWindowDisplayAffinity` with `WDA_EXCLUDEFROMCAPTURE` flag:

```typescript
// native/windows-api.ts
import ffi from 'ffi-napi';
import ref from 'ref-napi';

const user32 = ffi.Library('user32', {
  'SetWindowDisplayAffinity': ['bool', ['pointer', 'uint32']]
});

// WDA_EXCLUDEFROMCAPTURE = 0x00000011
const WDA_EXCLUDEFROMCAPTURE = 0x00000011;

export function hideFromCapture(hwnd: Buffer): boolean {
  return user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
}
```

#### 4.2.2 Integration with Electron
```typescript
// Get native window handle
const hwnd = overlayWindow.getNativeWindowHandle();
hideFromCapture(hwnd);
```

#### 4.2.3 Limitations (Documented)
- ✅ Works against: OBS, Discord, Teams, Snipping Tool, Win+Shift+S
- ❌ Does not protect against: Hardware capture cards, phone cameras
- ⚠️ Windows 10 2004+ required (falls back gracefully on older versions)

### 4.3 Screen Content Reading

#### 4.3.1 Smart Screen Capture
```typescript
interface CaptureConfig {
  captureMode: 'full' | 'active-window' | 'selection';
  compression: {
    quality: number;      // 0.6-0.9
    maxWidth: number;     // 1920 default
    maxHeight: number;    // 1080 default
  };
  throttle: {
    minInterval: number;  // 500ms minimum between captures
    maxPerMinute: number; // 10 max per minute
  };
}
```

#### 4.3.2 Token-Efficient Capture Strategy
To avoid burning tokens on continuous monitoring:

1. **On-Demand Capture Only**
   - Screen is captured ONLY when user triggers a question
   - No background monitoring/capture

2. **Smart Compression**
   ```typescript
   async function compressForGemini(screenshot: Buffer): Promise<Buffer> {
     return sharp(screenshot)
       .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
       .jpeg({ quality: 75 })
       .toBuffer();
   }
   ```

3. **Active Window Focus** (Default Mode)
   - Capture only the active window, not full screen
   - Reduces image size and API costs

4. **Selection Mode** (Optional)
   - User draws rectangle to capture specific area
   - Minimum data sent to API

### 4.4 AI Question Answering

#### 4.4.1 Gemini Integration
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiService {
  model: 'gemini-2.0-flash-exp' | 'gemini-1.5-flash' | 'gemini-1.5-pro';
  systemPrompt: string;
  
  askWithScreenshot(
    question: string, 
    screenshot: Buffer, 
    context?: string
  ): Promise<string>;
  
  askTextOnly(
    question: string, 
    context?: string
  ): Promise<string>;
}
```

#### 4.4.2 Model Selection
| Model | Use Case | Cost |
|-------|----------|------|
| `gemini-2.0-flash-exp` | Default, balanced speed/quality | Low |
| `gemini-1.5-flash` | Quick answers, simple questions | Lowest |
| `gemini-1.5-pro` | Complex analysis, detailed answers | Higher |

#### 4.4.3 System Prompt Template
```typescript
const SYSTEM_PROMPT = `You are Truly, an AI assistant helping users understand 
their screen content. You analyze screenshots and provide helpful, accurate 
answers. Be concise but comprehensive. Format responses in Markdown when 
appropriate. If you cannot determine something from the screenshot, say so 
clearly.`;
```

### 4.5 User Interface

#### 4.5.1 Overlay UI Components
```
┌──────────────────────────────────┐
│ ⚙️  Truly          ─ □ ×        │ ← Header (draggable)
├──────────────────────────────────┤
│                                  │
│  ┌────────────────────────────┐  │
│  │ User: What does this error │  │
│  │       mean?                 │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Truly: Based on the screen │  │
│  │ shot, you're seeing a...   │  │
│  │ [Markdown rendered answer] │  │
│  └────────────────────────────┘  │
│                                  │
│  ...                             │
│                                  │
├──────────────────────────────────┤
│  [📷] [  Type your question... ] │ ← Input area
│        [Ask with Screen 📸]      │
└──────────────────────────────────┘
```

#### 4.5.2 Design Principles
- **Glass Morphism**: Frosted glass effect with backdrop blur
- **Dark Mode Default**: Reduces visual distraction
- **Minimal Chrome**: Focus on content, not UI elements
- **Smooth Animations**: Framer Motion for all transitions

### 4.6 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Toggle overlay visibility |
| `Ctrl+Shift+C` | Capture screen and ask |
| `Ctrl+Shift+A` | Focus input (overlay must be visible) |
| `Escape` | Hide overlay |
| `Ctrl+Enter` | Send message with screenshot |
| `Enter` | Send text-only message |

### 4.7 System Tray Integration

```
┌─────────────────────────┐
│ 📌 Show/Hide Overlay    │
│ 📸 Quick Capture        │
│ ───────────────────     │
│ ⚙️ Settings             │
│ 📊 Usage Stats          │
│ ───────────────────     │
│ ❌ Quit Truly           │
└─────────────────────────┘
```

---

## 5. Advanced Features

### 5.1 Intelligent Screen Monitoring (Token Optimization)

#### 5.1.1 Problem Statement
Continuous screen monitoring would burn through Gemini API tokens quickly. We need smart strategies.

#### 5.1.2 Solution: Event-Driven Capture

```typescript
interface MonitoringStrategy {
  // Option 1: Manual trigger only (default)
  manual: {
    captureOnQuestion: true;
    captureOnHotkey: true;
  };
  
  // Option 2: Smart periodic (opt-in)
  smartPeriodic: {
    enabled: boolean;
    checkIntervalMs: 5000;        // Check for changes every 5s
    onlyIfWindowChanged: true;    // Skip if same window
    onlyIfContentChanged: true;   // Use perceptual hash to detect changes
    maxCapturesPerHour: 12;       // Hard limit
  };
  
  // Option 3: OCR-first approach (cheapest)
  ocrFirst: {
    enabled: boolean;
    useLocalOCR: true;            // Tesseract.js for local OCR
    onlySendToGeminiIfNeeded: true;
  };
}
```

#### 5.1.3 Perceptual Hashing for Change Detection
```typescript
import { phash } from 'sharp-phash';

async function hasScreenChanged(
  currentScreen: Buffer, 
  lastScreen: Buffer
): Promise<boolean> {
  const [currentHash, lastHash] = await Promise.all([
    phash(currentScreen),
    phash(lastScreen)
  ]);
  
  const distance = hammingDistance(currentHash, lastHash);
  return distance > 10; // Threshold for "significant change"
}
```

### 5.2 Context Preservation

#### 5.2.1 Conversation History
```typescript
interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    screenshot?: string;  // base64, compressed
    timestamp: number;
  }>;
  
  // Keep last N messages for context
  maxMessages: 10;
  
  // Auto-clear after inactivity
  clearAfterMinutes: 30;
}
```

#### 5.2.2 Screen Context Caching
```typescript
interface ScreenContext {
  lastCapture: Buffer;
  lastCaptureTime: number;
  extractedText?: string;        // OCR results cached
  detectedElements?: string[];   // UI elements detected
  
  // Reuse if captured within last N seconds
  reuseThresholdMs: 30000;
}
```

### 5.3 Privacy & Security Features

#### 5.3.1 Data Handling
```typescript
interface PrivacyConfig {
  // Screenshots
  neverPersistScreenshots: true;   // RAM only
  autoDeleteAfterResponse: true;
  
  // API Communication
  useHttpsOnly: true;
  
  // Local Storage
  encryptApiKey: true;             // electron-store encryption
  clearHistoryOnExit: boolean;     // User preference
  
  // Sensitive Content
  blurDetectedPasswords: boolean;  // Optional OCR-based detection
}
```

### 5.4 Performance Optimizations

#### 5.4.1 Resource Management
```typescript
interface PerformanceConfig {
  // Capture optimization
  captureQuality: 0.75;            // JPEG quality
  maxImageDimension: 1920;         // Resize if larger
  
  // Memory management  
  maxCachedScreenshots: 3;
  gcAfterResponse: true;
  
  // API optimization
  useStreaming: true;              // Stream Gemini responses
  timeout: 30000;                  // 30s max wait
  
  // UI optimization
  renderInViewportOnly: true;
  virtualizeMessageList: true;
}
```

---

## 6. Project Structure

```
truly/
├── package.json
├── forge.config.ts              # Electron Forge config
├── tsconfig.json
├── tailwind.config.js
│
├── src/
│   ├── main/                    # Main process
│   │   ├── index.ts             # Entry point
│   │   ├── windows/
│   │   │   ├── overlay.ts       # Overlay window management
│   │   │   └── settings.ts      # Settings window
│   │   ├── services/
│   │   │   ├── gemini.ts        # Gemini API client
│   │   │   ├── capture.ts       # Screen capture
│   │   │   └── shortcuts.ts     # Global shortcuts
│   │   ├── native/
│   │   │   └── windows-api.ts   # Native Windows API (FFI)
│   │   ├── ipc/
│   │   │   └── handlers.ts      # IPC handlers
│   │   └── store.ts             # Electron store config
│   │
│   ├── preload/
│   │   └── index.ts             # Preload script (bridge)
│   │
│   ├── renderer/                # React UI
│   │   ├── overlay/             # Overlay window UI
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── Chat.tsx
│   │   │   │   ├── Message.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useGemini.ts
│   │   │   │   └── useCapture.ts
│   │   │   └── styles/
│   │   │       └── overlay.css
│   │   │
│   │   ├── settings/            # Settings window UI
│   │   │   ├── App.tsx
│   │   │   └── components/
│   │   │       ├── ApiConfig.tsx
│   │   │       ├── Shortcuts.tsx
│   │   │       └── Appearance.tsx
│   │   │
│   │   └── shared/              # Shared UI components
│   │       ├── components/
│   │       └── utils/
│   │
│   └── types/                   # TypeScript definitions
│       ├── gemini.d.ts
│       ├── capture.d.ts
│       └── ipc.d.ts
│
├── assets/
│   ├── icons/
│   │   ├── tray-icon.png
│   │   └── app-icon.ico
│   └── fonts/
│
├── native/                      # Native addon source (optional)
│   ├── binding.gyp
│   └── windows-capture.cc
│
└── tests/
    ├── main/
    └── renderer/
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup with Electron Forge
- [ ] Basic overlay window (transparent, always-on-top)
- [ ] Native Windows API integration for capture hiding
- [ ] Simple UI shell with React

### Phase 2: Core Features (Week 2)
- [ ] Screen capture functionality
- [ ] Gemini API integration
- [ ] Chat UI with message rendering
- [ ] Keyboard shortcuts

### Phase 3: Polish (Week 3)
- [ ] Settings window
- [ ] System tray integration
- [ ] Glassmorphism UI styling
- [ ] Animation polish

### Phase 4: Optimization (Week 4)
- [ ] Token-efficient monitoring strategies
- [ ] Performance optimization
- [ ] Error handling
- [ ] Testing

### Phase 5: Packaging (Week 5)
- [ ] Installer creation
- [ ] Auto-update setup
- [ ] Code signing (optional)
- [ ] Documentation

---

## 8. Configuration & Settings

### 8.1 User Settings Schema
```typescript
interface TrulySettings {
  // API
  geminiApiKey: string;
  modelPreference: 'gemini-2.0-flash-exp' | 'gemini-1.5-flash' | 'gemini-1.5-pro';
  
  // Appearance
  theme: 'dark' | 'light' | 'system';
  overlayOpacity: number;         // 0.8 - 1.0
  overlayPosition: { x: number; y: number };
  overlaySize: { width: number; height: number };
  
  // Shortcuts
  shortcuts: {
    toggleOverlay: string;        // 'Ctrl+Shift+Space'
    captureAndAsk: string;        // 'Ctrl+Shift+C'
    focusInput: string;           // 'Ctrl+Shift+A'
  };
  
  // Behavior
  captureMode: 'full' | 'active-window' | 'selection';
  startMinimized: boolean;
  runOnStartup: boolean;
  
  // Privacy
  clearHistoryOnExit: boolean;
  sendAnalytics: boolean;
}
```

---

## 9. API Token Management

### 9.1 Cost Estimation

| Action | Estimated Tokens | Cost (approx) |
|--------|------------------|---------------|
| Screenshot analysis | 2000-5000 tokens | ~$0.001-0.003 |
| Text question | 100-500 tokens | ~$0.0001 |
| Full conversation (10 msgs) | 3000-8000 tokens | ~$0.002-0.005 |

### 9.2 Token Optimization Strategies
1. **Compress images** before sending (JPEG 75%)
2. **Resize to max 1920x1080**
3. **Use flash models** for most queries
4. **Cache and reuse** recent screenshots
5. **Limit context window** to last 10 messages

---

## 10. Error Handling

### 10.1 Error Categories
```typescript
enum TrulyError {
  // API Errors
  API_KEY_INVALID = 'Invalid or expired API key',
  API_RATE_LIMIT = 'Rate limit exceeded',
  API_NETWORK = 'Network connection failed',
  
  // Capture Errors
  CAPTURE_FAILED = 'Screen capture failed',
  CAPTURE_PERMISSION = 'Screen capture permission denied',
  
  // Window Errors
  WINDOW_AFFINITY_FAILED = 'Could not hide from screen capture',
  
  // System Errors
  MEMORY_LOW = 'Low memory warning',
}
```

### 10.2 User-Friendly Error Messages
All errors should be displayed with:
- Clear explanation
- Suggested action
- Optional "Report Issue" button

---

## 11. Testing Strategy

### 11.1 Unit Tests
- Gemini API client mocking
- Screen capture compression
- Settings persistence

### 11.2 Integration Tests
- Full question-answer flow
- Keyboard shortcut handling
- Window management

### 11.3 Manual Testing Checklist
- [ ] Overlay appears correctly on different monitors
- [ ] Overlay hidden from OBS recording
- [ ] Overlay hidden from Windows Snipping Tool
- [ ] Overlay hidden from Discord screen share
- [ ] Keyboard shortcuts work globally
- [ ] API key validation works
- [ ] Error states display correctly

---

## 12. Dependencies

### 12.1 Production Dependencies
```json
{
  "dependencies": {
    "electron-store": "^8.1.0",
    "@google/generative-ai": "^0.21.0",
    "screenshot-desktop": "^1.15.0",
    "sharp": "^0.33.0",
    "ffi-napi": "^4.0.3",
    "ref-napi": "^3.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.0",
    "framer-motion": "^11.0.0",
    "zustand": "^4.5.0"
  }
}
```

### 12.2 Dev Dependencies
```json
{
  "devDependencies": {
    "@electron-forge/cli": "^7.0.0",
    "@electron-forge/maker-squirrel": "^7.0.0",
    "@electron-forge/plugin-webpack": "^7.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.10.0",
    "electron": "^28.0.0"
  }
}
```

---

## 13. Deployment & Distribution

### 13.1 Build Process
```bash
# Development
npm run dev

# Production build
npm run make

# Output: out/make/squirrel.windows/x64/
```

### 13.2 Installer
- **Format**: NSIS or Squirrel.Windows
- **Size Target**: < 100MB
- **Auto-update**: electron-updater integration

---

## 14. Future Enhancements (v2.0+)

### Potential Future Features
1. **Voice Input**: Whisper API integration
2. **Multi-monitor Support**: Capture specific monitors
3. **Plugin System**: Custom prompts/workflows
4. **Team Features**: Shared prompts, usage tracking
5. **Local LLM Option**: Ollama integration for offline use
6. **Cross-platform**: macOS and Linux (WDA only works on Windows)

---

## 15. Quick Start Development

### 15.1 Prerequisites
- Node.js 20+ (LTS recommended)
- Python 3.11 (for native modules)
- Visual Studio Build Tools (for node-gyp)
- Windows 10 2004+ or Windows 11

### 15.2 Setup Commands
```powershell
# Clone and install
git clone <repo>
cd truly
npm install

# Set up environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Start development
npm run dev
```

---

## 16. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| WDA not working on some Windows versions | High | Graceful degradation, warning message |
| Gemini API rate limits | Medium | Implement exponential backoff, caching |
| Native module compatibility | Medium | Test on multiple Windows versions |
| High token costs | Medium | Aggressive optimization, usage warnings |
| Screen capture permissions | Low | Clear setup instructions |

---

## Appendix A: Windows API Reference

### SetWindowDisplayAffinity
- **Minimum OS**: Windows 7 (basic), Windows 10 2004 (WDA_EXCLUDEFROMCAPTURE)
- **Header**: `winuser.h`
- **DLL**: `user32.dll`
- **Flags**:
  - `WDA_NONE (0x00)`: Normal behavior
  - `WDA_MONITOR (0x01)`: Only visible on physical monitor
  - `WDA_EXCLUDEFROMCAPTURE (0x11)`: Excluded from capture (Win10 2004+)

---

*Last Updated: January 9, 2025*
*Version: 1.0*
