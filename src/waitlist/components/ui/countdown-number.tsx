"use client";

import React, { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";

const MotionNumberFlow = motion.create(NumberFlow);

interface CountdownProps {
  endDate: Date;
  startDate?: Date;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function AnimatedNumberCountdown({
  endDate,
  startDate,
  className,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const start = startDate ? new Date(startDate) : new Date();
      const end = new Date(endDate);
      const difference = end.getTime() - start.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endDate, startDate]);

  const units: { key: keyof TimeLeft; label: string }[] = [
    { key: "days", label: "Dias" },
    { key: "hours", label: "Horas" },
    { key: "minutes", label: "Minutos" },
    { key: "seconds", label: "Segundos" },
  ];

  return (
    <div className={`flex items-center justify-center gap-3 sm:gap-5 ${className ?? ""}`}>
      {units.map(({ key, label }, i) => (
        <React.Fragment key={key}>
          {i > 0 && (
            <span className="mb-5 text-xl font-bold text-brand-orange/60 sm:text-2xl">
              :
            </span>
          )}
          <div className="flex flex-col items-center">
            <MotionNumberFlow
              value={timeLeft[key]}
              className="text-4xl font-extrabold tracking-tighter text-brand-white sm:text-5xl"
              format={{ minimumIntegerDigits: 2 }}
            />
            <span className="mt-1 text-[11px] font-medium uppercase tracking-widest text-brand-white/40">
              {label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
