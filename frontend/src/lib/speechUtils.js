/**
 * PolicyLens AI — Speech Utilities
 *
 * TTS (Text-to-Speech):  speak(), stopSpeaking(), isSpeaking() (Cloud-based via gTTS)
 * STT (Speech-to-Text):  createRecognition()
 *
 * All functions include console.log debugging for every step.
 */
import { API_BASE } from './utils';

// Global reference for the currently playing audio
let currentAudio = null;

// ── BCP-47 Locale Mapping ─────────────────────────────────────────────
const LOCALE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
};

export const LANGUAGE_NAMES = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', te: 'Telugu',
  mr: 'Marathi', ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada',
  ml: 'Malayalam', pa: 'Punjabi',
};

/**
 * Get the BCP-47 locale for a language code.
 */
export function getLocale(langCode) {
  return LOCALE_MAP[langCode] || 'en-IN';
}

// ── Text-to-Speech (TTS) ──────────────────────────────────────────────

// ── Text-to-Speech (Cloud TTS via API) ─────────────────────────────────

/**
 * Speak text aloud.
 *
 * @param {string} text      - The text to speak
 * @param {string} langCode  - i18n language code ('hi', 'ta', etc.)
 * @param {function} onEnd   - Callback when speech finishes
 * @returns {SpeechSynthesisUtterance|null}
 */
export async function speak(text, langCode = 'en', onEnd = null) {
  console.log(`[TTS] Cloud speak() called | lang=${langCode} | text="${text.substring(0, 60)}..."`);

  // Stop any ongoing speech first
  stopSpeaking();

  // Clean text for natural TTS output (remove markdown, URLs, bracketed text like JSON logs)
  const cleanText = text
    .replace(/https?:\/\/[^\s]+/g, '')       
    .replace(/[*_~`#\[\]]/g, '')             
    .replace(/{.*?}/g, '')                   
    .replace(/\s{2,}/g, ' ')                 
    .trim();

  if (!cleanText) {
    console.warn('[TTS] WARNING: Text is empty after cleaning. Nothing to speak.');
    if (onEnd) onEnd();
    return null;
  }

  console.log(`[TTS] Requesting Cloud audio... length: ${cleanText.length} chars`);

  try {
    const response = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanText,
        lang: langCode
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status} ${response.statusText}`);
    }

    // Get the audio file as a blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create and play Audio object
    currentAudio = new Audio(audioUrl);
    
    currentAudio.onplay = () => console.log('[TTS] ▶ Playing cloud audio...');
    currentAudio.onended = () => {
      console.log('[TTS] ✅ Audio playback finished.');
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      if (onEnd) onEnd();
    };
    currentAudio.onerror = (e) => {
      console.error(`[TTS] ❌ Audio element error:`, e);
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      if (onEnd) onEnd();
    };

    await currentAudio.play();
    return currentAudio;

  } catch (error) {
    console.error('[TTS] ❌ Error fetching cloud audio:', error);
    if (onEnd) onEnd();
    return null;
  }
}

/**
 * Stop any currently playing speech.
 */
export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
    console.log('[TTS] ⏹ Cloud Audio stopped.');
  }
}

/**
 * Check if cloud audio is currently speaking.
 */
export function isSpeaking() {
  return currentAudio !== null && !currentAudio.paused;
}


// ── Speech-to-Text (STT) ─────────────────────────────────────────────

/**
 * Create a SpeechRecognition instance with all event handlers wired up.
 *
 * @param {object} callbacks
 *   - onResult(transcript)  — Called with the final transcript
 *   - onError(errorType)    — Called with the error type string
 *   - onEnd()               — Called when recognition stops
 *   - onStart()             — Called when recognition starts
 * @returns {SpeechRecognition|null}
 */
export function createRecognition(callbacks = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error('[STT] ERROR: SpeechRecognition API not supported in this browser.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log('[STT] 🎤 Listening started...');
    if (callbacks.onStart) callbacks.onStart();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    console.log(`[STT] ✅ Speech detected: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%)`);
    if (callbacks.onResult) callbacks.onResult(transcript);
  };

  recognition.onerror = (event) => {
    console.error(`[STT] ❌ Error: ${event.error}`);
    let message;
    switch (event.error) {
      case 'not-allowed':
        message = 'Microphone permission denied. Please allow microphone access.';
        break;
      case 'no-speech':
        message = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        message = 'No microphone found. Please connect a microphone.';
        break;
      case 'network':
        message = 'Connection error. Are you on Chrome? Try disabling VPN or Ad-blockers.';
        break;
      case 'aborted':
        message = 'Speech stopped.';
        break;
      default:
        message = `Speech error: ${event.error}`;
    }
    console.error(`[STT] Diagnostic: ${message}`);
    if (callbacks.onError) callbacks.onError(event.error, message);
  };

  recognition.onend = () => {
    console.log('[STT] 🎤 Listening stopped.');
    if (callbacks.onEnd) callbacks.onEnd();
  };

  recognition.onspeechstart = () => {
    console.log('[STT] 🔊 Speech started (user is talking)...');
  };

  recognition.onspeechend = () => {
    console.log('[STT] 🔇 Speech ended (user stopped talking).');
  };

  return recognition;
}

/**
 * Set the STT language on a recognition instance.
 */
export function setRecognitionLanguage(recognition, langCode) {
  if (!recognition) return;
  const locale = LOCALE_MAP[langCode] || 'en-IN';
  recognition.lang = locale;
  console.log(`[STT] Language set to: ${locale}`);
}
