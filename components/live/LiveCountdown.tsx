import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export interface LiveCountdownProps {
  targetTime: string | Date;
  onComplete?: () => void;
  compact?: boolean;
}

export const LiveCountdown: React.FC<LiveCountdownProps> = ({
  targetTime,
  onComplete,
  compact = false
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetTime).getTime() - Date.now();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        if (onComplete) onComplete();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetTime, onComplete]);

  if (timeLeft.isPast) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Starting any moment • Instructor connecting...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
        <Clock className="w-3.5 h-3.5 text-blue-400" />
        {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
        <span>{String(timeLeft.hours).padStart(2, '0')}:</span>
        <span>{String(timeLeft.minutes).padStart(2, '0')}:</span>
        <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 text-center my-2">
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-[#0B0F19] border border-slate-700/80 flex items-center justify-center font-mono text-xl sm:text-2xl font-extrabold text-white shadow-inner">
            {String(timeLeft.days).padStart(2, '0')}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">Days</span>
        </div>
      )}

      <div className="flex flex-col items-center">
        <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-[#0B0F19] border border-slate-700/80 flex items-center justify-center font-mono text-xl sm:text-2xl font-extrabold text-white shadow-inner">
          {String(timeLeft.hours).padStart(2, '0')}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">Hours</span>
      </div>

      <span className="text-slate-500 font-bold text-xl mb-4">:</span>

      <div className="flex flex-col items-center">
        <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-[#0B0F19] border border-slate-700/80 flex items-center justify-center font-mono text-xl sm:text-2xl font-extrabold text-white shadow-inner">
          {String(timeLeft.minutes).padStart(2, '0')}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">Mins</span>
      </div>

      <span className="text-slate-500 font-bold text-xl mb-4">:</span>

      <div className="flex flex-col items-center">
        <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-xl bg-[#0B0F19] border border-slate-700/80 flex items-center justify-center font-mono text-xl sm:text-2xl font-extrabold text-[#1F81FC] shadow-inner">
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">Secs</span>
      </div>
    </div>
  );
};

export default LiveCountdown;
