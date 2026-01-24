#!/bin/bash

#############################################################################
# TrailHub API Testing Script
# 
# Provides interactive testing of all TrailHub API endpoints
# Supports curl commands and multiple testing scenarios
#
# Usage:
#   chmod +x test_api.sh
#   ./test_api.sh [scenario]
#
# Scenarios:
#   - scenario1: Register user, list hikes, join hike
#   - scenario2: Create hike, update, delete (guide only)
#   - scenario3: Test privacy filtering on user profiles
#   - all: Run all scenarios
#   - health: Quick health check
#
#############################################################################

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMESTAMP=$(date +%s)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

#############################################################################
# JSON Parsing Functions (replacement for jq - uses grep/sed)
#############################################################################

# Extract a string field from JSON
json_get_string() {
  local json="$1"
  local field="$2"
  echo "$json" | grep -o "\"$field\":\"[^\"]*\"" | head -1 | cut -d'"' -f4 2>/dev/null || echo ""
}

# Extract a numeric field from JSON
json_get_number() {
  local json="$1"
  local field="$2"
  echo "$json" | grep -o "\"$field\":[^,}]*" | head -1 | cut -d':' -f2 | xargs 2>/dev/null || echo ""
}

# Check if a field exists in JSON
json_has_field() {
  local json="$1"
  local field="$2"
  if echo "$json" | grep -q "\"$field\""; then
    echo "true"
  else
    echo "false"
  fi
}

# Count elements in a JSON array
json_array_length() {
  local json="$1"
  # Remove outer brackets
  local trimmed="${json#[}"
  trimmed="${trimmed%]}"
  
  # Empty array = 0
  if [ -z "$trimmed" ] || [ "$trimmed" = "" ]; then
    echo "0"
  else
    # Count top-level commas and add 1
    echo "$trimmed" | grep -o "," | wc -l | awk '{print $1 + 1}'
  fi
}

# Pretty print JSON with basic formatting
json_pretty() {
  local json="$1"
  echo "$json" | sed 's/,/,\n  /g; s/{/{\n  /; s/}/\n}/'
}

# Pretty print first element or show first 15 lines of pretty output
json_head() {
  local json="$1"
  local lines="${2:-15}"
  json_pretty "$json" | head -n "$lines"
}

# Pretty print
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ $1${NC}"
}

# Health check
health_check() {
  print_header "Health Check"
  print_info "Testing backend connectivity..."
  
  RESPONSE=$(curl -s "$BASE_URL/healthz")
  if echo "$RESPONSE" | grep -q '"status"'; then
    print_success "Backend is running"
    echo "$RESPONSE"
  else
    print_error "Backend is not responding"
  fi
}

