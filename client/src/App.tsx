import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
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
  const scrollPositions = useState<Record<string, number>>(() => ({}))[0];

  useEffect(() => {
    // Save current scroll position before route changes
    const saveScrollPosition = () => {
      scrollPositions[location] = window.scrollY;
    };

    // Restore scroll position or scroll to top
    const restoreScrollPosition = () => {
      const savedPosition = scrollPositions[location];
      
      if (savedPosition !== undefined) {
        // This page was visited before, restore scroll position
        setTimeout(() => {
          window.scrollTo(0, savedPosition);
        }, 0);
      } else {
        // First time visiting this page, scroll to top
        window.scrollTo(0, 0);
      }
    };

    // Save scroll position on route change
    window.addEventListener('beforeunload', saveScrollPosition);
    
    // Restore scroll position after route change
    restoreScrollPosition();

    return () => {
      saveScrollPosition();
      window.removeEventListener('beforeunload', saveScrollPosition);
    };
  }, [location, scrollPositions]);
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
          <div className="min-h-screen bg-background">
            <Navigation />
            <Router />
          </div>
          <CreatePostModal open={createPostOpen} onOpenChange={setCreatePostOpen} />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
