"""
APEX backend — edge case & security test suite.

Run: pytest test_server.py -v
All external API calls (Anthropic, WHOOP, Oura) are mocked.
"""
from __future__ import annotations

import base64
import json
import os
import unittest.mock as mock

import pytest

# Set required env vars BEFORE importing server so the startup check passes
os.environ.setdefault("FLASK_SECRET_KEY", "test-secret-key-that-is-long-enough-32x")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test-key")


@pytest.fixture(scope="session")
def app():
    import server as srv
    srv.app.config["TESTING"] = True
    srv.app.config["SECRET_KEY"] = "test-secret-key-that-is-long-enough-32x"
    # Disable rate limiting in tests
    srv.limiter.enabled = False
    return srv.app


@pytest.fixture
def client(app):
    with app.test_client() as c:
        yield c


# ─────────────────────────────────────────────────────────────────────────────
# /api/chat — input validation
# ─────────────────────────────────────────────────────────────────────────────

class TestChatInputValidation:
    def _mock_stream(self, chunks=("ok",)):
        """Return a context-manager mock whose .text_stream yields chunks."""
        ctx = mock.MagicMock()
        ctx.__enter__ = mock.MagicMock(return_value=ctx)
        ctx.__exit__ = mock.MagicMock(return_value=False)
        ctx.text_stream = iter(chunks)
        return ctx

    def _stream_text(self, rv) -> str:
        """Collect all SSE data lines from a streaming response into plain text."""
        text = ""
        for line in rv.get_data(as_text=True).splitlines():
            if line.startswith("data: ") and line[6:] not in ("[DONE]", "[ERROR]"):
                try:
                    text += json.loads(line[6:])
                except json.JSONDecodeError:
                    pass
        return text

    def test_empty_message_rejected(self, client):
        rv = client.post("/api/chat", json={"message": ""})
        assert rv.status_code == 400
        assert "message" in rv.get_json()["error"].lower()

    def test_whitespace_only_message_rejected(self, client):
        rv = client.post("/api/chat", json={"message": "   \n\t  "})
        assert rv.status_code == 400

    def test_missing_message_field_rejected(self, client):
        rv = client.post("/api/chat", json={})
        assert rv.status_code == 400

    def test_non_json_body_returns_400(self, client):
        rv = client.post("/api/chat", data="not json",
                         content_type="application/json")
        assert rv.status_code == 400

    def test_message_truncated_to_max_length(self, client):
        import server as srv
        huge = "A" * (srv.MAX_MESSAGE_LEN + 5000)
        captured = []

        def fake_stream(**kwargs):
            captured.append(kwargs.get("messages", []))
            return self._mock_stream(["ok"])

        with mock.patch.object(srv.ai_client.messages, "stream", side_effect=fake_stream):
            rv = client.post("/api/chat", json={"message": huge})
        assert rv.status_code == 200
        assert len(captured[0][-1]["content"]) == srv.MAX_MESSAGE_LEN

    def test_valid_message_passes_through(self, client):
        import server as srv
        with mock.patch.object(srv.ai_client.messages, "stream",
                               return_value=self._mock_stream(["hel", "lo"])):
            rv = client.post("/api/chat", json={"message": "How is my HRV?"})
        assert rv.status_code == 200
        assert self._stream_text(rv) == "hello"

    def test_history_invalid_type_rejected(self, client):
        rv = client.post("/api/chat", json={
            "message": "hi",
            "history": "not a list",
        })
        assert rv.status_code == 400

    def test_history_bad_roles_stripped(self, client):
        import server as srv
        captured = []

        def fake_stream(**kwargs):
            captured.append(kwargs.get("messages", []))
            return self._mock_stream(["ok"])

        with mock.patch.object(srv.ai_client.messages, "stream", side_effect=fake_stream):
            rv = client.post("/api/chat", json={
                "message": "hi",
                "history": [
                    {"role": "user",      "content": "legit message"},
                    {"role": "admin",     "content": "injected system msg"},
                    {"role": "assistant", "content": "response"},
                ],
            })
        assert rv.status_code == 200
        roles = [m["role"] for m in captured[0]]
        assert "admin" not in roles

    def test_history_capped_at_max_messages(self, client):
        import server as srv
        captured = []

        def fake_stream(**kwargs):
            captured.append(kwargs.get("messages", []))
            return self._mock_stream(["ok"])

        large_history = [{"role": "user" if i % 2 == 0 else "assistant",
                          "content": f"msg {i}"}
                         for i in range(50)]

        with mock.patch.object(srv.ai_client.messages, "stream", side_effect=fake_stream):
            rv = client.post("/api/chat", json={
                "message": "hi",
                "history": large_history,
            })
        assert rv.status_code == 200
        assert len(captured[0]) <= srv.MAX_HISTORY_MSGS + 1

    def test_context_unknown_keys_stripped(self, client):
        import server as srv
        captured_systems = []

        def fake_stream(**kwargs):
            captured_systems.append(kwargs.get("system", []))
            return self._mock_stream(["ok"])

        with mock.patch.object(srv.ai_client.messages, "stream", side_effect=fake_stream):
            rv = client.post("/api/chat", json={
                "message": "hi",
                "context": {
                    "name": "Luke",
                    "__proto__": "injection",
                    "malicious_key": "ignore me",
                    "recovery": {"hrv": 55},
                },
            })
        assert rv.status_code == 200
        system_text = json.dumps(captured_systems[0])
        assert "__proto__" not in system_text
        assert "malicious_key" not in system_text
        assert "Luke" in system_text

    def test_anthropic_error_yields_error_event(self, client):
        import server as srv
        import anthropic
        # In streaming, errors appear as SSE events, not HTTP status codes,
        # because the 200 header is sent before the generator runs.
        ctx = mock.MagicMock()
        ctx.__enter__ = mock.MagicMock(side_effect=anthropic.APIError(
            "boom", request=mock.MagicMock(), body=None))
        ctx.__exit__ = mock.MagicMock(return_value=False)
        with mock.patch.object(srv.ai_client.messages, "stream", return_value=ctx):
            rv = client.post("/api/chat", json={"message": "hi"})
        body = rv.get_data(as_text=True)
        assert "[ERROR]" in body
        assert "boom" not in body