# Scenario 1: Register user, create a hike, and join it
scenario_1() {
  print_header "Scenario 1: Register User → Create Test Hike → Join Hike"
  
  # Step 1: Register a new hiker
  print_info "Step 1: Registering new hiker..."
  HIKER_EMAIL="hiker_$TIMESTAMP@example.com"
  HIKER_UID="hiker-$TIMESTAMP"
  
  HIKER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"firebaseUid\": \"$HIKER_UID\",
      \"email\": \"$HIKER_EMAIL\",
      \"name\": \"Jane Hiker\",
      \"role\": \"hiker\"
    }")
  
  HIKER_ID=$(json_get_string "$HIKER_RESPONSE" "id")
  
  if [ -n "$HIKER_ID" ] && [ "$HIKER_ID" != "error" ]; then
    print_success "Registered hiker with ID: $HIKER_ID"
    json_head "$HIKER_RESPONSE"
  else
    print_error "Failed to register hiker"
    json_pretty "$HIKER_RESPONSE"
    return 1
  fi
  
  # Step 2: Create a guide and test hike for the hiker to join
  print_info "Step 2: Creating test guide and hike..."
  GUIDE_EMAIL="scenario1-guide-$TIMESTAMP@example.com"
  GUIDE_UID="scenario1-guide-$TIMESTAMP"
  
  GUIDE_REGISTER=$(curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"firebaseUid\": \"$GUIDE_UID\",
      \"email\": \"$GUIDE_EMAIL\",
      \"name\": \"Test Guide for Scenario 1\",
      \"role\": \"guide\"
    }")
  
  GUIDE_ID=$(json_get_string "$GUIDE_REGISTER" "id")
  
  # Create guide profile
  curl -s -X PATCH "$BASE_URL/api/users/profile" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -H "Content-Type: application/json" \
    -d "{\"bio\": \"Scenario 1 test guide\", \"displayName\": \"Test Guide\"}" > /dev/null
  
  # Create a hike with good capacity
  HIKE_CREATE=$(curl -s -X POST "$BASE_URL/api/hikes" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -F "title=Scenario 1 Test Hike $TIMESTAMP" \
    -F "description=Test hike for joining" \
    -F "difficulty=EASY" \
    -F "price=30" \
    -F "capacity=20" \
    -F "date=2026-02-15")
  
  HIKE_ID=$(json_get_string "$HIKE_CREATE" "id")
  
  if [ -n "$HIKE_ID" ] && [ "$HIKE_ID" != "error" ]; then
    print_success "Created test hike with ID: $HIKE_ID"
    json_head "$HIKE_CREATE"
  else
    print_error "Failed to create test hike"
    json_pretty "$HIKE_CREATE"
    return 1
  fi
  
  # Step 3: Join the hike as the hiker
  print_info "Step 3: Joining hike #$HIKE_ID as hiker..."
  JOIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/hikes/$HIKE_ID/join" \
    -H "x-dev-user: {\"id\":\"$HIKER_UID\",\"email\":\"$HIKER_EMAIL\",\"role\":\"hiker\"}")
  
  BOOKING_ID=$(json_get_string "$JOIN_RESPONSE" "id")
  
  if [ -n "$BOOKING_ID" ] && [ "$BOOKING_ID" != "error" ]; then
    print_success "Joined hike with booking ID: $BOOKING_ID"
    json_pretty "$JOIN_RESPONSE"
  else
    print_error "Failed to join hike"
    json_pretty "$JOIN_RESPONSE"
  fi
  
  # Step 4: Check user profile (should show booking)
  print_info "Step 4: Checking user profile (should show booking)..."
  PROFILE=$(curl -s "$BASE_URL/api/users/me" \
    -H "x-dev-user: {\"id\":\"$HIKER_UID\",\"email\":\"$HIKER_EMAIL\",\"role\":\"hiker\"}")
  
  if json_has_field "$PROFILE" "bookings"; then
    print_success "User profile loaded with bookings field"
    json_head "$PROFILE"
  else
    print_info "User profile loaded"
    json_head "$PROFILE"
  fi
}

# Scenario 2: Create hike, update, delete (guide only)
scenario_2() {
  print_header "Scenario 2: Create Hike → Update → Delete (Guide Only)"
  
  GUIDE_ID="guide-$TIMESTAMP"
  GUIDE_EMAIL="guide_$TIMESTAMP@example.com"
  GUIDE_UID="$GUIDE_ID"
  
  # Step 0: Register guide user with guide role
  print_info "Step 0: Registering guide user..."
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"firebaseUid\": \"$GUIDE_UID\",
      \"email\": \"$GUIDE_EMAIL\",
      \"name\": \"Test Guide\",
      \"role\": \"guide\"
    }")
  
  GUIDE_USER_ID=$(json_get_string "$REGISTER_RESPONSE" "id")
  
  if [ -n "$GUIDE_USER_ID" ] && [ "$GUIDE_USER_ID" != "error" ]; then
    print_success "Registered guide user with ID: $GUIDE_USER_ID"
  else
    print_error "Failed to register guide user"
    json_pretty "$REGISTER_RESPONSE"
    return 1
  fi
  
  # Step 0b: Create guide profile via PATCH /api/users/profile
  print_info "Step 0b: Creating guide profile..."
  PROFILE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/users/profile" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -H "Content-Type: application/json" \
    -d "{
      \"bio\": \"Test guide for API testing\",
      \"displayName\": \"Test Guide\"
    }")
  
  if echo "$PROFILE_RESPONSE" | grep -q '"id"'; then
    print_success "Created/updated guide profile"
    json_head "$PROFILE_RESPONSE"
  else
    print_error "Failed to create guide profile"
    json_pretty "$PROFILE_RESPONSE"
    return 1
  fi
  
  # Step 1: Create hike
  print_info "Step 1: Creating new hike..."
  CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/hikes" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -F "title=Test Hike $TIMESTAMP" \
    -F "description=A beautiful test hike" \
    -F "difficulty=MODERATE" \
    -F "price=55" \
    -F "capacity=15" \
    -F "date=2024-12-25")
  
  HIKE_ID=$(json_get_string "$CREATE_RESPONSE" "id")
  
  if [ -n "$HIKE_ID" ] && [ "$HIKE_ID" != "error" ]; then
    print_success "Created hike with ID: $HIKE_ID"
    json_head "$CREATE_RESPONSE"
  else
    print_error "Failed to create hike"
    json_pretty "$CREATE_RESPONSE"
    return 1
  fi
  
  # Step 2: Update hike
  print_info "Step 2: Updating hike price..."
  UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/hikes/$HIKE_ID" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -H "Content-Type: application/json" \
    -d '{"price": 65, "capacity": 20}')
  
  UPDATED_PRICE=$(json_get_number "$UPDATE_RESPONSE" "price")
  
  if [ "$UPDATED_PRICE" = "65" ]; then
    print_success "Updated hike price to: $UPDATED_PRICE"
    json_head "$UPDATE_RESPONSE"
  else
    print_error "Failed to update hike"
    json_pretty "$UPDATE_RESPONSE"
  fi
  
  # Step 3: Delete hike
  print_info "Step 3: Deleting hike..."
  DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/hikes/$HIKE_ID" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}")
  
  HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "204" ]; then
    print_success "Deleted hike (HTTP 204 No Content)"
  else
    print_error "Failed to delete hike (HTTP $HTTP_CODE)"
    echo "$DELETE_RESPONSE" | head -n -1
  fi
  
  # Step 4: Verify deletion
  print_info "Step 4: Verifying hike is deleted..."
  VERIFY=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/hikes/$HIKE_ID")
  HTTP_CODE=$(echo "$VERIFY" | tail -n1)
  
  if [ "$HTTP_CODE" = "404" ]; then
    print_success "Hike deleted successfully (returns 404)"
  else
    print_info "Hike still exists or returns HTTP $HTTP_CODE"
  fi
}

