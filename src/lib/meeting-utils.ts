import { format, parseISO } from 'date-fns';

// Convert time string (e.g., "9:00 AM") to hours and minutes
export function parseTimeString(timeString: string): {
  hours: number;
  minutes: number;
} {
  const [time, period] = timeString.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

// Combine date and time string into a Date object
export function combineDateAndTime(date: Date, timeString: string): Date {
  const { hours, minutes } = parseTimeString(timeString);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Format a date for display in the UI
export function formatMeetingDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'PPP');
}

// Format a time for display in the UI
export function formatMeetingTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'h:mm a');
}

// Format a date and time range for display in the UI
export function formatMeetingTimeRange(
  start: string | Date,
  end: string | Date
): string {
  const startObj = typeof start === 'string' ? parseISO(start) : start;
  const endObj = typeof end === 'string' ? parseISO(end) : end;
  return `${format(startObj, 'h:mm a')} - ${format(endObj, 'h:mm a')}`;
}

// Get status label for display
export function getAttendeeStatusLabel(status: string): string {
  switch (status) {
    case 'ACCEPTED':
      return 'Accepted';
    case 'DECLINED':
      return 'Declined';
    case 'TENTATIVE':
      return 'Maybe';
    default:
      return 'Pending';
  }
}

// Generate a random Google Meet link
export function generateMeetLink(): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `https://meet.google.com/${result}`;
}
