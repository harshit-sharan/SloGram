import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navigation } from "@/components/Navigation";
import { CreatePostModal } from "@/components/CreatePostModal";
import Feed from "@/pages/Feed";
import Profile from "@/pages/Profile";
import Messages from "@/pages/Messages";
import PostDetail from "@/pages/PostDetail";
import Notifications from "@/pages/Notifications";
import Saved from "@/pages/Saved";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Feed} />
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
