/**
 * PolicyLens AI — VoiceBot Component
 *
 * Features:
 *   1. Floating chat bubble (bottom-right)
 *   2. Full chat interface with message history
 *   3. Text input + Send button
 *   4. 🎤 Mic button for Speech-to-Text (STT)
 *   5. 🔊 Auto TTS toggle + per-message Listen button
 *   6. Language-aware (follows i18n selection)
 *   7. Console.log debugging at every step
 *
 * Flow:
 *   User clicks mic → STT captures speech → text sent to /api/chat →
 *   Gemini responds → displayed → spoken via TTS
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle, X, Send, Volume2, VolumeX, Trash2,
  Loader2, Bot, User as UserIcon, Mic, MicOff, AlertCircle
} from 'lucide-react';
import { API_BASE } from '../lib/utils';
import {
  speak, stopSpeaking, isSpeaking,
  createRecognition, setRecognitionLanguage, getLocale
} from '../lib/speechUtils';

export default function VoiceBot() {
  const { t, i18n } = useTranslation();

  // ── State ──
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [sttError, setSttError] = useState(null);
  const [sttSupported, setSttSupported] = useState(true);

  // ── Refs ──
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const msgIdCounter = useRef(0);

  // ── Initialize STT on mount ──
  useEffect(() => {
    console.log('[VoiceBot] Initializing...');

    const recognition = createRecognition({
      onStart: () => {
        console.log('[VoiceBot] STT started');
        setIsListening(true);
        setSttError(null);
      },
      onResult: (transcript) => {
        console.log(`[VoiceBot] STT result: "${transcript}"`);
        setInput(transcript);
        setIsListening(false);
        // Auto-submit after voice input
        setTimeout(() => {
          console.log('[VoiceBot] Auto-submitting voice input...');
          submitMessage(transcript);
        }, 300);
      },
      onError: (errorType, message) => {
        console.error(`[VoiceBot] STT error: ${errorType} — ${message}`);
        setIsListening(false);
        setSttError(message);
        
        // If it's a network or aborted error, we try to clear the instance
        if (errorType === 'network' || errorType === 'aborted') {
          console.warn('[VoiceBot] Resetting recognition engine due to error...');
          try { recognitionRef.current.abort(); } catch(e) {}
        }
        
        setTimeout(() => setSttError(null), 7000);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    if (recognition) {
      recognitionRef.current = recognition;
      console.log('[VoiceBot] STT initialized successfully');
    } else {
      console.warn('[VoiceBot] STT not supported');
      setSttSupported(false);
    }

    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Greeting on first open ──
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = t('greeting');
      const id = ++msgIdCounter.current;
      setMessages([{ id, role: 'assistant', content: greeting, timestamp: Date.now() }]);
      console.log('[VoiceBot] Greeting displayed');
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ── Cleanup speech on close ──
  useEffect(() => {
    if (!isOpen) stopSpeaking();
  }, [isOpen]);

  // ── Core: Submit message to backend ──
  const submitMessage = useCallback(async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || loading) return;

    console.log(`[VoiceBot] Sending to chatbot: "${text}"`);

    // Add user message
    const userId = ++msgIdCounter.current;
    const userMsg = { id: userId, role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setSttError(null);

    try {
      const token = localStorage.getItem('token');
      console.log('[VoiceBot] Calling /api/chat...');

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          language: i18n.language,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      console.log(`[VoiceBot] Response status: ${res.status}`);

      if (res.ok && data.reply) {
        console.log(`[VoiceBot] Response received (${data.reply.length} chars): "${data.reply.substring(0, 80)}..."`);

        const botId = ++msgIdCounter.current;
        const botMsg = {
          id: botId,
          role: 'assistant',
          content: data.reply,
          timestamp: Date.now(),
          language: data.language || i18n.language,
          bcp47: data.bcp47,
        };
        setMessages(prev => [...prev, botMsg]);

        // Auto TTS
        if (autoSpeak) {
          console.log('[VoiceBot] Auto-speaking response...');
          setSpeakingMsgId(botId);
          await speak(data.reply, data.language || i18n.language, () => {
            console.log('[VoiceBot] Auto-speak finished');
            setSpeakingMsgId(null);
          });
        }
      } else {
        console.error(`[VoiceBot] API error: ${data.error}`);
        const errId = ++msgIdCounter.current;
        setMessages(prev => [...prev, {
          id: errId,
          role: 'assistant',
          content: data.error || t('error_message'),
          timestamp: Date.now(),
          isError: true,
        }]);
      }
    } catch (err) {
      console.error(`[VoiceBot] Network error: ${err.message}`);
      const errId = ++msgIdCounter.current;
      setMessages(prev => [...prev, {
        id: errId,
        role: 'assistant',
        content: t('error_message'),
        timestamp: Date.now(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, autoSpeak, i18n.language, t]);

  // ── Mic toggle ──
  const toggleMic = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('[VoiceBot] STT not available');
      setSttError('Speech recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      console.log('[VoiceBot] Stopping STT...');
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      console.log('[VoiceBot] Starting STT...');
      stopSpeaking(); // Stop any TTS before listening
      setRecognitionLanguage(recognitionRef.current, i18n.language);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('[VoiceBot] STT start error:', e.message);
        // Already running — abort and restart
        recognitionRef.current.abort();
        setTimeout(() => {
          setRecognitionLanguage(recognitionRef.current, i18n.language);
          recognitionRef.current.start();
        }, 200);
      }
    }
  }, [isListening, i18n.language]);

  // ── Per-message speak ──
  const handleSpeakMessage = useCallback(async (msg) => {
    if (speakingMsgId === msg.id) {
      console.log('[VoiceBot] Stopping TTS for message', msg.id);
      stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      console.log('[VoiceBot] Speaking message', msg.id);
      stopSpeaking();
      setSpeakingMsgId(msg.id);
      await speak(msg.content, msg.language || i18n.language, () => {
        console.log('[VoiceBot] TTS finished for message', msg.id);
        setSpeakingMsgId(null);
      });
    }
  }, [speakingMsgId, i18n.language]);

  // ── Form submit ──
  const handleSubmit = (e) => {
    e.preventDefault();
    submitMessage();
  };

  // ── Clear chat ──
  const clearChat = () => {
    stopSpeaking();
    msgIdCounter.current = 0;
    const id = ++msgIdCounter.current;
    setMessages([{ id, role: 'assistant', content: t('greeting'), timestamp: Date.now() }]);
    console.log('[VoiceBot] Chat cleared');
  };

  return (
    <>
      {/* ── Floating Action Button ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setIsOpen(true); console.log('[VoiceBot] Opened'); }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:shadow-2xl hover:shadow-indigo-500/40 transition-shadow"
            aria-label="Open Assistant"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[580px] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl shadow-black/25 overflow-hidden border border-surface-200/50 dark:border-surface-700/50 bg-white dark:bg-surface-900"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-none">{t('assistant')}</h3>
                  <p className="text-[10px] opacity-80 mt-0.5">Gemini AI — {getLocale(i18n.language)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Auto-Speak Toggle */}
                <button
                  onClick={() => {
                    const next = !autoSpeak;
                    setAutoSpeak(next);
                    if (!next) stopSpeaking();
                    console.log(`[VoiceBot] Auto-speak: ${next ? 'ON' : 'OFF'}`);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${autoSpeak ? 'bg-white/25' : 'bg-white/10 opacity-60'}`}
                  title={`${t('speak_responses')} (${autoSpeak ? 'ON' : 'OFF'})`}
                >
                  {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                {/* Clear */}
                <button onClick={clearChat} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title={t('clear_chat')}>
                  <Trash2 className="w-4 h-4" />
                </button>
                {/* Close */}
                <button onClick={() => { setIsOpen(false); console.log('[VoiceBot] Closed'); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── STT Error Banner ── */}
            <AnimatePresence>
              {sttError && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-red-500/10 border-b border-red-200 dark:border-red-800 px-3 py-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 shrink-0"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{sttError}</span>
                  <button onClick={() => setSttError(null)} className="ml-auto"><X className="w-3 h-3" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-surface-50 dark:bg-surface-950">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Bot avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-md'
                      : msg.isError
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-bl-md'
                        : 'bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 shadow-sm border border-surface-100 dark:border-surface-700 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Listen button on bot messages */}
                    {msg.role === 'assistant' && !msg.isError && (
                      <button
                        onClick={() => handleSpeakMessage(msg)}
                        className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium transition-all ${
                          speakingMsgId === msg.id
                            ? 'text-indigo-500 dark:text-indigo-400'
                            : 'opacity-40 hover:opacity-100'
                        }`}
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${speakingMsgId === msg.id ? 'animate-pulse' : ''}`} />
                        {speakingMsgId === msg.id ? t('stop_listening') : t('listen')}
                      </button>
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white dark:bg-surface-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-surface-100 dark:border-surface-700">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input Bar ── */}
            <form onSubmit={handleSubmit} className="px-3 py-2.5 border-t border-surface-200/50 dark:border-surface-700/50 bg-white dark:bg-surface-900 shrink-0">
              <div className="flex items-center gap-2">
                {/* Mic Button */}
                {sttSupported && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={loading}
                    className={`p-2.5 rounded-xl transition-all shrink-0 ${
                      isListening
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-500 shadow-lg shadow-red-500/20 animate-pulse'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-indigo-500'
                    }`}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}

                {/* Text Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? '🎤 Listening...' : t('ask_anything')}
                  className="flex-1 py-2.5 px-3.5 rounded-xl bg-surface-100 dark:bg-surface-800 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium placeholder:text-surface-400"
                  disabled={loading || isListening}
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={loading || !input.trim() || isListening}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/20 transition-all shrink-0"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>

              {/* Listening indicator */}
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 flex items-center justify-center gap-2 text-xs text-red-500 font-medium"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Listening in {getLocale(i18n.language)}...
                </motion.div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
