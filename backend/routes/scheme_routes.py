"""
PolicyLens AI — Scheme Matcher Routes (Gemini AI Powered)
POST /api/schemes   — AI-powered scheme matching based on citizen profile
"""
import os
import json
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

logger = logging.getLogger(__name__)

scheme_bp = Blueprint("schemes", __name__)

# ── Scheme Result Cache ────────────────────────────────────────────────
# Key: "age:income:category:state:gender:lang"
# Value: (timestamp, results)
SCHEME_CACHE = {}
CACHE_EXPIRY = 3600  # 1 hour in seconds

LANG_NAMES = {
    "en": "English", "hi": "Hindi", "bn": "Bengali", "te": "Telugu",
    "mr": "Marathi", "ta": "Tamil", "gu": "Gujarati", "kn": "Kannada",
    "ml": "Malayalam", "pa": "Punjabi",
}
SYSTEM_PROMPT = """You are "PolicyLens AI Scheme Matcher" — an expert AI assistant specializing in Indian Government Welfare Schemes (Central + State level).

YOUR TASK:
Given a citizen's detailed profile, return a JSON array of ALL real, currently active Indian government schemes that this citizen is eligible for.

PROFILE FIELDS YOU WILL RECEIVE:
- Age, Annual Family Income, Caste Category, Gender, State
- Education Level, Occupation, Disability Status
- Marital Status, Number of Dependents
- Residence Type (Rural/Urban/Semi-Urban)
- Whether they hold a BPL (Below Poverty Line) card
- Whether they belong to a religious/linguistic Minority community

RULES:
1. Only include REAL schemes that are currently active in India (Central or State level) as of 2025-2026.
2. For each scheme, provide:
   - "name": Official scheme name
   - "ministry": Which ministry/department runs it
   - "type": One of ["Scholarship", "Subsidy", "Pension", "Insurance", "Housing", "Employment", "Loan", "Healthcare", "Agriculture", "Education"]
   - "benefit": What the citizen gets (e.g., "₹75,000/year scholarship")
   - "eligibility_summary": One-line summary of why this citizen qualifies
   - "official_url": The real government URL to apply (e.g., myscheme.gov.in link)
   - "match_score": A percentage (0-100) indicating how strongly this citizen matches
3. Sort results by match_score descending (best matches first).
4. Include Central (all-India) schemes AND state-specific schemes for the citizen's state.
5. Do NOT invent fake schemes. Only include schemes you are confident actually exist.
6. If income is above 8,00,000/year, exclude BPL-only schemes.
7. If category is SC/ST/OBC, include reservation-specific schemes.
8. If age is below 25, prioritize education/scholarship schemes.
9. If age is above 60, include pension and elderly welfare schemes.
10. If the citizen has a disability, include disability-specific welfare schemes (e.g., ADIP, DDRS, NHFDC loans).
11. If the citizen is a farmer or agriculture worker, include agricultural schemes (e.g., PM-KISAN, PMFBY).
12. If the citizen is a student, prioritize scholarship and education-related schemes.
13. If the citizen holds a BPL card, include BPL-specific schemes.
14. If the citizen belongs to a minority community, include minority welfare schemes.
15. If the citizen is a woman (Female gender), include women-specific schemes.
16. If the citizen is widowed, include widow pension and welfare schemes.
17. Consider the citizen's education level for skill development and higher education schemes.
18. Consider residence type (Rural/Urban) for location-specific schemes.
19. Return between 5 and 20 schemes maximum.

RESPONSE FORMAT:
Return ONLY valid JSON. No markdown, no explanation, no extra text, no code fences. Just the JSON array starting with [ and ending with ].
"""


def _get_gemini_model(model_name="gemini-2.0-flash-lite", api_key=None):
    """Lazily initialize and return the Gemini model."""
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
        
    try:
        import google.generativeai as genai
        if not api_key:
            logger.error("No Gemini API key found")
            return None
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(model_name)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini {model_name}: {e}")
        return None


