"""
PolicyLens AI — Chatbot Routes (Gemini AI Powered)
POST /api/chat — Multilingual conversational assistant

Full flow:
  User message (text or STT) → Gemini AI → JSON response → Frontend TTS
"""
import os
import re
import time
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

logger = logging.getLogger(__name__)

chatbot_bp = Blueprint("chatbot", __name__)

# ── Language Registry ──────────────────────────────────────────────────
LANG_MAP = {
    "en": {"name": "English",   "bcp47": "en-IN"},
    "hi": {"name": "Hindi",     "bcp47": "hi-IN"},
    "bn": {"name": "Bengali",   "bcp47": "bn-IN"},
    "te": {"name": "Telugu",    "bcp47": "te-IN"},
    "mr": {"name": "Marathi",   "bcp47": "mr-IN"},
    "ta": {"name": "Tamil",     "bcp47": "ta-IN"},
    "gu": {"name": "Gujarati",  "bcp47": "gu-IN"},
    "kn": {"name": "Kannada",   "bcp47": "kn-IN"},
    "ml": {"name": "Malayalam", "bcp47": "ml-IN"},
    "pa": {"name": "Punjabi",   "bcp47": "pa-IN"},
}

# ── Gemini Model Singleton ─────────────────────────────────────────────
_model = None

def _get_model(model_name="gemini-2.0-flash-lite", api_key=None):
    """Fetch the specified Gemini model using a specific API key."""
    if not api_key:
        # Fallback to single key if plural isn't found
        api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        logger.error("No Gemini API key found in environment.")
        return None
        
    try:
        import google.generativeai as genai
        # Note: genai.configure is global, but we call it per-attempt for rotation
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(model_name)
    except Exception as e:
        logger.error(f"Gemini {model_name} init failed with key {api_key[:10]}...: {e}")
        return None


def get_all_keys():
    """Parse GEMINI_API_KEYS or GEMINI_API_KEY from environment."""
    keys_str = os.environ.get("GEMINI_API_KEYS") or os.environ.get("GEMINI_API_KEY")
    if not keys_str:
        return []
    # Split by comma and remove whitespace
    return [k.strip() for k in keys_str.split(",") if k.strip()]


# ── System Prompt Template ─────────────────────────────────────────────
SYSTEM_PROMPT = """You are "PolicyLens AI Assistant" — a helpful, friendly, multilingual chatbot for Indian citizens.

CRITICAL LANGUAGE RULE:
- The user's preferred language is: {lang_name}
- You MUST respond ENTIRELY in {lang_name}. Every single word.
- If the language is English, respond in simple English.
- If the user writes in mixed language (Hinglish, Tanglish, etc.), respond in the DOMINANT language.

COMMUNICATION RULES:
1. Use SIMPLE, easy-to-understand words. No complex vocabulary.
2. Keep sentences SHORT — under 15 words each when possible.
3. Be conversational and polite, like talking to a friend.
4. Use bullet points for steps or lists.
5. Avoid symbols, emojis, or complex punctuation (TTS-friendly output).
6. Do NOT use markdown formatting (no **, no ##, no ```).
7. Keep responses under 120 words unless detailed explanation is asked.

EXPERTISE:
- You are an expert on Indian government welfare schemes (Central + State).
- You know eligibility criteria, application processes, and benefits.
- You can guide users through PM-KISAN, PMAY, Ayushman Bharat, MGNREGA, and hundreds more.
- You can also help with general questions about the PolicyLens platform.

ERROR HANDLING:
- If you don't understand, ask for clarification in the SAME language.
- If asked about something outside your expertise, politely redirect.
- Never make up false scheme information.

CULTURAL AWARENESS:
- Use culturally appropriate greetings (Namaste for Hindi, Vanakkam for Tamil, etc).
- Use respectful language appropriate for rural and semi-urban users.
"""


# ── Language Auto-Detection ────────────────────────────────────────────
SCRIPT_PATTERNS = {
    "hi": re.compile(r'[\u0900-\u097F]'),   # Devanagari
    "bn": re.compile(r'[\u0980-\u09FF]'),   # Bengali
    "te": re.compile(r'[\u0C00-\u0C7F]'),   # Telugu
    "mr": re.compile(r'[\u0900-\u097F]'),   # Devanagari (same as Hindi)
    "ta": re.compile(r'[\u0B80-\u0BFF]'),   # Tamil
    "gu": re.compile(r'[\u0A80-\u0AFF]'),   # Gujarati
    "kn": re.compile(r'[\u0C80-\u0CFF]'),   # Kannada
    "ml": re.compile(r'[\u0D00-\u0D7F]'),   # Malayalam
    "pa": re.compile(r'[\u0A00-\u0A7F]'),   # Gurmukhi
}


def detect_language(text, hint="en"):
    """Detect language from script. Falls back to the hint."""
    for lang, pattern in SCRIPT_PATTERNS.items():
        if pattern.search(text):
            # Devanagari is shared by Hindi/Marathi — use hint to disambiguate
            if lang == "hi" and hint == "mr":
                return "mr"
            return lang
    return hint