# Scenario 3: Test privacy filtering
scenario_3() {
  print_header "Scenario 3: Test Privacy Filtering on User Profiles"
  
  # Use a hiker from scenario 1
  TEST_USER_EMAIL="privacy-test-$TIMESTAMP@example.com"
  TEST_USER_UID="privacy-user-$TIMESTAMP"
  
  # Register a test user
  print_info "Registering test user for privacy checks..."
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"firebaseUid\": \"$TEST_USER_UID\",
      \"email\": \"$TEST_USER_EMAIL\",
      \"name\": \"Privacy Test User\",
      \"role\": \"hiker\"
    }")
  
  USER_ID=$(json_get_string "$REGISTER_RESPONSE" "id")
  if [ -z "$USER_ID" ]; then
    print_error "Failed to register test user for privacy testing"
    return 0
  fi
  
  print_success "Test user registered: $USER_ID"
  
  OTHER_USER_ID="other-user-$TIMESTAMP"
  OWNER_ID="owner-$TIMESTAMP"
  ADMIN_ID="admin-$TIMESTAMP"
  
  print_info "Testing /api/users/$USER_ID with different access levels...\n"
  
  # View 1: As another user (should get privacy-filtered view)
  print_info "View 1: As another hiker (privacy-filtered)..."
  OTHER_VIEW=$(curl -s "$BASE_URL/api/users/$USER_ID" \
    -H "x-dev-user: {\"id\":\"$OTHER_USER_ID\",\"email\":\"other@local\",\"role\":\"hiker\"}")
  
  HAS_EMAIL=$(json_has_field "$OTHER_VIEW" "email")
  if [ "$HAS_EMAIL" = "false" ]; then
    print_success "Email is hidden in public view"
  else
    print_info "Email field present (may be intentional)"
  fi
  json_head "$OTHER_VIEW"
  
  # View 2: As the owner (should get full profile)
  print_info "\nView 2: As the owner (full profile)..."
  OWNER_VIEW=$(curl -s "$BASE_URL/api/users/$USER_ID" \
    -H "x-dev-user: {\"id\":\"$TEST_USER_UID\",\"email\":\"$TEST_USER_EMAIL\",\"role\":\"hiker\"}")
  
  HAS_EMAIL=$(json_has_field "$OWNER_VIEW" "email")
  if [ "$HAS_EMAIL" = "true" ]; then
    print_success "Email is visible to owner"
  fi
  json_head "$OWNER_VIEW"
  
  # View 3: As admin (should get full profile)
  print_info "\nView 3: As admin (full profile)..."
  ADMIN_VIEW=$(curl -s "$BASE_URL/api/users/$USER_ID" \
    -H "x-dev-user: {\"id\":\"$ADMIN_ID\",\"email\":\"admin@local\",\"role\":\"admin\"}")
  
  HAS_EMAIL=$(json_has_field "$ADMIN_VIEW" "email")
  if [ "$HAS_EMAIL" = "true" ]; then
    print_success "Email is visible to admin"
  fi
  json_head "$ADMIN_VIEW"
}

