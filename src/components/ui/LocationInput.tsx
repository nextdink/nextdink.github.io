/// <reference types="@types/google.maps" />
import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import type { EventLocation } from '@/types/event.types';

// Declare google as global to avoid TypeScript errors
declare const google: typeof globalThis.google;

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationInputProps {
  value: EventLocation | null;
  onChange: (location: EventLocation | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

// Load Google Maps script dynamically
let googleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsLoaded) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function LocationInput({
  value,
  onChange,
  label = 'Location',
  required = false,
  error,
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value?.formattedAddress || '');
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Initialize Google Maps
  useEffect(() => {
    if (!googleApiKey) return;
    
    loadGoogleMaps(googleApiKey).then(() => {
      setIsGoogleReady(true);
    }).catch(console.error);
  }, [googleApiKey]);

  // Sync input value with external value
  const prevValueRef = useRef(value?.formattedAddress);
  if (value?.formattedAddress !== prevValueRef.current) {
    prevValueRef.current = value?.formattedAddress;
    if (value?.formattedAddress && value.formattedAddress !== inputValue) {
      setInputValue(value.formattedAddress);
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 3 || !isGoogleReady) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Use the new AutocompleteSuggestion API (no session token needed)
      const request: google.maps.places.AutocompleteRequest = {
        input: query,
      };
      
      const { suggestions: autocompleteSuggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      
      const results: PlaceResult[] = autocompleteSuggestions
        .filter((s): s is google.maps.places.AutocompleteSuggestion & { placePrediction: google.maps.places.PlacePrediction } => 
          s.placePrediction !== null
        )
        .map((s) => ({
          id: s.placePrediction.placeId,
          name: s.placePrediction.mainText?.text || '',
          address: s.placePrediction.secondaryText?.text || '',
          latitude: 0,
          longitude: 0,
        }));
      
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Places search error:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isGoogleReady]);

  const getPlaceDetails = useCallback(async (placeId: string, name: string, address: string) => {
    if (!isGoogleReady) return;

    try {
      // Use the new Place class
      const place = new google.maps.places.Place({
        id: placeId,
      });
      
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      
      if (place.location) {
        const eventLocation: EventLocation = {
          venueName: place.displayName || name,
          formattedAddress: place.formattedAddress || address,
          latitude: place.location.lat(),
          longitude: place.location.lng(),
          placeId,
        };
        setInputValue(`${eventLocation.venueName} - ${eventLocation.formattedAddress}`);
        onChange(eventLocation);
        
      }
    } catch (err) {
      console.error('Place details error:', err);
      // Fallback to basic info
      onChange({
        venueName: name,
        formattedAddress: address,
        latitude: 0,
        longitude: 0,
        placeId,
      });
      setInputValue(`${name} - ${address}`);
    }
  }, [isGoogleReady, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsManualEntry(false);
    if (value) onChange(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (newValue.length >= 3) {
      debounceRef.current = setTimeout(() => searchLocations(newValue), 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (place: PlaceResult) => {
    setSuggestions([]);
    setShowSuggestions(false);
    getPlaceDetails(place.id, place.name, place.address);
  };

  const handleClear = () => {
    setInputValue('');
    onChange(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsManualEntry(false);
    inputRef.current?.focus();
  };

  const handleManualSubmit = () => {
    if (inputValue.trim()) {
      onChange({
        venueName: inputValue.trim(),
        formattedAddress: inputValue.trim(),
        latitude: 0,
        longitude: 0,
      });
      setIsManualEntry(false);
    }
  };

  // No API key - manual entry only
  if (!googleApiKey) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><MapPin className="w-5 h-5" /></div>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleManualSubmit}
            placeholder="Enter venue name and address"
            className={`w-full h-11 pl-10 pr-10 bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-slate-100 ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
          />
        </div>
        <p className="text-xs text-amber-600">Google Maps API not configured. Using manual entry.</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"><MapPin className="w-5 h-5" /></div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search for a venue or address"
          className={`w-full h-11 pl-10 pr-10 bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-primary-600 ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
          {inputValue && !isLoading && (
            <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => handleSelectSuggestion(place)}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{place.name}</p>
                {place.address && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{place.address}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {value && value.latitude !== 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <MapPin className="w-3 h-3" /><span>Location selected</span>
        </div>
      )}

      {inputValue && !value && !isManualEntry && suggestions.length === 0 && !isLoading && (
        <button type="button" onClick={() => setIsManualEntry(true)} className="text-xs text-primary-600 hover:underline">
          Can't find your location? Enter manually
        </button>
      )}

      {isManualEntry && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Enter manually, then tap "Use this address"</p>
          <button type="button" onClick={handleManualSubmit} className="text-xs text-primary-600 hover:underline">Use this address</button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}