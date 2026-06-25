import os
import time
import json
import urllib.request
import urllib.parse
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
from ai_pipeline import configure_groq, run_full_pipeline, run_chatbot

# ─── Load Environment ──────────────────────────────────────────────────
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_IMAGE_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# ─── Initialize Services ───────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=["http://localhost:*", "http://127.0.0.1:*"], supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
configure_groq(GROQ_API_KEY)


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(line for line in text.splitlines() if not line.strip().startswith("```"))

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        return {
            "summary": text[:800],
            "visible_issue": "Unable to parse structured image response",
            "confidence": 0,
        }


def analyze_uploaded_image(image_data_url: str, description: str, ward: str) -> dict:
    """Analyze an optional citizen-uploaded complaint image via Groq."""
    if not image_data_url:
        return {}
    if not GROQ_API_KEY:
        return {
            "summary": "Image was attached, but Groq is not configured on the server.",
            "visible_issue": "Analysis unavailable",
            "confidence": 0,
            "model": GROQ_IMAGE_MODEL,
        }

    prompt = """Analyze this civic complaint image for Bhopal Municipal Corporation.
Return ONLY valid JSON:
{
  "visible_issue": "<short issue label>",
  "summary": "<1-2 sentence image-based observation>",
  "severity संकेत": "<Low | Medium | High | Critical>",
  "public_safety_risk": "<none | possible | clear>",
  "recommended_department_hint": "<department or cell likely responsible>",
  "evidence_points": ["<3 concise visual observations>"],
  "confidence": <0.0 to 1.0>
}"""

    payload = {
        "model": GROQ_IMAGE_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"{prompt}\n\nCitizen description: {description}\nWard: {ward}",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": image_data_url},
                    },
                ],
            }
        ],
        "temperature": 0.2,
        "max_tokens": 600,
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "CivicMind-Backend/1.0"
    }

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        data=json.dumps(payload).encode("utf-8"),
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            result = json.loads(response.read().decode("utf-8"))
            text = result["choices"][0]["message"]["content"]
            parsed = _parse_json_response(text)
            parsed["model"] = GROQ_IMAGE_MODEL
            return parsed
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        return {
            "summary": f"Image analysis failed with Groq HTTP {e.code}.",
            "visible_issue": "Analysis failed",
            "error": error_msg[:500],
            "confidence": 0,
            "model": GROQ_IMAGE_MODEL,
        }
    except Exception as e:
        return {
            "summary": "Image analysis could not be completed via Groq.",
            "visible_issue": "Analysis failed",
            "error": str(e),
            "confidence": 0,
            "model": GROQ_IMAGE_MODEL,
        }


def attach_image_analysis_for_storage(complaint_data: dict) -> dict:
    """Store optional image analysis inside existing JSON output fields."""
    image_analysis = complaint_data.pop("image_analysis", None)
    attachment_name = complaint_data.pop("attachment_name", None)
    attachment_mime = complaint_data.pop("attachment_mime", None)
    complaint_data.pop("image_data_url", None)

    if image_analysis or attachment_name or attachment_mime:
        agent1_output = complaint_data.get("agent1_output") or {}
        if not isinstance(agent1_output, dict):
            agent1_output = {"raw": agent1_output}
        agent1_output["image_attachment"] = {
            "name": attachment_name,
            "mime": attachment_mime,
            "analysis": image_analysis or {},
        }
        complaint_data["agent1_output"] = agent1_output

    return complaint_data


def hydrate_image_analysis(complaint: dict) -> dict:
    agent1_output = complaint.get("agent1_output") or {}
    if isinstance(agent1_output, dict):
        attachment = agent1_output.get("image_attachment") or {}
        if isinstance(attachment, dict):
            complaint["attachment_name"] = attachment.get("name")
            complaint["attachment_mime"] = attachment.get("mime")
            complaint["image_analysis"] = attachment.get("analysis")
    return complaint

