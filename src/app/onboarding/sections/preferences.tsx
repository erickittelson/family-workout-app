"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Calendar, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SectionProps } from "./types";

// Major cities for quick selection
const POPULAR_CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "San Francisco",
  "Seattle",
  "Denver",
  "Austin",
  "Boston",
  "Miami",
  "Atlanta",
  "Dallas",
  "San Diego",
  "Portland",
];

const DURATION_STYLES = [
  { 
    id: "quick", 
    label: "Quick Sessions", 
    description: "15-30 min focused workouts",
    emoji: "⚡",
    avgDuration: 20,
  },
  { 
    id: "standard", 
    label: "Standard", 
    description: "45-60 min balanced sessions",
    emoji: "💪",
    avgDuration: 50,
  },
  { 
    id: "extended", 
    label: "Extended", 
    description: "75-90+ min deep training",
    emoji: "🔥",
    avgDuration: 80,
  },
  { 
    id: "varies", 
    label: "It Varies", 
    description: "Mix of short & long sessions, two-a-days",
    emoji: "🔄",
    avgDuration: 60,
  },
];

const DAYS = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
];

export function PreferencesSection({ data, onUpdate, onNext }: SectionProps) {
  const [step, setStep] = useState<"duration" | "days" | "city">("duration");
  const [durationStyle, setDurationStyle] = useState(
    data.workoutDuration 
      ? data.workoutDuration <= 30 ? "quick" 
        : data.workoutDuration <= 60 ? "standard" 
        : data.workoutDuration <= 90 ? "extended" 
        : "varies"
      : ""
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(data.workoutDays || []);
  const [city, setCity] = useState(data.city || "");
  const [citySearch, setCitySearch] = useState("");

  const filteredCities = useMemo(() => {
    if (!citySearch) return POPULAR_CITIES;
    const query = citySearch.toLowerCase();
    return POPULAR_CITIES.filter((c) => c.toLowerCase().includes(query));
  }, [citySearch]);

  const handleDurationSelect = (id: string) => {
    setDurationStyle(id);
    const style = DURATION_STYLES.find(s => s.id === id);
    if (style) {
      onUpdate({ workoutDuration: style.avgDuration });
    }
  };

  const handleDurationContinue = () => {
    if (durationStyle) {
      setStep("days");
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleDaysContinue = () => {
    onUpdate({ workoutDays: selectedDays });
    setStep("city");
  };

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setCitySearch("");
  };

  const handleContinue = () => {
    const finalCity = city.trim() || citySearch.trim();
    if (finalCity) {
      onUpdate({ city: finalCity });
    }
    onNext();
  };

  const handleSkipCity = () => {
    onNext();
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-md mx-auto w-full">
        {step === "duration" && (
          <motion.div
            key="duration"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              How long are your workouts?
            </h2>
            <p className="text-muted-foreground mb-6">
              Pick what fits your typical training style
            </p>

            <div className="space-y-2 mb-6">
              {DURATION_STYLES.map(({ id, label, description, emoji }) => (
                <button
                  key={id}
                  onClick={() => handleDurationSelect(id)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border-2 transition-all",
                    "flex items-center gap-3 text-left",
                    "hover:border-brand hover:bg-brand/5",
                    durationStyle === id
                      ? "border-brand bg-brand/10"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex-1">
                    <span className="font-semibold block">{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                  {durationStyle === id && (
                    <Check className="w-5 h-5 text-brand" />
                  )}
                </button>
              ))}
            </div>

            <Button
              onClick={handleDurationContinue}
              disabled={!durationStyle}
              className="w-full h-12 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}

        {step === "days" && (
          <motion.div
            key="days"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Which days work best?
            </h2>
            <p className="text-muted-foreground mb-6">
              We&apos;ll schedule your workouts on these days
            </p>

            <div className="flex justify-center gap-2 mb-6">
              {DAYS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => toggleDay(id)}
                  className={cn(
                    "relative w-12 h-12 rounded-xl border-2 transition-all",
                    "flex items-center justify-center font-medium text-sm",
                    "hover:border-brand hover:bg-brand/5",
                    selectedDays.includes(id)
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-card"
                  )}
                >
                  {label}
                  {selectedDays.includes(id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>

            <Button
              onClick={handleDaysContinue}
              disabled={selectedDays.length === 0}
              className="w-full h-12 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}

        {step === "city" && (
          <motion.div
            key="city"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-brand" />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Where are you based?
            </h2>
            <p className="text-muted-foreground mb-6">
              This helps you connect with others in your area
            </p>

            {/* City input */}
            <Input
              value={city || citySearch}
              onChange={(e) => {
                setCity("");
                setCitySearch(e.target.value);
              }}
              placeholder="Type your city..."
              className="mb-4 h-12 text-center text-lg"
            />

            {/* Quick select cities */}
            {!city && (
              <div className="space-y-2 mb-6">
                <p className="text-xs text-muted-foreground">Popular cities:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {filteredCities.slice(0, 8).map((c) => (
                    <button
                      key={c}
                      onClick={() => handleCitySelect(c)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-sm transition-all",
                        "hover:border-brand hover:bg-brand/5",
                        "border-border bg-card"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected city display */}
            {city && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-brand/10 border border-brand/20 mb-6"
              >
                <MapPin className="w-4 h-4 text-brand" />
                <span className="font-medium">{city}</span>
                <button
                  className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCity("");
                    setCitySearch("");
                  }}
                >
                  Change
                </button>
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleSkipCity}
                className="flex-1 h-12"
              >
                Skip for now
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!city.trim() && !citySearch.trim()}
                className="flex-1 h-12 text-lg bg-energy-gradient hover:opacity-90 rounded-xl group disabled:opacity-50"
              >
                Continue
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
