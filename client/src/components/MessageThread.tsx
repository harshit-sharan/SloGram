import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useInfiniteQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

interface MessageThreadProps {
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  autoFocus?: boolean;
}

interface NotesResponse {
  notes: Message[];
  hasMore: boolean;
}

export function MessageThread({ conversationId, otherUser, autoFocus = false }: MessageThreadProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const { isConnected, lastMessage, sendMessage } = useWebSocket();

  // Fetch notes with infinite query (reverse pagination)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<NotesResponse>({
    queryKey: ["/api/conversations", conversationId, "notes"],
    queryFn: async ({ pageParam }) => {
      const url = `/api/conversations/${conversationId}/messages?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.notes.length === 0) return undefined;
      // Use the oldest note's createdAt as the cursor
      return lastPage.notes[lastPage.notes.length - 1].createdAt;
    },
    initialPageParam: undefined,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Flatten and reverse notes (oldest first at top)
  const notes = data?.pages.flatMap(page => page.notes).reverse() || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  // Initial scroll to bottom when first notes load
  useEffect(() => {
    if (notes.length > 0 && shouldScrollToBottom) {
      setTimeout(() => scrollToBottom(), 0);
      setShouldScrollToBottom(false);
    }
  }, [notes.length, shouldScrollToBottom]);

  // Auto-focus input when autoFocus prop is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Delay focus slightly to ensure component is fully mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, conversationId]);

  // Mark notes as read when conversation is opened
  useEffect(() => {
    const markAsRead = async () => {
      try {
        await apiRequest("POST", `/api/conversations/${conversationId}/mark-read`, {});
        // Invalidate unread count and conversations list
        queryClient.invalidateQueries({
          queryKey: ["/api/notes", user?.id, "unread-count"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations-with-details", user?.id],
        });
      } catch (error) {
        console.error("Failed to mark notes as read:", error);
      }
    };

    if (conversationId && user?.id) {
      markAsRead();
    }
  }, [conversationId, user?.id]);

  // Refetch notes when receiving WebSocket notes for this conversation
  useEffect(() => {
    if (lastMessage?.type === "note" && lastMessage.message?.conversationId === conversationId) {
      // Refetch to get the new note
      refetch();
      
      // Scroll to bottom to show new note
      setTimeout(() => scrollToBottom(), 100);
      
      // Update conversations list to show last note preview
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations-with-details", user?.id],
      });
    }
  }, [lastMessage, conversationId, user?.id, refetch]);

  // Handle scroll to load older notes
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop } = container;
      
      // If scrolled near top (within 100px), load more notes
      if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
        const previousScrollHeight = container.scrollHeight;
        
        fetchNextPage().then(() => {
          // Maintain scroll position after loading older notes
          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeight;
            container.scrollTop = scrollTop + scrollDiff;
          });
        });
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    sendMessage({
      type: "note",
      conversationId,
      recipientId: otherUser.id,
      text: newMessage,
    });

    setNewMessage("");
    
    // Scroll to bottom after sending
    setTimeout(() => scrollToBottom(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="message-thread">
      <div className="border-b p-4 flex items-center gap-3">
        <Link href={`/space/${otherUser.id}`} className="flex items-center gap-3 hover-elevate rounded-md p-1 -m-1" data-testid="link-user-space">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser?.avatar} />
            <AvatarFallback>{otherUser?.name?.charAt(0) || otherUser?.username?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-serif font-semibold" data-testid="text-recipient-name">
              {otherUser.name}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-connection-status">
              {isConnected ? "Active now" : "Offline"}
            </p>
          </div>
        </Link>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {isFetchingNextPage && (
          <div className="text-center text-sm text-muted-foreground py-2">
            Loading older notes...
          </div>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className={`flex ${note.senderId === user?.id ? "justify-end" : "justify-start"}`}
            data-testid={`note-${note.id}`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                note.senderId === user?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm break-words">{note.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a note..."
            className="flex-1"
            data-testid="input-note"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || !isConnected}
            data-testid="button-send-note"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
