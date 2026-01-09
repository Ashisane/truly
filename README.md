# Truly - AI Screen Overlay Assistant

> **An intelligent screen overlay powered by Google Gemini - A Parakeet clone for Windows**

Truly is a transparent, always-on-top overlay that analyzes your screen and provides instant AI-powered answers to questions, coding problems, and more.

## ✨ Key Features

- 🎯 **Click-Through Overlay**: Transparent to clicks, only interactive when needed
- 🚫 **Hidden from Screen Capture**: Invisible to OBS, Discord, Teams, screen recording
- 🧠 **Smart AI Analysis**: Uses Gemini 3 Flash Preview with 2.5 Flash fallback
- ⌨️ **Keyboard-Driven**: All controls via global shortcuts
- 💾 **Persistent Settings**: API key and preferences saved across sessions
- 🎨 **Clean UI**: Minimal, transparent glass-morphism design

## 🚀 Quick Start

### Installation

1. Download `Truly-Setup.exe` from the releases
2. Run the installer
3. Launch Truly from Start Menu or Desktop

### First Launch

1. Truly will open with the settings panel
2. Enter your **Google Gemini API Key**
   - Get your free API key: https://makersuite.google.com/app/apikey
3. Press Enter or click Save
4. Click-through mode is automatically enabled!

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Q` | Quick analyze screen |
| `Ctrl+Shift+Space` | Show/hide overlay |
| `Ctrl+Shift+X` | Toggle click-through mode |

## 🎯 How to Use

### Basic Workflow

1. **Press `Ctrl+Shift+Q`** - Captures your screen and analyzes it
2. **Wait a moment** - AI processes the screenshot
3. **Press `Ctrl+Shift+Space`** - View the results in overlay
4. **Copy answer** - Click response text to select and copy

### Advanced Tips

- **Click-Through Mode**: When ON (green), overlay is transparent to clicks
  - Toggle with `Ctrl+Shift+X` to interact with overlay
- **Multiple Questions**: AI automatically detects and answers all questions
- **Background Analysis**: Window can be hidden while analyzing
- **Persistent Results**: Last answer stays until next analysis

## 🛠️ Technical Details

### System Requirements

- **OS**: Windows 10 2004+ or Windows 11
- **RAM**: 4GB minimum
- **Internet**: Required for Gemini API

### AI Models

Truly uses a smart fallback system:
1. **Primary**: Gemini 3 Flash Preview (best quality)
2. **Fallback**: Gemini 2.5 Flash (if rate limited)

### Privacy

- ✅ API key encrypted and stored locally
- ✅ Screenshots never saved to disk (RAM only)
- ✅ No telemetry or analytics
- ✅ Direct API calls to Google (no third-party servers)

## 📝 Use Cases

### Education
- Instant answers to quiz questions
- Math problem solving
- Study assistance

### Coding
- Debug error messages
- Code explanation
- Algorithm complexity analysis

### General
- Form filling assistance
- Document summarization
- Quick fact-checking

## 🐛 Troubleshooting

### Overlay not appearing
- Check if Truly is running (system tray icon)
- Press `Ctrl+Shift+Space` to toggle visibility

### Click-through not working
- Press `Ctrl+Shift+X` to toggle mode
- Check status indicator in header (green = ON)

### API errors
- Verify API key in settings (gear icon)
- Check internet connection
- Ensure Gemini API quota isn't exceeded

### Screen capture hidden from view
- This is intentional! Overlay uses `WDA_EXCLUDEFROMCAPTURE`
- Your overlay won't appear in OBS, Discord, etc.

## 🔐 Security Notes

- **API Key Storage**: Encrypted using electron-store
- **Screen Capture Protection**: Uses Windows `SetWindowDisplayAffinity` API
- **No External Servers**: Direct communication with Google Gemini only

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Credits

- Inspired by **Parakeet** (the original screen overlay assistant)
- Powered by **Google Gemini API**
- Built with **Electron** + **React** + **TypeScript**

## 📧 Support

For issues and feature requests, please create an issue on GitHub.

---

**Made with ❤️ by Truly Team**

*Version 1.0.0*
