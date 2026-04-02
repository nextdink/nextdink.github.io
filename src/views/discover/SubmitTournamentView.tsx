import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { LocationInput } from "@/components/ui/LocationInput";
import { useAuth } from "@/hooks/useAuth";
import { tournamentService } from "@/services/tournamentService";
import type { EventLocation } from "@/types/event.types";
import type {
  CreateTournamentData,
  TournamentFormat,
} from "@/types/tournament.types";

const FORMAT_OPTIONS: { value: TournamentFormat; label: string }[] = [
  { value: "singles", label: "Singles" },
  { value: "doubles", label: "Doubles" },
  { value: "mixed", label: "Mixed" },
  { value: "multi", label: "Multi-Format" },
];

const SKILL_LEVELS = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0", "Open"];

export function SubmitTournamentView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("doubles");
  const [skillLevels, setSkillLevels] = useState<string[]>([]);
  const [entryFee, setEntryFee] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const toggleSkillLevel = (level: string) => {
    setSkillLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  const isValid = name && startDate && location;

  const handleSubmit = async () => {
    if (!user || !isValid) return;

    setLoading(true);
    setError(null);
    try {
      const data: CreateTournamentData = {
        name,
        description: description || undefined,
        startDate: new Date(startDate + "T00:00:00"),
        endDate: new Date((endDate || startDate) + "T23:59:59"),
        venueName: location.venueName,
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        placeId: location.placeId,
        format,
        skillLevels,
        entryFee: entryFee || undefined,
        organizerName: organizerName || undefined,
        registrationUrl: registrationUrl || undefined,
        sourceUrl: sourceUrl || undefined,
      };

      await tournamentService.create(data, user.uid);
      navigate(-1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit tournament",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Submit Tournament" showBottomNav={false}>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card>
        <div className="space-y-4 p-4">
          {/* Tournament Name */}
          <Input
            label="Tournament Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Spring Classic 2025"
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                Start Date<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-600 dark:focus:border-primary-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                End Date
              </label>
              <input
                type="date"
                value={endDate || startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-600 dark:focus:border-primary-400"
              />
            </div>
          </div>

          {/* Location */}
          <LocationInput
            label="Location"
            value={location}
            onChange={setLocation}
            required
          />

          {/* Format */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              Format<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    format === opt.value
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Skill Levels */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              Skill Levels
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleSkillLevel(level)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    skillLevels.includes(level)
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tournament details, rules, prizes..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary-600 dark:focus:border-primary-400 resize-none"
            />
          </div>

          {/* Entry Fee */}
          <Input
            label="Entry Fee"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
            placeholder="$40/event"
          />

          {/* Organizer */}
          <Input
            label="Organizer Name"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
          />

          {/* Registration URL */}
          <Input
            label="Registration URL"
            value={registrationUrl}
            onChange={(e) => setRegistrationUrl(e.target.value)}
            placeholder="https://..."
          />

          {/* Source URL */}
          <Input
            label="Source URL"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
          />

          {/* Error */}
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            loading={loading}
            className="w-full"
          >
            Submit Tournament
          </Button>
        </div>
      </Card>
    </PageLayout>
  );
}
