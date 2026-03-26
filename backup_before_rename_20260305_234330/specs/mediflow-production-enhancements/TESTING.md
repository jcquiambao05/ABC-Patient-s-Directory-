# ABC Patient Directory - Testing Guide

## Testing Checklist

### Pre-Deployment Testing

#### 1. System Health Checks

```bash
# Check all services are running
curl http://localhost:5000/health  # OCR service
curl http://localhost:3000/api/health  # Web application

# Expected responses:
# OCR: {"status": "healthy", "models": {"tesseract": true}}
# Web: {"status": "ok", "database": "connected"}
```

#### 2. Authentication Testing

- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Logout functionality
- [ ] Token expiration after 8 hours
- [ ] Protected routes require authentication
- [ ] JWT token validation

**Test Steps:**
1. Navigate to http://localhost:3000
2. Enter credentials: admin@mediflow.ai / Admin@123456
3. Verify successful login and redirect to patient directory
4. Click logout button
5. Verify redirect to login page
6. Try accessing http://localhost:3000 without login (should redirect)

#### 3. Patient Management Testing

- [ ] Create new patient manually
- [ ] View patient list
- [ ] Search patients by name
- [ ] View patient details
- [ ] Edit patient information
- [ ] Delete patient (with confirmation)
- [ ] Cabinet organization (A-Z grouping)

**Test Steps:**
1. Click "New Entry" button
2. Fill in patient information:
   - First Name: Test
   - Last Name: Patient
   - DOB: 1990-01-01
   - Gender: Male
   - Phone: 123-456-7890
   - Email: test@example.com
   - Address: 123 Test St
3. Submit form
4. Verify patient appears in directory under "Cabinet P"
5. Click on patient to view details
6. Click edit icon, modify information, save
7. Verify changes persist
8. Click delete icon, confirm deletion
9. Verify patient removed from directory

#### 4. AI Upload Entry Testing

- [ ] Upload medical chart image
- [ ] Patient name extracted correctly (not "MEDICAL CHART")
- [ ] Date of birth normalized to YYYY-MM-DD
- [ ] Phone number extracted
- [ ] Email extracted
- [ ] Address extracted
- [ ] Gender normalized (M→male, F→female)
- [ ] New patient created in database
- [ ] Medical chart created and linked

**Test Steps:**
1. Click "AI Upload Entry" button
2. Upload a medical chart image (JPEG/PNG)
3. Wait for processing (3-5 seconds)
4. Verify new patient appears in directory
5. Click on patient to view details
6. Verify all fields populated correctly:
   - Name is actual patient name (not header text)
   - DOB in YYYY-MM-DD format
   - Phone, email, address present
   - Gender normalized
7. Check medical chart tab
8. Verify diagnosis and notes extracted

#### 5. AI Upload (Existing Patient) Testing

- [ ] Select existing patient
- [ ] Upload medical chart
- [ ] Chart added to patient's records
- [ ] Extracted data accurate
- [ ] Confidence score displayed
- [ ] Review functionality works

**Test Steps:**
1. Select an existing patient
2. Click "AI Upload" button
3. Upload medical chart image
4. Wait for processing
5. Verify new chart appears in patient's medical records
6. Check confidence score (should be 80-90% for clear images)
7. Click review button
8. Verify all fields editable
9. Make changes and save
10. Verify changes persist

#### 6. Medical Chart Review Testing

- [ ] View medical chart details
- [ ] Edit diagnosis field
- [ ] Edit treatment plan
- [ ] Edit notes
- [ ] Add reviewer notes
- [ ] Mark as reviewed
- [ ] Save changes
- [ ] View raw OCR text

**Test Steps:**
1. Click on a medical chart
2. Review modal opens
3. Edit diagnosis: "Updated diagnosis text"
4. Edit treatment plan: "Updated treatment"
5. Add reviewer notes: "Verified by admin"
6. Click "Save & Mark Reviewed"
7. Verify chart shows "Reviewed" badge
8. Re-open chart
9. Verify changes saved
10. Check raw OCR text section displays

