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
  const scrollPositions = useRef<Record<string, number>>({});
  const prevLocationRef = useRef<string>(location);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Save scroll position of previous location before navigating away
    if (prevLocationRef.current !== location && !isRestoringRef.current) {
      scrollPositions.current[prevLocationRef.current] = window.scrollY;
    }

    // Restore scroll position or scroll to top
    const savedPosition = scrollPositions.current[location];
    
    if (savedPosition !== undefined && savedPosition > 0) {
      // This page was visited before, restore scroll position
      isRestoringRef.current = true;
      
      // Use multiple animation frames to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo(0, savedPosition);
            isRestoringRef.current = false;
          }, 100);
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
