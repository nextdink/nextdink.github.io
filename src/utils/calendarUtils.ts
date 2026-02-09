/**
 * Calendar utilities for generating calendar event files and links
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Format date for ICS file (format: YYYYMMDDTHHMMSS)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Format date for Google Calendar URL (format: YYYYMMDDTHHMMSSZ)
 */
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape special characters for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate ICS file content
 */
export function generateICSContent(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Next Dink//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `LOCATION:${escapeICS(event.location)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  lines.push(
    `DTSTAMP:${formatICSDate(new Date())}`,
    `UID:${Date.now()}-nextdink@nextdink.app`,
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

/**
 * Download ICS file
 */
export function downloadICSFile(event: CalendarEvent): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    location: event.location,
    details: event.description || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Web Calendar URL
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    location: event.location,
    body: event.description || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Calendar provider options
 */
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'download';

/**
 * Add event to calendar based on provider
 */
export function addToCalendar(event: CalendarEvent, provider: CalendarProvider): void {
  switch (provider) {
    case 'google':
      window.open(generateGoogleCalendarUrl(event), '_blank');
      break;
    case 'outlook':
      window.open(generateOutlookCalendarUrl(event), '_blank');
      break;
    case 'apple':
    case 'download':
      downloadICSFile(event);
      break;
  }
}

/**
 * Detect if user is on iOS/macOS (likely uses Apple Calendar)
 */
export function isAppleDevice(): boolean {
  return /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
}

/**
 * Get suggested calendar provider based on device
 */
export function getSuggestedProvider(): CalendarProvider {
  if (isAppleDevice()) {
    return 'apple';
  }
  // Default to Google Calendar for other devices
  return 'google';
}