def get_all_keys():
    """Parse GEMINI_API_KEYS or GEMINI_API_KEY from environment."""
    keys_str = os.environ.get("GEMINI_API_KEYS") or os.environ.get("GEMINI_API_KEY")
    if not keys_str:
        return []
    return [k.strip() for k in keys_str.split(",") if k.strip()]


# ---------------------------------------------------------------------------
# Comprehensive Rule-Based Fallback Scheme Database
# ---------------------------------------------------------------------------
FALLBACK_SCHEME_DB = [
    {
        "name": "PM-KISAN Samman Nidhi",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "type": "Subsidy",
        "benefit": "₹6,000 per year in 3 installments directly to bank account",
        "eligibility_summary": "For all small and marginal farmer families across India",
        "official_url": "https://pmkisan.gov.in/",
        "conditions": {"occupation": ["Farmer"], "max_income": 1000000}
    },
    {
        "name": "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
        "ministry": "Ministry of Health & Family Welfare",
        "type": "Healthcare",
        "benefit": "₹5 Lakh health cover per family per year for secondary and tertiary hospitalization",
        "eligibility_summary": "For economically weaker families with annual income below ₹5 Lakh",
        "official_url": "https://nha.gov.in/",
        "conditions": {"max_income": 500000}
    },
    {
        "name": "PM Ujjwala Yojana 2.0",
        "ministry": "Ministry of Petroleum & Natural Gas",
        "type": "Subsidy",
        "benefit": "Free LPG connection with first refill and stove",
        "eligibility_summary": "For women from BPL households without existing LPG connection",
        "official_url": "https://www.pmuy.gov.in/",
        "conditions": {"gender": ["Female"], "bpl_card": True, "max_income": 300000}
    },
    {
        "name": "PM Awas Yojana - Gramin (PMAY-G)",
        "ministry": "Ministry of Rural Development",
        "type": "Housing",
        "benefit": "₹1.20 Lakh (plains) / ₹1.30 Lakh (hilly areas) for house construction",
        "eligibility_summary": "For houseless and those living in kutcha/dilapidated houses in rural areas",
        "official_url": "https://pmayg.nic.in/",
        "conditions": {"residence": ["Rural"], "max_income": 300000}
    },
    {
        "name": "PM Awas Yojana - Urban (PMAY-U)",
        "ministry": "Ministry of Housing & Urban Affairs",
        "type": "Housing",
        "benefit": "Interest subsidy up to ₹2.67 Lakh on home loan OR house construction support",
        "eligibility_summary": "For urban poor families without a pucca house",
        "official_url": "https://pmaymis.gov.in/",
        "conditions": {"residence": ["Urban", "Semi-Urban"], "max_income": 1800000}
    },
    {
        "name": "National Social Assistance Programme - Old Age Pension (IGNOAPS)",
        "ministry": "Ministry of Rural Development",
        "type": "Pension",
        "benefit": "₹200-500/month pension for senior citizens BPL families",
        "eligibility_summary": "For citizens aged 60+ years belonging to BPL households",
        "official_url": "https://nsap.nic.in/",
        "conditions": {"min_age": 60, "max_income": 300000}
    },
    {
        "name": "PM Fasal Bima Yojana (PMFBY)",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "type": "Insurance",
        "benefit": "Crop insurance at 1.5-5% premium; full claim on crop failure",
        "eligibility_summary": "For all farmers growing notified crops in notified areas",
        "official_url": "https://pmfby.gov.in/",
        "conditions": {"occupation": ["Farmer"]}
    },
    {
        "name": "Post Matric Scholarship for SC Students",
        "ministry": "Ministry of Social Justice & Empowerment",
        "type": "Scholarship",
        "benefit": "Full tuition fee + maintenance allowance for higher education",
        "eligibility_summary": "For SC students pursuing post-matriculation education with family income < ₹2.5 Lakh",
        "official_url": "https://scholarships.gov.in/",
        "conditions": {"category": ["SC"], "max_income": 250000, "education": ["10th Pass", "12th Pass", "ITI / Diploma", "Graduate", "Post Graduate", "Professional Degree", "PhD"]}
    },
    {
        "name": "Post Matric Scholarship for ST Students",
        "ministry": "Ministry of Tribal Affairs",
        "type": "Scholarship",
        "benefit": "Full tuition fee + maintenance allowance for higher education",
        "eligibility_summary": "For ST students pursuing post-matriculation education with family income < ₹2.5 Lakh",
        "official_url": "https://scholarships.gov.in/",
        "conditions": {"category": ["ST"], "max_income": 250000, "education": ["10th Pass", "12th Pass", "ITI / Diploma", "Graduate", "Post Graduate", "Professional Degree", "PhD"]}
    },
    {
        "name": "Post Matric Scholarship for OBC Students",
        "ministry": "Ministry of Social Justice & Empowerment",
        "type": "Scholarship",
        "benefit": "Tuition fee + exam fee + maintenance allowance",
        "eligibility_summary": "For OBC students in post-matriculation with family income < ₹1 Lakh",
        "official_url": "https://scholarships.gov.in/",
        "conditions": {"category": ["OBC"], "max_income": 100000, "education": ["10th Pass", "12th Pass", "ITI / Diploma", "Graduate", "Post Graduate", "Professional Degree", "PhD"]}
    },
    {
        "name": "PM Scholarship Scheme for RPF/RPSF",
        "ministry": "Ministry of Railways",
        "type": "Scholarship",
        "benefit": "₹2,500/month (boys) to ₹3,000/month (girls) scholarship",
        "eligibility_summary": "For students aged 18-25 pursuing professional courses",
        "official_url": "https://scholarships.gov.in/",
        "conditions": {"min_age": 18, "max_age": 25, "education": ["12th Pass", "Graduate", "Post Graduate", "Professional Degree"]}
    },
    {
        "name": "Mahatma Gandhi National Rural Employment Guarantee Act (MGNREGA)",
        "ministry": "Ministry of Rural Development",
        "type": "Employment",
        "benefit": "100 days guaranteed wage employment per year at ₹250-350/day",
        "eligibility_summary": "For adult members of rural households willing to do unskilled manual work",
        "official_url": "https://nrega.nic.in/",
        "conditions": {"min_age": 18, "residence": ["Rural"]}
    },
    {
        "name": "PM Mudra Yojana (PMMY)",
        "ministry": "Ministry of Finance",
        "type": "Loan",
        "benefit": "Collateral-free business loans up to ₹10 Lakh (Shishu/Kishore/Tarun)",
        "eligibility_summary": "For non-corporate, non-farm small/micro enterprises and self-employed individuals",
        "official_url": "https://www.mudra.org.in/",
        "conditions": {"occupation": ["Self-Employed", "Daily Wage Laborer", "Skilled Worker", "Unemployed"]}
    },
    {
        "name": "Sukanya Samriddhi Yojana",
        "ministry": "Ministry of Finance",
        "type": "Subsidy",
        "benefit": "High interest rate savings (8.2%) + tax benefits under 80C for girl child future",
        "eligibility_summary": "For parents/guardians of girl children below age 10",
        "official_url": "https://www.nsiindia.gov.in/",
        "conditions": {"gender": ["Female"], "max_age": 10}
    },
    {
        "name": "Beti Bachao Beti Padhao",
        "ministry": "Ministry of Women & Child Development",
        "type": "Education",
        "benefit": "Awareness + financial support to promote girl child education and welfare",
        "eligibility_summary": "For girl children to ensure they receive education and equal opportunities",
        "official_url": "https://wcd.nic.in/bbbp-schemes",
        "conditions": {"gender": ["Female"], "max_age": 25}
    },
    {
        "name": "PM Matru Vandana Yojana (PMMVY)",
        "ministry": "Ministry of Women & Child Development",
        "type": "Subsidy",
        "benefit": "₹11,000 cash incentive for first live birth (₹6,000 for 2nd girl child)",
        "eligibility_summary": "For pregnant & lactating women for first live birth in the family",
        "official_url": "https://pmmvy.wcd.gov.in/",
        "conditions": {"gender": ["Female"], "min_age": 19, "max_age": 50}
    },
    {
        "name": "Stand Up India",
        "ministry": "Ministry of Finance",
        "type": "Loan",
        "benefit": "Bank loans between ₹10 Lakh and ₹1 Crore for enterprise setup",
        "eligibility_summary": "For SC/ST and women entrepreneurs to set up greenfield enterprises",
        "official_url": "https://www.standupmitra.in/",
        "conditions": {"category": ["SC", "ST"], "min_age": 18}
    },
    {
        "name": "Stand Up India (Women)",
        "ministry": "Ministry of Finance",
        "type": "Loan",
        "benefit": "Bank loans between ₹10 Lakh and ₹1 Crore for new enterprise",
        "eligibility_summary": "For women entrepreneurs to set up greenfield manufacturing or services enterprise",
        "official_url": "https://www.standupmitra.in/",
        "conditions": {"gender": ["Female"], "min_age": 18}
    },
    {
        "name": "PM Vishwakarma Yojana",
        "ministry": "Ministry of Micro, Small and Medium Enterprises",
        "type": "Loan",
        "benefit": "Skill training + toolkit + collateral-free loans up to ₹3 Lakh at 5% interest",
        "eligibility_summary": "For artisans and craftspeople working in traditional trades",
        "official_url": "https://pmvishwakarma.gov.in/",
        "conditions": {"occupation": ["Self-Employed", "Skilled Worker", "Daily Wage Laborer"]}
    },
    {
        "name": "Atal Pension Yojana (APY)",
        "ministry": "Ministry of Finance",
        "type": "Pension",
        "benefit": "Guaranteed pension of ₹1,000 to ₹5,000/month after age 60",
        "eligibility_summary": "For unorganized sector workers aged 18-40 years",
        "official_url": "https://www.npscra.nsdl.co.in/scheme-details.php",
        "conditions": {"min_age": 18, "max_age": 40, "occupation": ["Self-Employed", "Daily Wage Laborer", "Farmer", "Homemaker", "Skilled Worker", "Unemployed"]}
    },
    {
        "name": "PM Jeevan Jyoti Bima Yojana (PMJJBY)",
        "ministry": "Ministry of Finance",
        "type": "Insurance",
        "benefit": "₹2 Lakh life insurance cover for just ₹436/year premium",
        "eligibility_summary": "For all citizens aged 18-50 years with a bank account",
        "official_url": "https://jansuraksha.gov.in/",
        "conditions": {"min_age": 18, "max_age": 50}
    },
    {
        "name": "PM Suraksha Bima Yojana (PMSBY)",
        "ministry": "Ministry of Finance",
        "type": "Insurance",
        "benefit": "₹2 Lakh accidental death + disability insurance for just ₹20/year",
        "eligibility_summary": "For all citizens aged 18-70 years with a bank account",
        "official_url": "https://jansuraksha.gov.in/",
        "conditions": {"min_age": 18, "max_age": 70}
    },
    {
        "name": "National Handicapped Finance & Development Corporation (NHFDC) Loans",
        "ministry": "Ministry of Social Justice & Empowerment",
        "type": "Loan",
        "benefit": "Concessional loans up to ₹25 Lakh for self-employment and education",
        "eligibility_summary": "For persons with disabilities (40%+ disability certificate)",
        "official_url": "https://nhfdc.nic.in/",
        "conditions": {"disability": True}
    },
    {
        "name": "Assistance to Disabled Persons (ADIP) Scheme",
        "ministry": "Ministry of Social Justice & Empowerment",
        "type": "Subsidy",
        "benefit": "Free aids and appliances (wheelchairs, hearing aids, artificial limbs, etc.)",
        "eligibility_summary": "For persons with disabilities with income below ₹20,000/month",
        "official_url": "https://www.nhfdc.nic.in/",
        "conditions": {"disability": True, "max_income": 240000}
    },
    {
        "name": "PM Widow Pension Scheme (IGNWPS)",
        "ministry": "Ministry of Rural Development",
        "type": "Pension",
        "benefit": "₹300-500/month pension for widows from BPL families",
        "eligibility_summary": "For widowed women aged 40-79 from BPL households",
        "official_url": "https://nsap.nic.in/",
        "conditions": {"gender": ["Female"], "marital_status": ["Widowed"], "min_age": 40, "max_income": 300000}
    },
    {
        "name": "Minority Scholarship - Pre-Matric & Post-Matric",
        "ministry": "Ministry of Minority Affairs",
        "type": "Scholarship",
        "benefit": "Tuition fees + maintenance allowance for students from minority communities",
        "eligibility_summary": "For minority community students with family income < ₹2 Lakh",
        "official_url": "https://scholarships.gov.in/",
        "conditions": {"minority": True, "max_income": 200000, "max_age": 30}
    },
    {
        "name": "National Means-cum-Merit Scholarship (NMMSS)",
        "ministry": "Ministry of Education",
        "type": "Scholarship",
        "benefit": "₹12,000 per year scholarship for meritorious students",
        "eligibility_summary": "For economically weaker students studying in Class 9-12 with family income < ₹3.5 Lakh",
        "official_url": "https://scholarships.gov.in/",
        "conditions": {"max_income": 350000, "max_age": 20, "education": ["Below 10th", "10th Pass", "12th Pass"]}
    },
    {
        "name": "PM SVANidhi - Street Vendor's AtmaNirbhar Nidhi",
        "ministry": "Ministry of Housing & Urban Affairs",
        "type": "Loan",
        "benefit": "Working capital loan up to ₹50,000 with 7% interest subsidy",
        "eligibility_summary": "For street vendors in urban areas to restart livelihood",
        "official_url": "https://pmsvanidhi.mohua.gov.in/",
        "conditions": {"occupation": ["Self-Employed", "Daily Wage Laborer"], "residence": ["Urban", "Semi-Urban"]}
    },
    {
        "name": "Pradhan Mantri Garib Kalyan Anna Yojana (PMGKAY)",
        "ministry": "Ministry of Consumer Affairs",
        "type": "Subsidy",
        "benefit": "5 kg free foodgrains per person per month (rice/wheat)",
        "eligibility_summary": "For all Antyodaya & priority households under NFSA",
        "official_url": "https://nfsa.gov.in/",
        "conditions": {"max_income": 300000}
    },
    {
        "name": "PM Kisan Maandhan Yojana",
        "ministry": "Ministry of Agriculture & Farmers Welfare",
        "type": "Pension",
        "benefit": "₹3,000/month pension after age 60 for small/marginal farmers",
        "eligibility_summary": "For small and marginal farmers aged 18-40 years",
        "official_url": "https://pmkmy.gov.in/",
        "conditions": {"occupation": ["Farmer"], "min_age": 18, "max_age": 40, "max_income": 500000}
    },
]

