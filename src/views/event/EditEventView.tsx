import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { LocationInput } from '@/components/ui/LocationInput';
import { Spinner } from '@/components/ui/Spinner';
import { ROUTES, getEventRoute } from '@/config/routes';
import { eventService } from '@/services/eventService';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvent';
import type { EventLocation, EventVisibility, EventJoinType, UpdateEventData } from '@/types/event.types';
import { format } from 'date-fns';

export function EditEventView() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { event, isLoading: isLoadingEvent, error: loadError } = useEvent(eventId);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('8');
  
  // Step 2: Location
  const [location, setLocation] = useState<EventLocation | null>(null);
  
  // Step 3: Rules
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [joinType, setJoinType] = useState<EventJoinType>('open');

  // Initialize form with event data
  useEffect(() => {
    if (event && !initialized) {
      setName(event.name);
      setDescription(event.description || '');
      setDate(format(event.date, 'yyyy-MM-dd'));
      setStartTime(format(event.date, 'HH:mm'));
      setEndTime(format(event.endTime, 'HH:mm'));
      setMaxPlayers(event.maxPlayers.toString());
      setLocation({
        venueName: event.venueName,
        formattedAddress: event.formattedAddress,
        latitude: event.latitude,
        longitude: event.longitude,
        placeId: event.placeId,
      });
      setVisibility(event.visibility);
      setJoinType(event.joinType);
      setInitialized(true);
    }
  }, [event, initialized]);

  // Check if user can edit
  const canEdit = user && event && (event.ownerId === user.uid || event.adminIds?.includes(user.uid));

  const handleSubmit = async () => {
    if (!user || !eventId) {
      setError('You must be logged in to edit an event');
      return;
    }

    if (!location) {
      setError('Please select a location');
      return;
    }

    if (!canEdit) {
      setError('You do not have permission to edit this event');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse date and times
      const eventDate = new Date(`${date}T${startTime}`);
      const eventEndTime = new Date(`${date}T${endTime}`);

      const updateData: UpdateEventData = {
        name,
        description: description || undefined,
        date: eventDate,
        endTime: eventEndTime,
        maxPlayers: parseInt(maxPlayers, 10),
        venueName: location.venueName,
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        placeId: location.placeId,
        visibility,
        joinType,
      };

      await eventService.update(eventId, updateData);
      navigate(getEventRoute(eventId));
    } catch (err) {
      console.error('Failed to update event:', err);
      setError(err instanceof Error ? err.message : 'Failed to update event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = name && date && startTime && endTime;
  const canProceedStep2 = location !== null;

  // Loading state
  if (isLoadingEvent) {
    return (
      <PageLayout title="Edit Event" showBack showBottomNav={false}>
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      </PageLayout>
    );
  }

  // Error or not found
  if (loadError || !event) {
    return (
      <PageLayout title="Edit Event" showBack showBottomNav={false}>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            Event not found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            This event may have been deleted or you don't have access.
          </p>
          <Button onClick={() => navigate(ROUTES.HOME)}>Go Home</Button>
        </div>
      </PageLayout>
    );
  }

  // Check permissions
  if (!canEdit) {
    return (
      <PageLayout title="Edit Event" showBack showBottomNav={false}>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            Permission Denied
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            You don't have permission to edit this event.
          </p>
          <Button onClick={() => navigate(getEventRoute(eventId!))}>Back to Event</Button>
        </div>
      </PageLayout>
    );
  }

  // Event is not active
  if (event.status !== 'active') {
    return (
      <PageLayout title="Edit Event" showBack showBottomNav={false}>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            Cannot Edit Event
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            This event has been {event.status} and cannot be edited.
          </p>
          <Button onClick={() => navigate(getEventRoute(eventId!))}>Back to Event</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Edit Event" showBack showBottomNav={false}>
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step
                  ? 'bg-primary-600 dark:bg-primary-400'
                  : s < step
                  ? 'bg-primary-300 dark:bg-primary-700'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card>
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-4">
              Basic Info
            </h3>
            <div className="space-y-4">
              <Input
                label="Event Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Saturday Morning Pickleball"
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details about your event..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary-600 dark:focus:border-primary-400"
                />
                <p className="text-xs text-slate-500 mt-1">{description.length}/500</p>
              </div>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
                <Input
                  label="End Time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Max Players"
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                min="2"
                max="100"
                required
              />
              <Button onClick={() => setStep(2)} className="w-full" disabled={!canProceedStep1}>
                Next: Location
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <Card>
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-4">
              Location
            </h3>
            <div className="space-y-4">
              <LocationInput
                value={location}
                onChange={setLocation}
                label="Search for a venue"
                required
              />
              
              {location && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Venue</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {location.venueName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Address</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {location.formattedAddress}
                    </p>
                  </div>
                  {location.latitude !== 0 && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Coordinates</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1" disabled={!canProceedStep2}>
                  Next: Rules
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Rules */}
        {step === 3 && (
          <Card>
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-4">
              Event Rules
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">
                  Who can see this event?
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as EventVisibility)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-600 dark:focus:border-primary-400"
                >
                  <option value="public">Public - Anyone can find</option>
                  <option value="code">Code - Need event code</option>
                  <option value="private">Private - Invite only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1.5">
                  How can players join?
                </label>
                <select
                  value={joinType}
                  onChange={(e) => setJoinType(e.target.value as EventJoinType)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-600 dark:focus:border-primary-400"
                >
                  <option value="open">Open - Anyone who can see can join</option>
                  <option value="invite_only">Invite Only</option>
                </select>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  loading={loading} 
                  className="flex-1"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Summary Preview */}
        {step === 3 && (
          <Card>
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-4">
              Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Event</span>
                <span className="text-slate-900 dark:text-slate-100 font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Date</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {date && new Date(date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Time</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {startTime} - {endTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Max Players</span>
                <span className="text-slate-900 dark:text-slate-100">{maxPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Venue</span>
                <span className="text-slate-900 dark:text-slate-100 text-right max-w-[60%] truncate">
                  {location?.venueName}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}