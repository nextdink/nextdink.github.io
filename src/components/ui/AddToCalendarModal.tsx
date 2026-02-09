import { CalendarPlus } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { addToCalendar, isAppleDevice, type CalendarEvent, type CalendarProvider } from '@/utils/calendarUtils';

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  title?: string;
  message?: string;
}

export function AddToCalendarModal({
  isOpen,
  onClose,
  event,
  title = 'Add to Calendar',
  message = 'Would you like to add this event to your calendar?',
}: AddToCalendarModalProps) {
  if (!event) return null;

  const handleAddToCalendar = (provider: CalendarProvider) => {
    addToCalendar(event, provider);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
        
        <div className="space-y-2">
          {/* Google Calendar */}
          <button
            onClick={() => handleAddToCalendar('google')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#4285F4"/>
                <path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Google Calendar
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Open in Google Calendar
              </p>
            </div>
          </button>

          {/* Outlook Calendar */}
          <button
            onClick={() => handleAddToCalendar('outlook')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0078D4">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-6v4h4l-5 6z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Outlook Calendar
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Open in Outlook.com
              </p>
            </div>
          </button>

          {/* Apple Calendar / Download ICS */}
          <button
            onClick={() => handleAddToCalendar('apple')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <CalendarPlus className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {isAppleDevice() ? 'Apple Calendar' : 'Download .ics File'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAppleDevice() 
                  ? 'Open in Apple Calendar' 
                  : 'Download and open in any calendar app'}
              </p>
            </div>
          </button>
        </div>

        <div className="pt-2">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe Later
          </Button>
        </div>
      </div>
    </Modal>
  );
}