import React from 'react';

interface TooltipProps {
  text: string;
  position?: 'right' | 'left' | 'top' | 'bottom';
  className?: string;
}

/**
 * Tooltip — a small ? badge with hover explanation text.
 * Usage: <Tooltip text="What this field means" />
 * Inline next to any label: <label>BP <Tooltip text="Blood pressure..." /></label>
 */
export function Tooltip({ text, position = 'right', className = '' }: TooltipProps) {
  return (
    <span className={`relative group inline-flex items-center ml-1 cursor-help align-middle ${className}`}>
      {/* Badge */}
      <span className="w-3.5 h-3.5 rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-500
                       text-[9px] flex items-center justify-center font-bold
                       transition-colors flex-shrink-0 leading-none select-none">
        ?
      </span>

      {/* Bubble — rendered into a portal-like fixed layer via absolute + z-50 */}
      <span className={`
        absolute z-50 hidden group-hover:flex
        w-52 bg-zinc-900 text-white text-[11px] font-normal rounded-xl
        px-3 py-2 shadow-2xl leading-relaxed pointer-events-none
        ${position === 'right'  ? 'left-5 top-1/2 -translate-y-1/2' : ''}
        ${position === 'left'   ? 'right-5 top-1/2 -translate-y-1/2' : ''}
        ${position === 'top'    ? 'bottom-5 left-1/2 -translate-x-1/2' : ''}
        ${position === 'bottom' ? 'top-5 left-1/2 -translate-x-1/2' : ''}
      `}>
        {text}
        {/* Arrow */}
        {position === 'right'  && <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 rotate-45" />}
        {position === 'left'   && <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 rotate-45" />}
        {position === 'top'    && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45" />}
        {position === 'bottom' && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45" />}
      </span>
    </span>
  );
}

// ── Pre-built tooltip definitions for reuse across the app ───────────────────

export const TOOLTIPS = {
  // Vitals
  bp:     'Blood Pressure. Format: systolic/diastolic (e.g. 120/80 mmHg). Normal adult: below 120/80.',
  hr:     'Heart Rate in beats per minute. Normal resting: 60–100 bpm.',
  temp:   'Body temperature in Celsius. Normal: 36.5–37.5°C. Fever: above 37.8°C.',
  spo2:   'Blood oxygen saturation (%). Normal: 95–100%. Below 90% requires immediate attention.',
  rr:     'Respiratory Rate — breaths per minute. Normal adult: 12–20 breaths/min.',
  weight: 'Patient weight in kilograms.',
  height: 'Patient height in centimeters.',

  // Patient directory
  verified:    'Doctor has reviewed and confirmed this patient\'s information is accurate and complete.',
  archive:     'Hides this patient from the directory. All records are preserved. Can be restored by Super Admin.',
  referredBy:  'Name of the doctor, clinic, or person who referred this patient to the clinic.',

  // Appointments
  frequency:   'How often this appointment repeats. Select "Once" if it does not repeat.',
  bookingType: 'Walk-in: patient arrived without a prior appointment. Standard: scheduled in advance.',
  noShow:      'Patient did not arrive for this appointment. The system marks this automatically each midnight.',

  // Auth / Settings
  mfa:         'Two-Factor Authentication. Adds a second login step using a 6-digit code from Google Authenticator. Strongly recommended.',
  displayName: 'The name shown in the sidebar. Does not affect your login email.',
  doctorNotes: 'Only visible to Doctor/Admin. Staff members cannot see or edit this field.',

  // Chat
  aiLocal:     'This assistant runs on the clinic\'s own computer using Ollama. No data is sent to the internet.',
  faqMode:     'The AI assistant is optional. This FAQ answers common questions without AI.',
} as const;