# ─── Bhopal Wards Data ─────────────────────────────────────────────────
BHOPAL_WARDS = [
    {"id": 1, "name": "Shyamla Hills", "zone": "Zone 1", "lat": 23.2599, "lng": 77.4126, "common_issues": ["Road Damage", "Water Leakage"]},
    {"id": 2, "name": "Arera Colony", "zone": "Zone 2", "lat": 23.2156, "lng": 77.4356, "common_issues": ["Pothole", "Garbage"]},
    {"id": 3, "name": "MP Nagar", "zone": "Zone 3", "lat": 23.2332, "lng": 77.4273, "common_issues": ["Streetlight", "Encroachment"]},
    {"id": 4, "name": "Kolar", "zone": "Zone 4", "lat": 23.1845, "lng": 77.4721, "common_issues": ["Water Leakage", "Drainage"]},
    {"id": 5, "name": "Govindpura", "zone": "Zone 5", "lat": 23.2701, "lng": 77.4589, "common_issues": ["Garbage", "Road Damage"]},
    {"id": 6, "name": "Karond", "zone": "Zone 6", "lat": 23.2987, "lng": 77.3876, "common_issues": ["Drainage", "Pothole"]},
    {"id": 7, "name": "Bairagarh", "zone": "Zone 7", "lat": 23.2876, "lng": 77.3234, "common_issues": ["Garbage", "Stray Animals"]},
    {"id": 8, "name": "Habibganj", "zone": "Zone 8", "lat": 23.2298, "lng": 77.4389, "common_issues": ["Pothole", "Streetlight"]},
    {"id": 9, "name": "New Market", "zone": "Zone 9", "lat": 23.2287, "lng": 77.4041, "common_issues": ["Encroachment", "Garbage"]},
    {"id": 10, "name": "Jahangirabad", "zone": "Zone 10", "lat": 23.2687, "lng": 77.4234, "common_issues": ["Water Leakage", "Drainage"]},
    {"id": 11, "name": "Misrod", "zone": "Zone 11", "lat": 23.1654, "lng": 77.4912, "common_issues": ["Road Damage", "Garbage"]},
    {"id": 12, "name": "Bhanpur", "zone": "Zone 12", "lat": 23.1456, "lng": 77.4678, "common_issues": ["Garbage", "Drainage"]},
    {"id": 13, "name": "Ayodhya Nagar", "zone": "Zone 13", "lat": 23.2543, "lng": 77.3987, "common_issues": ["Water Leakage", "Pothole"]},
    {"id": 14, "name": "Ashoka Garden", "zone": "Zone 14", "lat": 23.2187, "lng": 77.3876, "common_issues": ["Stray Animals", "Garbage"]},
    {"id": 15, "name": "Berasia", "zone": "Zone 15", "lat": 23.3456, "lng": 77.4512, "common_issues": ["Road Damage", "Water Leakage"]},
    {"id": 16, "name": "Ratibad", "zone": "Zone 16", "lat": 23.1234, "lng": 77.4123, "common_issues": ["Drainage", "Road Damage"]},
    {"id": 17, "name": "Bagmugalia", "zone": "Zone 17", "lat": 23.1987, "lng": 77.5012, "common_issues": ["Pothole", "Streetlight"]},
    {"id": 18, "name": "Talaiya", "zone": "Zone 18", "lat": 23.2654, "lng": 77.4098, "common_issues": ["Drainage", "Encroachment"]},
    {"id": 19, "name": "Kotwali", "zone": "Zone 19", "lat": 23.2589, "lng": 77.4021, "common_issues": ["Streetlight", "Encroachment"]},
    {"id": 20, "name": "Huzur", "zone": "Zone 20", "lat": 23.2012, "lng": 77.4534, "common_issues": ["Road Damage", "Garbage"]},
    {"id": 21, "name": "Katara Hills", "zone": "Zone 1", "lat": 23.1876, "lng": 77.4321, "common_issues": ["Water Leakage", "Pothole"]},
    {"id": 22, "name": "Gulmohar", "zone": "Zone 2", "lat": 23.2234, "lng": 77.4423, "common_issues": ["Streetlight", "Road Damage"]},
    {"id": 23, "name": "Nehru Nagar", "zone": "Zone 3", "lat": 23.2445, "lng": 77.4187, "common_issues": ["Drainage", "Garbage"]},
    {"id": 24, "name": "Danish Kunj", "zone": "Zone 4", "lat": 23.1934, "lng": 77.4567, "common_issues": ["Stray Animals", "Road Damage"]},
    {"id": 25, "name": "Salaiya", "zone": "Zone 5", "lat": 23.2789, "lng": 77.4654, "common_issues": ["Garbage", "Water Leakage"]},
    {"id": 26, "name": "Piplani", "zone": "Zone 6", "lat": 23.2543, "lng": 77.4789, "common_issues": ["Road Damage", "Streetlight"]},
    {"id": 27, "name": "Char Imli", "zone": "Zone 7", "lat": 23.2398, "lng": 77.4312, "common_issues": ["Encroachment", "Drainage"]},
    {"id": 28, "name": "Idgah Hills", "zone": "Zone 8", "lat": 23.2712, "lng": 77.4156, "common_issues": ["Water Leakage", "Garbage"]},
    {"id": 29, "name": "Shahpura", "zone": "Zone 9", "lat": 23.1876, "lng": 77.4876, "common_issues": ["Pothole", "Drainage"]},
    {"id": 30, "name": "Trilanga", "zone": "Zone 10", "lat": 23.2067, "lng": 77.4456, "common_issues": ["Road Damage", "Water Leakage"]},
]

