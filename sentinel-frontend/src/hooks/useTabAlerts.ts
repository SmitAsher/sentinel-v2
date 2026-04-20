import { useEffect, useRef } from 'react';

export function useTabAlerts(totalAlerts: number, organization: string) {
  const originalTitle = useRef(document.title);
  const prevAlerts = useRef(totalAlerts);

  useEffect(() => {
    if (totalAlerts > prevAlerts.current) {
      // New alert occurred
      const newCount = totalAlerts - prevAlerts.current;
      
      // Flash tab title
      document.title = `(${totalAlerts}) 🚨 CRITICAL ALERT - ${organization}`;
      
      // Flash back after 2 seconds
      const timeout = setTimeout(() => {
        document.title = `Sentinel - ${organization} Dashboard`;
      }, 2000);

      prevAlerts.current = totalAlerts;

      return () => clearTimeout(timeout);
    }
  }, [totalAlerts, organization]);

  useEffect(() => {
    // Set base title when org changes
    if (organization) {
      document.title = `Sentinel - ${organization} Dashboard`;
    } else {
      document.title = originalTitle.current;
    }
  }, [organization]);
}