# Scenario 4: Error handling - invalid data and wrong roles
scenario_4() {
  print_header "Scenario 4: Error Handling (Invalid Data & Wrong Roles)"
  
  HIKER_UID="hiker-err-$TIMESTAMP"
  HIKER_EMAIL="hiker-err-$TIMESTAMP@example.com"
  
  # Step 1: Try to create hike as hiker (should fail)
  print_info "Step 1: Trying to create hike as hiker (should fail)..."
  ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/hikes" \
    -H "x-dev-user: {\"id\":\"$HIKER_UID\",\"email\":\"$HIKER_EMAIL\",\"role\":\"hiker\"}" \
    -F "title=Should Fail" \
    -F "difficulty=EASY" \
    -F "capacity=10" \
    -F "date=2026-02-15")
  
  if echo "$ERROR_RESPONSE" | grep -q "error"; then
    print_success "Correctly rejected hike creation by hiker"
    json_head "$ERROR_RESPONSE"
  else
    print_error "Hiker was allowed to create hike (security issue!)"
  fi
  
  # Step 2: Try to register with invalid email
  print_info "\nStep 2: Registering user with invalid email..."
  INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"firebaseUid\": \"test-$TIMESTAMP\",
      \"email\": \"not-an-email\",
      \"name\": \"Test\",
      \"role\": \"hiker\"
    }")
  
  if echo "$INVALID_RESPONSE" | grep -q "id"; then
    print_info "API accepted invalid email (validation may be lenient)"
  else
    print_success "API rejected invalid email"
  fi
  json_head "$INVALID_RESPONSE"
  
  # Step 3: Try to create hike with invalid difficulty
  GUIDE_UID="guide-err-$TIMESTAMP"
  GUIDE_EMAIL="guide-err-$TIMESTAMP@example.com"
  
  print_info "\nStep 3: Creating guide for invalid data test..."
  curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{\"firebaseUid\": \"$GUIDE_UID\", \"email\": \"$GUIDE_EMAIL\", \"name\": \"Error Test Guide\", \"role\": \"guide\"}" > /dev/null
  
  curl -s -X PATCH "$BASE_URL/api/users/profile" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -H "Content-Type: application/json" \
    -d "{\"bio\": \"Test\", \"displayName\": \"Test\"}" > /dev/null
  
  print_info "Step 4: Trying to create hike with invalid difficulty..."
  INVALID_HIKE=$(curl -s -X POST "$BASE_URL/api/hikes" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -F "title=Invalid Difficulty Test" \
    -F "difficulty=SUPER_HARD" \
    -F "capacity=10" \
    -F "date=2026-02-15")
  
  if echo "$INVALID_HIKE" | grep -q "error"; then
    print_success "Correctly rejected invalid difficulty"
    json_head "$INVALID_HIKE"
  else
    print_error "API accepted invalid difficulty"
  fi
}

