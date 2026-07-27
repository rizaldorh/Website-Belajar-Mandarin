'use client';

import { useEffect, useState } from 'react';

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className="fixed left-0 top-0 z-50 h-1 w-full bg-gray-100">
      <div
        className="h-full bg-teal-500 transition-[width] duration-100"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
