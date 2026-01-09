import React, { useState, useEffect } from 'react';

interface TrulyAPI {
    getApiKey: () => Promise<string>;
    setApiKey: (key: string) => Promise<boolean>;
    captureScreen: (mode: string) => Promise<string>;
    askGemini: (question: string, screenshot?: string) => Promise<string>;
    hideOverlay: () => void;
}

declare global {
    interface Window { truly: TrulyAPI; }
}

export default function App() {
    const [status, setStatus] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => {
        if (!window.truly) {
            setStatus('API not available');
            return;
        }
        window.truly.getApiKey()
            .then(k => {
                if (k) {
                    setApiKey(k);
                    setHasKey(true);
                    setStatus('Ready');
                } else {
                    setShowSettings(true);
                    setStatus('Enter API key');
                }
            })
            .catch(e => setStatus('Error: ' + e.message));
    }, []);

    const saveKey = async () => {
        if (!apiKey) return;
        try {
            await window.truly.setApiKey(apiKey);
            setHasKey(true);
            setShowSettings(false);
            setStatus('Ready');
        } catch (e: any) {
            setStatus('Error: ' + e.message);
        }
    };

    const capture = async () => {
        if (!hasKey) {
            setShowSettings(true);
            return;
        }
        setLoading(true);
        setResponse('');
        try {
            setStatus('Capturing screen...');
            const img = await window.truly.captureScreen('full');
            setStatus('Analyzing with AI...');
            // Auto-prompt: AI will deduce what's on screen
            const ans = await window.truly.askGemini('', img);
            setResponse(ans);
            setStatus('');
        } catch (e: any) {
            setStatus('');
            setResponse('Error: ' + e.message);
        }
        setLoading(false);
    };

    return (
        <div style={styles.container}>
            {/* Header Bar - Cluely Style */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.shortcut}>Ask Follow-Up</span>
                    <span style={styles.shortcutKey}>⌘ ↵</span>
                    <div style={styles.divider} />
                    <span style={styles.shortcut}>Show/Hide</span>
                    <span style={styles.shortcutKey}>⌘ \</span>
                </div>
                <div style={styles.headerRight}>
                    <span style={styles.timer}>00:00</span>
                    <button style={styles.iconBtn} onClick={() => setShowSettings(!showSettings)}>⚙</button>
                    <button style={styles.iconBtn} onClick={() => window.truly?.hideOverlay()}>―</button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div style={styles.settings}>
                    <input
                        style={styles.input}
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="Enter Gemini API Key..."
                    />
                    <button style={styles.saveBtn} onClick={saveKey}>Save</button>
                </div>
            )}

            {/* Response Area */}
            <div style={styles.content}>
                {loading ? (
                    <div style={styles.loading}>
                        <div style={styles.spinner} />
                        <span>Analyzing...</span>
                    </div>
                ) : response ? (
                    <div style={styles.response}>
                        <div style={styles.responseHeader}>
                            <span style={styles.aiIcon}>✦</span>
                            <span style={styles.aiLabel}>AI Response</span>
                        </div>
                        <div style={styles.responseText}>{response}</div>
                    </div>
                ) : (
                    <div style={styles.empty}>
                        <div style={styles.emptyIcon}>✦</div>
                        <div style={styles.emptyText}>Press button below to analyze screen</div>
                        <div style={styles.emptyHint}>or use Ctrl+Shift+C</div>
                    </div>
                )}
            </div>

            {/* Status */}
            {status && <div style={styles.status}>{status}</div>}

            {/* Bottom Action Button */}
            <button
                style={{ ...styles.captureBtn, opacity: loading ? 0.6 : 1 }}
                onClick={capture}
                disabled={loading}
            >
                📸 Analyze Screen
            </button>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        width: '100%',
        height: '100%',
        background: 'rgba(28, 28, 32, 0.95)',
        backdropFilter: 'blur(20px)',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(45, 45, 50, 0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        WebkitAppRegion: 'drag' as any,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        WebkitAppRegion: 'no-drag' as any,
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        WebkitAppRegion: 'no-drag' as any,
    },
    shortcut: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
    },
    shortcutKey: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        background: 'rgba(255,255,255,0.1)',
        padding: '2px 6px',
        borderRadius: 4,
        marginRight: 8,
    },
    divider: {
        width: 1,
        height: 14,
        background: 'rgba(255,255,255,0.15)',
        marginRight: 8,
    },
    timer: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginRight: 8,
    },
    iconBtn: {
        background: 'transparent',
        border: 'none',
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        cursor: 'pointer',
        padding: '4px 8px',
        borderRadius: 4,
    },
    settings: {
        display: 'flex',
        gap: 8,
        padding: 12,
        background: 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    input: {
        flex: 1,
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: '#fff',
        fontSize: 12,
    },
    saveBtn: {
        padding: '8px 16px',
        borderRadius: 6,
        border: 'none',
        background: '#6366f1',
        color: '#fff',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
    },
    content: {
        flex: 1,
        padding: 16,
        overflow: 'auto',
    },
    loading: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 12,
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
    },
    spinner: {
        width: 24,
        height: 24,
        border: '2px solid rgba(255,255,255,0.1)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    response: {
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        padding: 14,
    },
    responseHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    aiIcon: {
        color: '#6366f1',
        fontSize: 14,
    },
    aiLabel: {
        fontSize: 12,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.8)',
    },
    responseText: {
        fontSize: 13,
        lineHeight: 1.6,
        color: 'rgba(255,255,255,0.85)',
        whiteSpace: 'pre-wrap' as const,
    },
    empty: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
    },
    emptyIcon: {
        fontSize: 32,
        color: 'rgba(99, 102, 241, 0.5)',
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 4,
    },
    emptyHint: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
    },
    status: {
        padding: '6px 12px',
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.2)',
    },
    captureBtn: {
        margin: 12,
        padding: '12px 16px',
        borderRadius: 8,
        border: 'none',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
    },
};

// Add keyframe animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);