# Helper to find zone by ward name
def get_zone_for_ward(ward_name: str) -> str:
    for w in BHOPAL_WARDS:
        if w["name"] == ward_name:
            return w["zone"]
    return "Zone 1"


# ═══════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@app.route("/api/complaints/analyze", methods=["POST"])
def analyze_complaint():
    """Analyze a new complaint through the AI pipeline without saving."""
    try:
        data = request.get_json()

        # Validate required fields
        citizen_name = data.get("citizen_name", "").strip()
        ward = data.get("ward", "").strip()
        description = data.get("description", "").strip()
        phone = data.get("phone", "").strip()
        input_method = data.get("input_method", "text")
        lat = data.get("lat")
        lng = data.get("lng")
        address = data.get("address", "").strip()
        image_data_url = data.get("image_data_url", "")
        attachment_name = data.get("attachment_name", "")
        attachment_mime = data.get("attachment_mime", "")
        user_email = data.get("user_email", "").strip()

        if not citizen_name:
            return jsonify({"error": "citizen_name is required"}), 400
        if not ward:
            return jsonify({"error": "ward is required"}), 400
        if not description:
            return jsonify({"error": "description is required"}), 400

        zone = get_zone_for_ward(ward)

        # Generate complaint number
        complaint_number = "CVM-" + str(int(time.time()))[-6:]

        # Run AI pipeline (3 agents sequentially)
        pipeline_result = run_full_pipeline(description, ward, zone)
        image_analysis = analyze_uploaded_image(image_data_url, description, ward) if image_data_url else None

        # Clean SLA days (AI might output 0.167 for 4 hours, DB expects INTEGER)
        try:
            sla_days = float(pipeline_result.get("estimated_resolution_days", 7))
            sla_days = 1 if sla_days < 1 else int(round(sla_days))
        except (ValueError, TypeError):
            sla_days = 7

        # Build complaint record
        complaint_data = {
            "complaint_number": complaint_number,
            "citizen_name": citizen_name,
            "phone": phone,
            "ward": ward,
            "zone": zone,
            "description": description,
            "complaint_type": pipeline_result["complaint_type"],
            "priority": pipeline_result["priority"],
            "department": pipeline_result["department"],
            "department_email": pipeline_result["agent3_output"].get("department_email", ""),
            "sub_department": pipeline_result.get("sub_department", ""),
            "estimated_resolution_days": sla_days,
            "summary": pipeline_result["summary"],
            "action_notice": pipeline_result["action_notice"],
            "priority_reason": pipeline_result["priority_reason"],
            "agent1_output": pipeline_result["agent1_output"],
            "agent2_output": pipeline_result["agent2_output"],
            "agent3_output": pipeline_result["agent3_output"],
            "status": "Pending",
            "input_method": input_method,
            "address": address,
            "image_analysis": image_analysis,
            "attachment_name": attachment_name,
            "attachment_mime": attachment_mime,
            "user_email": user_email,
        }

        if lat is not None and lng is not None:
            complaint_data["lat"] = float(lat)
            complaint_data["lng"] = float(lng)

        return jsonify(complaint_data), 200

    except ValueError as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"AI Pipeline error: {str(e)}"}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/complaints", methods=["POST"])
