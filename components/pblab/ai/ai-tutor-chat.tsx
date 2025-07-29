"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Send, MessageCircle, User, Bot, RotateCcw } from "lucide-react";
import { getAiTutorHistory, type AiConversationMessage } from "@/lib/actions/ai";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AiTutorChatProps {
  projectId: string;
  className?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  isAi: boolean;
  userName: string;
  timestamp: string;
}

export function AiTutorChat({ projectId, className }: AiTutorChatProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial conversation history
  useEffect(() => {
    const loadInitialMessages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getAiTutorHistory({
          projectId,
          offset: 0,
          limit: 10
        });

        if (result.success) {
          const chatMessages: ChatMessage[] = result.data.map((msg: AiConversationMessage) => ({
            id: msg.id,
            content: msg.message,
            isAi: msg.is_ai,
            userName: msg.user_name,
            timestamp: new Date(msg.created_at).toLocaleString()
          }));

          setMessages(chatMessages);
          setOffset(chatMessages.length);
          setHasMoreMessages(chatMessages.length === 10);
        } else {
          setError(result.error || "Failed to load conversation history");
        }
      } catch (err) {
        console.error("Error loading messages:", err);
        setError("Failed to load conversation history");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialMessages();
  }, [projectId]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Helper function to refresh messages
  const refreshMessages = useCallback(async () => {
    try {
      const result = await getAiTutorHistory({
        projectId,
        offset: 0,
        limit: 10
      });

      if (result.success) {
        const chatMessages: ChatMessage[] = result.data.map((msg: AiConversationMessage) => ({
          id: msg.id,
          content: msg.message,
          isAi: msg.is_ai,
          userName: msg.user_name,
          timestamp: new Date(msg.created_at).toLocaleString()
        }));
        
        setMessages(chatMessages);
        setOffset(chatMessages.length);
        setHasMoreMessages(chatMessages.length === 10);
      }
    } catch (err) {
      console.error("Error refreshing messages:", err);
    }
  }, [projectId]);

  // Supabase broadcast channel for real-time chat sharing
  useEffect(() => {
    const supabase = createClient();
    
    // Create unique channel name to avoid conflicts
    const channelName = `project_${projectId}_ai_tutor`;
    
    // Subscribe to broadcast messages for this project
    const channel = supabase
      .channel(channelName)
      .on(
        'broadcast',
        { event: 'new_ai_usage' },
        ({ payload }) => {
          // Only refresh if it's for our project
          if (payload.projectId === projectId) {
            refreshMessages();
          }
        }
      )
      .on(
        'system',
        { event: 'error' },
        (error) => {
          console.error('[RT] channel error:', error);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [projectId, refreshMessages]);

  const loadMessages = async (newOffset: number, isInitial: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAiTutorHistory({
        projectId,
        offset: newOffset,
        limit: 10
      });

      if (result.success) {
        const chatMessages: ChatMessage[] = result.data.map((msg: AiConversationMessage) => ({
          id: msg.id,
          content: msg.message,
          isAi: msg.is_ai,
          userName: msg.user_name,
          timestamp: new Date(msg.created_at).toLocaleString()
        }));

        if (isInitial) {
          setMessages(chatMessages);
          setOffset(chatMessages.length);
        } else {
          // Prepend older messages
          setMessages(prev => [...chatMessages, ...prev]);
          setOffset(prev => prev + chatMessages.length);
        }

        // Check if there are more messages
        setHasMoreMessages(chatMessages.length === 10);
      } else {
        setError(result.error || "Failed to load conversation history");
      }
    } catch (err) {
      console.error("Error loading messages:", err);
      setError("Failed to load conversation history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadOlderMessages = () => {
    if (!isLoading && hasMoreMessages) {
      loadMessages(offset);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isSending) return;

    const messageToSend = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    setError(null);

    try {
      // Send message to AI tutor API
      const response = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          message: messageToSend,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Manually refresh to see the new response immediately
        await refreshMessages();
      } else {
        setError(result.error || "Failed to send message");
        // Restore the message if it failed to send
        setNewMessage(messageToSend);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
      setNewMessage(messageToSend);
    } finally {
      setIsSending(false);
    }
  };


  if (isCollapsed) {
    return (
      <Card className={cn("w-12 h-fit", className)}>
        <CardContent className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="w-full h-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="mt-2 flex flex-col items-center space-y-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground writing-mode-vertical-rl text-orientation-mixed">
              AI Tutor
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-96 h-[600px] flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <Bot className="h-4 w-4 text-blue-600" />
          <span>Team Chat with AI PBL Tutor</span>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <div 
          className="flex-1 overflow-y-auto pr-2 max-h-96" 
          ref={messagesContainerRef}
        >
          <div className="space-y-4">
            {/* Load Older Messages Button */}
            {hasMoreMessages && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadOlderMessages}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {isLoading ? (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load older messages"
                  )}
                </Button>
              </div>
            )}

            {/* Messages */}
            {messages.length === 0 && !isLoading ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p>Start a conversation with your AI PBL Tutor!</p>
                <p className="text-xs mt-1">This chat is shared with your team.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex space-x-2",
                    message.isAi ? "justify-start" : "justify-start"
                  )}
                >
                  <div className="flex-shrink-0">
                    {message.isAi ? (
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Bot className="h-3 w-3 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {message.userName}
                      </span>
                      {message.isAi && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          AI
                        </Badge>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-sm p-3 rounded-lg max-w-full",
                        message.isAi
                          ? "bg-blue-50 text-blue-900 border border-blue-200"
                          : "bg-gray-50 text-gray-900"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ask your AI tutor a question..."
            className="flex-1"
            disabled={isSending}
          />
          <Button type="submit" size="sm" disabled={!newMessage.trim() || isSending}>
            {isSending ? (
              <RotateCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          This conversation is shared with your team members
        </p>
      </CardContent>
    </Card>
  );
}