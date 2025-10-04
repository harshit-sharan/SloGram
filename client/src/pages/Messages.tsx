import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageThread } from "@/components/MessageThread";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
}

export default function Messages() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useQuery<ConversationWithUser[]>({
    queryKey: ["/api/conversations-with-details", user?.id],
    enabled: !!user,
  });

  const selected = conversations.find((c) => c.conversation.id === selectedConversation);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="w-full md:w-96 border-r">
        <div className="p-4 border-b">
          <h2 className="font-serif text-xl font-semibold">Messages</h2>
        </div>
        <div className="overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map(({ conversation, otherUser, lastMessage }) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`w-full p-4 flex items-center gap-3 hover-elevate border-b ${
                  selectedConversation === conversation.id ? "bg-muted" : ""
                }`}
                data-testid={`conversation-${conversation.id}`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={otherUser.avatar} />
                  <AvatarFallback>{otherUser.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-serif font-semibold" data-testid={`text-name-${conversation.id}`}>
                    {otherUser.displayName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lastMessage?.text || "No messages yet"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {lastMessage && new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 hidden md:flex flex-col">
        {selected && user ? (
          <MessageThread
            conversationId={selected.conversation.id}
            currentUserId={user.id}
            otherUser={{
              id: selected.otherUser.id,
              name: selected.otherUser.displayName || selected.otherUser.username,
              username: selected.otherUser.username,
              avatar: selected.otherUser.avatar,
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4" />
              <p className="font-serif text-xl">Select a conversation</p>
              <p className="text-sm">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
