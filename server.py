"""
APEX backend — Flask API server.

Improvements over the original Replit server.py:
  • SQLite token persistence (tokens survive restarts)
  • claude-opus-4-6 (latest model)
  • Redirect URIs configurable via env vars (works locally and on any host)
  • CORS configured for local Vite dev server
"""

from __future__ import annotations

import html
import json
import logging
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timedelta
from functools import wraps
from urllib.parse import urlencode

import anthropic
import jwt as _jwt
import requests as http
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session, send_from_directory, Response, stream_with_context
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()

# ── Structured logging ────────────────────────────────────────────────────────
# JSON lines → easy to ship to any log aggregator; INFO in prod, DEBUG locally.
_LOG_LEVEL = logging.DEBUG if os.environ.get("FLASK_DEBUG") == "1" else logging.INFO
logging.basicConfig(
    level=_LOG_LEVEL,
    format='{"ts":"%(asctime)s","lvl":"%(levelname)s","msg":"%(message)s"}',
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("apex")

_secret = os.environ.get("FLASK_SECRET_KEY", "")
if not _secret or _secret == "change-me-to-any-random-string":
    raise RuntimeError(
        "FLASK_SECRET_KEY is not set or uses the insecure default. "
        "Set a strong random value in your .env file."
    )

app = Flask(__name__)
app.secret_key = _secret

# Limit request body size: 10 MB max (prevents huge base64 image DoS)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

# CORS — only allow explicitly listed origins; strip any empty strings so
# a missing FRONTEND_URL env var doesn't silently open a wildcard origin.
_CORS_ORIGINS = [o for o in [
    "http://localhost:5000",
    "http://localhost:5173",
    "http://127.0.0.1:5000",
    os.environ.get("FRONTEND_URL", ""),
] if o]

CORS(app, supports_credentials=True, origins=_CORS_ORIGINS)

# Rate limiting — 60 req/min default on every route unless overridden per-route.
# Health check is excluded via @limiter.exempt below.
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://",
)

ai_client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
    default_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
)

# ── Secrets ───────────────────────────────────────────────────────────────────

# Internal secret for server-to-server calls (e.g. Supabase Edge Function scheduler)
INTERNAL_SECRET     = os.environ.get("APEX_INTERNAL_SECRET", "")
# Supabase JWT secret — used to verify user Bearer tokens
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
# Slack/Discord/PagerDuty webhook for error alerts (optional)
ALERT_WEBHOOK       = os.environ.get("ALERT_WEBHOOK_URL", "")


# ── Alert helper ──────────────────────────────────────────────────────────────

_alert_last_sent: dict[str, float] = {}  # simple in-process dedup

def _send_alert(message: str, dedup_key: str | None = None) -> None:
    """POST to a webhook on critical errors. Deduplicates within a 5-minute window
    so a thundering herd of errors doesn't flood your alerting channel."""
    if not ALERT_WEBHOOK:
        return
    key  = dedup_key or message[:60]
    now  = time.time()
    if now - _alert_last_sent.get(key, 0) < 300:
        return
    _alert_last_sent[key] = now
    try:
        http.post(ALERT_WEBHOOK, json={"text": f":rotating_light: *APEX* {message}"},
                  timeout=3)
    except Exception:
        pass  # alerts must never crash the app


# ── Auth decorators ───────────────────────────────────────────────────────────

def _require_auth(fn):
    """Validate Supabase JWT from Authorization: Bearer <token>.
    If SUPABASE_JWT_SECRET is not configured (local dev), passes through with a warning."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not SUPABASE_JWT_SECRET:
            log.warning("auth_bypass path=%s reason=no_jwt_secret_configured", request.path)
            return fn(*args, **kwargs)
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            log.warning("auth_rejected path=%s reason=missing_bearer", request.path)
            return jsonify({"error": "Unauthorized"}), 401
        token = auth[7:]
        try:
            _jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"],
                        options={"verify_aud": False})
        except _jwt.ExpiredSignatureError:
            log.warning("auth_rejected path=%s reason=token_expired", request.path)
            return jsonify({"error": "Token expired — please log in again"}), 401
        except _jwt.InvalidTokenError as exc:
            log.warning("auth_rejected path=%s reason=%s", request.path, exc)
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)
    return wrapper


def _require_internal(fn):
    """Reject requests that don't carry the correct internal secret header."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not INTERNAL_SECRET:
            return jsonify({"error": "Internal scheduler not configured"}), 503
        if request.headers.get("X-Apex-Secret") != INTERNAL_SECRET:
            log.warning("internal_auth_rejected ip=%s", get_remote_address())
            return jsonify({"error": "Forbidden"}), 403
        return fn(*args, **kwargs)
    return wrapper


