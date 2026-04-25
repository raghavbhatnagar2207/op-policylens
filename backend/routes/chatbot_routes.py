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

    # Available models — each has its OWN separate quota bucket
    models_to_try = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]
    reply = None
    success_model = None
    
    if not available_keys:
        logger.warning("[CHAT] No API keys configured — skipping AI, using fallback.")
    
    for model_name in models_to_try:
        if not available_keys:
            break
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
        # ── Smart Fallback: Helpful information without AI ──
        fallbacks = {
            "en": "Namaste! I am PolicyLens AI Assistant. I can help you with Indian government welfare schemes. "
                  "Here are some popular schemes you can explore: "
                  "1. PM-KISAN: Rs 6000 per year for farmers. "
                  "2. Ayushman Bharat: Rs 5 Lakh health cover for families. "
                  "3. PM Awas Yojana: Housing support for rural and urban poor. "
                  "4. MGNREGA: 100 days guaranteed employment. "
                  "5. PM Ujjwala Yojana: Free LPG connection for women. "
                  "Use the Scheme Matcher feature on the left menu to find schemes that match your profile!",
            "hi": "नमस्ते! मैं PolicyLens AI सहायक हूँ। मैं आपको भारत सरकार की कल्याणकारी योजनाओं के बारे में मदद कर सकता हूँ। "
                  "यहाँ कुछ लोकप्रिय योजनाएँ हैं: "
                  "1. पीएम-किसान: किसानों को प्रति वर्ष 6000 रुपये। "
                  "2. आयुष्मान भारत: परिवारों के लिए 5 लाख रुपये का स्वास्थ्य कवर। "
                  "3. पीएम आवास योजना: ग्रामीण और शहरी गरीबों के लिए आवास सहायता। "
                  "4. मनरेगा: 100 दिन की गारंटीशुदा रोजगार। "
                  "स्कीम मैचर का उपयोग करके अपनी प्रोफ़ाइल से मेल खाने वाली योजनाएँ खोजें!",
            "bn": "নমস্কার! আমি PolicyLens AI সহকারী। আমি আপনাকে ভারত সরকারের কল্যাণমূলক প্রকল্পগুলি সম্পর্কে সাহায্য করতে পারি। "
                  "স্কিম ম্যাচার ব্যবহার করে আপনার প্রোফাইলের সাথে মেলে এমন প্রকল্পগুলি খুঁজুন!",
            "te": "నమస్కారం! నేను PolicyLens AI అసిస్టెంట్. భారత ప్రభుత్వ సంక్షేమ పథకాల గురించి మీకు సహాయం చేయగలను। "
                  "స్కీమ్ మ్యాచర్ ఉపయోగించి మీ ప్రొఫైల్‌కు సరిపోయే పథకాలను కనుగొనండి!",
            "mr": "नमस्कार! मी PolicyLens AI सहाय्यक आहे. भारत सरकारच्या कल्याणकारी योजनांबद्दल मी तुम्हाला मदत करू शकतो। "
                  "स्कीम मॅचर वापरून तुमच्या प्रोफाइलशी जुळणाऱ्या योजना शोधा!",
            "ta": "வணக்கம்! நான் PolicyLens AI உதவியாளர். இந்திய அரசின் நலத்திட்டங்கள் பற்றி உங்களுக்கு உதவ முடியும். "
                  "ஸ்கீம் மேட்சர் பயன்படுத்தி உங்கள் சுயவிவரத்துடன் பொருந்தும் திட்டங்களைக் கண்டறியுங்கள்!",
            "gu": "નમસ્તે! હું PolicyLens AI સહાયક છું. ભારત સરકારની કલ્યાણકારી યોજનાઓ વિશે હું તમને મદદ કરી શકું છું। "
                  "સ્કીમ મેચર વાપરીને તમારી પ્રોફાઇલ સાથે મેળ ખાતી યોજનાઓ શોધો!",
            "kn": "ನಮಸ್ಕಾರ! ನಾನು PolicyLens AI ಸಹಾಯಕ. ಭಾರತ ಸರ್ಕಾರದ ಕಲ್ಯಾಣ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. "
                  "ಸ್ಕೀಮ್ ಮ್ಯಾಚರ್ ಬಳಸಿ ನಿಮ್ಮ ಪ್ರೊಫೈಲ್‌ಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ!",
            "ml": "നമസ്കാരം! ഞാൻ PolicyLens AI അസിസ്റ്റന്റ് ആണ്. ഇന്ത്യൻ സർക്കാർ ക്ഷേമ പദ്ധതികളെക്കുറിച്ച് നിങ്ങളെ സഹായിക്കാൻ എനിക്ക് കഴിയും. "
                  "സ്കീം മാച്ചർ ഉപയോഗിച്ച് നിങ്ങളുടെ പ്രൊഫൈലുമായി പൊരുത്തപ്പെടുന്ന പദ്ധതികൾ കണ്ടെത്തുക!",
            "pa": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ PolicyLens AI ਸਹਾਇਕ ਹਾਂ। ਭਾਰਤ ਸਰਕਾਰ ਦੀਆਂ ਭਲਾਈ ਯੋਜਨਾਵਾਂ ਬਾਰੇ ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। "
                  "ਸਕੀਮ ਮੈਚਰ ਵਰਤ ਕੇ ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਨਾਲ ਮੇਲ ਖਾਂਦੀਆਂ ਯੋਜਨਾਵਾਂ ਲੱਭੋ!"
        }
        
        return jsonify({
            "reply": fallbacks.get(detected_lang, fallbacks["en"]),
            "language": detected_lang,
            "bcp47": bcp47,
            "source": "offline-assistant"
        }), 200

    return jsonify({
        "reply": reply,
        "language": detected_lang,
        "bcp47": bcp47,
        "model": success_model
    }), 200
