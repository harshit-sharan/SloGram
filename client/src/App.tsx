import { useState, useEffect, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { Navigation } from "@/components/Navigation";
import { CreatePostModal } from "@/components/CreatePostModal";
import Feed from "@/pages/Feed";
import Explore from "@/pages/Explore";
import Profile from "@/pages/Profile";
import Messages from "@/pages/Messages";
import PostDetail from "@/pages/PostDetail";
import Notifications from "@/pages/Notifications";
import Saved from "@/pages/Saved";
import NotFound from "@/pages/not-found";

// Hook to manage scroll position restoration
function useScrollRestoration() {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  const isRestoringRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    // On first mount, check if this is a page reload
    if (!initializedRef.current) {
      initializedRef.current = true;
      
      // Check if this is a page reload (not back/forward navigation)
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const isReload = navigationEntries.length > 0 && navigationEntries[0].type === 'reload';
      
      if (isReload) {
        // Clear scroll positions on page reload
        sessionStorage.removeItem('scrollPositions');
      }
    }

    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Load scroll positions from sessionStorage
    const getScrollPositions = (): Record<string, number> => {
      const stored = sessionStorage.getItem('scrollPositions');
      return stored ? JSON.parse(stored) : {};
    };

    const saveScrollPositions = (positions: Record<string, number>) => {
      sessionStorage.setItem('scrollPositions', JSON.stringify(positions));
    };

    // Save scroll position of previous location before navigating away
    if (prevLocationRef.current !== location && !isRestoringRef.current) {
      const positions = getScrollPositions();
      positions[prevLocationRef.current] = window.scrollY;
      saveScrollPositions(positions);
    }

    // Restore scroll position or scroll to top
    const scrollPositions = getScrollPositions();
    const savedPosition = scrollPositions[location];
    
    if (savedPosition !== undefined && savedPosition > 0) {
      // This page was visited before, restore scroll position
      isRestoringRef.current = true;
      
      const restoreScroll = () => {
        let lastHeight = 0;
        let stableCount = 0;
        
        const attemptRestore = (attempts = 0) => {
          // For pages with infinite scroll, be much more patient
          // Give up after 100 attempts (10 seconds) instead of 20 attempts (2 seconds)
          if (attempts > 100) {
            isRestoringRef.current = false;
            return;
          }

          const currentHeight = document.documentElement.scrollHeight;
          const maxScroll = currentHeight - window.innerHeight;
          
          // Check if height has stabilized (hasn't changed in 3 consecutive checks)
          if (currentHeight === lastHeight) {
            stableCount++;
          } else {
            stableCount = 0;
            lastHeight = currentHeight;
          }
          
          // Restore scroll if:
          // 1. Document is tall enough to scroll to saved position AND height is stable, OR
          // 2. We've waited long enough (50+ attempts = 5 seconds) and document is reasonably tall
          const heightIsStable = stableCount >= 3;
          const isLongEnough = maxScroll >= savedPosition;
          const hasWaitedLong = attempts > 50 && maxScroll >= savedPosition * 0.8;
          
          if ((isLongEnough && heightIsStable) || hasWaitedLong) {
            window.scrollTo(0, Math.min(savedPosition, maxScroll));
            isRestoringRef.current = false;
          } else {
            // Content still loading, try again
            setTimeout(() => attemptRestore(attempts + 1), 100);
          }
        };

        attemptRestore();
      };

      // Start restoration after a brief delay to let React render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(restoreScroll, 50);
        });
      });
    } else {
      // First time visiting this page, scroll to top
      window.scrollTo(0, 0);
      isRestoringRef.current = false;
    }

    // Update previous location reference
    prevLocationRef.current = location;
  }, [location]);
}

function Router() {
  useScrollRestoration();
  
  return (
    <Switch>
      <Route path="/" component={Feed} />
      <Route path="/explore" component={Explore} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/messages" component={Messages} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/saved" component={Saved} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [createPostOpen, setCreatePostOpen] = useState(false);

  useEffect(() => {
    const handleCreatePost = () => {
      setCreatePostOpen(true);
    };

    window.addEventListener('open-create-post', handleCreatePost);
    return () => {
      window.removeEventListener('open-create-post', handleCreatePost);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <NavigationProvider>
            <div className="min-h-screen bg-background">
              <Navigation />
              <Router />
            </div>
            <CreatePostModal open={createPostOpen} onOpenChange={setCreatePostOpen} />
            <Toaster />
          </NavigationProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