# ─────────────────────────────────────────────────────────────────────────────
# /api/scan — image validation
# ─────────────────────────────────────────────────────────────────────────────

class TestScanInputValidation:
    def _mock_scan_response(self):
        payload = json.dumps({
            "name": "Chicken",
            "items": [{"name": "chicken", "portion": "200g", "kcal": 330,
                        "p": 62, "c": 0, "f": 7, "confidence": "90%"}],
            "totals": {"kcal": 330, "p": 62, "c": 0, "f": 7},
        })
        m = mock.MagicMock()
        m.content = [mock.MagicMock(text=payload)]
        return m

    def test_missing_image_rejected(self, client):
        rv = client.post("/api/scan", json={})
        assert rv.status_code == 400

    def test_empty_image_rejected(self, client):
        rv = client.post("/api/scan", json={"image": ""})
        assert rv.status_code == 400

    def test_non_string_image_rejected(self, client):
        rv = client.post("/api/scan", json={"image": 12345})
        assert rv.status_code == 400

    def test_oversized_image_rejected(self, client):
        import server as srv
        big_b64 = base64.b64encode(b"x" * (srv.MAX_IMAGE_BYTES + 1)).decode()
        rv = client.post("/api/scan", json={"image": big_b64})
        assert rv.status_code == 413

    def test_malformed_data_uri_rejected(self, client):
        rv = client.post("/api/scan", json={"image": "data:image/jpeg;base64,"})
        assert rv.status_code == 400

    def test_png_media_type_detected(self, client):
        import server as srv
        captured = []

        def fake_create(**kwargs):
            captured.append(kwargs)
            return self._mock_scan_response()

        tiny_png = base64.b64encode(b"\x89PNG fake").decode()
        with mock.patch.object(srv.ai_client.messages, "create", side_effect=fake_create):
            rv = client.post("/api/scan",
                             json={"image": f"data:image/png;base64,{tiny_png}"})
        assert rv.status_code == 200
        source = captured[0]["messages"][0]["content"][0]["source"]
        assert source["media_type"] == "image/png"

    def test_bad_ai_json_returns_422(self, client):
        import server as srv
        import anthropic
        bad = mock.MagicMock()
        bad.content = [mock.MagicMock(text="not json at all")]
        with mock.patch.object(srv.ai_client.messages, "create", return_value=bad):
            rv = client.post("/api/scan",
                             json={"image": base64.b64encode(b"fake").decode()})
        assert rv.status_code == 422

    def test_scan_totals_recalculated_server_side(self, client):
        """Totals must be computed server-side; AI-provided totals are replaced."""
        import server as srv
        faked_totals_wrong = json.dumps({
            "name": "Meal",
            "items": [{"name": "rice", "portion": "100g",
                        "kcal": 200, "p": 4, "c": 44, "f": 1, "confidence": "95%"}],
            "totals": {"kcal": 9999, "p": 9999, "c": 9999, "f": 9999},
        })
        m = mock.MagicMock()
        m.content = [mock.MagicMock(text=faked_totals_wrong)]
        with mock.patch.object(srv.ai_client.messages, "create", return_value=m):
            rv = client.post("/api/scan",
                             json={"image": base64.b64encode(b"fake").decode()})
        data = rv.get_json()
        assert data["totals"]["kcal"] == 200
        assert data["totals"]["p"]    == 4

    def test_anthropic_error_does_not_leak(self, client):
        import server as srv
        import anthropic
        with mock.patch.object(srv.ai_client.messages, "create",
                               side_effect=anthropic.APIError("secret", request=mock.MagicMock(), body=None)):
            rv = client.post("/api/scan",
                             json={"image": base64.b64encode(b"x").decode()})
        assert rv.status_code == 500
        assert "secret" not in rv.get_data(as_text=True)


