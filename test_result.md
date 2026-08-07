#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Re-architect the AREVEI AI coding platform (Codex-built) so the workspace AI chat works like
  Emergent chat: real-time streaming, shows which files it is editing by name, asks clarifying
  questions, and edits files smoothly. Replace the expensive OpenAI Codex SDK with a cheap
  LiteLLM/OpenRouter routed agent (free/paid model switching), operating on the workspace file
  store as the single source of truth (no sandbox required for edits).

backend:
  - task: "LiteLLM/OpenRouter model router + /ai/models endpoint"
    implemented: true
    working: true
    file: "backend/model_router.py, backend/github_platform.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Added model_router.py (LiteLLM over OpenRouter + NVIDIA NIM). Allowlist: free=openrouter/openai/gpt-oss-20b:free, cheap=openrouter/google/gemini-2.5-flash-lite, nim=nvidia_nim/meta/llama-3.1-8b-instruct, coding=openrouter/anthropic/claude-sonnet-4.5. Verified all four slugs work with live keys (tool-calling confirmed on free models). GET /api/workspaces/ai/models returns catalog + router_ready."
        -working: true
        -agent: "testing"
        -comment: "PASSED. GET /api/ai/models returns 4 models (free, cheap, nim, coding) with correct slugs and labels. Default model is 'free'. router_ready is true. All model metadata is correct."

  - task: "Cheap streaming workspace coding agent (replaces Codex SDK)"
    implemented: true
    working: true
    file: "backend/github_platform.py (_stream_litellm_workspace_agent, workspace_ai_chat_stream)"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "New primary path in POST /api/workspaces/{id}/ai/chat/stream. Server-side agent loop with tools (list_files/read_file/write_file/run_command) editing the Mongo workspace store directly (single source of truth for Monaco). Emits NDJSON: file_edit_started/finished events with path, delta tokens, final result with files_changed/changes. No Daytona/Codex required for edits. Smoke test passed: free model created notes.md, streamed live edit events, persisted content correctly. Codex path kept as fallback via payload.use_codex."
        -working: true
        -agent: "testing"
        -comment: "PASSED. Tested with both 'free' and 'cheap' models. POST /api/workspaces/{id}/ai/chat/stream correctly: (1) streams NDJSON events including file_edit_started and file_edit_finished with path, (2) emits delta tokens with assistant summary, (3) returns final result object with files_changed array and status='applied', (4) persists files to workspace store verified via GET /api/workspaces/{id}/files/{path}. Model switching between 'free' (OpenRouter GPT-OSS) and 'cheap' (Google Gemini Flash Lite) works correctly. Files created: hello.txt with 'Hi' and greet.txt with 'Hey'. No Daytona sandbox required. Single source of truth confirmed."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "LiteLLM/OpenRouter model router + /ai/models endpoint"
    - "Cheap streaming workspace coding agent (replaces Codex SDK)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: |
      Please run a FOCUSED, minimal backend test (keep LLM calls small to save cost).
      Auth: founder@demo.com / Demo@1234 (see /app/memory/test_credentials.md).
      Test only these:
      1. GET /api/workspaces/ai/models -> returns 4 models + router_ready:true + default 'free'.
      2. POST /api/projects/start {prompt,name} -> returns workspace with id.
      3. POST /api/workspaces/{id}/ai/chat/stream (NDJSON stream), body {"message":"Create a file hello.txt with the text Hi","model":"free"}:
         - stream contains file_edit_started AND file_edit_finished events with path 'hello.txt'
         - stream ends with a result item whose files_changed includes hello.txt and status 'applied'
      4. GET /api/workspaces/{id}/files/hello.txt -> content contains 'Hi' (persistence / single source of truth).
      5. Model switching: repeat step 3 once with {"model":"cheap"} using a tiny prompt to confirm another provider works.
      Use ONE small prompt per model to minimize token cost. Do NOT start Daytona sandboxes.
    -agent: "testing"
    -message: |
      ✓ ALL BACKEND TESTS PASSED
      
      Test Results Summary:
      1. ✓ GET /api/ai/models - Returns 4 models (free, cheap, nim, coding), default='free', router_ready=true
      2. ✓ POST /api/projects/start - Creates workspace successfully
      3. ✓ POST /api/workspaces/{id}/ai/chat/stream (model=free) - Creates hello.txt with "Hi"
         - Emits file_edit_started event with path='hello.txt'
         - Emits file_edit_finished event with path='hello.txt'
         - Returns result with status='applied' and files_changed containing hello.txt
         - Assistant summary: "Created `hello.txt` with the content 'Hi'."
      4. ✓ GET /api/workspaces/{id}/files/hello.txt - Content is "Hi" (persistence verified)
      5. ✓ POST /api/workspaces/{id}/ai/chat/stream (model=cheap) - Creates greet.txt with "Hey"
         - Model switching to Google Gemini Flash Lite works correctly
         - Emits file_edit_started and file_edit_finished events
         - Returns result with status='applied' and files_changed containing greet.txt
         - Assistant summary: "I have created the file greet.txt with the content 'Hey'."
      6. ✓ GET /api/workspaces/{id}/files/greet.txt - Content is "Hey" (persistence verified)
      
      Key Validations:
      - LiteLLM/OpenRouter model router is fully functional
      - Cheap streaming workspace agent works with multiple models (free and cheap)
      - NDJSON streaming format is correct (one JSON object per line)
      - File edit events are properly emitted with paths
      - Files are persisted to workspace store (single source of truth)
      - Model switching between providers works seamlessly
      - No Daytona sandbox required for file edits
      - Token cost minimized with small prompts
      
      The replacement of the expensive Codex SDK with LiteLLM/OpenRouter is working perfectly.