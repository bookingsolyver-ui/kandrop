"use client";

import React from "react";
import { Puzzle } from "lucide-react";

import { Badge } from "@/waitlist/components/ui/badge";
import AnimatedNumberCountdown from "@/waitlist/components/ui/countdown-number";
import { LAUNCH_AT } from "@/waitlist/lib/launch";

export const AnimatedNumberCountDownDemo = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <Badge
        variant="outline"
        className="rounded-[14px] border border-white/10 text-base text-brand-white"
      >
        <Puzzle className="mr-1.5 h-4 w-4 fill-brand-orange text-brand-orange" />
        Contagem Regressiva
      </Badge>
      <AnimatedNumberCountdown
        endDate={new Date(LAUNCH_AT)}
        className="my-4"
      />
    </div>
  );
};

export default AnimatedNumberCountDownDemo;