# ─────────────────────────────────────────────────────────────────────────────
# XSS / injection in OAuth popup
# ─────────────────────────────────────────────────────────────────────────────

class TestPopupPageXSS:
    def test_html_in_error_message_is_escaped_in_body(self, app):
        import server as srv
        xss = '<script>alert("xss")</script>'
        page = srv._popup_page("whoop_oauth", "error", xss)
        # The <p> body must have HTML-escaped content
        assert "&lt;script&gt;" in page

    def test_script_tag_injection_blocked_in_js_block(self, app):
        import server as srv
        xss = '</script><script>alert("xss")</script>'
        page = srv._popup_page("whoop_oauth", "error", xss)
        # The </script> sequence must not appear literally inside the JS block
        script_block = page.split("<script>")[1].split("</script>")[0]
        assert "</script>" not in script_block

    def test_success_page_html_body_is_fixed_string(self, app):
        import server as srv
        page = srv._popup_page("whoop_oauth", "success", "")
        assert "Connected successfully" in page

    def test_postmessage_uses_specific_origin(self, app):
        import server as srv
        page = srv._popup_page("whoop_oauth", "success", "")
        assert "'*'" not in page
        assert '"*"' not in page
        # Should contain the configured FRONTEND_ORIGIN (unicode-escaped in _js_str)
        assert "localhost" in page

    def test_error_img_tag_neutralised_in_html(self, app):
        import server as srv
        provider_error = '"><img src=x onerror=alert(1)>'
        page = srv._popup_page("oura_oauth", "error", provider_error)
        # The <img tag itself must be HTML-escaped so it can't execute
        html_body = page.split("<p>")[1].split("</p>")[0]
        assert "<img" not in html_body          # tag must not appear literally
        assert "&lt;img" in html_body           # must be escaped instead

    def test_angle_brackets_unicode_escaped_in_js(self, app):
        import server as srv
        page = srv._popup_page("whoop_oauth", "error", "<b>injection</b>")
        script_block = page.split("<script>")[1].split("</script>")[0]
        # < and > must be unicode-escaped inside the JS block
        assert "\\u003c" in script_block or "<b>" not in script_block


# ─────────────────────────────────────────────────────────────────────────────
# OAuth CSRF state validation
# ─────────────────────────────────────────────────────────────────────────────