def create_complaint():
    """Submit a finalized complaint to the database."""
    try:
        complaint_data = request.get_json()
        complaint_data = attach_image_analysis_for_storage(complaint_data)
        
        # Save to Supabase directly
        result = supabase.table("complaints").insert(complaint_data).execute()

        if result.data:
            # Trigger n8n Email Webhook
            try:
                dept_email = complaint_data.get("department_email", "")
                subject = f"CivicMind Alert: [{complaint_data.get('priority', 'New')}] {complaint_data.get('complaint_type', 'General')} in {complaint_data.get('ward')}"
                
                email_data = (
                    f"Tracking ID: {complaint_data.get('complaint_number')}\n"
                    f"Citizen: {complaint_data.get('citizen_name')} (Phone: {complaint_data.get('phone', 'N/A')})\n"
                    f"Location: {complaint_data.get('ward')}, {complaint_data.get('zone')}\n\n"
                    f"AI Summary:\n{complaint_data.get('summary')}\n\n"
                    f"Official Notice:\n{complaint_data.get('action_notice')}\n\n"
                    f"SLA Priority Reason:\n{complaint_data.get('priority_reason')}"
                )
                
                params = urllib.parse.urlencode({
                    "department_email_id": dept_email,
                    "subject": subject,
                    "data": email_data
                })
                
                webhook_url = f"https://sujalchachre001.app.n8n.cloud/webhook-test/d808eea1-adc1-4c69-8b4f-4372c5b00f12?{params}"
                urllib.request.urlopen(webhook_url, timeout=5)
            except Exception as e:
                print(f"Failed to trigger n8n webhook: {e}")

            return jsonify(hydrate_image_analysis(result.data[0])), 201
        else:
            return jsonify({"error": "Failed to save complaint"}), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/vapi/webhook", methods=["POST"])
