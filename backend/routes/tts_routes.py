import io
import logging
from flask import Blueprint, request, send_file, jsonify
from gtts import gTTS

logger = logging.getLogger(__name__)

tts_bp = Blueprint("tts", __name__)

# gTTS supported Indian languages (verified)
GTTS_SUPPORTED = {"en", "hi", "bn", "te", "mr", "ta", "gu", "kn", "ml"}

# Fallback map for unsupported languages
GTTS_FALLBACK = {
    "pa": "hi",  # Punjabi -> Hindi (closest supported)
}

@tts_bp.route("/api/tts", methods=["GET", "POST"])
def text_to_speech():
    """
    Generate Cloud TTS audio from text.
    Accepts GET (query params: text, lang) or POST (JSON: {text, lang}).
    Returns audio/mpeg stream.
    """
    try:
        text = None
        lang = "en"
        
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            text = data.get("text")
            lang = data.get("lang", "en")
        else:
            text = request.args.get("text")
            lang = request.args.get("lang", "en")

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Clean the language code (e.g., 'hi-IN' -> 'hi')
        gtts_lang = lang.split("-")[0].lower() if lang else "en"
        
        # Check fallback map
        if gtts_lang in GTTS_FALLBACK:
            logger.info(f"[TTS] Language '{gtts_lang}' not natively supported, using fallback '{GTTS_FALLBACK[gtts_lang]}'")
            gtts_lang = GTTS_FALLBACK[gtts_lang]
        
        # If still not in our supported set, fallback to English
        if gtts_lang not in GTTS_SUPPORTED:
            logger.warning(f"[TTS] Language '{gtts_lang}' unknown, falling back to 'en'.")
            gtts_lang = "en"

        logger.info(f"[TTS] Generating speech: lang={gtts_lang}, text_len={len(text)}")
        
        try:
            tts = gTTS(text=text, lang=gtts_lang)
        except Exception as synth_err:
            logger.warning(f"[TTS] Synthesis failed for '{gtts_lang}': {synth_err}. Falling back to English.")
            tts = gTTS(text=text, lang="en")

        # Write to memory buffer (no disk I/O)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)

        return send_file(
            fp,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )
        
    except Exception as e:
        logger.error(f"[TTS] Error generating speech: {e}")
        return jsonify({"error": str(e)}), 500
