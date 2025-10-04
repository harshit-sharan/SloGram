import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

export function MessageThread({ conversationId, currentUserId, otherUser }: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isConnected, lastMessage, sendMessage } = useWebSocket(currentUserId);

  // Fetch messages from database - this is the single source of truth
  const { data: messages = [], refetch } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Ensure fetch on mount
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Refetch messages when receiving WebSocket messages for this conversation
  useEffect(() => {
    if (lastMessage?.type === "message" && lastMessage.message?.conversationId === conversationId) {
      // Refetch this conversation's messages
      refetch();
      
      // Update conversations list to show last message preview
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations-with-details", currentUserId],
      });
    }
  }, [lastMessage, conversationId, currentUserId, refetch]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    sendMessage({
      type: "message",
      conversationId,
      recipientId: otherUser.id,
      text: newMessage,
    });

    setNewMessage("");
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
          <AvatarImage src={otherUser.avatar} />
          <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
            data-testid={`message-${msg.id}`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                msg.senderId === currentUserId
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
