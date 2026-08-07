#!/usr/bin/env python3
"""
Focused backend test for AREVEI cheap coding agent.
Tests the LiteLLM/OpenRouter model router and streaming workspace agent.
"""
import json
import os
import sys
import requests
from typing import Iterator

# Backend URL from frontend .env
BACKEND_URL = "https://github-import-lite.preview.emergentagent.com/api"
AUTH_EMAIL = "founder@demo.com"
AUTH_PASSWORD = "Demo@1234"

def log(msg: str):
    """Print test log message."""
    print(f"[TEST] {msg}", flush=True)

def login() -> str:
    """Login and return auth token."""
    log(f"Logging in as {AUTH_EMAIL}...")
    resp = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={"email": AUTH_EMAIL, "password": AUTH_PASSWORD},
        timeout=30
    )
    if resp.status_code != 200:
        raise Exception(f"Login failed: {resp.status_code} {resp.text[:500]}")
    data = resp.json()
    token = data.get("token")
    if not token:
        raise Exception(f"No token in login response: {data}")
    log(f"✓ Login successful")
    return token

def test_ai_models(token: str):
    """Test 1: GET /api/workspaces/ai/models"""
    log("Test 1: GET /api/workspaces/ai/models")
    resp = requests.get(
        f"{BACKEND_URL}/ai/models",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30
    )
    if resp.status_code != 200:
        raise Exception(f"GET /ai/models failed: {resp.status_code} {resp.text[:500]}")
    
    data = resp.json()
    models = data.get("models", [])
    default = data.get("default")
    router_ready = data.get("router_ready")
    
    log(f"  Models returned: {len(models)}")
    log(f"  Default model: {default}")
    log(f"  Router ready: {router_ready}")
    
    # Verify 4 models
    if len(models) != 4:
        raise Exception(f"Expected 4 models, got {len(models)}: {models}")
    
    # Verify model names
    model_ids = {m.get("id") for m in models}
    expected = {"free", "cheap", "nim", "coding"}
    if model_ids != expected:
        raise Exception(f"Expected models {expected}, got {model_ids}")
    
    # Verify default is 'free'
    if default != "free":
        raise Exception(f"Expected default='free', got '{default}'")
    
    # Verify router_ready is true
    if not router_ready:
        raise Exception(f"Expected router_ready=true, got {router_ready}")
    
    log("✓ Test 1 PASSED: /ai/models returns 4 models, default='free', router_ready=true")
    return True

def test_projects_start(token: str) -> str:
    """Test 2: POST /api/projects/start - returns workspace id"""
    log("Test 2: POST /api/projects/start")
    resp = requests.post(
        f"{BACKEND_URL}/projects/start",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "tiny test app", "name": "test"},
        timeout=30
    )
    if resp.status_code != 200:
        raise Exception(f"POST /projects/start failed: {resp.status_code} {resp.text[:500]}")
    
    data = resp.json()
    workspace_id = data.get("id")
    if not workspace_id:
        raise Exception(f"No workspace id in response: {data}")
    
    log(f"  Workspace created: {workspace_id}")
    log("✓ Test 2 PASSED: /projects/start returned workspace")
    return workspace_id

def parse_ndjson_stream(content: str) -> list:
    """Parse NDJSON stream (one JSON object per line)."""
    events = []
    for line in content.strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"[WARN] Failed to parse line: {line[:100]} - {e}")
    return events