#### 7. Update Last Visit Testing

- [ ] Click "Update Last Visit" button
- [ ] Confirmation modal appears
- [ ] Current date shown
- [ ] Confirm update
- [ ] Last visit date updated in patient list
- [ ] Visit record created

**Test Steps:**
1. Select a patient
2. Click "Update Last Visit" button
3. Verify confirmation modal shows today's date
4. Click "Confirm"
5. Wait for success message
6. Check patient list - last visit date updated
7. Check patient details - new visit record created

#### 8. Delete Functionality Testing

- [ ] Delete patient confirmation modal
- [ ] Warning about cascading deletes
- [ ] Patient and all records deleted
- [ ] Delete medical chart confirmation
- [ ] Chart deleted, patient remains

**Test Steps:**
1. Click delete icon next to patient
2. Verify warning about deleting all records
3. Cancel - verify patient still exists
4. Click delete again, confirm
5. Verify patient removed from directory
6. Create new patient with medical chart
7. Click delete icon on medical chart
8. Confirm deletion
9. Verify chart removed, patient remains

#### 9. OCR Extraction Accuracy Testing

Test with various document types:

- [ ] Printed medical charts (should be 90%+ accuracy)
- [ ] Handwritten notes (should be 75%+ accuracy)
- [ ] Mixed printed/handwritten (should extract both)
- [ ] Poor quality images (should flag low confidence)
- [ ] Non-medical documents (should extract what it can)

**Test Cases:**

**Case 1: Clear Printed Chart**
- Expected: High confidence (>85%)
- All fields extracted accurately
- Name not confused with headers

**Case 2: Handwritten Chart**
- Expected: Lower confidence (70-85%)
- Basic fields extracted
- May need manual review

**Case 3: Poor Quality Image**
- Expected: Low confidence (<70%)
- Partial extraction
- Flagged for manual review

#### 10. Error Handling Testing

- [ ] Upload invalid file type (should reject)
- [ ] Upload oversized file (should reject)
- [ ] Network error during upload (should show error)
- [ ] OCR service down (should show error message)
- [ ] Database connection lost (should show error)
- [ ] Invalid JWT token (should redirect to login)

**Test Steps:**
1. Try uploading .txt file - should reject
2. Try uploading 50MB image - should reject
3. Stop OCR service, try upload - should show error
4. Restart OCR service
5. Stop database, try loading patients - should show error
6. Restart database
7. Manually expire JWT token - should redirect to login

### Performance Testing

#### 1. OCR Processing Time

- [ ] Single document: <5 seconds
- [ ] Multiple documents: Queue properly
- [ ] Large images (>5MB): Process without timeout
- [ ] Concurrent uploads: Handle gracefully

**Test Steps:**
1. Upload single document, time processing
2. Upload 3 documents simultaneously
3. Verify all process successfully
4. Check processing times reasonable

#### 2. Page Load Times

- [ ] Login page: <1 second
- [ ] Patient directory: <2 seconds
- [ ] Patient details: <1 second
- [ ] Medical chart review: <1 second

#### 3. Search Performance

- [ ] Search with 100+ patients: <500ms
- [ ] Search updates in real-time
- [ ] No lag when typing

### Security Testing

#### 1. Authentication Security

- [ ] Passwords hashed in database (not plain text)
- [ ] JWT tokens expire after 8 hours
- [ ] Invalid tokens rejected
- [ ] Logout invalidates token
- [ ] No access without authentication

**Test Steps:**
1. Check database - passwords should be bcrypt hashes
2. Login and wait 8 hours - should auto-logout
3. Manually modify JWT token - should reject
4. Logout and try accessing API - should fail

#### 2. SQL Injection Prevention

- [ ] Search input sanitized
- [ ] Form inputs sanitized
- [ ] No raw SQL in queries

**Test Steps:**
1. Try searching for: `'; DROP TABLE patients; --`
2. Verify no error, no data loss
3. Try creating patient with SQL in name field
4. Verify stored safely