class TestOAuthCSRF:
    def test_whoop_callback_rejects_missing_code(self, client):
        with client.session_transaction() as sess:
            sess["whoop_state"] = "valid_state"
        rv = client.get("/api/whoop/callback?state=valid_state")
        assert rv.status_code == 200
        assert "Error" in rv.get_data(as_text=True)

    def test_whoop_callback_rejects_state_mismatch(self, client):
        with client.session_transaction() as sess:
            sess["whoop_state"] = "correct_state"
        rv = client.get("/api/whoop/callback?code=abc&state=WRONG_STATE")
        assert rv.status_code == 200
        text = rv.get_data(as_text=True)
        assert "mismatch" in text.lower() or "error" in text.lower()

    def test_oura_callback_rejects_state_mismatch(self, client):
        with client.session_transaction() as sess:
            sess["oura_state"] = "correct_state"
        rv = client.get("/api/oura/callback?code=abc&state=DIFFERENT")
        assert rv.status_code == 200
        assert "Error" in rv.get_data(as_text=True)

    def test_whoop_callback_error_param_handled(self, client):
        rv = client.get("/api/whoop/callback?error=access_denied")
        assert rv.status_code == 200
        text = rv.get_data(as_text=True)
        assert "Error" in text


# ─────────────────────────────────────────────────────────────────────────────
# WHOOP / Oura status endpoints
# ─────────────────────────────────────────────────────────────────────────────

class TestWearableStatus:
    def test_whoop_status_not_connected_by_default(self, client):
        import server as srv
        with mock.patch.object(srv, "_get_tok", return_value={}):
            rv = client.get("/api/whoop/status")
        data = rv.get_json()
        assert rv.status_code == 200
        assert data["connected"] is False

    def test_oura_status_not_connected_by_default(self, client):
        import server as srv
        with mock.patch.object(srv, "_get_tok", return_value={}):
            rv = client.get("/api/oura/status")
        data = rv.get_json()
        assert data["connected"] is False

    def test_whoop_status_returns_configured_false_when_no_client_id(self, client):
        import server as srv
        with mock.patch.object(srv, "WHOOP_CLIENT_ID", ""), \
             mock.patch.object(srv, "_get_tok", return_value={}):
            rv = client.get("/api/whoop/status")
        assert rv.get_json()["configured"] is False

    def test_whoop_connect_fails_without_client_id(self, client):
        import server as srv
        with mock.patch.object(srv, "WHOOP_CLIENT_ID", ""):
            rv = client.get("/api/whoop/connect")
        assert rv.status_code == 503

    def test_oura_connect_fails_without_client_id(self, client):
        import server as srv
        with mock.patch.object(srv, "OURA_CLIENT_ID", ""):
            rv = client.get("/api/oura/connect")
        assert rv.status_code == 503


# ─────────────────────────────────────────────────────────────────────────────
# WHOOP / Oura sync — auth check
# ─────────────────────────────────────────────────────────────────────────────

class TestWearableSync:
    def test_whoop_sync_requires_connected_token(self, client):
        import server as srv
        with mock.patch.object(srv, "_get_tok", return_value={}):
            rv = client.post("/api/whoop/sync")
        assert rv.status_code == 401

    def test_oura_sync_requires_connected_token(self, client):
        import server as srv
        with mock.patch.object(srv, "_get_tok", return_value={}):
            rv = client.post("/api/oura/sync")
        assert rv.status_code == 401

    def test_whoop_sync_propagates_api_error(self, client):
        import server as srv
        tok = {"access_token": "tok", "refresh_token": "ref",
               "expires_at": 9_999_999_999.0}
        bad_resp = mock.MagicMock(ok=False, status_code=502)

        with mock.patch.object(srv, "_get_tok", return_value=tok), \
             mock.patch.object(srv, "_whoop_get", return_value=(None, "WHOOP API error 502")):
            rv = client.post("/api/whoop/sync")
        assert rv.status_code == 502

    def test_oura_sync_propagates_api_error(self, client):
        import server as srv
        tok = {"access_token": "tok"}
        with mock.patch.object(srv, "_get_tok", return_value=tok), \
             mock.patch.object(srv, "_oura_get", return_value=(None, "Oura API error 502")):
            rv = client.post("/api/oura/sync")
        assert rv.status_code == 502


