#!/usr/bin/env python3
"""
AREVEI EDIT-VISIBILITY Bug Fix Verification Test
Tests that agent edits are visible in the codebase and not clobbered by re-reads.
"""

import requests
import json
import time

# Configuration
BASE_URL = "https://github-import-lite.preview.emergentagent.com/api"
EMAIL = "founder@demo.com"
PASSWORD = "Demo@1234"

def print_step(step_num, description):
    """Print a test step header."""
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def print_result(passed, message):
    """Print test result."""
    status = "✓ PASS" if passed else "✗ FAIL"
    print(f"{status}: {message}")

def login():
    """Login and return auth token."""
    print_step(0, "Login")
    url = f"{BASE_URL}/auth/login"
    payload = {"email": EMAIL, "password": PASSWORD}
    
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("token")
        print_result(True, f"Login successful, token received")
        return token
    else:
        print_result(False, f"Login failed: {response.text}")
        return None

def create_workspace(token):
    """Create a React workspace and return workspace ID."""
    print_step(1, "POST /api/projects/start")
    url = f"{BASE_URL}/projects/start"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"prompt": "react", "name": "vis"}
    
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        workspace_id = data.get("workspace_id") or data.get("id")
        print_result(True, f"Workspace created: {workspace_id}")
        return workspace_id
    else:
        print_result(False, f"Failed to create workspace: {response.text}")
        return None

def edit_file_via_agent(token, workspace_id):
    """Ask agent to edit src/App.jsx with marker text."""
    print_step(2, "POST /api/workspaces/{id}/ai/chat/stream - Edit src/App.jsx")
    url = f"{BASE_URL}/workspaces/{workspace_id}/ai/chat/stream"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "message": "Edit src/App.jsx: change the main heading text to 'AREVEI EDIT MARKER 123'. Keep everything else.",
        "model": "codex-mini"
    }
    
    response = requests.post(url, json=payload, headers=headers, stream=True)
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print_result(False, f"Stream request failed: {response.text}")
        return False
    
    # Parse NDJSON stream
    file_edit_started = False
    file_edit_finished = False
    result_status = None
    edited_file = None
    
    for line in response.iter_lines():
        if not line:
            continue
        
        try:
            event = json.loads(line.decode('utf-8'))
            event_type = event.get("type")
            
            if event_type == "file_edit_started":
                path = event.get("path")
                if "App.jsx" in path:
                    file_edit_started = True
                    edited_file = path
                    print(f"  → file_edit_started: {path}")
            
            elif event_type == "file_edit_finished":
                path = event.get("path")
                if "App.jsx" in path:
                    file_edit_finished = True
                    print(f"  → file_edit_finished: {path}")
            
            elif event_type == "result":
                result_status = event.get("status")
                files_changed = event.get("files_changed", [])
                print(f"  → result status: {result_status}")
                print(f"  → files_changed: {files_changed}")
                
                # If agent edited a different file, capture it
                if files_changed and not edited_file:
                    for f in files_changed:
                        if "App" in f or "app" in f:
                            edited_file = f
                            break
        
        except json.JSONDecodeError:
            continue
    
    # Validation
    passed = file_edit_started and file_edit_finished and result_status == "applied"
    
    if passed:
        print_result(True, f"Agent edit completed: file_edit_started={file_edit_started}, file_edit_finished={file_edit_finished}, status={result_status}")
    else:
        print_result(False, f"Agent edit incomplete: file_edit_started={file_edit_started}, file_edit_finished={file_edit_finished}, status={result_status}")
    
    return passed, edited_file or "src/App.jsx"