#### 3. XSS Prevention

- [ ] HTML in patient names escaped
- [ ] Script tags in notes escaped
- [ ] No JavaScript execution from user input

**Test Steps:**
1. Create patient with name: `<script>alert('XSS')</script>`
2. Verify displayed as text, not executed
3. Add notes with HTML tags
4. Verify escaped properly

### Browser Compatibility Testing

Test in multiple browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Test Steps:**
1. Open application in each browser
2. Test login
3. Test patient creation
4. Test document upload
5. Test all major features
6. Verify no console errors

### Mobile Responsiveness Testing

- [ ] Login page responsive
- [ ] Patient list readable on mobile
- [ ] Patient details accessible
- [ ] Forms usable on mobile
- [ ] Buttons appropriately sized

**Test Steps:**
1. Open in mobile browser or use dev tools
2. Test at 375px width (iPhone)
3. Test at 768px width (tablet)
4. Verify all features accessible

### Data Integrity Testing

#### 1. Database Constraints

- [ ] Cannot create patient without required fields
- [ ] Cannot create duplicate patient IDs
- [ ] Foreign key constraints enforced
- [ ] Cascade deletes work correctly

#### 2. Data Validation

- [ ] Email format validated
- [ ] Phone format flexible but validated
- [ ] Date format normalized
- [ ] Required fields enforced

### Backup and Recovery Testing

- [ ] Database backup successful
- [ ] Restore from backup works
- [ ] No data loss after restore
- [ ] System functional after restore

**Test Steps:**
1. Create test data
2. Backup database: `pg_dump $DATABASE_URL > backup.sql`
3. Delete test data
4. Restore: `psql $DATABASE_URL < backup.sql`
5. Verify data restored correctly

### Load Testing (Optional)

For production deployment:

- [ ] 10 concurrent users
- [ ] 50 concurrent users
- [ ] 100 concurrent users
- [ ] System remains responsive
- [ ] No crashes or errors

## Automated Testing (Future)

### Unit Tests
- Authentication functions
- Data validation functions
- OCR extraction functions
- Database queries

### Integration Tests
- API endpoint testing
- Database integration
- OCR service integration
- Authentication flow

### End-to-End Tests
- User workflows
- Document processing pipeline
- Patient management flows

## Bug Reporting

When reporting bugs, include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Screenshots** (if applicable)
5. **Browser/OS** information
6. **Console errors** (F12 → Console tab)
7. **Log files** (ocr_service.log, webapp.log)

## Test Data

### Sample Patients

```
Patient 1:
- Name: John Doe
- DOB: 1980-05-15
- Gender: Male
- Phone: 555-123-4567
- Email: john.doe@example.com

Patient 2:
- Name: Jane Smith
- DOB: 1992-08-22
- Gender: Female
- Phone: 555-987-6543
- Email: jane.smith@example.com
```

### Sample Medical Charts

Create test images with:
- Clear patient name
- Date of birth
- Visit date
- Diagnosis
- Treatment plan
- Vitals (BP, HR, Temp)

## Success Criteria

System is ready for production when:

✅ All authentication tests pass
✅ All patient management tests pass
✅ OCR extraction accuracy >85% for clear images
✅ All error handling works correctly
✅ No security vulnerabilities found
✅ Performance meets requirements
✅ Works in all major browsers
✅ Mobile responsive
✅ Data integrity maintained
✅ Backup/restore tested

## Post-Deployment Monitoring

After deployment, monitor:

1. **Error rates** - Should be <1%
2. **Response times** - Should be <2 seconds
3. **OCR accuracy** - Should be >85%
4. **User feedback** - Collect and address issues
5. **System uptime** - Should be >99%

## Continuous Testing

Regularly test:
- Weekly: Basic functionality
- Monthly: Full test suite
- Quarterly: Security audit
- Annually: Performance review

## Support

For testing issues:
1. Check TROUBLESHOOTING.md
2. Review logs
3. Verify test environment matches production
4. Document and report bugs
