#!/usr/bin/env python3
"""
Backend test for AREVEI preview proxy bug fix verification.
Tests that the preview proxy returns a branded HTML waiting page instead of raw Daytona daemon JSON errors.
"""

import requests
import json
import sys

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

def test_preview_proxy_bug_fix():
    """Main test function for preview proxy bug fix."""
    
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
    
    # Step 2: Create workspace (NO runtime started)
    print_step(2, "POST /api/projects/start to create workspace (no runtime)")
    try:
        create_response = requests.post(
            f"{BASE_URL}/api/projects/start",
            json={"prompt": "tiny", "name": "prev"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
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
    
    # Step 3: Test preview proxy with Accept: text/html
    print_step(3, "GET /api/workspaces/{id}/runtime/preview-proxy with Accept: text/html")
    try:
        preview_url = f"{BASE_URL}/api/workspaces/{workspace_id}/runtime/preview-proxy?arevei_token={token}"
        print(f"URL: {preview_url}")
        
        preview_response = requests.get(
            preview_url,
            headers={"Accept": "text/html"},
            timeout=10
        )
        
        status = preview_response.status_code
        content_type = preview_response.headers.get("Content-Type", "")
        body = preview_response.text
        
        print(f"Status: {status}")
        print(f"Content-Type: {content_type}")
        print(f"Body snippet: {truncate_body(body, 200)}")
        
        # Assertions
        all_passed = True
        
        # Check status code
        if status != 200:
            print_result(False, f"Expected status 200, got {status}")
            all_passed = False
        else:
            print_result(True, "Status is 200")
        
        # Check Content-Type
        if "text/html" not in content_type.lower():
            print_result(False, f"Expected Content-Type to contain 'text/html', got '{content_type}'")
            all_passed = False
        else:
            print_result(True, f"Content-Type contains 'text/html': {content_type}")
        
        # Check body contains waiting/loading indicators (Preparing, waking, Starting, Provisioning)
        body_lower = body.lower()
        waiting_indicators = ["preparing", "waking", "starting", "provisioning"]
        found_indicators = [ind for ind in waiting_indicators if ind in body_lower]
        
        if found_indicators:
            print_result(True, f"Body contains waiting indicators: {found_indicators}")
        else:
            print_result(False, "Body does NOT contain any waiting indicators (preparing/waking/starting/provisioning)")
            all_passed = False
        
        # Check body does NOT contain error indicators
        error_indicators = ["DAYTONA_DAEMON", "statusCode", "proxy upstream error"]
        found_errors = [indicator for indicator in error_indicators if indicator in body]
        
        if found_errors:
            print_result(False, f"Body contains error indicators: {found_errors}")
            all_passed = False
        else:
            print_result(True, "Body does NOT contain 'DAYTONA_DAEMON', 'statusCode', or 'proxy upstream error'")
        
        if not all_passed:
            print(f"\nFull body:\n{body}")
            return False
        
    except Exception as e:
        print_result(False, f"Preview proxy exception: {str(e)}")
        return False
    
    # Step 4: Test keepalive endpoint
    print_step(4, "POST /api/workspaces/{id}/runtime/keepalive")
    try:
        keepalive_response = requests.post(
            f"{BASE_URL}/api/workspaces/{workspace_id}/runtime/keepalive",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        status = keepalive_response.status_code
        print(f"Status: {status}")
        print(f"Response: {truncate_body(keepalive_response.text, 200)}")
        
        if status != 200:
            print_result(False, f"Expected status 200, got {status}", keepalive_response.text[:200])
            return False
        
        keepalive_data = keepalive_response.json()
        if keepalive_data.get("ok") != True:
            print_result(False, f"Expected {{\"ok\": true}}, got {keepalive_data}")
            return False
        
        print_result(True, "Keepalive endpoint returned 200 with {\"ok\": true}")
        
    except Exception as e:
        print_result(False, f"Keepalive exception: {str(e)}")
        return False
    
    # Step 5: Regression test - GET /api/ai/models
    print_step(5, "Regression: GET /api/ai/models")
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
        
        print(f"Models count: {len(models)}")
        print(f"router_ready: {router_ready}")
        
        if len(models) != 4:
            print_result(False, f"Expected 4 models, got {len(models)}")
            return False
        
        if router_ready != True:
            print_result(False, f"Expected router_ready=true, got {router_ready}")
            return False
        
        print_result(True, "Models endpoint returned 200 with 4 models and router_ready=true")
        
    except Exception as e:
        print_result(False, f"Models endpoint exception: {str(e)}")
        return False
    
    # All tests passed
    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED - Preview proxy bug fix verified successfully!")
    print("="*80)
    return True

if __name__ == "__main__":
    success = test_preview_proxy_bug_fix()
    sys.exit(0 if success else 1)