def vapi_webhook():
    """Handle incoming tool calls from Vapi Voice AI."""
    try:
        data = request.get_json() or {}
        message = data.get("message", {})
        
        # We only handle tool-calls
        if message.get("type") == "tool-calls":
            tool_list = message.get("toolWithToolCallList", [])
            results = []
            
            for tool_call_wrapper in tool_list:
                tool_call = tool_call_wrapper.get("toolCall", {})
                tool_call_id = tool_call.get("id")
                function = tool_call.get("function", {})
                
                if function.get("name") == "submit_civic_complaint":
                    arguments_data = function.get("arguments", {})
                    if isinstance(arguments_data, str):
                        try:
                            args = json.loads(arguments_data)
                        except json.JSONDecodeError:
                            args = {}
                    else:
                        args = arguments_data

                        
                    citizen_name = args.get("citizen_name", "Anonymous User")
                    ward = args.get("ward", "Unknown Ward")
                    description = args.get("description", "No description provided")
                    phone = args.get("phone", "")
                    
                    zone = get_zone_for_ward(ward)
                    complaint_number = "CVM-" + str(int(time.time()))[-6:]
                    
                    # Run AI pipeline
                    pipeline_result = run_full_pipeline(description, ward, zone)
                    
                    try:
                        sla_days = float(pipeline_result.get("estimated_resolution_days", 7))
                        sla_days = 1 if sla_days < 1 else int(round(sla_days))
                    except (ValueError, TypeError):
                        sla_days = 7
                        
                    complaint_data = {
                        "complaint_number": complaint_number,
                        "citizen_name": citizen_name,
                        "phone": phone,
                        "ward": ward,
                        "zone": zone,
                        "description": description,
                        "complaint_type": pipeline_result["complaint_type"],
                        "priority": pipeline_result["priority"],
                        "department": pipeline_result["department"],
                        "department_email": pipeline_result["agent3_output"].get("department_email", ""),
                        "sub_department": pipeline_result.get("sub_department", ""),
                        "estimated_resolution_days": sla_days,
                        "summary": pipeline_result["summary"],
                        "action_notice": pipeline_result["action_notice"],
                        "priority_reason": pipeline_result["priority_reason"],
                        "agent1_output": pipeline_result["agent1_output"],
                        "agent2_output": pipeline_result["agent2_output"],
                        "agent3_output": pipeline_result["agent3_output"],
                        "status": "Pending",
                        "input_method": "voice",
                    }
                    
                    # Save to DB
                    db_result = supabase.table("complaints").insert(complaint_data).execute()
                    
                    if db_result.data:
                        # Trigger n8n Webhook
                        try:
                            dept_email = complaint_data.get("department_email", "")
                            subject = f"CivicMind Alert (VOICE): [{complaint_data.get('priority', 'New')}] {complaint_data.get('complaint_type', 'General')} in {complaint_data.get('ward')}"
                            
                            email_data = (
                                f"Tracking ID: {complaint_data.get('complaint_number')}\n"
                                f"Citizen: {complaint_data.get('citizen_name')} (Phone: {complaint_data.get('phone', 'N/A')})\n"
                                f"Input Method: VOICE ASSISTANT\n\n"
                                f"AI Summary:\n{complaint_data.get('summary')}\n\n"
                                f"Original Transcript:\n{complaint_data.get('description')}\n\n"
                                f"SLA Priority Reason:\n{complaint_data.get('priority_reason')}"
                            )
                            
                            params = urllib.parse.urlencode({"department_email_id": dept_email, "subject": subject, "data": email_data})
                            webhook_url = f"https://sujalchachre001.app.n8n.cloud/webhook-test/d808eea1-adc1-4c69-8b4f-4372c5b00f12?{params}"
                            urllib.request.urlopen(webhook_url, timeout=5)
                        except Exception as e:
                            print(f"Failed to trigger n8n webhook: {e}")
                            
                        # Tell Vapi the successful result
                        results.append({
                            "toolCallId": tool_call_id,
                            "result": f"Success! Complaint registered. The tracking ID is {complaint_number}. Let the user know."
                        })
                    else:
                        results.append({
                            "toolCallId": tool_call_id,
                            "result": "Failed to save the complaint to the database."
                        })
                else:
                    # Unrecognized function
                    results.append({
                        "toolCallId": tool_call_id,
                        "result": "Error: Unrecognized function name."
                    })
            
            return jsonify({"results": results}), 200
            
        # If it's some other Vapi message type (like status updates), just ack
        return jsonify({"status": "acknowledged"}), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



