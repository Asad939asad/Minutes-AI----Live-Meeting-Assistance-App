import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn } from "@/lib/animations";
import axios from "axios";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIManager() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: newMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);

    try {
      const response = await axios.post('http://localhost:8000/generate-sql', {
        prompt: newMessage
      });

      let assistantContent = '';
      if (response.data.success) {
        assistantContent = `Query: ${response.data.query}\n\n`;
        if (response.data.results) {
          assistantContent += `Results: ${JSON.stringify(response.data.results, null, 2)}`;
        } else {
          assistantContent += response.data.message;
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-8">
      <div className={cn("flex justify-between items-center", fadeIn)}>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AI Assistant</h1>
          <p className="text-muted-foreground text-lg">Chat with your AI assistant</p>
        </div>
      </div>

      <Card className={cn(fadeIn)}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-500" />
            Chat with AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex flex-col">
            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start gap-4 max-w-[80%]",
                      "animate-in fade-in duration-200",
                      message.type === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.type === "user"
                          ? "bg-indigo-500"
                          : "bg-indigo-500/10"
                      )}
                    >
                      {message.type === "user" ? (
                        <span className="text-white text-sm">U</span>
                      ) : (
                        <Bot className="h-4 w-4 text-indigo-500" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "rounded-lg p-4",
                        message.type === "user"
                          ? "bg-indigo-500 text-white"
                          : "bg-muted"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bot className="h-4 w-4" />
                    <span>AI is typing...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}