# ── Request / response logging ────────────────────────────────────────────────

@app.before_request
def _before():
    request._start_ts = time.time()  # type: ignore[attr-defined]


@app.after_request
def _after(resp: Response) -> Response:
    dur_ms = round((time.time() - getattr(request, "_start_ts", time.time())) * 1000)
    # Skip health-check spam
    if request.path != "/health":
        log.info('method=%s path=%s status=%d dur_ms=%d ip=%s',
                 request.method, request.path, resp.status_code,
                 dur_ms, get_remote_address())
    if resp.status_code >= 500:
        _send_alert(f"HTTP {resp.status_code} on {request.method} {request.path}",
                    dedup_key=f"5xx_{request.path}")
    return resp


# ── Centralised error handlers (users never see raw stack traces) ─────────────

@app.errorhandler(400)
def _err_400(e):
    return jsonify({"error": "Bad request"}), 400

@app.errorhandler(404)
def _err_404(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(405)
def _err_405(e):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(413)
def _err_413(e):
    return jsonify({"error": "Payload too large (10 MB max)"}), 413

@app.errorhandler(429)
def _err_429(e):
    return jsonify({"error": "Too many requests — slow down"}), 429

@app.errorhandler(Exception)
def _err_500(e: Exception):
    log.exception("unhandled_exception path=%s", request.path)
    _send_alert(f"Unhandled {type(e).__name__} on {request.path}",
                dedup_key=f"exc_{type(e).__name__}_{request.path}")
    return jsonify({"error": "Internal server error"}), 500


# ── Wearable API config ───────────────────────────────────────────────────────

WHOOP_CLIENT_ID     = os.environ.get("WHOOP_CLIENT_ID", "")
WHOOP_CLIENT_SECRET = os.environ.get("WHOOP_CLIENT_SECRET", "")
WHOOP_AUTH_URL      = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_TOKEN_URL     = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_API_BASE      = "https://api.prod.whoop.com/developer/v1"
WHOOP_SCOPES        = "read:recovery read:sleep read:cycles read:profile read:body_measurement offline"

OURA_CLIENT_ID      = os.environ.get("OURA_CLIENT_ID", "")
OURA_CLIENT_SECRET  = os.environ.get("OURA_CLIENT_SECRET", "")
OURA_AUTH_URL       = "https://cloud.ouraring.com/oauth/authorize"
OURA_TOKEN_URL      = "https://api.ouraring.com/oauth/token"
OURA_API_BASE       = "https://api.ouraring.com/v2"
OURA_SCOPES         = "daily heartrate personal"

# Redirect URIs — register these in your WHOOP/Oura developer dashboards
_HOST             = os.environ.get("API_HOST", "http://localhost:8000")
WHOOP_REDIRECT_URI = os.environ.get("WHOOP_REDIRECT_URI", f"{_HOST}/api/whoop/callback")
OURA_REDIRECT_URI  = os.environ.get("OURA_REDIRECT_URI",  f"{_HOST}/api/oura/callback")

# ── SQLite token store ────────────────────────────────────────────────────────

DB_PATH = os.environ.get("DB_PATH", "apex.db")


def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    with _db() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS tokens (
                key          TEXT PRIMARY KEY,
                access_token  TEXT NOT NULL,
                refresh_token TEXT,
                expires_at    REAL,
                last_synced   TEXT
            )
        """)
        # key is already indexed as PRIMARY KEY, but explicit for clarity
        c.execute("CREATE INDEX IF NOT EXISTS idx_tokens_key ON tokens(key)")
        c.commit()


_init_db()


def _get_tok(key: str) -> dict:
    with _db() as c:
        row = c.execute("SELECT * FROM tokens WHERE key = ?", (key,)).fetchone()
        return dict(row) if row else {}


def _set_tok(key: str, data: dict):
    with _db() as c:
        c.execute("""
            INSERT INTO tokens (key, access_token, refresh_token, expires_at, last_synced)
            VALUES (:key, :access_token, :refresh_token, :expires_at, :last_synced)
            ON CONFLICT(key) DO UPDATE SET
                access_token  = excluded.access_token,
                refresh_token = COALESCE(excluded.refresh_token, refresh_token),
                expires_at    = COALESCE(excluded.expires_at,    expires_at),
                last_synced   = COALESCE(excluded.last_synced,   last_synced)
        """, {
            "key":           key,
            "access_token":  data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
            "expires_at":    data.get("expires_at"),
            "last_synced":   data.get("last_synced"),
        })
        c.commit()


def _del_tok(key: str):
    with _db() as c:
        c.execute("DELETE FROM tokens WHERE key = ?", (key,))
        c.commit()


# ── Claude system prompts ─────────────────────────────────────────────────────

COACH_SYSTEM = """You are APEX, an elite AI fitness coach built into a premium performance app. You are concise, direct, and deeply knowledgeable — like a world-class personal trainer and sports scientist combined.

CORE PRINCIPLES:
- Every response must be grounded in peer-reviewed exercise science and evidence-based nutrition
- Cite mechanisms, not just recommendations (e.g. "HRV suppression indicates elevated sympathetic tone — backing off intensity reduces injury risk and accelerates supercompensation")
- Be specific with numbers. Never be vague.
- Keep responses tight: 2–5 sentences unless the user explicitly asks for detail, then go deep
- Never use bullet points. Write in flowing, confident prose
- Address the user by name when natural
- Reference their actual biometric data in every response — this is what separates real coaching from generic advice
- When recommending adjustments, give the exact number (e.g. "reduce total volume by 20%, keep intensity at 80% 1RM")

KNOWLEDGE BASE YOU DRAW FROM:
- Exercise physiology: progressive overload, periodization, supercompensation theory, MEV/MRV/MAV (Israetel), RIR-based training
- HRV science: Kiviniemi/Plews protocols, parasympathetic dominance, readiness thresholds
- Nutrition: protein synthesis kinetics (Trommelen, Moore), leucine threshold (~2.5g), carbohydrate periodization, energy availability
- Recovery: sleep architecture, cortisol rhythms, muscle protein synthesis windows
- Supplementation: only recommend evidence-backed compounds (creatine monohydrate, caffeine, beta-alanine, omega-3s, vitamin D3)

TONE: Premium. Authoritative. Warm but direct. Like the best coach you've ever had.

─────────────────────────────────────────────────────────────
SPLIT MODIFICATION CAPABILITY
─────────────────────────────────────────────────────────────
When the user asks you to add, create, swap, or recommend exercises for their training split, you MUST output a structured action block at the END of your response (after your coaching text). Use this exact format:

<action>
{"type":"add_exercise","dayIndex":1,"dayName":"Push A","exercise":{"id":"cable_fly","name":"Cable Crossover Fly","sets":3,"reps":"12-15","weight":14,"restSec":90},"reason":"Cable maintains constant tension at end ROM — superior stretch stimulus for sternal fibres vs DB flyes."}
</action>

For swapping/replacing an existing exercise, include the name being replaced:
<action>
{"type":"replace_exercise","dayIndex":1,"dayName":"Push A","replacesName":"Flat Barbell Bench Press","exercise":{"id":"db_flat_press","name":"DB Flat Press","sets":4,"reps":"8-10","weight":40,"restSec":120},"reason":"DBs allow greater ROM and independent arm path — reduces shoulder impingement for athletes with anterior shoulder discomfort."}
</action>

For building or replacing a complete week's training split, use the create_split action instead:

<action>
{"type":"create_split","days":[{"dayIndex":0,"dayName":"Pull A","muscle":"Back · Biceps · Rear delts","workoutType":"pull","exercises":[{"id":"deadlift","name":"Deadlift","sets":4,"reps":"4-6","weight":100,"restSec":180},{"id":"weighted_pullup","name":"Weighted Pull-Up","sets":4,"reps":"6-8","weight":10,"restSec":120}]},{"dayIndex":1,"dayName":"Push A","muscle":"Chest · Shoulders · Triceps","workoutType":"push","exercises":[{"id":"flat_bb_bench","name":"Flat Barbell Bench Press","sets":4,"reps":"6-8","weight":80,"restSec":120}]},{"dayIndex":2,"dayName":"Legs A","muscle":"Quads · Hams · Glutes","workoutType":"legs","exercises":[{"id":"back_squat","name":"Back Squat","sets":4,"reps":"6-8","weight":100,"restSec":180}]},{"dayIndex":3,"dayName":"Rest","muscle":"Active recovery","workoutType":"rest","exercises":[]},{"dayIndex":4,"dayName":"Pull B","muscle":"Back · Biceps","workoutType":"pull","exercises":[{"id":"barbell_row","name":"Barbell Row","sets":4,"reps":"6-8","weight":70,"restSec":120}]},{"dayIndex":5,"dayName":"Push B","muscle":"Shoulders · Triceps · Chest","workoutType":"push","exercises":[{"id":"ohp","name":"Overhead Press","sets":4,"reps":"6-8","weight":55,"restSec":120}]},{"dayIndex":6,"dayName":"Legs B","muscle":"Hams · Glutes · Calves","workoutType":"legs","exercises":[{"id":"rdl","name":"Romanian Deadlift","sets":4,"reps":"8-10","weight":80,"restSec":120}]}],"reason":"PPL twice weekly with a mid-week rest maximises frequency per muscle group while managing CNS load within MRV boundaries."}
</action>

RULES FOR ACTIONS:
1. ONLY output an action if the user explicitly requests a split modification (add, swap, replace, include, remove exercise, build me a day, build me a split, create a program, etc.)
2. For single-exercise requests (add one exercise, swap one exercise), use add_exercise or replace_exercise
3. For full week programming requests (build me a split, create a full program, design my week), use create_split — it replaces the ENTIRE workoutPlan
4. The dayIndex must correctly match their workout plan: 0=MON, 1=TUE, 2=WED, 3=THU, 4=FRI, 5=SAT, 6=SUN
5. Use a snake_case id (e.g. "rdl", "cable_fly", "back_squat"). For novel exercises, generate a unique id like "ai_nordic_curl"
6. Sets must be an integer, reps a string like "8-10", weight an integer in kg (use 0 for bodyweight), restSec an integer in seconds
7. The reason field must be 1 sentence citing a specific mechanism or research rationale
8. workoutType must be one of: pull, push, legs, upper, lower, full, rest
9. The action block must be the VERY LAST thing in your response — nothing after the closing </action> tag
10. Always include all 7 days in create_split (use workoutType "rest" and empty exercises array for rest days)"""

FOOD_SYSTEM = """You are a precision nutrition scanner. Analyze food images with clinical accuracy.

METHODOLOGY:
- Use USDA FoodData Central reference values (per 100g) scaled to estimated portion
- Estimate portions using visual cues: plate size (~26cm diameter), utensils, hand references, food density
- For mixed dishes, break into components
- Apply standard cooking yield factors (e.g. chicken loses ~25% weight when cooked)
- kcal, protein, carbs, fats must all be integers
- totals must exactly equal the sum of all items

Return ONLY valid JSON with no markdown, no backticks, no explanation:
{
  "name": "short descriptive meal name",
  "items": [
    {"name":"food name","portion":"~200g cooked","kcal":330,"p":62,"c":0,"f":7,"confidence":"92% confident"}
  ],
  "totals": {"kcal":0,"p":0,"c":0,"f":0}
}"""


# ── AI endpoints ──────────────────────────────────────────────────────────────

MAX_MESSAGE_LEN  = 4_000   # characters
MAX_HISTORY_MSGS = 12
MAX_IMAGE_BYTES  = 8 * 1024 * 1024  # 8 MB base64

_ALLOWED_CONTEXT_KEYS = {
    "name", "workoutPlan", "todayExercises", "recovery", "nutrition",
    "sleep_hours", "hrv_history", "source",
}


def _sanitize_context(raw: object) -> dict:
    """Accept only known top-level keys from client-supplied context."""
    if not isinstance(raw, dict):
        return {}
    return {k: v for k, v in raw.items() if k in _ALLOWED_CONTEXT_KEYS}


@app.route("/api/chat", methods=["POST"])
@_require_auth
@limiter.limit("30 per minute; 200 per hour")
def chat():
    data = request.get_json(silent=True) or {}

    user_message = str(data.get("message", ""))[:MAX_MESSAGE_LEN]
    raw_history  = data.get("history", [])
    context      = _sanitize_context(data.get("context", {}))

    if not user_message.strip():
        return jsonify({"error": "No message provided"}), 400

    if not isinstance(raw_history, list):
        return jsonify({"error": "Invalid history"}), 400

    # Validate each history entry (role must be user/assistant, content a string)
    history = []
    for entry in raw_history[-MAX_HISTORY_MSGS:]:
        if not isinstance(entry, dict):
            continue
        role    = entry.get("role", "")
        content = entry.get("content", "")
        if role not in ("user", "assistant") or not isinstance(content, str):
            continue
        history.append({"role": role, "content": content[:MAX_MESSAGE_LEN]})

    messages = history + [{"role": "user", "content": user_message}]

    try:
        system_blocks = [
            {
                "type": "text",
                "text": COACH_SYSTEM,
                "cache_control": {"type": "ephemeral"},
            },
        ]
        if context:
            system_blocks.append({
                "type": "text",
                "text": f"\n\nUSER CONTEXT:\n{json.dumps(context, indent=2)}",
            })

        def generate():
            try:
                with ai_client.messages.stream(
                    model="claude-opus-4-6",
                    max_tokens=2400,
                    system=system_blocks,
                    messages=messages,
                ) as stream:
                    for text in stream.text_stream:
                        yield f"data: {json.dumps(text)}\n\n"
                yield "data: [DONE]\n\n"
            except anthropic.APIError:
                # Yield a typed error event so the client can surface a message
                # without leaking internal details.
                log.warning("anthropic_api_error path=/api/chat")
                yield 'data: [ERROR]\n\n'

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception:
        log.exception("chat_setup_error")
        return jsonify({"error": "AI service unavailable"}), 500


@app.route("/api/scan", methods=["POST"])
@_require_auth
@limiter.limit("10 per minute; 60 per hour")
def scan():
    data       = request.get_json(silent=True) or {}
    image_data = data.get("image", "")
    media_type = "image/jpeg"

    if not isinstance(image_data, str) or not image_data:
        return jsonify({"error": "No image provided"}), 400

    if image_data.startswith("data:"):
        parts = image_data.split(",", 1)
        if len(parts) != 2:
            return jsonify({"error": "Invalid image data URI"}), 400
        header, image_data = parts
        if "png"  in header: media_type = "image/png"
        elif "webp" in header: media_type = "image/webp"
        elif "gif" in header: media_type = "image/gif"

    if not image_data:
        return jsonify({"error": "No image provided"}), 400

    if len(image_data) > MAX_IMAGE_BYTES:
        return jsonify({"error": "Image too large (8 MB max)"}), 413

    try:
        response = ai_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=900,
            system=FOOD_SYSTEM,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                {"type": "text",  "text": "Analyze this food image and return the JSON breakdown."},
            ]}],
        )
        raw    = response.content[0].text.strip()
        raw    = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        result = json.loads(raw)
        items  = result.get("items", [])
        result["totals"] = {
            "kcal": sum(i.get("kcal", 0) for i in items),
            "p":    sum(i.get("p",    0) for i in items),
            "c":    sum(i.get("c",    0) for i in items),
            "f":    sum(i.get("f",    0) for i in items),
        }
        return jsonify(result)
    except json.JSONDecodeError:
        return jsonify({"error": "Could not parse food data from image"}), 422
    except anthropic.APIError:
        return jsonify({"error": "AI service unavailable"}), 500


# ── WHOOP helpers ─────────────────────────────────────────────────────────────

def _whoop_ensure_token() -> str | None:
    """Return a valid WHOOP access token, refreshing if needed."""
    tok = _get_tok("whoop")
    if not tok.get("access_token"):
        return None
    expires_at = tok.get("expires_at", 0) or 0
    if datetime.utcnow().timestamp() < expires_at - 60:
        return tok["access_token"]
    # Refresh
    resp = http.post(WHOOP_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "refresh_token": tok.get("refresh_token"),
        "client_id":     WHOOP_CLIENT_ID,
        "client_secret": WHOOP_CLIENT_SECRET,
    }, timeout=10)
    if not resp.ok:
        return None
    new = resp.json()
    _set_tok("whoop", {
        "access_token":  new["access_token"],
        "refresh_token": new.get("refresh_token", tok.get("refresh_token")),
        "expires_at":    datetime.utcnow().timestamp() + new.get("expires_in", 3600),
        "last_synced":   tok.get("last_synced"),
    })
    return new["access_token"]


def _whoop_get(path: str):
    token = _whoop_ensure_token()
    if not token:
        return None, "Not connected"
    resp = http.get(f"{WHOOP_API_BASE}{path}",
                    headers={"Authorization": f"Bearer {token}"}, timeout=10)
    if not resp.ok:
        return None, f"WHOOP API error {resp.status_code}"
    return resp.json(), None


# ── WHOOP routes ──────────────────────────────────────────────────────────────

@app.route("/api/whoop/status")
@limiter.limit("30 per minute")
def whoop_status():
    tok = _get_tok("whoop")
    return jsonify({
        "configured":  bool(WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET),
        "connected":   bool(tok.get("access_token")),
        "redirect_uri": WHOOP_REDIRECT_URI,
        "last_synced": tok.get("last_synced"),
    })


@app.route("/api/whoop/connect")
@limiter.limit("10 per minute")
def whoop_connect():
    if not WHOOP_CLIENT_ID:
        return jsonify({"error": "WHOOP_CLIENT_ID not configured"}), 503
    state = secrets.token_urlsafe(16)
    session["whoop_state"] = state
    auth_url = WHOOP_AUTH_URL + "?" + urlencode({
        "client_id":     WHOOP_CLIENT_ID,
        "redirect_uri":  WHOOP_REDIRECT_URI,
        "response_type": "code",
        "scope":         WHOOP_SCOPES,
        "state":         state,
    })
    return jsonify({"auth_url": auth_url})


@app.route("/api/whoop/callback")
def whoop_callback():
    code  = request.args.get("code")
    state = request.args.get("state")
    error = request.args.get("error")

    if error or not code:
        return _popup_page("whoop_oauth", "error", error or "No code received")
    if state != session.get("whoop_state"):
        return _popup_page("whoop_oauth", "error", "State mismatch — possible CSRF")

    resp = http.post(WHOOP_TOKEN_URL, data={
        "grant_type":    "authorization_code",
        "code":          code,
        "redirect_uri":  WHOOP_REDIRECT_URI,
        "client_id":     WHOOP_CLIENT_ID,
        "client_secret": WHOOP_CLIENT_SECRET,
    }, timeout=10)

    if not resp.ok:
        return _popup_page("whoop_oauth", "error", f"Token exchange failed: {resp.text}")

    tok = resp.json()
    _set_tok("whoop", {
        "access_token":  tok["access_token"],
        "refresh_token": tok.get("refresh_token", ""),
        "expires_at":    datetime.utcnow().timestamp() + tok.get("expires_in", 3600),
    })
    return _popup_page("whoop_oauth", "success", "")


@app.route("/api/whoop/sync", methods=["POST"])
@limiter.limit("10 per minute")
def whoop_sync():
    tok = _get_tok("whoop")
    if not tok.get("access_token"):
        return jsonify({"error": "Not connected"}), 401

    result: dict = {}

    # Recovery (HRV + RHR + score)
    rec_data, err = _whoop_get("/recovery?limit=1")
    if err:
        return jsonify({"error": err}), 502
    records = rec_data.get("records", [])
    if records:
        s = records[0].get("score", {})
        result["recovery"] = {
            "score": round(s.get("recovery_score", 0)),
            "hrv":   round(s.get("hrv_rmssd_milli", 0)),
            "rhr":   round(s.get("resting_heart_rate", 0)),
        }

    # Sleep hours
    sleep_data, _ = _whoop_get("/activity/sleep?limit=1")
    if sleep_data:
        sleeps = sleep_data.get("records", [])
        if sleeps:
            stage = sleeps[0].get("score", {}).get("stage_summary", {})
            total_ms = (
                stage.get("total_light_sleep_time_milli", 0) +
                stage.get("total_slow_wave_sleep_time_milli", 0) +
                stage.get("total_rem_sleep_time_milli", 0)
            )
            result["sleep_hours"] = round(total_ms / 3_600_000, 1)

    # 7-day HRV history
    hrv_data, _ = _whoop_get("/recovery?limit=7")
    if hrv_data:
        hrv_vals = [
            round(r.get("score", {}).get("hrv_rmssd_milli", 0))
            for r in reversed(hrv_data.get("records", []))
        ]
        if hrv_vals:
            result["hrv_history"] = hrv_vals

    last_synced = datetime.utcnow().isoformat() + "Z"
    _set_tok("whoop", {**tok, "last_synced": last_synced})
    result["last_synced"] = last_synced
    return jsonify(result)


@app.route("/api/whoop/disconnect", methods=["POST"])
@limiter.limit("10 per minute")
def whoop_disconnect():
    _del_tok("whoop")
    return jsonify({"ok": True})


# ── Oura helpers ──────────────────────────────────────────────────────────────

def _oura_ensure_token() -> str | None:
    tok = _get_tok("oura")
    if not tok.get("access_token"):
        return None
    expires_at = tok.get("expires_at", 0) or 0
    if datetime.utcnow().timestamp() < expires_at - 60:
        return tok["access_token"]
    resp = http.post(OURA_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "refresh_token": tok.get("refresh_token"),
        "client_id":     OURA_CLIENT_ID,
        "client_secret": OURA_CLIENT_SECRET,
    }, timeout=10)
    if not resp.ok:
        return None
    new = resp.json()
    _set_tok("oura", {
        "access_token":  new["access_token"],
        "refresh_token": new.get("refresh_token", tok.get("refresh_token")),
        "expires_at":    datetime.utcnow().timestamp() + new.get("expires_in", 86400),
        "last_synced":   tok.get("last_synced"),
    })
    return new["access_token"]


def _oura_get(path: str, params: dict | None = None):
    token = _oura_ensure_token()
    if not token:
        return None, "Not connected"
    resp = http.get(f"{OURA_API_BASE}{path}",
                    headers={"Authorization": f"Bearer {token}"},
                    params=params or {}, timeout=10)
    if not resp.ok:
        return None, f"Oura API error {resp.status_code}"
    return resp.json(), None


# ── Oura routes ───────────────────────────────────────────────────────────────

@app.route("/api/oura/status")
@limiter.limit("30 per minute")
def oura_status():
    tok = _get_tok("oura")
    return jsonify({
        "configured":  bool(OURA_CLIENT_ID and OURA_CLIENT_SECRET),
        "connected":   bool(tok.get("access_token")),
        "redirect_uri": OURA_REDIRECT_URI,
        "last_synced": tok.get("last_synced"),
    })


@app.route("/api/oura/connect")
@limiter.limit("10 per minute")
def oura_connect():
    if not OURA_CLIENT_ID:
        return jsonify({"error": "OURA_CLIENT_ID not configured"}), 503
    state = secrets.token_urlsafe(16)
    session["oura_state"] = state
    auth_url = OURA_AUTH_URL + "?" + urlencode({
        "client_id":     OURA_CLIENT_ID,
        "redirect_uri":  OURA_REDIRECT_URI,
        "response_type": "code",
        "scope":         OURA_SCOPES,
        "state":         state,
    })
    return jsonify({"auth_url": auth_url})


@app.route("/api/oura/callback")
def oura_callback():
    code  = request.args.get("code")
    state = request.args.get("state")
    error = request.args.get("error")

    if error or not code:
        return _popup_page("oura_oauth", "error", error or "No code received")
    if state != session.get("oura_state"):
        return _popup_page("oura_oauth", "error", "State mismatch")

    resp = http.post(OURA_TOKEN_URL, data={
        "grant_type":    "authorization_code",
        "code":          code,
        "redirect_uri":  OURA_REDIRECT_URI,
        "client_id":     OURA_CLIENT_ID,
        "client_secret": OURA_CLIENT_SECRET,
    }, timeout=10)

    if not resp.ok:
        return _popup_page("oura_oauth", "error", f"Token exchange failed: {resp.text}")

    tok = resp.json()
    _set_tok("oura", {
        "access_token":  tok["access_token"],
        "refresh_token": tok.get("refresh_token", ""),
        "expires_at":    datetime.utcnow().timestamp() + tok.get("expires_in", 86400),
    })
    return _popup_page("oura_oauth", "success", "")


@app.route("/api/oura/sync", methods=["POST"])
@limiter.limit("10 per minute")
def oura_sync():
    tok = _get_tok("oura")
    if not tok.get("access_token"):
        return jsonify({"error": "Not connected"}), 401

    today    = datetime.utcnow().date().isoformat()
    week_ago = (datetime.utcnow().date() - timedelta(days=7)).isoformat()
    result: dict = {}

    rd, err = _oura_get("/usercollection/daily_readiness", {"start_date": week_ago, "end_date": today})
    if err:
        return jsonify({"error": err}), 502
    readiness_records = rd.get("data", [])
    if readiness_records:
        latest = readiness_records[-1]
        result["recovery"] = {"score": latest.get("score", 0)}

    sl, _ = _oura_get("/usercollection/sleep", {"start_date": week_ago, "end_date": today})
    if sl:
        sleep_records = sl.get("data", [])
        if sleep_records:
            latest_sleep = sleep_records[-1]
            hrv_avg  = latest_sleep.get("average_hrv")
            rhr      = latest_sleep.get("lowest_heart_rate")
            dur_sec  = latest_sleep.get("total_sleep_duration")
            if hrv_avg: result["recovery"] = {**result.get("recovery", {}), "hrv": round(hrv_avg)}
            if rhr:     result["recovery"] = {**result.get("recovery", {}), "rhr": round(rhr)}
            if dur_sec: result["sleep_hours"] = round(dur_sec / 3600, 1)
            hrv_hist = [round(r.get("average_hrv") or 0) for r in sleep_records[-7:]]
            if any(h > 0 for h in hrv_hist):
                result["hrv_history"] = hrv_hist

    last_synced = datetime.utcnow().isoformat() + "Z"
    _set_tok("oura", {**tok, "last_synced": last_synced})
    result["last_synced"] = last_synced
    return jsonify(result)


@app.route("/api/oura/disconnect", methods=["POST"])
@limiter.limit("10 per minute")
def oura_disconnect():
    _del_tok("oura")
    return jsonify({"ok": True})


# ── Internal scheduler endpoint ───────────────────────────────────────────────

@app.route("/api/internal/sync-all", methods=["POST"])
@_require_internal
def internal_sync_all():
    """Called by the Supabase Edge Function cron job each morning.
    Refreshes tokens and syncs all connected wearables."""
    results: dict = {}

    # WHOOP
    whoop_tok = _get_tok("whoop")
    if whoop_tok.get("access_token"):
        rec_data, err = _whoop_get("/recovery?limit=1")
        if not err and rec_data:
            records = rec_data.get("records", [])
            if records:
                s = records[0].get("score", {})
                results["whoop_recovery"] = {
                    "score": round(s.get("recovery_score", 0)),
                    "hrv":   round(s.get("hrv_rmssd_milli", 0)),
                    "rhr":   round(s.get("resting_heart_rate", 0)),
                }
        sleep_data, _ = _whoop_get("/activity/sleep?limit=1")
        if sleep_data:
            sleeps = sleep_data.get("records", [])
            if sleeps:
                stage    = sleeps[0].get("score", {}).get("stage_summary", {})
                total_ms = (
                    stage.get("total_light_sleep_time_milli", 0) +
                    stage.get("total_slow_wave_sleep_time_milli", 0) +
                    stage.get("total_rem_sleep_time_milli", 0)
                )
                results["whoop_sleep_hours"] = round(total_ms / 3_600_000, 1)
        last_synced = datetime.utcnow().isoformat() + "Z"
        _set_tok("whoop", {**whoop_tok, "last_synced": last_synced})
        results["whoop_synced_at"] = last_synced

    # Oura
    oura_tok = _get_tok("oura")
    if oura_tok.get("access_token"):
        today    = datetime.utcnow().date().isoformat()
        week_ago = (datetime.utcnow().date() - timedelta(days=7)).isoformat()
        rd, err = _oura_get("/usercollection/daily_readiness",
                            {"start_date": week_ago, "end_date": today})
        if not err and rd:
            readiness = rd.get("data", [])
            if readiness:
                results["oura_recovery"] = {"score": readiness[-1].get("score", 0)}
        sl, _ = _oura_get("/usercollection/sleep",
                          {"start_date": week_ago, "end_date": today})
        if sl:
            sleeps = sl.get("data", [])
            if sleeps:
                latest  = sleeps[-1]
                hrv_avg = latest.get("average_hrv")
                dur_sec = latest.get("total_sleep_duration")
                if hrv_avg:
                    results.setdefault("oura_recovery", {})["hrv"] = round(hrv_avg)
                if dur_sec:
                    results["oura_sleep_hours"] = round(dur_sec / 3600, 1)
        last_synced = datetime.utcnow().isoformat() + "Z"
        _set_tok("oura", {**oura_tok, "last_synced": last_synced})
        results["oura_synced_at"] = last_synced

    results["synced_at"] = datetime.utcnow().isoformat() + "Z"
    return jsonify(results)


# ── Shared OAuth popup helper ─────────────────────────────────────────────────

_FRONTEND_ORIGIN = os.environ.get("FRONTEND_URL", "http://localhost:5000")


def _js_str(value: str) -> str:
    """JSON-encode a string for safe embedding inside an HTML <script> block.
    Standard json.dumps leaves < > & unescaped, which allows </script> injection."""
    return (
        json.dumps(value)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
    )


def _popup_page(msg_type: str, status: str, message: str) -> str:
    title   = "APEX – Connected" if status == "success" else "APEX – Error"
    heading = "✓ Connected"      if status == "success" else "⚠ Error"
    # HTML body: only show a fixed success string or an HTML-escaped error
    body    = "Connected successfully. This window will close." if status == "success" \
              else html.escape(message)
    return f"""<!DOCTYPE html>
<html>
<head><title>{html.escape(title)}</title>
<style>
  body{{font-family:-apple-system,sans-serif;background:#1A1714;color:#F5F0E8;
        display:flex;align-items:center;justify-content:center;height:100vh;margin:0}}
  .card{{text-align:center;padding:40px}}
  h2{{font-family:Georgia,serif;font-weight:300;margin-bottom:8px}}
  p{{color:rgba(245,240,232,.5);font-size:14px}}
</style>
</head>
<body>
<div class="card"><h2>{heading}</h2><p>{body}</p></div>
<script>
  window.opener && window.opener.postMessage(
    {{type:{_js_str(msg_type)},status:{_js_str(status)},message:{_js_str(message)}}},
    {_js_str(_FRONTEND_ORIGIN)}
  );
  setTimeout(()=>window.close(), 1500);
</script>
</body>
</html>"""


# ── Health check ─────────────────────────────────────────────────────────────

@app.route("/health")
@limiter.exempt
def health():
    """Used by load balancer / blue-green deploy readiness probes."""
    return jsonify({"status": "ok", "ts": datetime.utcnow().isoformat() + "Z"})


# ── Static frontend (production) ──────────────────────────────────────────────

DIST = os.path.join(os.path.dirname(__file__), "client", "dist")

if os.path.isdir(DIST):
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path: str):
        if path and os.path.exists(os.path.join(DIST, path)):
            return send_from_directory(DIST, path)
        return send_from_directory(DIST, "index.html")


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
