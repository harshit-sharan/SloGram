import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useInfiniteQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

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

interface MessagesResponse {
  messages: Message[];
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

  // Fetch messages with infinite query (reverse pagination)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<MessagesResponse>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: async ({ pageParam }) => {
      const url = `/api/conversations/${conversationId}/messages?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined;
      // Use the oldest message's createdAt as the cursor
      return lastPage.messages[lastPage.messages.length - 1].createdAt;
    },
    initialPageParam: undefined,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Flatten and reverse messages (oldest first at top)
  const messages = data?.pages.flatMap(page => page.messages).reverse() || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  // Initial scroll to bottom when first messages load
  useEffect(() => {
    if (messages.length > 0 && shouldScrollToBottom) {
      setTimeout(() => scrollToBottom(), 0);
      setShouldScrollToBottom(false);
    }
  }, [messages.length, shouldScrollToBottom]);

  // Auto-focus input when autoFocus prop is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Delay focus slightly to ensure component is fully mounted
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  // Refetch messages when receiving WebSocket messages for this conversation
  useEffect(() => {
    if (lastMessage?.type === "message" && lastMessage.message?.conversationId === conversationId) {
      // Refetch to get the new message
      refetch();
      
      // Scroll to bottom to show new message
      setTimeout(() => scrollToBottom(), 100);
      
      // Update conversations list to show last message preview
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations-with-details", user?.id],
      });
    }
  }, [lastMessage, conversationId, user?.id, refetch]);

  // Handle scroll to load older messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop } = container;
      
      // If scrolled near top (within 100px), load more messages
      if (scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
        const previousScrollHeight = container.scrollHeight;
        
        fetchNextPage().then(() => {
          // Maintain scroll position after loading older messages
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
      type: "message",
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
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {isFetchingNextPage && (
          <div className="text-center text-sm text-muted-foreground py-2">
            Loading older messages...
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
            data-testid={`message-${msg.id}`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                msg.senderId === user?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm break-words">{msg.text}</p>
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
            placeholder="Type a message..."
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || !isConnected}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
