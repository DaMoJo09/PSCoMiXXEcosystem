import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trackPageVisit } from '../lib/analytics';

export const useAnalytics = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      trackPageVisit(location);
      prevLocationRef.current = location;
    }
  }, [location]);
};
