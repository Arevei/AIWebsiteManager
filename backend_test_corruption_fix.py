#!/usr/bin/env python3
"""
Backend test for AREVEI file corruption fix + Codex model restoration.
Tests that:
1. Codex models (codex-mini, codex) are restored to the model catalog
2. File edits don't have over-escaped unicode sequences (\u0027, \u0022)
3. Model switching still works correctly
"""

import requests
import json
import sys
import time

# Backend base URL
BASE_URL = "https://github-import-lite.preview.emergentagent.com"

# Test credentials
EMAIL = "founder@demo.com"
PASSWORD = "Demo@1234"

def print_step(step_num, description):
    """Print a test step header."""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def print_result(passed, message, details=None):
    """Print test result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {details}")

def truncate_body(body, max_len=200):
    """Truncate body to max_len characters."""
    if len(body) > max_len:
        return body[:max_len] + "..."
    return body

def read_ndjson_stream(response):
    """Read NDJSON stream and return all events."""
    events = []
    for line in response.iter_lines():
        if line:
            try:
                event = json.loads(line.decode('utf-8'))
                events.append(event)
            except json.JSONDecodeError as e:
                print(f"Warning: Failed to parse line: {line[:100]}")
    return events

def test_corruption_fix():
    """Main test function for file corruption fix + Codex model restoration."""
    
    # Step 1: Login
    print_step(1, "Login with founder@demo.com")
    try:
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            timeout=10
        )
        print(f"Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print_result(False, f"Login failed with status {login_response.status_code}", login_response.text[:200])
            return False
        
        login_data = login_response.json()
        token = login_data.get("token")
        
        if not token:
            print_result(False, "No token in login response", str(login_data))
            return False
        
        print_result(True, "Login successful", f"Token: {token[:20]}...")
        
    except Exception as e:
        print_result(False, f"Login exception: {str(e)}")
        return False
    
    # Step 2: GET /api/ai/models - verify 6 models including codex-mini and codex
    print_step(2, "GET /api/ai/models - verify 6 models with codex-mini and codex")
    try:
        models_response = requests.get(
            f"{BASE_URL}/api/ai/models",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        status = models_response.status_code
        print(f"Status: {status}")
        
        if status != 200:
            print_result(False, f"Expected status 200, got {status}", models_response.text[:200])
            return False
        
        models_data = models_response.json()
        models = models_data.get("models", [])
        router_ready = models_data.get("router_ready")
        default_model = models_data.get("default")
        
        print(f"Models count: {len(models)}")
        print(f"Default model: {default_model}")
        print(f"router_ready: {router_ready}")
        print(f"Model IDs: {[m.get('id') for m in models]}")
        
        # Check model count
        if len(models) != 6:
            print_result(False, f"Expected 6 models, got {len(models)}")
            return False
        
        # Check for codex-mini and codex
        model_ids = [m.get('id') for m in models]
        if 'codex-mini' not in model_ids:
            print_result(False, f"'codex-mini' not found in model IDs: {model_ids}")
            return False
        
        if 'codex' not in model_ids:
            print_result(False, f"'codex' not found in model IDs: {model_ids}")
            return False
        
        # Check default model
        if default_model != 'codex-mini':
            print_result(False, f"Expected default='codex-mini', got '{default_model}'")
            return False
        
        # Check router_ready
        if router_ready != True:
            print_result(False, f"Expected router_ready=true, got {router_ready}")
            return False
        
        print_result(True, "Models endpoint returned 6 models including 'codex-mini' and 'codex', default='codex-mini', router_ready=true")
        
    except Exception as e:
        print_result(False, f"Models endpoint exception: {str(e)}")
        return False
    
    # Step 3: POST /api/projects/start - create React workspace
    print_step(3, "POST /api/projects/start - create React workspace")
    try:
        create_response = requests.post(
            f"{BASE_URL}/api/projects/start",
            json={"prompt": "react", "name": "fix"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=60
        )
        print(f"Status: {create_response.status_code}")
        print(f"Response: {truncate_body(create_response.text, 300)}")
        
        if create_response.status_code != 200:
            print_result(False, f"Workspace creation failed with status {create_response.status_code}", create_response.text[:200])
            return False
        
        workspace_data = create_response.json()
        workspace_id = workspace_data.get("workspace_id") or workspace_data.get("id")
        
        if not workspace_id:
            print_result(False, "No workspace_id in response", str(workspace_data))
            return False
        
        print_result(True, f"Workspace created: {workspace_id}")
        
    except Exception as e:
        print_result(False, f"Workspace creation exception: {str(e)}")
        return False
    
    # Step 4: POST /api/workspaces/{id}/ai/chat/stream - edit src/main.jsx with codex-mini
    print_step(4, "POST /api/workspaces/{id}/ai/chat/stream - edit src/main.jsx with codex-mini")
    try:
        chat_url = f"{BASE_URL}/api/workspaces/{workspace_id}/ai/chat/stream"
        chat_payload = {
            "message": "Edit src/main.jsx: add a line at the very top: console.log('AREVEI ready'); keep the rest unchanged",
            "model": "codex-mini"
        }
        
        print(f"URL: {chat_url}")
        print(f"Payload: {chat_payload}")
        
        chat_response = requests.post(
            chat_url,
            json=chat_payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
            stream=True
        )
        
        status = chat_response.status_code
        print(f"Status: {status}")
        
        if status != 200:
            print_result(False, f"Expected status 200, got {status}", chat_response.text[:500])
            return False
        
        # Read NDJSON stream
        events = read_ndjson_stream(chat_response)
        print(f"Received {len(events)} events")
        
        # Find the result event
        final_result = None
        for event in events:
            if event.get("type") == "result":
                final_result = event.get("result")
                break
        
        if not final_result:
            print_result(False, "No result event found")
            return False
        
        # Check for file_edit_started and file_edit_finished in the result's events array
        result_events = final_result.get("events", [])
        file_edit_started = None
        file_edit_finished = None
        
        for evt in result_events:
            if evt.get("raw_type") == "file_edit_started" or evt.get("type") == "file_edit_started":
                file_edit_started = evt
                print(f"Found file_edit_started: path={evt.get('path')}")
            elif evt.get("raw_type") == "file_edit_finished" or evt.get("type") == "file_edit_finished":
                file_edit_finished = evt
                print(f"Found file_edit_finished: path={evt.get('path')}")
        
        # Verify file_edit_started
        if not file_edit_started:
            print_result(False, "No file_edit_started event found in result.events")
            return False
        
        if file_edit_started.get("path") != "src/main.jsx":
            print_result(False, f"Expected file_edit_started path='src/main.jsx', got '{file_edit_started.get('path')}'")
            return False
        
        # Verify file_edit_finished
        if not file_edit_finished:
            print_result(False, "No file_edit_finished event found in result.events")
            return False
        
        if file_edit_finished.get("path") != "src/main.jsx":
            print_result(False, f"Expected file_edit_finished path='src/main.jsx', got '{file_edit_finished.get('path')}'")
            return False
        
        # Verify final result status
        if final_result.get("status") != "applied":
            print_result(False, f"Expected result status='applied', got '{final_result.get('status')}'")
            return False
        
        print_result(True, "Chat stream returned file_edit_started, file_edit_finished for src/main.jsx, and result with status='applied'")
        
    except Exception as e:
        print_result(False, f"Chat stream exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 5: GET /api/workspaces/{id}/files/src/main.jsx - verify no corruption
    print_step(5, "GET /api/workspaces/{id}/files/src/main.jsx - verify no \\uXXXX corruption")
    try:
        file_url = f"{BASE_URL}/api/workspaces/{workspace_id}/files/src/main.jsx"
        file_response = requests.get(
            file_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        status = file_response.status_code
        print(f"Status: {status}")
        
        if status != 200:
            print_result(False, f"Expected status 200, got {status}", file_response.text[:200])
            return False
        
        file_content = file_response.text
        print(f"File content length: {len(file_content)} characters")
        
        # Get first line
        first_line = file_content.split('\n')[0] if file_content else ""
        print(f"First line: {first_line}")
        
        # Check for console.log('AREVEI ready')
        if "console.log('AREVEI ready')" not in file_content and 'console.log("AREVEI ready")' not in file_content:
            print_result(False, "File does NOT contain console.log('AREVEI ready') or console.log(\"AREVEI ready\")")
            print(f"File content:\n{file_content[:500]}")
            return False
        
        # Check for corruption - literal escape sequences \u0027 or \u0022
        # We're looking for the 6-character sequence backslash-u-0-0-2-7 or backslash-u-0-0-2-2
        if "\\u0027" in file_content:
            print_result(False, "File CONTAINS \\u0027 corruption (over-escaped single quote)")
            print(f"File content:\n{file_content[:500]}")
            return False
        
        if "\\u0022" in file_content:
            print_result(False, "File CONTAINS \\u0022 corruption (over-escaped double quote)")
            print(f"File content:\n{file_content[:500]}")
            return False
        
        print_result(True, f"File contains console.log and does NOT contain \\u0027 or \\u0022 corruption. First line: {first_line}")
        
    except Exception as e:
        print_result(False, f"File retrieval exception: {str(e)}")
        return False
    
    # Step 6: Model switching test - create z.txt with 'free' model
    print_step(6, "Model switching test - create z.txt with 'free' model")
    try:
        chat_url = f"{BASE_URL}/api/workspaces/{workspace_id}/ai/chat/stream"
        chat_payload = {
            "message": "Create file z.txt containing exactly: done",
            "model": "free"
        }
        
        print(f"URL: {chat_url}")
        print(f"Payload: {chat_payload}")
        
        chat_response = requests.post(
            chat_url,
            json=chat_payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
            stream=True
        )
        
        status = chat_response.status_code
        print(f"Status: {status}")
        
        if status != 200:
            print_result(False, f"Expected status 200, got {status}", chat_response.text[:500])
            return False
        
        # Read NDJSON stream
        events = read_ndjson_stream(chat_response)
        print(f"Received {len(events)} events")
        
        # Verify z.txt was created
        file_url = f"{BASE_URL}/api/workspaces/{workspace_id}/files/z.txt"
        file_response = requests.get(
            file_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if file_response.status_code != 200:
            print_result(False, f"z.txt not found, status {file_response.status_code}")
            return False
        
        z_content = file_response.text
        print(f"z.txt content: {z_content}")
        
        if "done" not in z_content:
            print_result(False, f"z.txt does NOT contain 'done', content: {z_content}")
            return False
        
        print_result(True, f"Model switching works - z.txt created with 'free' model, content: {z_content}")
        
    except Exception as e:
        print_result(False, f"Model switching test exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # All tests passed
    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED - File corruption fix + Codex model restoration verified!")
    print("="*80)
    print("\nSUMMARY:")
    print("- 6 models returned including 'codex-mini' and 'codex'")
    print("- Default model is 'codex-mini'")
    print("- router_ready is true")
    print(f"- src/main.jsx first line: {first_line}")
    print("- NO \\u0027 or \\u0022 corruption found in file content")
    print("- Model switching between 'codex-mini' and 'free' works correctly")
    return True

if __name__ == "__main__":
    success = test_corruption_fix()
    sys.exit(0 if success else 1)