# ─────────────────────────────────────────────────────────────────────────────
# Token refresh logic
# ─────────────────────────────────────────────────────────────────────────────

class TestTokenRefresh:
    _UID = "00000000-0000-0000-0000-000000000001"

    def test_whoop_refresh_called_when_token_expired(self):
        import server as srv
        expired_tok = {
            "access_token": "old",
            "refresh_token": "ref",
            "expires_at": 0.0,  # already expired
        }
        new_tok_resp = mock.MagicMock(ok=True)
        new_tok_resp.json.return_value = {
            "access_token": "new_tok",
            "expires_in": 3600,
        }
        with mock.patch.object(srv, "_get_tok", return_value=expired_tok), \
             mock.patch.object(srv, "_set_tok") as mock_set, \
             mock.patch("server.http.post", return_value=new_tok_resp):
            result = srv._whoop_ensure_token(self._UID)
        assert result == "new_tok"
        mock_set.assert_called_once()

    def test_whoop_refresh_failure_returns_none(self):
        import server as srv
        expired = {"access_token": "old", "refresh_token": "ref", "expires_at": 0.0}
        bad_resp = mock.MagicMock(ok=False)
        with mock.patch.object(srv, "_get_tok", return_value=expired), \
             mock.patch("server.http.post", return_value=bad_resp):
            result = srv._whoop_ensure_token(self._UID)
        assert result is None

    def test_valid_token_not_refreshed(self):
        import server as srv
        future = {"access_token": "valid", "refresh_token": "ref",
                  "expires_at": 9_999_999_999.0}
        with mock.patch.object(srv, "_get_tok", return_value=future), \
             mock.patch("server.http.post") as mock_post:
            result = srv._whoop_ensure_token(self._UID)
        assert result == "valid"
        mock_post.assert_not_called()

    def test_oura_refresh_called_when_expired(self):
        import server as srv
        expired = {"access_token": "old", "refresh_token": "ref", "expires_at": 0.0}
        new_resp = mock.MagicMock(ok=True)
        new_resp.json.return_value = {"access_token": "new_oura", "expires_in": 86400}
        with mock.patch.object(srv, "_get_tok", return_value=expired), \
             mock.patch.object(srv, "_set_tok"), \
             mock.patch("server.http.post", return_value=new_resp):
            result = srv._oura_ensure_token(self._UID)
        assert result == "new_oura"


# ─────────────────────────────────────────────────────────────────────────────
# Token store helpers (Supabase REST — calls are mocked)
# ─────────────────────────────────────────────────────────────────────────────