def _get_rule_based_schemes(age, income, category, gender, state, education,
                            occupation, disability, marital_status, residence,
                            bpl_card, minority, dependents):
    """
    Rule-based fallback: filter the scheme database against the citizen's profile.
    Returns matched schemes sorted by match_score descending.
    """
    matched = []
    
    for scheme in FALLBACK_SCHEME_DB:
        cond = scheme["conditions"]
        score = 70  # Base score
        disqualified = False
        
        # Check maximum income
        if "max_income" in cond and income > cond["max_income"]:
            disqualified = True
        
        # Check minimum age
        if "min_age" in cond and age < cond["min_age"]:
            disqualified = True
        
        # Check maximum age
        if "max_age" in cond and age > cond["max_age"]:
            disqualified = True
        
        # Check gender
        if "gender" in cond and gender not in cond["gender"]:
            disqualified = True
        
        # Check category (caste)
        if "category" in cond and category not in cond["category"]:
            disqualified = True
        
        # Check occupation
        if "occupation" in cond and occupation not in cond["occupation"]:
            disqualified = True
        
        # Check residence
        if "residence" in cond and residence not in cond["residence"]:
            disqualified = True
        
        # Check education
        if "education" in cond and education not in cond["education"]:
            disqualified = True
        
        # Check marital_status
        if "marital_status" in cond and marital_status not in cond["marital_status"]:
            disqualified = True
        
        # Check BPL card
        if "bpl_card" in cond and cond["bpl_card"] is True and bpl_card != True and bpl_card != "Yes":
            disqualified = True
        
        # Check minority
        if "minority" in cond and cond["minority"] is True and minority != True and minority != "Yes":
            disqualified = True
        
        # Check disability
        if "disability" in cond and cond["disability"] is True:
            if not disability or disability == "None" or disability == "":
                disqualified = True
        
        if disqualified:
            continue
        
        # ── Calculate match score based on how many conditions match ──
        bonus = 0
        if "max_income" in cond:
            # Lower income = better match for welfare schemes
            ratio = 1 - (income / cond["max_income"])
            bonus += int(ratio * 15)
        
        if "category" in cond:
            bonus += 8  # Category-specific scheme = strong match
        
        if "gender" in cond:
            bonus += 5
        
        if "occupation" in cond:
            bonus += 5
        
        if "disability" in cond:
            bonus += 10
        
        if "minority" in cond:
            bonus += 8
        
        score = min(98, score + bonus)
        
        matched.append({
            "name": scheme["name"],
            "ministry": scheme["ministry"],
            "type": scheme["type"],
            "benefit": scheme["benefit"],
            "eligibility_summary": scheme["eligibility_summary"],
            "official_url": scheme["official_url"],
            "match_score": score,
        })
    
    # Sort by match_score descending
    matched.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Return top 20
    return matched[:20]


