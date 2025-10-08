import { createContext, useContext, useRef, useEffect, ReactNode, useState } from 'react';
import { useLocation } from 'wouter';

interface NavigationContextType {
  previousLocation: string;
}

const NavigationContext = createContext<NavigationContextType>({
  previousLocation: '/',
});

export function useNavigation() {
  return useContext(NavigationContext);
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const previousLocationRef = useRef<string>('/');

  useEffect(() => {
    // Only update the previous location reference when navigating to a non-moment page
    // This way, when viewing moments, we remember where we came from
    if (!location.startsWith('/moment/')) {
      previousLocationRef.current = location;
    }
  }, [location]);

  return (
    <NavigationContext.Provider value={{ previousLocation: previousLocationRef.current }}>
      {children}
    </NavigationContext.Provider>
  );
}
