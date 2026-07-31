// ABCare OmniFlow — Static FAQ content
// Fully offline — no API, no AI, no internet needed.
// Edit this file to update FAQ content for the clinic.

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  category: string;
  icon: string; // emoji
  items: FaqItem[];
}

export const FAQ_DATA: FaqCategory[] = [
  {
    category: 'Queue',
    icon: '🏥',
    items: [
      {
        q: 'How do I add a patient to today\'s queue?',
        a: 'Go to the Queue page. On the left panel, search the patient\'s name. Click "+ Add" next to their name. They will appear in the queue list immediately.',
      },
      {
        q: 'How do I add a new patient who isn\'t in the system yet?',
        a: 'On the Queue page, click "New Patient" at the top of the left panel. Fill in the patient details and save. They will be automatically added to the queue.',
      },
      {
        q: 'What does "In Consultation" status mean?',
        a: 'The doctor clicked "Call Next" for this patient. They are currently being seen. Only the Doctor/Admin role can mark them as Done.',
      },
      {
        q: 'Can I change the order of patients in the queue?',
        a: 'Yes. If you are Staff, drag and drop the patient rows to reorder them. The positions update immediately.',
      },
      {
        q: 'What is "Archive Day"?',
        a: 'Archive Day closes the queue for today. Use this at the end of the clinic day to clear all entries. The data is saved but removed from the active queue view.',
      },
    ],
  },
  {
    category: 'Appointments',
    icon: '📅',
    items: [
      {
        q: 'Can I book an appointment on a Sunday?',
        a: 'No. Sundays are closed days and are greyed out on the calendar. The doctor can also block specific weekdays via the Schedule tab on the Calendar page.',
      },
      {
        q: 'What happens to missed appointments?',
        a: 'Every midnight, the system automatically marks confirmed appointments from past dates as "No-Show" if they were not marked as Attended.',
      },
      {
        q: 'How do I mark a patient as attended?',
        a: 'On the Calendar page, click the date, find the appointment in the right panel, and click "Mark Attended". This only appears for confirmed appointments on today or past dates.',
      },
      {
        q: 'Can appointments repeat automatically?',
        a: 'Yes. When creating an appointment, set the Frequency to Weekly, Monthly, or Yearly. Choose "Once" if it does not repeat.',
      },
      {
        q: 'How do I cancel an appointment?',
        a: 'On the Calendar page, click the date, find the appointment, and click the trash icon. Confirm the cancellation in the prompt.',
      },
    ],
  },
  {
    category: 'Patient Records',
    icon: '📋',
    items: [
      {
        q: 'What is the difference between Archive and Delete?',
        a: 'Archive hides the patient from the directory but keeps all their records safe. They can be restored by the Super Admin. Permanently delete is only available to Super Admin and cannot be undone.',
      },
      {
        q: 'What does the blue Verified checkmark mean?',
        a: 'The Doctor/Admin has confirmed that this patient\'s identity and information is accurate and complete. Staff can add patients but only the doctor can verify them.',
      },
      {
        q: 'How do I upload a patient photo?',
        a: 'Open the patient\'s detail panel. Click the camera icon or the photo area at the top. Select a JPEG, PNG, or WebP image (max 10MB).',
      },
      {
        q: 'Can I search for a patient?',
        a: 'Yes. Use the search bar at the top of the Patient Directory. It searches by full name in real time.',
      },
      {
        q: 'What information is in the Medical History tab?',
        a: 'Past medical conditions, maintenance medications, travel history, family history, and personal/social history. This is separate from consultation records.',
      },
    ],
  },
  {
    category: 'Consultation Records',
    icon: '🩺',
    items: [
      {
        q: 'How do I add a new consultation record?',
        a: 'Open the patient\'s detail panel. Go to the Consultations tab. Click "+ New Record". Fill in the date, clinical findings, and assessment/plan. Click Save.',
      },
      {
        q: 'What does "Mark as Reviewed" mean?',
        a: 'Clicking Mark Reviewed sets the record as finalized. The timestamp is recorded. Once marked, the record is locked from further edits by staff.',
      },
      {
        q: 'What are Doctor Notes?',
        a: 'Doctor Notes are private notes only visible to the Doctor/Admin role. Staff members cannot see or edit this field. Use it for clinical impressions or instructions.',
      },
      {
        q: 'What vitals can I record?',
        a: 'Blood Pressure (systolic/diastolic), Heart Rate (bpm), Temperature (°C), SpO2 (%), Respiratory Rate, Weight (kg), and Height (cm).',
      },
    ],
  },
  {
    category: 'Accounts & Login',
    icon: '🔐',
    items: [
      {
        q: 'I can\'t log in — it says my account is locked.',
        a: 'After 5 failed login attempts, the account is locked for 15 minutes. Wait and try again. If you forgot your password, use "Forgot Password" on the login screen.',
      },
      {
        q: 'How do I reset my password?',
        a: 'On the login page, click "Forgot Password". Enter your email. A 6-digit code will be sent to your email (expires in 10 minutes). Enter the code and set a new password.',
      },
      {
        q: 'What is MFA / Two-Factor Authentication?',
        a: 'MFA adds a second login step using a 6-digit code from Google Authenticator. It is optional but strongly recommended. Enable it in Settings after logging in.',
      },
      {
        q: 'How many accounts can be created?',
        a: 'The system allows a maximum of 2 Staff accounts and 2 Doctor/Admin accounts. After that, the signup page shows "Registration Closed".',
      },
      {
        q: 'What is the difference between Staff and Admin?',
        a: 'Staff can manage the patient directory, queue, and appointments. Admin (Doctor) can additionally access audit logs, verify patients, add custom procedures, and see doctor-only notes.',
      },
    ],
  },
  {
    category: 'System',
    icon: '⚙️',
    items: [
      {
        q: 'The AI briefing says "AI is offline" every morning.',
        a: 'The morning briefing uses a local AI (Ollama). If Ollama is not installed or running, the briefing is skipped. The rest of the app works fully without it.',
      },
      {
        q: 'How do I stop the web app?',
        a: 'For Docker/production: run "bash manage.sh stop" in the terminal. For local testing: run "bash stop-mediflow.sh". The app restarts automatically when the server reboots.',
      },
      {
        q: 'How do I back up the patient data?',
        a: 'Run "bash manage.sh backup" on the server to create a manual backup. For automatic daily backups, run "bash manage.sh backup-setup" once. Backups are saved to the /backups/ folder.',
      },
      {
        q: 'How do I access the system from another computer in the clinic?',
        a: 'Open a browser on any computer connected to the clinic\'s network. Type the server\'s IP address followed by :3000 (example: http://192.168.1.50:3000). If local DNS is set up, use the hostname instead.',
      },
    ],
  },
];
