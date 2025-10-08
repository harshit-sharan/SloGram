import { useState, useEffect } from "react";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageThread } from "@/components/MessageThread";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";

interface ConversationWithUser {
  conversation: {
    id: string;
    user1Id: string;
    user2Id: string;
    lastMessageAt: string;
  };
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  lastMessage?: {
    text: string;
    createdAt: string;
  };
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [autoSelectedId, setAutoSelectedId] = useState<string | null>(null);

  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useQuery<ConversationWithUser[]>({
    queryKey: ["/api/conversations-with-details", user?.id],
    enabled: !!user,
    refetchOnMount: "always",
    staleTime: 0,
    gcTime: 0,
  });

  // Auto-select conversation from URL parameter
  useEffect(() => {
    // Only run when conversations are loaded
    if (isLoading) return;

    // Use window.location.search to get query parameters (wouter's location doesn't include query string)
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("conversation");

    // Only auto-select if we have a conversation ID and haven't already auto-selected this one
    if (conversationId && conversationId !== autoSelectedId) {
      // Normalize IDs to strings for comparison
      const conversationExists = conversations.find(
        (c) => String(c.conversation.id) === conversationId,
      );

      if (conversationExists) {
        setSelectedConversation(conversationId);
        setShouldAutoFocus(true);
        setAutoSelectedId(conversationId);
      } else if (conversations.length > 0) {
        // If conversation not found but we have conversations, force a refetch
        setTimeout(() => {
          refetch();
        }, 500);
      }
    }
  }, [location, conversations, isLoading, autoSelectedId, refetch]);

  // Normalize IDs to strings for comparison
  const selected = conversations.find(
    (c) => String(c.conversation.id) === selectedConversation,
  );

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation List - Hidden on mobile when chat is selected */}
      <div
        className={`w-full md:w-96 border-r ${selectedConversation ? "hidden md:block" : "block"}`}
      >
        <div className="p-4 border-b">
          <h2 className="font-serif text-xl font-semibold">Conversations</h2>
        </div>
        <div className="overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map(
              ({ conversation, otherUser, lastMessage, unreadCount }) => (
                <button
                  key={conversation.id}
                  onClick={() => {
                    // Normalize ID to string for consistency
                    setSelectedConversation(String(conversation.id));
                    setShouldAutoFocus(false);
                  }}
                  className={`w-full p-4 flex items-center gap-3 hover-elevate border-b ${
                    String(conversation.id) === selectedConversation
                      ? "bg-muted"
                      : ""
                  } ${unreadCount > 0 ? "bg-accent/20" : ""}`}
                  data-testid={`conversation-${conversation.id}`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherUser.avatar} />
                      <AvatarFallback>
                        {otherUser.displayName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className={`font-serif ${unreadCount > 0 ? "font-bold" : "font-semibold"}`}
                      data-testid={`text-name-${conversation.id}`}
                    >
                      {otherUser.displayName}
                    </p>
                    <p
                      className={`text-sm ${unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                    >
                      {lastMessage?.text || "No notes yet"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lastMessage &&
                      new Date(lastMessage.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </div>
                </button>
              ),
            )
          )}
        </div>
      </div>

      {/* Chat Window - Shows on mobile when conversation is selected */}
      <div
        className={`flex-1 flex-col ${selectedConversation ? "flex" : "hidden md:flex"}`}
      >
        {selected ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden p-2 border-b flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
                data-testid="button-back-to-conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Link
                href={`/space/${selected.otherUser.id}`}
                className="flex items-center gap-2 hover-elevate rounded-md p-1 -m-1"
                data-testid="link-user-space-mobile"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selected.otherUser.avatar} />
                  <AvatarFallback>
                    {selected.otherUser.displayName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold">
                  {selected.otherUser.displayName}
                </span>
              </Link>
            </div>
            <MessageThread
              conversationId={selected.conversation.id}
              otherUser={{
                id: selected.otherUser.id,
                name:
                  selected.otherUser.displayName || selected.otherUser.username,
                username: selected.otherUser.username,
                avatar: selected.otherUser.avatar,
              }}
              autoFocus={shouldAutoFocus}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4" />
              <p className="font-serif text-xl">Select a conversation</p>
              <p className="text-sm">
                Choose from your existing conversations or start a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
