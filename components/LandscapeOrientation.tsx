'use client';

import { useEffect, useState } from 'react';

export default function LandscapeOrientation() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobileDevice = window.innerWidth <= 768;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      
      setIsMobile(isMobileDevice);
      setIsPortrait(isPortraitMode && isMobileDevice);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isMobile || !isPortrait) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-[9999] flex flex-col items-center justify-center p-8 text-white">
      <div className="text-6xl mb-8 animate-bounce">📱</div>
      <h2 className="text-2xl font-bold mb-4 text-center">Please Rotate Your Device</h2>
      <p className="text-lg text-center mb-8">
        This site is optimized for landscape mode.<br />
        Please rotate your device to continue.
      </p>
      <div className="text-4xl animate-spin" style={{ animationDuration: '2s' }}>
        ↻
      </div>
    </div>
  );
}



