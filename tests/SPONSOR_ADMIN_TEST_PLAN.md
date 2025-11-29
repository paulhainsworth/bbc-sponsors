# Sponsor Admin Features - Comprehensive Test Plan

## Overview
This test plan covers all features that a sponsor admin can interact with in the application.

## Test Categories

### 1. Dashboard & Overview
- [ ] Dashboard loads and displays sponsor name
- [ ] Statistics cards display correctly:
  - [ ] Total Promotions count
  - [ ] Active Promotions count
  - [ ] Featured Promotions count
- [ ] Quick action buttons are visible and functional:
  - [ ] Edit Profile button
  - [ ] Create Promotion button
  - [ ] View Public Page button
- [ ] Recent promotions list displays (if promotions exist)
- [ ] Empty state displays correctly (if no promotions)

### 2. Profile Management
- [ ] Profile page loads with current sponsor data
- [ ] All profile fields are displayed:
  - [ ] Name (read-only)
  - [ ] Tagline (editable)
  - [ ] Description (editable)
  - [ ] Categories (multi-select, editable)
  - [ ] Website URL (editable)
  - [ ] Contact email (editable)
  - [ ] Contact phone (editable)
  - [ ] Address fields (editable)
  - [ ] Social media links (editable)
- [ ] Name field is disabled (read-only)
- [ ] Can edit and save tagline
- [ ] Can edit and save description
- [ ] Can update categories
- [ ] Can update contact information
- [ ] Can update address
- [ ] Can update social media links
- [ ] Form validation works (required fields, URL format, etc.)
- [ ] Success message appears after saving
- [ ] Changes persist after page reload

### 3. Promotions Management - List View
- [ ] Promotions list page loads
- [ ] Table displays all promotions for sponsor
- [ ] Table columns are visible:
  - [ ] Title
  - [ ] Type
  - [ ] Status
  - [ ] Start Date
  - [ ] End Date
  - [ ] Featured indicator
- [ ] Status badges display with correct colors
- [ ] Create Promotion button is visible
- [ ] Edit link is visible for each promotion
- [ ] Delete button is visible for each promotion
- [ ] Toggle status button (Activate/Deactivate) is visible
- [ ] Empty state displays if no promotions exist

### 4. Promotions Management - Create
- [ ] Create promotion page loads
- [ ] All form fields are visible:
  - [ ] Title (required)
  - [ ] Description (required, rich text editor)
  - [ ] Promotion Type dropdown
  - [ ] Start Date
  - [ ] End Date
  - [ ] Coupon Code (conditional)
  - [ ] External Link (conditional)
  - [ ] Terms & Conditions
- [ ] Form fields show/hide based on promotion type:
  - [ ] Time Limited: End Date required
  - [ ] Coupon Code: Coupon Code field required
  - [ ] External Link: External Link field required
- [ ] Can create Evergreen promotion
- [ ] Can create Time Limited promotion
- [ ] Can create Coupon Code promotion
- [ ] Can create External Link promotion
- [ ] Form validation works (required fields)
- [ ] Rich text editor works for description
- [ ] Successfully creates promotion and redirects to list
- [ ] New promotion appears in promotions list
- [ ] New promotion has status "pending_approval"

### 5. Promotions Management - Edit
- [ ] Edit promotion page loads with existing data
- [ ] All fields are pre-filled with current values
- [ ] Can edit title
- [ ] Can edit description (rich text editor)
- [ ] Can change promotion type
- [ ] Can update dates
- [ ] Can update coupon code
- [ ] Can update external link
- [ ] Can update terms
- [ ] Status is displayed (read-only)
- [ ] Can save changes successfully
- [ ] Changes persist after save
- [ ] Redirects to promotions list after save
- [ ] Can edit active promotions (not just drafts)

### 6. Promotions Management - Delete
- [ ] Delete button is visible for promotions
- [ ] Clicking delete shows confirmation dialog
- [ ] Can cancel deletion
- [ ] Can confirm deletion
- [ ] Promotion is removed from list after deletion
- [ ] Success message appears after deletion

### 7. Promotions Management - Status Toggle
- [ ] Toggle status button is visible
- [ ] Button text shows current action (Activate/Deactivate)
- [ ] Can activate draft promotion
- [ ] Can deactivate active promotion
- [ ] Status updates immediately in UI
- [ ] Status badge updates color
- [ ] Cannot toggle status for pending_approval promotions

### 8. Team Member Management
- [ ] Team members page loads
- [ ] Page heading is visible
- [ ] Invite form is visible:
  - [ ] Email input field
  - [ ] Send Invitation button
- [ ] Current team members table/list is visible
- [ ] Can see own user in team list (marked as "You")
- [ ] Can invite new team member
- [ ] Invitation form validation works
- [ ] Success message appears after invitation sent
- [ ] Cannot remove yourself from team
- [ ] Remove button is disabled/hidden for own user

### 9. Navigation
- [ ] Navigation menu is visible on all pages
- [ ] All navigation links work:
  - [ ] Dashboard link
  - [ ] Profile link
  - [ ] Promotions link
  - [ ] Team link
- [ ] Can navigate between all pages
- [ ] Active page is highlighted in navigation
- [ ] Navigation persists across page loads

### 10. Error Handling
- [ ] Handles network errors gracefully
- [ ] Shows error messages for failed operations
- [ ] Handles missing sponsor association
- [ ] Handles unauthorized access attempts
- [ ] Handles invalid form data

## Test Execution Order

1. Dashboard tests (foundation)
2. Navigation tests (ensure navigation works)
3. Profile Management tests
4. Promotions List tests
5. Create Promotion tests
6. Edit Promotion tests
7. Delete Promotion tests
8. Status Toggle tests
9. Team Member Management tests
10. Error Handling tests

## Success Criteria

- All tests pass
- No flaky tests (consistent results)
- All features are covered
- Edge cases are handled