# ---------------------------------------------------------------------------
# POST /api/schemes — AI-powered scheme matching
# ---------------------------------------------------------------------------
@scheme_bp.route("/api/schemes", methods=["POST"])
@jwt_required()
def match_schemes():
    """Use Gemini AI to find real government schemes matching a citizen's profile."""
    claims = get_jwt()
    if claims.get("role") != "Citizen":
        return jsonify({"error": "Access denied — Citizens only"}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    # Extract citizen profile
    age = data.get("age")
    income = data.get("income")
    category = data.get("category")
    gender = data.get("gender", "Not specified")
    state = data.get("state", "Not specified")
    education = data.get("education", "Not specified")
    occupation = data.get("occupation", "Not specified")
    disability = data.get("disability", "None")
    marital_status = data.get("marital_status", "Not specified")
    residence = data.get("residence", "Not specified")
    bpl_card = data.get("bpl_card", False)
    minority = data.get("minority", False)
    dependents = data.get("dependents", 0)

    language = data.get("language", "en")
    lang_name = LANG_NAMES.get(language, "English")

    if not all([age, income, category]):
        return jsonify({"error": "age, income, and category are required"}), 400

    # Build language instruction
    lang_instruction = ""
    if language != "en":
        lang_instruction = f"""\n\nIMPORTANT LANGUAGE INSTRUCTION:
The user's preferred language is {lang_name}.
You MUST translate all text fields into {lang_name}. This includes "name", "ministry", "benefit", and "eligibility_summary".
For example, translate the scheme name and the ministry name fully into {lang_name}.
Keep the JSON keys exactly in English (e.g., "name", "ministry", "type")."""

    user_prompt = f"""Find all eligible government schemes for this Indian citizen:

— BASIC INFO —
- Age: {age}
- Annual Family Income: ₹{income}
- Caste Category: {category}
- Gender: {gender}
- State: {state}

— EDUCATION & WORK —
- Education Level: {education}
- Occupation: {occupation}

— PERSONAL DETAILS —
- Marital Status: {marital_status}
- Number of Dependents: {dependents}
- Disability: {disability}
- Residence Type: {residence}
- BPL Card Holder: {'Yes' if bpl_card else 'No'}
- Minority Community: {'Yes' if minority else 'No'}
{lang_instruction}

Return the JSON array of matching schemes."""

    # ── Check Cache First ──
    import time
    # Include ALL filter fields in cache key so different combos get different results
    cache_key = f"{age}:{income}:{category}:{state}:{gender}:{education}:{occupation}:{disability}:{marital_status}:{residence}:{bpl_card}:{minority}:{dependents}:{language}"
    cached_data = SCHEME_CACHE.get(cache_key)
    if cached_data:
        timestamp, results = cached_data
        if time.time() - timestamp < CACHE_EXPIRY:
            logger.info(f"[SCHEMES] Returning cached results for cache key")
            return jsonify({"schemes": results, "source": "cache"}), 200

    # ── RESILIENT MODEL CALL LOOP (Multi-Key + Multi-Model Rotation) ──
    available_keys = get_all_keys()
    
    models_to_try = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]
    raw_text = None
    success_model = None
    
    if available_keys:
        for model_name in models_to_try:
            if raw_text: break
            
            for key in available_keys:
                if raw_text: break
                
                logger.info(f"[SCHEMES] Trying {model_name} with key {key[:8]}...")
                model = _get_gemini_model(model_name, api_key=key)
                if not model: continue
                
                try:
                    response = model.generate_content(
                        [SYSTEM_PROMPT, user_prompt],
                        request_options={"timeout": 5}
                    )
                    raw_text = response.text.strip()
                    # Clean up markdown code fences
                    if raw_text.startswith("```"):
                        lines = raw_text.split("\n")
                        lines = [l for l in lines if not l.strip().startswith("```")]
                        raw_text = "\n".join(lines)
                    
                    success_model = model_name
                    logger.info(f"[SCHEMES] Success with {model_name} using key {key[:8]}")
                    break
                except Exception as e:
                    err_msg = str(e)
                    if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                        logger.warning(f"[SCHEMES] Key {key[:8]} rate limited on {model_name}. Trying next...")
                        import time
                        time.sleep(1)
                        continue
                    else:
                        logger.error(f"[SCHEMES] Error with {model_name}: {err_msg[:100]}")
                        break

    if not raw_text:
        # ── Comprehensive Rule-Based Fallback ──
        logger.info("[SCHEMES] All AI models unavailable. Using rule-based fallback.")
        fallback_schemes = _get_rule_based_schemes(
            age=int(age), income=int(income), category=category, gender=gender,
            state=state, education=education, occupation=occupation,
            disability=disability, marital_status=marital_status,
            residence=residence, bpl_card=bpl_card, minority=minority,
            dependents=int(dependents) if dependents else 0
        )
        SCHEME_CACHE[cache_key] = (time.time(), fallback_schemes)
        return jsonify({"schemes": fallback_schemes, "source": "rule-based-fallback"}), 200

    try:
        schemes = json.loads(raw_text)
        # Store in cache
        SCHEME_CACHE[cache_key] = (time.time(), schemes)
        return jsonify({"schemes": schemes, "source": "gemini-ai", "model": success_model}), 200
    except json.JSONDecodeError as e:
        logger.error("Gemini returned invalid JSON: %s", e)
        return jsonify({"error": "AI returned invalid data.", "raw": raw_text[:500]}), 500
    except Exception as e:
        logger.error("Error processing schemes: %s", e)
        return jsonify({"error": str(e)}), 500