class TestTokenStore:
    """Verify _get_tok / _set_tok / _del_tok make the expected HTTP calls."""

    _UID = "00000000-0000-0000-0000-000000000001"

    def test_get_tok_returns_first_row(self):
        import server as srv
        row = {"user_id": self._UID, "provider": "whoop", "access_token": "abc"}
        resp = mock.MagicMock(ok=True)
        resp.json.return_value = [row]
        with mock.patch("server.http.get", return_value=resp), \
             mock.patch.object(srv, "SUPABASE_URL", "https://x.supabase.co"), \
             mock.patch.object(srv, "SUPABASE_SERVICE_KEY", "key"):
            tok = srv._get_tok(self._UID, "whoop")
        assert tok["access_token"] == "abc"

    def test_get_tok_returns_empty_when_not_found(self):
        import server as srv
        resp = mock.MagicMock(ok=True)
        resp.json.return_value = []
        with mock.patch("server.http.get", return_value=resp), \
             mock.patch.object(srv, "SUPABASE_URL", "https://x.supabase.co"), \
             mock.patch.object(srv, "SUPABASE_SERVICE_KEY", "key"):
            tok = srv._get_tok(self._UID, "nonexistent")
        assert tok == {}

    def test_set_tok_posts_to_supabase(self):
        import server as srv
        resp = mock.MagicMock(ok=True)
        with mock.patch("server.http.post", return_value=resp) as mock_post, \
             mock.patch.object(srv, "SUPABASE_URL", "https://x.supabase.co"), \
             mock.patch.object(srv, "SUPABASE_SERVICE_KEY", "key"):
            srv._set_tok(self._UID, "whoop", {"access_token": "tok"})
        mock_post.assert_called_once()
        payload = mock_post.call_args.kwargs["json"]
        assert payload["user_id"]  == self._UID
        assert payload["provider"] == "whoop"

    def test_del_tok_deletes_from_supabase(self):
        import server as srv
        resp = mock.MagicMock(ok=True)
        with mock.patch("server.http.delete", return_value=resp) as mock_del, \
             mock.patch.object(srv, "SUPABASE_URL", "https://x.supabase.co"), \
             mock.patch.object(srv, "SUPABASE_SERVICE_KEY", "key"):
            srv._del_tok(self._UID, "whoop")
        mock_del.assert_called_once()

    def test_disconnect_whoop_calls_del_tok(self, client):
        import server as srv
        with mock.patch.object(srv, "_del_tok") as mock_del:
            rv = client.post("/api/whoop/disconnect")
        assert rv.status_code == 200
        mock_del.assert_called_once()

    def test_disconnect_oura_calls_del_tok(self, client):
        import server as srv
        with mock.patch.object(srv, "_del_tok") as mock_del:
            rv = client.post("/api/oura/disconnect")
        assert rv.status_code == 200
        mock_del.assert_called_once()


# ─────────────────────────────────────────────────────────────────────────────
# API key exposure check
# ─────────────────────────────────────────────────────────────────────────────

class TestAPIKeyExposure:
    def test_anthropic_key_not_in_chat_response(self, client):
        import server as srv
        key = os.environ.get("ANTHROPIC_API_KEY", "sk-ant-test-key")
        ctx = mock.MagicMock()
        ctx.__enter__ = mock.MagicMock(return_value=ctx)
        ctx.__exit__ = mock.MagicMock(return_value=False)
        ctx.text_stream = iter(["all good"])
        with mock.patch.object(srv.ai_client.messages, "stream", return_value=ctx):
            rv = client.post("/api/chat", json={"message": "hi"})
        assert key not in rv.get_data(as_text=True)

    def test_whoop_secret_not_in_status_response(self, client):
        import server as srv
        with mock.patch.object(srv, "WHOOP_CLIENT_SECRET", "super_secret"), \
             mock.patch.object(srv, "_get_tok", return_value={}):
            rv = client.get("/api/whoop/status")
        assert "super_secret" not in rv.get_data(as_text=True)

    def test_oura_secret_not_in_status_response(self, client):
        import server as srv
        with mock.patch.object(srv, "OURA_CLIENT_SECRET", "oura_secret"), \
             mock.patch.object(srv, "_get_tok", return_value={}):
            rv = client.get("/api/oura/status")
        assert "oura_secret" not in rv.get_data(as_text=True)

    def test_access_tokens_not_returned_to_client(self, client):
        import server as srv
        with mock.patch.object(srv, "_get_tok",
                               return_value={"access_token": "BEARER_TOKEN_SECRET"}):
            rv = client.get("/api/whoop/status")
        assert "BEARER_TOKEN_SECRET" not in rv.get_data(as_text=True)


# ─────────────────────────────────────────────────────────────────────────────
# Request body size limit
# ─────────────────────────────────────────────────────────────────────────────

class TestRequestSizeLimits:
    def test_max_content_length_configured(self, app):
        assert app.config["MAX_CONTENT_LENGTH"] == 10 * 1024 * 1024

    def test_oversized_scan_payload_rejected(self, client):
        """10MB+ body should be rejected before hitting the route."""
        import server as srv
        # Just above the 8MB base64 cap inside the route
        oversized = base64.b64encode(b"x" * (srv.MAX_IMAGE_BYTES + 1)).decode()
        rv = client.post("/api/scan", json={"image": oversized})
        assert rv.status_code in (400, 413)
