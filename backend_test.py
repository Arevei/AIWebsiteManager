#!/usr/bin/env python3
"""
AREVEI EDIT-VISIBILITY Bug Fix Verification Test
Tests that agent edits are visible in the codebase and not clobbered by re-reads.
"""

import requests
import json
import os
import sys

# Backend URL from frontend/.env
BASE_URL = "https://github-import-lite.preview.emergentagent.com/api"

# Test credentials
EMAIL = "founder@demo.com"
PASSWORD = "Demo@1234"

def log(msg):
    """Print with flush for real-time output"""
    print(msg, flush=True)

def login():
    """Login and return auth token"""
    log("\n=== STEP 0: Login ===")
    url = f"{BASE_URL}/auth/login"
    payload = {"email": EMAIL, "password": PASSWORD}
    
    resp = requests.post(url, json=payload)
    log(f"POST {url}")
    log(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        log(f"❌ Login failed: {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    token = data.get("token")
    if not token:
        log(f"❌ No token in response: {data}")
        sys.exit(1)
    
    log(f"✓ Login successful, token received")
    return token

def create_workspace(token):
    """Create a React workspace and return workspace ID"""
    log("\n=== STEP 1: Create React Workspace ===")
    url = f"{BASE_URL}/projects/start"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"prompt": "react", "name": "vis2"}
    
    resp = requests.post(url, json=payload, headers=headers)
    log(f"POST {url}")
    log(f"Payload: {payload}")
    log(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        log(f"❌ Workspace creation failed: {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    workspace_id = data.get("workspace_id") or data.get("id")
    if not workspace_id:
        log(f"❌ No workspace_id in response: {data}")
        sys.exit(1)
    
    log(f"✓ Workspace created: {workspace_id}")
    return workspace_id

def stream_ai_chat(token, workspace_id, message, model="codex-mini", max_attempts=3):
    """
    Stream AI chat and return the result.
    IMPORTANT: LLM tool-calling is flaky, so retry up to max_attempts if no file edits occur.
    Returns: (success, result_dict, edited_path, attempt_count)
    """
    log(f"\n=== STEP 2: AI Chat Stream (model={model}) ===")
    url = f"{BASE_URL}/workspaces/{workspace_id}/ai/chat/stream"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"message": message, "model": model}
    
    for attempt in range(1, max_attempts + 1):
        log(f"\n--- Attempt {attempt}/{max_attempts} ---")
        log(f"POST {url}")
        log(f"Payload: {payload}")
        
        resp = requests.post(url, json=payload, headers=headers, stream=True)
        log(f"Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"❌ Stream request failed: {resp.text}")
            if attempt < max_attempts:
                log(f"⚠️  Retrying...")
                continue
            return False, None, None, attempt
        
        # Parse NDJSON stream
        events = []
        file_edit_started = False
        file_edit_finished = False
        edited_path = None
        result = None
        
        for line in resp.iter_lines():
            if not line:
                continue
            try:
                event = json.loads(line.decode('utf-8'))
                events.append(event)
                
                event_type = event.get("type")
                
                # Handle nested event structure: {"type": "event", "event": {...}}
                if event_type == "event":
                    inner_event = event.get("event", {})
                    inner_type = inner_event.get("type")
                    
                    if inner_type == "file_edit_started":
                        file_edit_started = True
                        path = inner_event.get("path")
                        log(f"  → file_edit_started: {path}")
                        if not edited_path:
                            edited_path = path
                    
                    elif inner_type == "file_edit_finished":
                        file_edit_finished = True
                        path = inner_event.get("path")
                        log(f"  → file_edit_finished: {path}")
                    
                    else:
                        # Log other inner event types for debugging
                        log(f"  → event.{inner_type}: {inner_event.get('message', '')}")
                
                elif event_type == "delta":
                    # Token streaming
                    pass
                
                elif event_type == "result":
                    # Result is nested: {"type": "result", "result": {...}}
                    result = event.get("result", {})
                    status = result.get("status")
                    files_changed = result.get("files_changed", [])
                    log(f"  → result: status={status}, files_changed={files_changed}")
                    if files_changed and not edited_path:
                        # files_changed is a list of dicts with "path" key
                        if isinstance(files_changed, list) and len(files_changed) > 0:
                            edited_path = files_changed[0].get("path") if isinstance(files_changed[0], dict) else files_changed[0]
                
                else:
                    # Log other event types for debugging
                    log(f"  → {event_type}: {json.dumps(event)[:150]}")
            
            except json.JSONDecodeError as e:
                log(f"⚠️  Failed to parse NDJSON line: {line[:100]}")
        
        log(f"\nReceived {len(events)} NDJSON events")
        
        # Check if we got file edits
        if result:
            status = result.get("status")
            files_changed = result.get("files_changed", [])
            
            if status == "no_changes" or not files_changed:
                log(f"⚠️  No file edits in this attempt (status={status}, files_changed={files_changed})")
                if attempt < max_attempts:
                    log(f"⚠️  Retrying same request...")
                    continue
                else:
                    log(f"❌ Failed after {max_attempts} attempts - no file edits")
                    return False, result, None, attempt
            
            # Success - we got file edits
            if file_edit_started:
                log(f"✓ file_edit_started event found")
            if file_edit_finished:
                log(f"✓ file_edit_finished event found")
            
            log(f"✓ Result status: {status}")
            log(f"✓ Files changed: {files_changed}")
            log(f"✓ Edited path: {edited_path}")
            log(f"✓ Success on attempt {attempt}")
            
            return True, result, edited_path, attempt
        
        else:
            log(f"⚠️  No result event in stream")
            if attempt < max_attempts:
                log(f"⚠️  Retrying...")
                continue
            else:
                log(f"❌ Failed after {max_attempts} attempts - no result event")
                return False, None, None, attempt
    
    # Should not reach here
    return False, None, None, max_attempts

def get_file_content(token, workspace_id, file_path):
    """Get file content from workspace"""
    url = f"{BASE_URL}/workspaces/{workspace_id}/files/{file_path}"
    headers = {"Authorization": f"Bearer {token}"}
    
    resp = requests.get(url, headers=headers)
    log(f"GET {url}")
    log(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        log(f"❌ Failed to get file: {resp.text}")
        return None
    
    data = resp.json()
    content = data.get("content", "")
    return content

def verify_edit_visibility(token, workspace_id, edited_path, marker_text):
    """Verify that the edit is visible and persists across multiple reads"""
    log(f"\n=== STEP 3: First Read - Verify Edit is Visible ===")
    
    content1 = get_file_content(token, workspace_id, edited_path)
    if content1 is None:
        log(f"❌ Failed to read file on first attempt")
        return False
    
    if marker_text in content1:
        log(f"✓ First read: File contains '{marker_text}'")
        log(f"  Content preview: {content1[:200]}...")
    else:
        log(f"❌ First read: File does NOT contain '{marker_text}'")
        log(f"  Content preview: {content1[:500]}...")
        return False
    
    log(f"\n=== STEP 4: Second Read - Verify Edit Persists (Not Clobbered) ===")
    
    content2 = get_file_content(token, workspace_id, edited_path)
    if content2 is None:
        log(f"❌ Failed to read file on second attempt")
        return False
    
    if marker_text in content2:
        log(f"✓ Second read: File STILL contains '{marker_text}'")
        log(f"  Content preview: {content2[:200]}...")
    else:
        log(f"❌ Second read: File does NOT contain '{marker_text}' (CLOBBERED!)")
        log(f"  Content preview: {content2[:500]}...")
        return False
    
    # Verify content is identical
    if content1 == content2:
        log(f"✓ Content is identical across both reads (edit persisted)")
    else:
        log(f"⚠️  Content differs between reads!")
        log(f"  First read length: {len(content1)}")
        log(f"  Second read length: {len(content2)}")
    
    return True

def regression_test_models(token):
    """Regression test: verify models endpoint"""
    log(f"\n=== STEP 5: Regression Test - Models Endpoint ===")
    url = f"{BASE_URL}/ai/models"
    headers = {"Authorization": f"Bearer {token}"}
    
    resp = requests.get(url, headers=headers)
    log(f"GET {url}")
    log(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        log(f"❌ Models endpoint failed: {resp.text}")
        return False
    
    data = resp.json()
    models = data.get("models", [])
    default_model = data.get("default")
    
    log(f"Models count: {len(models)}")
    log(f"Default model: {default_model}")
    
    if len(models) != 6:
        log(f"❌ Expected 6 models, got {len(models)}")
        return False
    
    if default_model != "codex-mini":
        log(f"❌ Expected default model 'codex-mini', got '{default_model}'")
        return False
    
    log(f"✓ Models endpoint working correctly")
    return True

def main():
    """Main test flow"""
    log("=" * 80)
    log("AREVEI EDIT-VISIBILITY BUG FIX VERIFICATION")
    log("=" * 80)
    
    # Login
    token = login()
    
    # Create workspace
    workspace_id = create_workspace(token)
    
    # AI chat stream with retry logic
    message = "In src/App.jsx change the main heading text to exactly: AREVEI EDIT MARKER 123. Keep everything else unchanged."
    success, result, edited_path, attempts = stream_ai_chat(token, workspace_id, message, model="codex-mini", max_attempts=3)
    
    if not success or not edited_path:
        log(f"\n❌ FAILED: AI chat did not produce file edits after {attempts} attempts")
        sys.exit(1)
    
    log(f"\n✓ AI chat succeeded on attempt {attempts}")
    log(f"✓ Edited file path: {edited_path}")
    
    # Verify edit visibility and persistence
    marker_text = "AREVEI EDIT MARKER 123"
    visibility_ok = verify_edit_visibility(token, workspace_id, edited_path, marker_text)
    
    if not visibility_ok:
        log(f"\n❌ FAILED: Edit visibility test failed")
        sys.exit(1)
    
    # Regression test
    models_ok = regression_test_models(token)
    
    if not models_ok:
        log(f"\n❌ FAILED: Regression test failed")
        sys.exit(1)
    
    # Final summary
    log("\n" + "=" * 80)
    log("✓ ALL TESTS PASSED")
    log("=" * 80)
    log(f"✓ Step 1: Workspace created ({workspace_id})")
    log(f"✓ Step 2: AI chat stream succeeded (attempts: {attempts})")
    log(f"✓ Step 3: First read - Edit visible (contains '{marker_text}')")
    log(f"✓ Step 4: Second read - Edit persists (NOT clobbered)")
    log(f"✓ Step 5: Regression - Models endpoint working (6 models, default=codex-mini)")
    log(f"\n✓ BUG FIX VERIFIED: Agent edits are visible and persist across reads")
    log("=" * 80)

if __name__ == "__main__":
    main()