@app.route("/api/complaints", methods=["GET"])
def get_complaints():
    """Get all complaints with optional filters."""
    try:
        query = supabase.table("complaints").select("*").order("created_at", desc=True)

        # Apply filters
        status = request.args.get("status")
        priority = request.args.get("priority")
        ward = request.args.get("ward")

        if status:
            query = query.eq("status", status)
        if priority:
            query = query.eq("priority", priority)
        if ward:
            query = query.eq("ward", ward)
        user_email = request.args.get("user_email")
        if user_email:
            query = query.eq("user_email", user_email)

        result = query.execute()
        return jsonify([hydrate_image_analysis(c) for c in result.data]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/complaints/<complaint_id>", methods=["GET"])
def get_complaint(complaint_id):
    """Get a single complaint by ID."""
    try:
        result = supabase.table("complaints").select("*").eq("id", complaint_id).execute()

        if result.data:
            return jsonify(hydrate_image_analysis(result.data[0])), 200
        else:
            return jsonify({"error": "Complaint not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/complaints/<complaint_id>/status", methods=["PATCH"])
def update_complaint_status(complaint_id):
    """Update the status of a complaint."""
    try:
        data = request.get_json()
        status = data.get("status")

        valid_statuses = ["Pending", "In Progress", "Resolved", "Rejected"]
        if status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400

        result = (
            supabase.table("complaints")
            .update({"status": status, "updated_at": "now()"})
            .eq("id", complaint_id)
            .execute()
        )

        if result.data:
            return jsonify(hydrate_image_analysis(result.data[0])), 200
        else:
            return jsonify({"error": "Complaint not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get aggregated statistics."""
    try:
        result = supabase.table("complaints").select("*").execute()
        complaints = result.data or []

        total = len(complaints)

        # Aggregate by priority
        by_priority = {}
        for c in complaints:
            p = c.get("priority", "Unknown")
            by_priority[p] = by_priority.get(p, 0) + 1

        # Aggregate by department
        by_department = {}
        for c in complaints:
            d = c.get("department", "Unknown")
            by_department[d] = by_department.get(d, 0) + 1

        # Aggregate by ward
        by_ward = {}
        for c in complaints:
            w = c.get("ward", "Unknown")
            by_ward[w] = by_ward.get(w, 0) + 1

        # Aggregate by status
        by_status = {}
        for c in complaints:
            s = c.get("status", "Unknown")
            by_status[s] = by_status.get(s, 0) + 1

        # Aggregate by type
        by_type = {}
        for c in complaints:
            t = c.get("complaint_type", "Unknown")
            by_type[t] = by_type.get(t, 0) + 1

        # Average resolution days
        resolution_days = [c.get("estimated_resolution_days", 0) for c in complaints if c.get("estimated_resolution_days")]
        avg_resolution = sum(resolution_days) / len(resolution_days) if resolution_days else 0

        stats = {
            "total": total,
            "by_priority": [{"priority": k, "count": v} for k, v in by_priority.items()],
            "by_department": [{"department": k, "count": v} for k, v in by_department.items()],
            "by_ward": [{"ward": k, "count": v} for k, v in by_ward.items()],
            "by_status": [{"status": k, "count": v} for k, v in by_status.items()],
            "by_type": [{"complaint_type": k, "count": v} for k, v in by_type.items()],
            "avg_resolution_days": round(avg_resolution, 1),
        }

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/wards", methods=["GET"])
def get_wards():
    """Return Bhopal ward data with lat/lng."""
    return jsonify(BHOPAL_WARDS), 200


# ─── Health Check ───────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "CivicMind API", "version": "1.0.0"}), 200


@app.route("/api/chat", methods=["POST"])
def chat_bot():
    """Handle Chatbot interactions."""
    try:
        data = request.get_json()
        message = data.get("message", "").strip()
        history = data.get("history", [])
        tracking_id = data.get("tracking_id", "").strip()
        user_email = data.get("user_email", "").strip()
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
            
        complaint_context = ""
        
        # If user provides tracking ID, fetch it from DB to give AI context
        if tracking_id:
            query = supabase.table("complaints").select("*").eq("complaint_number", tracking_id)
            if user_email:
                query = query.eq("user_email", user_email)
            result = query.execute()
            if result.data:
                c = result.data[0]
                complaint_context = json.dumps({
                    "Tracking ID": c.get("complaint_number"),
                    "Citizen": c.get("citizen_name"),
                    "Status": c.get("status"),
                    "Issue Category": c.get("complaint_type"),
                    "Priority": c.get("priority"),
                    "Summary": c.get("summary"),
                    "Assigned Department": c.get("department"),
                    "Sub Department": c.get("sub_department"),
                    "Estimated SLA (Days)": c.get("estimated_resolution_days"),
                    "Action Notice Generated": c.get("action_notice")
                }, indent=2)
                
        reply = run_chatbot(message, history, complaint_context)
        return jsonify({"reply": reply}), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─── Run Server ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  CivicMind API Server")
    print("  Bhopal Municipal Corporation")
    print("=" * 50)
    print(f"  Supabase: {'Connected' if SUPABASE_URL else 'NOT CONFIGURED'}")
    print(f"  AI Model: {'Configured (Groq)' if GROQ_API_KEY else 'NOT CONFIGURED'}")
    print("=" * 50 + "\n")
    app.run(debug=True, port=5000, host="0.0.0.0", threaded=True)
