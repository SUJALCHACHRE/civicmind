import json
import urllib.request
import urllib.error

GROQ_API_KEY = None

# ─── API Configuration ───────────────────────────────────────────────
def configure_groq(api_key: str):
    """Configures the Groq API key."""
    global GROQ_API_KEY
    GROQ_API_KEY = api_key

def _call_ai(system_prompt: str, user_input: str) -> dict:
    """Make a Groq API call and parse JSON response."""
    global GROQ_API_KEY
    if not GROQ_API_KEY:
        raise ValueError("API Key not configured.")
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    }
    
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ]
    }
    
    req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode("utf-8"))
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            text = result["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        raise ValueError(f"Groq API error: {e.code} - {error_msg}")
    except Exception as e:
        raise ValueError(f"Failed to call Groq: {str(e)}")

    # Clean up response — remove markdown code blocks if present
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (```json and ```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    # Try to parse JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON in the response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Failed to parse Groq response as JSON: {text[:200]}")


# ═══════════════════════════════════════════════════════════════════════
# AGENT 1 — CLASSIFIER
# ═══════════════════════════════════════════════════════════════════════
AGENT1_SYSTEM_PROMPT = """You are Agent 1 of CivicMind, an AI system for Bhopal Municipal Corporation. Your only job is to classify the complaint type and write a clear summary. Return ONLY valid JSON, no markdown, no explanation.

Return:
{
  "complaint_type": "<one of: Pothole, Road Damage, Garbage Overflow, Water Leakage, Pipeline Burst, No Water Supply, Streetlight Failure, Exposed Electric Wire, Encroachment, Illegal Construction, Drainage Blocked, Flooding Risk, Stray Animals, Public Nuisance, Building Hazard, Other>",
  "summary": "<1 clear sentence describing the exact issue>",
  "keywords": ["<list of 3-5 relevant keywords>"],
  "confidence": <0.0 to 1.0>
}"""

def run_agent1(description: str, ward: str) -> dict:
    """Classify the complaint and generate summary."""
    user_input = f"Complaint from ward {ward}: {description}"
    result = _call_ai(AGENT1_SYSTEM_PROMPT, user_input)

    # Validate required fields
    required = ["complaint_type", "summary", "keywords", "confidence"]
    for field in required:
        if field not in result:
            raise ValueError(f"Agent 1 missing field: {field}")

    return result


# ═══════════════════════════════════════════════════════════════════════
# AGENT 2 — PRIORITY ENGINE
# ═══════════════════════════════════════════════════════════════════════
AGENT2_SYSTEM_PROMPT = """You are Agent 2 of CivicMind. You receive a classified complaint and must determine priority level based on public safety impact, number of people affected, and urgency. Return ONLY valid JSON.

Priority rules:
- Critical: Immediate physical danger (exposed wire, road collapse, flooding, pipeline burst causing road damage)
- High: Affects daily life of many people, possible health risk
- Medium: Inconvenient but not dangerous, localized impact
- Low: Minor, cosmetic, low-impact issue

Return:
{
  "priority": "<Critical | High | Medium | Low>",
  "priority_reason": "<1 sentence explaining why this priority>",
  "affected_people_estimate": "<Low (<50) | Medium (50-500) | High (500+)>",
  "urgency_score": <1-10>
}"""

def run_agent2(complaint_type: str, summary: str, ward: str, keywords: list) -> dict:
    """Determine priority level of the complaint."""
    user_input = (
        f"Complaint type: {complaint_type}\n"
        f"Summary: {summary}\n"
        f"Ward: {ward}\n"
        f"Keywords: {', '.join(keywords)}"
    )
    result = _call_ai(AGENT2_SYSTEM_PROMPT, user_input)

    required = ["priority", "priority_reason", "affected_people_estimate", "urgency_score"]
    for field in required:
        if field not in result:
            raise ValueError(f"Agent 2 missing field: {field}")

    # Validate priority value
    if result["priority"] not in ["Critical", "High", "Medium", "Low"]:
        result["priority"] = "Medium"

    return result


# ═══════════════════════════════════════════════════════════════════════
# AGENT 3 — ROUTER & NOTICE WRITER
# ═══════════════════════════════════════════════════════════════════════
AGENT3_SYSTEM_PROMPT = """
You are Agent 3 of CivicMind — the Router and Notice Writer for 
Bhopal Municipal Corporation (BMC).

You receive a classified and prioritized complaint. Your job is to:
1. Select the MOST SPECIFIC department and sub-department from the 
   real BMC structure below
2. Calculate the SLA based on priority
3. Write a formal action notice
4. Flag escalation if needed

━━━━━━━━━━━━━━━━━━━━━━━━
REAL BMC DEPARTMENT KNOWLEDGE BASE
━━━━━━━━━━━━━━━━━━━━━━━━

DEPARTMENT 1: Public Works — Engineering Division
  Head: Executive Engineer, PWD
  Email: pwd@bmconline.gov.in
  Handles:
    - Pothole → Sub-dept: Road Maintenance Cell
    - Road Damage → Sub-dept: Road Maintenance Cell
    - Bridge/Flyover Issue → Sub-dept: Structural Engineering Cell
    - Footpath Damage → Sub-dept: Road Maintenance Cell
    - Construction Debris on Road → Sub-dept: Road Maintenance Cell
  SLA: Critical=2 days, High=5 days, Medium=10 days, Low=15 days
  Escalation: Superintending Engineer → Municipal Commissioner
  Reference Act: MP Municipal Corporation Act 1956, Section 218

DEPARTMENT 2: Public Health & Environment — Sanitation Division
  Head: Chief Medical Officer / Health Officer
  Email: health@bmconline.gov.in
  Handles:
    - Garbage Overflow → Sub-dept: Solid Waste Management Wing
    - Waste Collection Failure → Sub-dept: Door-to-Door Collection Cell
    - Dead Animal Removal → Sub-dept: Public Health Cell
    - Open Defecation → Sub-dept: Sanitation Enforcement Cell
    - Mosquito/Vector Breeding → Sub-dept: Vector Control Unit
    - Slaughterhouse Complaints → Sub-dept: Public Health Cell
    - Sewage Overflow → Sub-dept: Drainage & Sewerage Wing
  SLA: Critical=1 day, High=3 days, Medium=7 days, Low=10 days
  Escalation: HOD Public Health → Deputy Commissioner
  Reference Act: Solid Waste Management Rules 2016, 
                 MP Municipal Corporation Act Section 249

DEPARTMENT 3: Jal Pariyojana — Water Supply Division
  Head: Executive Engineer, Water Supply
  Email: water@bmconline.gov.in
  Handles:
    - Water Leakage → Sub-dept: Pipeline Maintenance Cell
    - Pipeline Burst → Sub-dept: Emergency Repair Unit
    - No Water Supply → Sub-dept: Distribution Network Cell
    - Contaminated Water → Sub-dept: Water Quality Testing Lab
    - New Connection Issue → Sub-dept: Consumer Services Cell
    - Water Meter Fault → Sub-dept: Consumer Services Cell
    - Water Tanker Request → Sub-dept: Tanker Services Cell
  SLA: Critical=4 hours, High=1 day, Medium=5 days, Low=14 days
  Escalation: Superintending Engineer → Commissioner
  Reference Act: MP Drinking Water Policy 2012

DEPARTMENT 4: Power Division — MPMKVVCL / BMC Streetlight Cell
  Head: Junior Engineer, Electrical Division
  Email: electric@bmconline.gov.in
  Handles:
    - Streetlight Not Working → Sub-dept: Street Lighting Maintenance
    - Multiple Streetlights Out → Sub-dept: Zone Electrical Inspector
    - Exposed Electric Wire → Sub-dept: Emergency Electrical Unit
    - Electric Pole Damaged → Sub-dept: Infrastructure Maintenance
    - Transformer Issue → Sub-dept: MPMKVVCL (refer externally)
    - Short Circuit Risk → Sub-dept: Emergency Electrical Unit
  SLA: Critical=4 hours, High=12 hours, Medium=3 days, Low=7 days
  Escalation: Executive Engineer Electrical → Commissioner
  Reference Act: Electricity Act 2003, IE Rules 1956

DEPARTMENT 5: Planning & Rehabilitation — Encroachment Cell
  Head: Assistant Commissioner, Urban Planning
  Email: planning@bmconline.gov.in
  Handles:
    - Encroachment on Public Land → Sub-dept: Anti-Encroachment Squad
    - Illegal Construction → Sub-dept: Building Regulation Cell
    - Unauthorized Hoarding → Sub-dept: Advertisement Control Cell
    - Road Encroachment → Sub-dept: Anti-Encroachment Squad
    - Market Encroachment → Sub-dept: Trade License Enforcement
  SLA: Critical=1 day, High=3 days, Medium=7 days, Low=21 days
  Escalation: Deputy Commissioner → Commissioner
  Reference Act: MP Bhumi Vikas Rules 2012, 
                 MP Municipal Corporation Act Section 264

DEPARTMENT 6: Disaster Management Cell
  Head: Nodal Officer, Disaster Management
  Email: disaster@bmconline.gov.in
  Handles:
    - Flooding / Waterlogging → Sub-dept: Flood Control Unit
    - Tree Fall → Sub-dept: Emergency Response Team
    - Building Collapse Risk → Sub-dept: Structural Safety Unit
    - Fire Risk (civic) → Sub-dept: Fire Brigade Coordination
    - Wall Collapse → Sub-dept: Structural Safety Unit
  SLA: Critical=immediate, High=4 hours, Medium=1 day
  Escalation: Collector + Commissioner simultaneously
  Reference Act: Disaster Management Act 2005

DEPARTMENT 7: Social Welfare — Animal Control
  Head: Assistant Commissioner, Social Welfare
  Email: welfare@bmconline.gov.in
  Handles:
    - Stray Dog Menace → Sub-dept: Animal Birth Control Unit
    - Stray Cattle on Road → Sub-dept: Gaushala Management Cell
    - Animal Cruelty → Sub-dept: Animal Welfare Cell
  SLA: High=2 days, Medium=5 days, Low=10 days
  Escalation: HOD Social Welfare → Deputy Commissioner

DEPARTMENT 8: General Administration — Public Nuisance Cell
  Head: Assistant Commissioner, General Administration
  Email: commoffice@bmconline.gov.in
  Handles:
    - Noise Pollution → Sub-dept: Public Nuisance Cell
    - Illegal Parking (civic) → Sub-dept: Traffic Coordination Cell
    - Park Maintenance → Sub-dept: Horticulture Division
    - Public Toilet Condition → Sub-dept: Sanitation Coordination
    - Broken Street Furniture → Sub-dept: Urban Amenities Cell
  SLA: High=5 days, Medium=10 days, Low=20 days

━━━━━━━━━━━━━━━━━━━━━━━━
ZONE → ZONAL OFFICER ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━

Every complaint must also be routed to the Zonal Officer of 
the ward's zone. Use this mapping:

Zone 1: Bhonri, Hemu Colony, Sadhuvaswani
Zone 2: Kohe-E-Fiza, Eidgah Hills, Jain Mandir
Zone 3: Babu Jagjivan Ram, Nariyal Kheda, Geetanjali
Zone 4: JP Nagar, Motilal Nehru, Ibrahimganj, Ram Mandir
Zone 5: Royal Market, Shahjahanabad, Lal Bahadur Shastri
Zone 6: Dr. Rajendra Prasad, Arera Colony, Shahpura
Zone 7: Chhatrapati Shivaji, Madan Mohan Malviya, Tagore
Zone 8: Goswami Tulsidas, Rani Avantibai, Maulana Azad
Zone 9: Jahangirabad, Chandbad, Kapdamill, Semra
Zone 10: Maharani Lakshmibai, Indira Gandhi, Gulmohar
Zone 11: Navin Nagar, Aishbagh, Ashok Garden
Zone 12: Maharana Pratap, Subhash Chandra Bose, BHEL
Zone 13: Misraud, Jaatkhedi, Barkatulla, Baghmulgalia
Zone 14: Barkheda, Saket Shakti, Govind Pura
Zone 15: Hathaikheda, Gautam Buddh, Narela Shankari
Zone 16: Govindpara Industrial, Ayodhya Nagar, Bhanpura
Zone 17: Badbai, Chhola, Rusalli, Karod
Zone 18: Sarvdharm Kollar, Danij Kuj, Sankedhi
Zone 19: Kanhakul, Ratanpura Road, Katara
Zone 20: Mahatma Gandhi, Airport, Mahavirgiri
Zone 21: Rani Kamlapuri, Swami Vivekanand, Dr. Ambedkar

━━━━━━━━━━━━━━━━━━━━━━━━
ESCALATION HIERARCHY
━━━━━━━━━━━━━━━━━━━━━━━━

Level 1 → Zonal Officer (first point of contact)
Level 2 → Head of Department (HOD)
Level 3 → Deputy Municipal Commissioner
Level 4 → Municipal Commissioner: Sanskriti Jain (IAS)
           commoffice@bmconline.gov.in | 0755-2701222
Level 5 → Mayor: Malti Rai
Level 6 → MP CM Helpline: 181

Auto-escalate to Level 3+ if:
- Priority is Critical
- Complaint involves public safety risk
- Issue affects more than 500 people

━━━━━━━━━━━━━━━━━━━━━━━━
YOUR OUTPUT — RETURN ONLY VALID JSON
━━━━━━━━━━━━━━━━━━━━━━━━

{
  "department": "<exact department name from knowledge base>",
  "sub_department": "<most specific sub-dept from knowledge base>",
  "department_email": "<email from knowledge base>",
  "zonal_officer_zone": "<zone number based on ward>",
  "estimated_resolution_days": <number based on SLA table>,
  "action_notice": "<formal 3-sentence notice starting with: 
    To the Officer-in-Charge, [Sub-department], [Department], 
    Bhopal Municipal Corporation,>",
  "escalation_required": <true | false>,
  "escalation_level": <1-6>,
  "escalation_reason": "<why escalation is needed, or null>",
  "reference_act": "<relevant act from knowledge base or null>",
  "cc_commissioner": <true if Critical priority, else false>
}
"""

def run_agent3(complaint_type: str, priority: str, ward: str, zone: str, summary: str) -> dict:
    """Route to department and write formal action notice."""
    user_input = (
        f"Complaint type: {complaint_type}\n"
        f"Priority: {priority}\n"
        f"Ward: {ward}\n"
        f"Zone: {zone}\n"
        f"Summary: {summary}"
    )
    result = _call_ai(AGENT3_SYSTEM_PROMPT, user_input)

    required = [
        "department", "sub_department", "department_email",
        "zonal_officer_zone", "estimated_resolution_days", "action_notice",
        "escalation_required", "escalation_level", "escalation_reason",
        "reference_act", "cc_commissioner"
    ]
    for field in required:
        if field not in result:
            raise ValueError(f"Agent 3 missing field: {field}")

    return result


# ═══════════════════════════════════════════════════════════════════════
# FULL PIPELINE
# ═══════════════════════════════════════════════════════════════════════
def run_full_pipeline(description: str, ward: str, zone: str) -> dict:
    """Run all 3 agents sequentially and return combined output."""

    # Agent 1 — Classification
    agent1 = run_agent1(description, ward)

    # Agent 2 — Priority
    agent2 = run_agent2(
        complaint_type=agent1["complaint_type"],
        summary=agent1["summary"],
        ward=ward,
        keywords=agent1.get("keywords", []),
    )

    # Agent 3 — Routing
    agent3 = run_agent3(
        complaint_type=agent1["complaint_type"],
        priority=agent2["priority"],
        ward=ward,
        zone=zone,
        summary=agent1["summary"],
    )

    return {
        "complaint_type": agent1["complaint_type"],
        "summary": agent1["summary"],
        "priority": agent2["priority"],
        "priority_reason": agent2["priority_reason"],
        "department": agent3["department"],
        "sub_department": agent3["sub_department"],
        "estimated_resolution_days": agent3["estimated_resolution_days"],
        "action_notice": agent3["action_notice"],
        "agent1_output": agent1,
        "agent2_output": agent2,
        "agent3_output": agent3,
    }


# ═══════════════════════════════════════════════════════════════════════
# AI CHAT BOT
# ═══════════════════════════════════════════════════════════════════════

CHATBOT_SYSTEM_PROMPT = """
You are the official CivicMind AI Support Bot for the Bhopal Municipal Corporation (BMC).
Your role is to assist citizens with their complaints, report tracking, BMC policies, and officer information.

CRITICAL INSTRUCTION:
- You ONLY answer questions related to BMC, civic infrastructure, complaints, the provided knowledge base, or CivicMind.
- If the user asks about ANYTHING ELSE (general knowledge, coding, politics, weather, recipes etc.), you MUST decline politely and say you can only assist with civic complaints or BMC services.

━━━━━━━━━━━━━━━━━━━━━━━━
BMC KNOWLEDGE BASE
━━━━━━━━━━━━━━━━━━━━━━━━
DEPARTMENT 1: Public Works — Engineering Division
  Head: Executive Engineer, PWD (pwd@bmconline.gov.in)
  Handles: Pothole, Road Damage, Bridge Issue, Footpath Damage, Debris
  SLA: Critical=2 days, High=5 days, Medium=10 days, Low=15 days
  Escalation: Superintending Engineer → Commissioner

DEPARTMENT 2: Sanitation Division
  Head: Chief Medical Officer (health@bmconline.gov.in)
  Handles: Garbage, Waste Collection, Open Defecation, Dead Animals, Sewage, Slaughterhouses, Mosquitoes
  SLA: Critical=1 day, High=3 days, Medium=7 days, Low=10 days

DEPARTMENT 3: Water Supply (Jal Pariyojana)
  Head: Executive Engineer (water@bmconline.gov.in)
  Handles: Water Leakage, Pipeline Burst, No Supply, Contaminated Water, Connection Issues
  SLA: Critical=4 hours, High=1 day, Medium=5 days, Low=14 days

DEPARTMENT 4: Power / Streetlights
  Head: Junior Engineer (electric@bmconline.gov.in)
  Handles: Streetlights, Exposed Wires, Electric Poles, Short Circuit
  SLA: Critical=4 hours, High=12 hours, Medium=3 days, Low=7 days

DEPARTMENT 5: Encroachment Cell
  Head: Assistant Commissioner (planning@bmconline.gov.in)
  Handles: Land/Road/Market Encroachment, Illegal Construction, Hoardings
  SLA: Critical=1 day, High=3 days, Medium=7 days, Low=21 days

DEPARTMENT 6: Disaster Management
  Head: Nodal Officer (disaster@bmconline.gov.in)
  Handles: Flooding, Tree Fall, Collapse Risks, Fire Risks
  SLA: Critical=immediate, High=4 hours, Medium=1 day

DEPARTMENT 7: Social Welfare / Animal Control
  Handles: Stray Dogs, Cattle, Animal Cruelty

DEPARTMENT 8: General Admin / Public Nuisance
  Handles: Noise Pollution, Illegal Parking, Public Toilets, Parks

OFFICERS:
- Mayor: Malti Rai
- Commissioner: Sanskriti Jain (IAS) (commoffice@bmconline.gov.in)
- Chief Engineer (Projects): Hans Kumar Jain
- Superintending Engineers: Suresh Sejkar, Rajeev Goswami, G.S. Saluja
- Admin/Swachh Bharat: Neelesh Dubey
- IT/Smart City: Devendra Singh Chauhan

{context}
"""

def run_chatbot(message: str, history: list, complaint_context: str = "") -> str:
    """Send user message and history to Groq Chatbot."""
    global GROQ_API_KEY
    if not GROQ_API_KEY:
        raise ValueError("API Key not configured.")
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    }
    
    # Inject complaint context if provided
    context_block = f"\nCURRENT COMPLAINT DATA FOR THE USER:\n{complaint_context}" if complaint_context else ""
    sys_prompt = CHATBOT_SYSTEM_PROMPT.replace("{context}", context_block)
    
    messages = [{"role": "system", "content": sys_prompt}]
    
    # Append history
    for entry in history:
        messages.append({"role": entry.get("role", "user"), "content": entry.get("content", "")})
    
    # Append current message
    messages.append({"role": "user", "content": message})
    
    data = {"model": "llama-3.3-70b-versatile", "messages": messages}
    
    req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode("utf-8"))
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"].strip()
    except Exception as e:
        raise ValueError(f"Chatbot API error: {str(e)}")
