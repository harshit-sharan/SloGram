import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageThread } from "@/components/MessageThread";

import avatar1 from "@assets/generated_images/Peaceful_woman_profile_photo_8348405c.png";
import avatar2 from "@assets/generated_images/Peaceful_man_profile_photo_581f44a8.png";

// Mock data - TODO: remove mock functionality
const mockConversations = [
  {
    id: "conv-1",
    otherUser: {
      id: "user-2",
      name: "James River",
      username: "james.slow",
      avatar: avatar2,
    },
    lastMessage: "That sounds wonderful!",
    lastMessageTime: "2m ago",
    unread: true,
  },
  {
    id: "conv-2",
    otherUser: {
      id: "user-3",
      name: "Emma Chen",
      username: "emma_mindful",
      avatar: avatar1,
    },
    lastMessage: "Let's connect tomorrow",
    lastMessageTime: "1h ago",
    unread: false,
  },
];

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const currentUserId = "user-1"; // TODO: remove mock functionality

  const selected = mockConversations.find((c) => c.id === selectedConversation);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="w-full md:w-96 border-r">
        <div className="p-4 border-b">
          <h2 className="font-serif text-xl font-semibold">Messages</h2>
        </div>
        <div className="overflow-y-auto">
          {mockConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`w-full p-4 flex items-center gap-3 hover-elevate border-b ${
                selectedConversation === conversation.id ? "bg-muted" : ""
              }`}
              data-testid={`conversation-${conversation.id}`}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={conversation.otherUser.avatar} />
                <AvatarFallback>{conversation.otherUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-serif font-semibold" data-testid={`text-name-${conversation.id}`}>
                  {conversation.otherUser.name}
                </p>
                <p className={`text-sm ${conversation.unread ? "font-semibold" : "text-muted-foreground"}`}>
                  {conversation.lastMessage}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {conversation.lastMessageTime}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 hidden md:flex flex-col">
        {selected ? (
          <MessageThread
            conversationId={selected.id}
            currentUserId={currentUserId}
            otherUser={selected.otherUser}
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
