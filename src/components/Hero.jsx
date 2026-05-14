import React from 'react';
import { cn } from '@/lib/utils';

export const Hero = ({ title, subtitle, className }) => {
  return (
    <div className={cn("pg-hero", className)}>
      <div className="relative z-10">
        <h2 className="text-2xl font-extrabold text-pg-text-main tracking-tight mb-2">{title}</h2>
        <p className="text-pg-text-soft text-sm max-w-2xl leading-relaxed">{subtitle}</p>
      </div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full -mr-32 -mt-32 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-100/20 rounded-full -ml-16 -mb-16 blur-2xl" />
    </div>
  );
};