def test_ai_chat_stream(token: str, workspace_id: str, model: str, message: str, expected_file: str):
    """Test 3/5: POST /api/workspaces/{id}/ai/chat/stream"""
    log(f"Test: POST /api/workspaces/{workspace_id}/ai/chat/stream (model={model})")
    log(f"  Message: {message}")
    
    resp = requests.post(
        f"{BACKEND_URL}/workspaces/{workspace_id}/ai/chat/stream",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": message, "model": model},
        stream=True,
        timeout=120
    )
    
    if resp.status_code != 200:
        raise Exception(f"POST /ai/chat/stream failed: {resp.status_code} {resp.text[:500]}")
    
    # Collect stream content
    content = b""
    for chunk in resp.iter_content(chunk_size=8192):
        if chunk:
            content += chunk
    
    # Decode to string
    content = content.decode('utf-8')
    
    log(f"  Stream received: {len(content)} bytes")
    
    # Parse NDJSON
    events = parse_ndjson_stream(content)
    log(f"  Parsed {len(events)} events")
    
    # Collect event types
    event_types = []
    file_edit_started = []
    file_edit_finished = []
    result_obj = None
    delta_texts = []
    errors = []
    
    for item in events:
        item_type = item.get("type")
        event_types.append(item_type)
        
        if item_type == "event":
            event = item.get("event", {})
            raw_type = event.get("raw_type")
            log(f"    → event: {raw_type} - {event.get('message', '')[:80]}")
            if raw_type == "file_edit_started":
                path = event.get("path")
                file_edit_started.append(path)
            elif raw_type == "file_edit_finished":
                path = event.get("path")
                file_edit_finished.append(path)
        elif item_type == "delta":
            delta_texts.append(item.get("text", ""))
        elif item_type == "result":
            result_obj = item.get("result")
        elif item_type == "error":
            errors.append(item.get("detail", "unknown error"))
    
    # Check for errors
    if errors:
        raise Exception(f"Stream contained errors: {errors}")
    
    # Verify file_edit_started for expected file
    if expected_file not in file_edit_started:
        raise Exception(f"Expected file_edit_started for '{expected_file}', got: {file_edit_started}")
    
    # Verify file_edit_finished for expected file
    if expected_file not in file_edit_finished:
        raise Exception(f"Expected file_edit_finished for '{expected_file}', got: {file_edit_finished}")
    
    # Verify result object
    if not result_obj:
        raise Exception(f"No result object in stream. Event types: {set(event_types)}")
    
    files_changed = result_obj.get("files_changed", [])
    status = result_obj.get("status")
    
    log(f"  Result status: {status}")
    log(f"  Files changed: {files_changed}")
    
    # Verify expected file in files_changed (files_changed is list of dicts with 'path' key)
    changed_paths = [f.get("path") if isinstance(f, dict) else f for f in files_changed]
    if expected_file not in changed_paths:
        raise Exception(f"Expected '{expected_file}' in files_changed, got: {changed_paths}")
    
    # Verify status is 'applied'
    if status != "applied":
        raise Exception(f"Expected status='applied', got '{status}'")
    
    # Collect assistant summary
    summary = "".join(delta_texts)
    log(f"  Assistant summary: {summary[:200]}")
    
    log(f"✓ Test PASSED: model={model}, file={expected_file}, status=applied")
    return True

def test_file_content(token: str, workspace_id: str, file_path: str, expected_content: str):
    """Test 4: GET /api/workspaces/{id}/files/{path}"""
    log(f"Test: GET /api/workspaces/{workspace_id}/files/{file_path}")
    
    resp = requests.get(
        f"{BACKEND_URL}/workspaces/{workspace_id}/files/{file_path}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30
    )
    
    if resp.status_code != 200:
        raise Exception(f"GET /files/{file_path} failed: {resp.status_code} {resp.text[:500]}")
    
    data = resp.json()
    content = data.get("content", "")
    
    log(f"  File content: {content[:100]}")
    
    # Verify content contains expected text
    if expected_content not in content:
        raise Exception(f"Expected content to contain '{expected_content}', got: {content}")
    
    log(f"✓ Test PASSED: {file_path} contains '{expected_content}'")
    return True

def main():
    """Run all tests."""
    log("=" * 60)
    log("AREVEI Cheap Coding Agent Backend Test")
    log("=" * 60)
    
    try:
        # Login
        token = login()
        
        # Test 1: GET /ai/models
        test_ai_models(token)
        
        # Test 2: POST /projects/start
        workspace_id = test_projects_start(token)
        
        # Test 3: POST /ai/chat/stream with model="free"
        test_ai_chat_stream(
            token, workspace_id, "free",
            "Create a file hello.txt containing exactly: Hi",
            "hello.txt"
        )
        
        # Test 4: GET /files/hello.txt
        test_file_content(token, workspace_id, "hello.txt", "Hi")
        
        # Test 5: POST /ai/chat/stream with model="cheap" (model switching)
        test_ai_chat_stream(
            token, workspace_id, "cheap",
            "Create a file greet.txt containing exactly: Hey",
            "greet.txt"
        )
        
        # Verify greet.txt persisted
        test_file_content(token, workspace_id, "greet.txt", "Hey")
        
        log("=" * 60)
        log("✓ ALL TESTS PASSED")
        log("=" * 60)
        return 0
        
    except Exception as e:
        log("=" * 60)
        log(f"✗ TEST FAILED: {e}")
        log("=" * 60)
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