def get_file_content(token, workspace_id, file_path, attempt_num):
    """Get file content and check for marker."""
    print_step(3 if attempt_num == 1 else 4, f"GET /api/workspaces/{{id}}/files/{file_path} (Attempt {attempt_num})")
    url = f"{BASE_URL}/workspaces/{workspace_id}/files/{file_path}"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        content = response.text
        marker_present = "AREVEI EDIT MARKER 123" in content
        
        # Extract heading text (look for h1 or heading-like text)
        heading_text = "NOT FOUND"
        for line in content.split('\n'):
            if 'AREVEI EDIT MARKER 123' in line:
                heading_text = line.strip()[:100]  # First 100 chars
                break
        
        print(f"Content length: {len(content)} bytes")
        print(f"Marker 'AREVEI EDIT MARKER 123' present: {marker_present}")
        print(f"Heading text: {heading_text}")
        
        if marker_present:
            print_result(True, f"File contains marker text (Attempt {attempt_num})")
        else:
            print_result(False, f"File does NOT contain marker text (Attempt {attempt_num})")
            print(f"First 500 chars of content:\n{content[:500]}")
        
        return marker_present, heading_text
    else:
        print_result(False, f"Failed to get file: {response.text}")
        return False, "ERROR"

def test_models_endpoint(token):
    """Regression test: GET /api/workspaces/ai/models."""
    print_step(5, "Regression: GET /api/workspaces/ai/models")
    url = f"{BASE_URL}/workspaces/ai/models"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        models = data.get("models", [])
        default_model = data.get("default")
        router_ready = data.get("router_ready")
        
        model_count = len(models)
        has_codex_mini = any(m.get("id") == "codex-mini" for m in models)
        
        print(f"Models count: {model_count}")
        print(f"Default model: {default_model}")
        print(f"Router ready: {router_ready}")
        print(f"Has codex-mini: {has_codex_mini}")
        
        passed = model_count == 6 and default_model == "codex-mini" and router_ready
        
        if passed:
            print_result(True, f"Models endpoint working: {model_count} models, default={default_model}, router_ready={router_ready}")
        else:
            print_result(False, f"Models endpoint issue: expected 6 models with default=codex-mini")
        
        return passed
    else:
        print_result(False, f"Failed to get models: {response.text}")
        return False

def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("AREVEI EDIT-VISIBILITY BUG FIX VERIFICATION")
    print("="*80)
    
    # Step 0: Login
    token = login()
    if not token:
        print("\n❌ CRITICAL: Login failed, cannot proceed")
        return
    
    # Step 1: Create workspace
    workspace_id = create_workspace(token)
    if not workspace_id:
        print("\n❌ CRITICAL: Workspace creation failed, cannot proceed")
        return
    
    # Wait a bit for workspace to initialize
    print("\nWaiting 3 seconds for workspace initialization...")
    time.sleep(3)
    
    # Step 2: Edit file via agent
    edit_success, edited_file = edit_file_via_agent(token, workspace_id)
    if not edit_success:
        print("\n❌ CRITICAL: Agent edit failed, cannot proceed")
        return
    
    # Wait for edit to complete
    print("\nWaiting 2 seconds for edit to persist...")
    time.sleep(2)
    
    # Step 3: Get file content (first time)
    marker_present_1, heading_1 = get_file_content(token, workspace_id, edited_file, 1)
    
    # Step 4: Get file content (second time - verify not clobbered)
    marker_present_2, heading_2 = get_file_content(token, workspace_id, edited_file, 2)
    
    # Step 5: Regression test
    models_ok = test_models_endpoint(token)
    
    # Final summary
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    
    all_passed = edit_success and marker_present_1 and marker_present_2 and models_ok
    
    print(f"\nStep 1 (Create workspace): {'✓ PASS' if workspace_id else '✗ FAIL'}")
    print(f"Step 2 (Agent edit): {'✓ PASS' if edit_success else '✗ FAIL'}")
    print(f"Step 3 (First GET - marker present): {'✓ PASS' if marker_present_1 else '✗ FAIL'}")
    print(f"  → Heading text: {heading_1}")
    print(f"Step 4 (Second GET - marker still present): {'✓ PASS' if marker_present_2 else '✗ FAIL'}")
    print(f"  → Heading text: {heading_2}")
    print(f"Step 5 (Regression - models): {'✓ PASS' if models_ok else '✗ FAIL'}")
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED - EDIT-VISIBILITY BUG FIX VERIFIED")
        print("The agent edit is visible in the codebase and stable across re-reads.")
    else:
        print("\n❌ SOME TESTS FAILED - SEE DETAILS ABOVE")
    
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
