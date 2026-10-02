/** Countdown display — FR-20, FR-21. Usa AnimatedNumberCountdown com NumberFlow. */
"use client";

import AnimatedNumberCountdown from "@/waitlist/components/ui/countdown-number";
import { LAUNCH_AT } from "@/waitlist/lib/launch";

const LAUNCH_DATE = new Date(LAUNCH_AT);

export default function Countdown() {
  return (
    <AnimatedNumberCountdown
      endDate={LAUNCH_DATE}
      className="my-2"
    />
  );
}