# Scenario 5: Edge cases - full hikes and dependencies
scenario_5() {
  print_header "Scenario 5: Edge Cases (Full Hikes & Dependencies)"
  
  GUIDE_UID="guide-edge-$TIMESTAMP"
  GUIDE_EMAIL="guide-edge-$TIMESTAMP@example.com"
  HIKER1_UID="hiker1-edge-$TIMESTAMP"
  HIKER1_EMAIL="hiker1-edge-$TIMESTAMP@example.com"
  HIKER2_UID="hiker2-edge-$TIMESTAMP"
  HIKER2_EMAIL="hiker2-edge-$TIMESTAMP@example.com"
  
  # Create guide
  print_info "Step 1: Setting up guide and hike with capacity 1..."
  curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{\"firebaseUid\": \"$GUIDE_UID\", \"email\": \"$GUIDE_EMAIL\", \"name\": \"Edge Guide\", \"role\": \"guide\"}" > /dev/null
  
  curl -s -X PATCH "$BASE_URL/api/users/profile" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -H "Content-Type: application/json" \
    -d "{\"bio\": \"Test\", \"displayName\": \"Edge Guide\"}" > /dev/null
  
  # Create hike with capacity 1
  HIKE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/hikes" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -F "title=Edge Case Hike $TIMESTAMP" \
    -F "difficulty=EASY" \
    -F "capacity=1" \
    -F "date=2026-02-15")
  
  HIKE_ID=$(json_get_string "$HIKE_RESPONSE" "id")
  print_success "Created hike with capacity 1: $HIKE_ID"
  
  # Register two hikers
  curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{\"firebaseUid\": \"$HIKER1_UID\", \"email\": \"$HIKER1_EMAIL\", \"name\": \"Hiker 1\", \"role\": \"hiker\"}" > /dev/null
  
  curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{\"firebaseUid\": \"$HIKER2_UID\", \"email\": \"$HIKER2_EMAIL\", \"name\": \"Hiker 2\", \"role\": \"hiker\"}" > /dev/null
  
  # First hiker joins
  print_info "Step 2: First hiker joins..."
  JOIN1=$(curl -s -X POST "$BASE_URL/api/hikes/$HIKE_ID/join" \
    -H "x-dev-user: {\"id\":\"$HIKER1_UID\",\"email\":\"$HIKER1_EMAIL\",\"role\":\"hiker\"}")
  
  if echo "$JOIN1" | grep -q '"id"'; then
    print_success "First hiker joined successfully"
  else
    print_error "First hiker failed to join"
  fi
  
  # Second hiker tries to join (should fail - full)
  print_info "Step 3: Second hiker tries to join full hike..."
  JOIN2=$(curl -s -X POST "$BASE_URL/api/hikes/$HIKE_ID/join" \
    -H "x-dev-user: {\"id\":\"$HIKER2_UID\",\"email\":\"$HIKER2_EMAIL\",\"role\":\"hiker\"}")
  
  if echo "$JOIN2" | grep -q "full"; then
    print_success "Correctly rejected booking for full hike"
    json_head "$JOIN2"
  else
    print_error "API allowed overbooking"
  fi
  
  # Try to delete hike with bookings
  print_info "Step 4: Trying to delete hike with active booking..."
  DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/hikes/$HIKE_ID" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}")
  
  HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    print_success "Hike deleted (cascade delete handled bookings)"
  else
    print_info "Deletion may have constraints (HTTP $HTTP_CODE)"
  fi
}

# Scenario 6: Admin operations
scenario_6() {
  print_header "Scenario 6: Admin Operations"
  
  # Use the admin UID from ADMIN_UIDS env var
  ADMIN_UID="yPDBrkpp4yfMAeUI7ew1CcgdW823"
  ADMIN_EMAIL="admin-$TIMESTAMP@example.com"
  
  print_info "Step 1: Testing admin endpoints..."
  
  # Try to access admin overview
  print_info "Checking admin overview..."
  OVERVIEW=$(curl -s "$BASE_URL/api/admin/overview" \
    -H "x-dev-user: {\"id\":\"$ADMIN_UID\",\"email\":\"$ADMIN_EMAIL\",\"firebaseUid\":\"$ADMIN_UID\",\"role\":\"admin\"}")
  
  if echo "$OVERVIEW" | grep -q "totalUsers\|users\|hikes"; then
    print_success "Admin overview endpoint accessible"
    json_head "$OVERVIEW"
  else
    print_info "Admin overview returned different structure or error"
    json_head "$OVERVIEW"
  fi
  
  # Try to access admin users list
  print_info "\nStep 2: Fetching admin users list..."
  USERS=$(curl -s "$BASE_URL/api/admin/users?page=1&pageSize=5" \
    -H "x-dev-user: {\"id\":\"$ADMIN_UID\",\"email\":\"$ADMIN_EMAIL\",\"firebaseUid\":\"$ADMIN_UID\",\"role\":\"admin\"}")
  
  if echo "$USERS" | grep -q "items\|total"; then
    print_success "Admin users list accessible"
    json_head "$USERS"
  else
    print_info "Users list returned different structure"
    json_head "$USERS"
  fi
  
  # Test non-admin cannot access
  print_info "\nStep 3: Testing non-admin access (should fail)..."
  FORBIDDEN=$(curl -s "$BASE_URL/api/admin/overview" \
    -H "x-dev-user: {\"id\":\"regular-user\",\"email\":\"user@test.com\",\"role\":\"hiker\"}")
  
  if echo "$FORBIDDEN" | grep -qi "forbidden\|unauthorized\|admin"; then
    print_success "Non-admin correctly denied access"
    json_head "$FORBIDDEN"
  else
    print_error "Non-admin may have accessed admin endpoint"
  fi
}

# Scenario 7: Reviews functionality
scenario_7() {
  print_header "Scenario 7: Reviews Functionality"
  
  GUIDE_UID="guide-review-$TIMESTAMP"
  GUIDE_EMAIL="guide-review-$TIMESTAMP@example.com"
  HIKER_UID="hiker-review-$TIMESTAMP"
  HIKER_EMAIL="hiker-review-$TIMESTAMP@example.com"
  
  # Create guide and hike
  print_info "Step 1: Setting up guide and hike..."
  curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{\"firebaseUid\": \"$GUIDE_UID\", \"email\": \"$GUIDE_EMAIL\", \"name\": \"Review Guide\", \"role\": \"guide\"}" > /dev/null
  
  curl -s -X PATCH "$BASE_URL/api/users/profile" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -H "Content-Type: application/json" \
    -d "{\"bio\": \"Test\", \"displayName\": \"Review Guide\"}" > /dev/null
  
  # Create hike with past date so it can be reviewed
  PAST_DATE=$(date -u -d "yesterday" +"%Y-%m-%d" 2>/dev/null || date -u -v-1d +"%Y-%m-%d")
  HIKE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/hikes" \
    -H "x-dev-user: {\"id\":\"$GUIDE_UID\",\"email\":\"$GUIDE_EMAIL\",\"role\":\"guide\"}" \
    -F "title=Review Test Hike $TIMESTAMP" \
    -F "difficulty=EASY" \
    -F "capacity=10" \
    -F "date=$PAST_DATE")
  
  HIKE_ID=$(json_get_string "$HIKE_RESPONSE" "id")
  GUIDE_PROFILE_ID=$(json_get_string "$HIKE_RESPONSE" "guideId")
  
  # Register hiker and join hike
  curl -s -X POST "$BASE_URL/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{\"firebaseUid\": \"$HIKER_UID\", \"email\": \"$HIKER_EMAIL\", \"name\": \"Review Hiker\", \"role\": \"hiker\"}" > /dev/null
  
  curl -s -X POST "$BASE_URL/api/hikes/$HIKE_ID/join" \
    -H "x-dev-user: {\"id\":\"$HIKER_UID\",\"email\":\"$HIKER_EMAIL\",\"role\":\"hiker\"}" > /dev/null
  
  # Create review
  print_info "Step 2: Creating review for guide..."
  REVIEW_RESPONSE=$(curl -s -X POST "$BASE_URL/api/reviews" \
    -H "x-dev-user: {\"id\":\"$HIKER_UID\",\"email\":\"$HIKER_EMAIL\",\"role\":\"hiker\"}" \
    -H "Content-Type: application/json" \
    -d "{
      \"guideId\": \"$GUIDE_PROFILE_ID\",
      \"hikeId\": \"$HIKE_ID\",
      \"rating\": 5,
      \"comment\": \"Excellent guide! Very knowledgeable and friendly.\"
    }")
  
  REVIEW_ID=$(json_get_string "$REVIEW_RESPONSE" "id")
  
  if [ -n "$REVIEW_ID" ] && [ "$REVIEW_ID" != "error" ]; then
    print_success "Review created: $REVIEW_ID"
    json_head "$REVIEW_RESPONSE"
  else
    print_error "Failed to create review"
    json_head "$REVIEW_RESPONSE"
  fi
  
  # Fetch reviews for guide
  print_info "\nStep 3: Fetching reviews for guide..."
  if [ -n "$GUIDE_PROFILE_ID" ]; then
    REVIEWS=$(curl -s "$BASE_URL/api/reviews/guide/$GUIDE_PROFILE_ID")
    
    if echo "$REVIEWS" | grep -q '"rating"'; then
      print_success "Reviews retrieved successfully"
      json_head "$REVIEWS"
    else
      print_info "No reviews found or different structure"
      json_head "$REVIEWS"
    fi
  else
    print_info "Could not get guide profile ID to fetch reviews"
  fi
}

# Scenario 8: Search and filtering
scenario_8() {
  print_header "Scenario 8: Search & Filtering"
  
  print_info "Step 1: Testing hike search by difficulty..."
  EASY_HIKES=$(curl -s "$BASE_URL/api/hikes?difficulty=EASY")
  EASY_COUNT=$(json_array_length "$EASY_HIKES")
  
  if [ "$EASY_COUNT" -gt 0 ]; then
    print_success "Found $EASY_COUNT easy hikes"
    json_head "$EASY_HIKES"
  else
    print_info "No easy hikes found (may be expected)"
  fi
  
  print_info "\nStep 2: Testing hike search by status..."
  ACTIVE_HIKES=$(curl -s "$BASE_URL/api/hikes?status=ACTIVE")
  ACTIVE_COUNT=$(json_array_length "$ACTIVE_HIKES")
  
  if [ "$ACTIVE_COUNT" -gt 0 ]; then
    print_success "Found $ACTIVE_COUNT active hikes"
  else
    print_info "No active hikes found"
  fi
  
  print_info "\nStep 3: Testing pagination..."
  PAGE1=$(curl -s "$BASE_URL/api/hikes?page=1&pageSize=5")
  PAGE1_COUNT=$(json_array_length "$PAGE1")
  
  if [ "$PAGE1_COUNT" -gt 0 ]; then
    print_success "Pagination working - page 1 has $PAGE1_COUNT items"
    json_head "$PAGE1"
  else
    print_info "Pagination may not be implemented or no results"
  fi
  
  print_info "\nStep 4: Testing search functionality..."
  SEARCH=$(curl -s "$BASE_URL/api/hikes?search=test")
  SEARCH_COUNT=$(json_array_length "$SEARCH")
  
  if [ "$SEARCH_COUNT" -gt 0 ]; then
    print_success "Search returned $SEARCH_COUNT results"
  else
    print_info "No search results (search may not be implemented)"
  fi
}

# Run all scenarios
run_all_scenarios() {
  print_header "Running All Scenarios"
  
  health_check
  scenario_1
  scenario_2
  scenario_3
  scenario_4
  scenario_5
  scenario_6
  scenario_7
  scenario_8
  
  print_header "All Scenarios Complete"
}

# Main logic
main() {
  SCENARIO="${1:-health}"
  
  case "$SCENARIO" in
    health)
      health_check
      ;;
    scenario1|s1)
      health_check
      scenario_1
      ;;
    scenario2|s2)
      health_check
      scenario_2
      ;;
    scenario3|s3)
      health_check
      scenario_3
      ;;
    scenario4|s4)
      health_check
      scenario_4
      ;;
    scenario5|s5)
      health_check
      scenario_5
      ;;
    scenario6|s6)
      health_check
      scenario_6
      ;;
    scenario7|s7)
      health_check
      scenario_7
      ;;
    scenario8|s8)
      health_check
      scenario_8
      ;;
    all)
      run_all_scenarios
      ;;
    *)
      echo "Usage: $0 [scenario]"
      echo ""
      echo "Scenarios:"
      echo "  health              - Quick health check"
      echo "  scenario1 (s1)      - Register user, create hike, join hike"
      echo "  scenario2 (s2)      - Create hike, update, delete (guide only)"
      echo "  scenario3 (s3)      - Test privacy filtering on user profiles"
      echo "  scenario4 (s4)      - Error handling (invalid data & wrong roles)"
      echo "  scenario5 (s5)      - Edge cases (full hikes & dependencies)"
      echo "  scenario6 (s6)      - Admin operations"
      echo "  scenario7 (s7)      - Reviews functionality"
      echo "  scenario8 (s8)      - Search & filtering"
      echo "  all                 - Run all scenarios"
      echo ""
      echo "Environment variables:"
      echo "  BASE_URL            - API base URL (default: http://localhost:3000)"
      echo ""
      echo "Examples:"
      echo "  ./test_api.sh health"
      echo "  ./test_api.sh scenario1"
      echo "  ./test_api.sh s4          # Run scenario 4"
      echo "  BASE_URL=https://api.example.com ./test_api.sh all"
      exit 1
      ;;
  esac
}

main "$@"
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  