# ── Chat Endpoint ──────────────────────────────────────────────────────
@chatbot_bp.route("/api/chat", methods=["POST"])
@jwt_required()
def chat():
    """Handle a chat message.

    Request JSON:
        {
            "message":  "User's text (from keyboard or STT)",
            "language": "en"  (i18n language code),
            "history":  [{"role": "user"|"assistant", "content": "..."}]
        }

    Response JSON:
        {
            "reply":       "Bot's text response",
            "language":    "en",
            "bcp47":       "en-IN",
            "source":      "gemini"
        }
    """
    start_time = time.time()

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    user_message = (data.get("message") or "").strip()
    ui_language = data.get("language", "en")
    history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    # ── Auto-detect language from text, with UI language as hint ──
    detected_lang = detect_language(user_message, hint=ui_language)
    lang_info = LANG_MAP.get(detected_lang, LANG_MAP["en"])
    lang_name = lang_info["name"]
    bcp47 = lang_info["bcp47"]

    logger.info("[CHAT] User message (%s): %s", lang_name, user_message[:80])

    # Model is initialized in the rotation loop below.
    # ── Build prompt ──
    system = SYSTEM_PROMPT.format(lang_name=lang_name)

    conversation = [system, ""]
    for msg in history[-10:]:
        role = "User" if msg.get("role") == "user" else "Assistant"
        conversation.append(f"{role}: {msg.get('content', '')}")

    conversation.append(f"User: {user_message}")
    conversation.append(f"Assistant (respond in {lang_name}):")

    full_prompt = "\n".join(conversation)

    # ── RESILIENT MODEL CALL LOOP (Multi-Key + Multi-Model Rotation) ──
    available_keys = get_all_keys()
    if not available_keys:
        return jsonify({"error": "No API keys configured"}), 503

    # Available models — each has its OWN separate quota bucket
    models_to_try = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]
    reply = None
    success_model = None
    
    for model_name in models_to_try:
        if reply: break
        
        for key in available_keys:
            if reply: break
            
            logger.info(f"[CHAT] Trying {model_name} with key {key[:8]}...")
            model = _get_model(model_name, api_key=key)
            if not model: continue

            try:
                # Disable internal retries — we handle rotation ourselves
                response = model.generate_content(
                    full_prompt,
                    request_options={"timeout": 30}
                )
                reply = response.text.strip()
                
                # Success!
                reply = reply.replace("**", "").replace("##", "").replace("# ", "")
                reply = re.sub(r'```[\s\S]*?```', '', reply).strip()
                success_model = model_name
                logger.info(f"[CHAT] Success with {model_name} using key {key[:8]}")
                break
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    logger.warning(f"[CHAT] Key {key[:8]} rate limited on {model_name}. Trying next...")
                    time.sleep(1)  # Short pause before trying next combo
                    continue
                else:
                    logger.error(f"[CHAT] Error with {model_name}: {err_msg[:100]}")
                    continue

    if not reply:
        # ── Ultimate Fallback: Friendly "Busy" message in all 10 languages ──
        fallbacks = {
            "en": "Hello! I am feeling a bit busy right now. Please try again in a minute.",
            "hi": "नमस्ते! अभी मुझे अधिक अनुरोध मिल रहे हैं। कृपया एक मिनट बाद फिर से प्रयास करें।",
            "bn": "நমস্কার! અત્યારે সার্ভার ব্যস্ত છે. ದయచేసి ఒక નિમિഷం తర్వాత મళ్లీ ప్రयत్నించండి। (Hello! I am busy right now.)", # Needs proper translation
            "te": "నమస్కారం! ప్రస్తుతం సర్వర్ బిజీగా ఉంది. దయచేసి ఒక నిమిషం తర్వాత మళ్ళీ ప్రయత్నించండి.",
            "mr": "नमस्कार! सध्या सर्व्हर बिझी आहे. कृपया एका मिनिटानंतर पुन्हा प्रयत्न करा.",
            "ta": "வணக்கம்! தற்போது சர்வர் பிஸியாக உள்ளது. ஒரு நிமிடம் கழித்து மீண்டும் முயற்சிக்கவும்.",
            "gu": "નમસ્તે! અત્યારે સર્વર વ્યસ્ત છે. કૃપા કરીને એક મિનિટ પછી ફરી પ્રયાસ કરો.",
            "kn": "ನಮಸ್ಕಾರ! ಪ್ರಸ್ತುತ ಸರ್ವರ್ ಕಾರ್ಯನಿರತವಾಗಿದೆ. ದಯವಿಟ್ಟು ಒಂದು ನಿಮಿಷದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
            "ml": "നമസ്കാരം! നിലവിൽ സെർവർ തിരക്കിലാണ്. ഒരു മിനിറ്റിനുശേഷം വീണ്ടും ശ്രമിക്കുക.",
            "pa": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਸਰਵਰ ਵਰਤਮਾਨ ਵਿੱਚ ਵਿਅਸਤ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਮਿੰਟ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
        }
        # Corrected Bengali Translation
        fallbacks["bn"] = "নমস্কার! বর্তমানে সার্ভার ব্যস্ত আছে। অনুগ্রহ করে এক মিনিট পর আবার চেষ্টা করুন।"
        
        return jsonify({
            "reply": fallbacks.get(detected_lang, fallbacks["en"]),
            "language": detected_lang,
            "bcp47": bcp47,
            "is_fallback": True
        }), 200

    return jsonify({
        "reply": reply,
        "language": detected_lang,
        "bcp47": bcp47,
        "model": success_model
    }), 200
