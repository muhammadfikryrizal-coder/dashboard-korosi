import React from 'react';
import { cn } from '@/lib/utils';

export const Hero = ({ title, subtitle, className }) => {
  return (
    <div className={cn('pg-hero', className)}>
      <h2 className="text-2xl font-extrabold text-pg-text-main tracking-tight mb-2">
        {title}
      </h2>
      <p className="text-pg-text-soft text-sm max-w-2xl leading-relaxed">{subtitle}</p>
    </div>
  );
};
