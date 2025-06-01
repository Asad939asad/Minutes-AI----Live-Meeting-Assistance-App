import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import {
  Download,
  Clock,
  Users,
  Calendar,
  Send,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeIn, fadeInFast, hoverCard } from "@/lib/animations";
import { meetingsService, Meeting } from "@/services/meetings";
import axios from "axios";

interface Message {
  speaker: string;
  content: string;
  timestamp: string;
}

interface ActionItem {
  id: string;
  content: string;
  assignee: string;
  dueDate: string;
  status: "pending" | "completed";
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function MeetingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meetingData, setMeetingData] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);  // Add this line

  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your meeting assistant. Ask me anything about the meeting.",
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Default language to translate into
  const [language, setLanguage] = useState("French");

  // Function to handle translation
  const handleTranslateMeeting = async () => {
    if (!id) return;
    setIsTranslating(true);  // Add this line
    try {
      const response = await axios.post("http://localhost:8000/translate-meeting", {
        meeting_id: Number(id),
        language: language,
      });

      // response.data is an object with:
      // {
      //   "translated_title": "...",
      //   "translated_summary": { "keyPoints": [...], "decisionsMade": [...], "nextSteps": [...] },
      //   "translated_action_items": [{ id, content, assignee, dueDate, status }, ...]
      // }
      const translatedData = response.data;

      setMeetingData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          title: translatedData.translated_title,
          summary: {
            keyPoints: translatedData.translated_summary.keyPoints || [],
            decisionsMade: translatedData.translated_summary.decisionsMade || [],
            nextSteps: translatedData.translated_summary.nextSteps || [],
          },
          action_items: translatedData.translated_action_items.map((item: any) => ({
            id: item.id,
            content: item.content,
            assignee: item.assignee,
            dueDate: item.dueDate,
            status: item.status, // keep "pending" or "completed"
          })),
        };
      });

      // Update our local actionItems state as well
      setActionItems(
        translatedData.translated_action_items.map((item: any) => ({
          id: item.id,
          content: item.content,
          assignee: item.assignee,
          dueDate: item.dueDate,
          status: item.status,
        }))
      );
    } catch (error) {
      console.error("Failed to translate meeting:", error);
    } finally {
      setIsTranslating(false);  // Add this line
    }
  };

  // Fetch meeting details on initial render
  useEffect(() => {
    if (id) {
      meetingsService
        .getMeeting(Number(id))
        .then((data: Meeting) => {
          setMeetingData(data);
          setActionItems(
            (data.action_items || []).map((item) => ({
              ...item,
              status: item.status as "pending" | "completed",
            }))
          );
          setTranscript(data.transcript || []);
          setLoading(false);
        })
        .catch((err: any) => {
          console.error(`Failed to fetch meeting with id ${id}:`, err);
          setError(true);
          setLoading(false);
        });
    } else {
      setError(true);
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <p className="text-lg">Loading meeting details...</p>
      </div>
    );
  }

  if (error || !meetingData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">
          Meeting not found
        </h2>
        <p className="text-muted-foreground">
          The meeting details you're looking for are not available.
        </p>
        <Button onClick={() => navigate("/meetings")}>Go to Meetings</Button>
      </div>
    );
  }

  const toggleActionItem = (itemId: string) => {
    setActionItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: item.status === "completed" ? "pending" : "completed",
            }
          : item
      )
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !id) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: newMessage,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setIsTyping(true);

    try {
      // Example chat endpoint call
      const response = await axios.post("http://localhost:8000/chat", {
        meeting_id: Number(id),
        question: newMessage,
      });

      // Suppose your backend returns something like: { "Response": "Assistant's reply" }
      const data = response.data;
      const responseText = data || "No response found";

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Failed to fetch chat response:", err);
      // Optionally handle the error on the UI
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
      <div className={cn("flex justify-between items-start", fadeIn)}>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {meetingData.title}
          </h1>
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{meetingData.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{meetingData.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{meetingData.participants} participants</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className={cn(
              "gap-2 hover:scale-105 active:scale-95 transition-all duration-200",
              "hover:bg-muted"
            )}
          >
            <Download className="h-4 w-4" /> Download Recording
          </Button>

          {/* Language input + Translate button */}
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="Enter language e.g. 'French'"
              className="w-32"
            />
            <Button
              onClick={handleTranslateMeeting}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
              disabled={isTranslating}
            >
              {isTranslating ? "Translating..." : "Translate Meeting"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="chat">Chat With Meeting</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className={cn(hoverCard, fadeInFast)}>
                <CardHeader>
                  <CardTitle className="text-xl">Meeting Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="transition-all duration-200 hover:translate-x-1">
                    <h3 className="text-lg font-medium text-foreground mb-3">
                      Key Points
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      {meetingData.summary.keyPoints.map((point: string, idx: number) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="transition-all duration-200 hover:translate-x-1">
                    <h3 className="text-lg font-medium text-foreground mb-3">
                      Decisions Made
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      {meetingData.summary.decisionsMade.map((decision: string, idx: number) => (
                        <li key={idx}>{decision}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="transition-all duration-200 hover:translate-x-1">
                    <h3 className="text-lg font-medium text-foreground mb-3">
                      Next Steps
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      {meetingData.summary.nextSteps.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className={cn(hoverCard, fadeInFast, "delay-100")}>
                <CardHeader>
                  <CardTitle className="text-xl">Action Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {actionItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-lg bg-muted border group",
                          "transition-all duration-200 hover:translate-x-1",
                          "hover:shadow-md hover:bg-muted/70"
                        )}
                      >
                        <div className="flex-shrink-0 mt-1">
                          <Checkbox
                            id={item.id}
                            checked={item.status === "completed"}
                            onCheckedChange={() => toggleActionItem(item.id)}
                            className={cn(
                              "transition-all duration-200",
                              item.status === "completed"
                                ? "bg-green-500 border-green-500"
                                : "group-hover:border-yellow-400"
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <label
                            htmlFor={item.id}
                            className={cn(
                              "text-foreground font-medium mb-2 block cursor-pointer",
                              item.status === "completed" &&
                                "line-through text-muted-foreground"
                            )}
                          >
                            {item.content}
                          </label>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Assignee: {item.assignee}</span>
                            <span>Due: {item.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transcript">
          <Card className={cn(hoverCard, fadeIn)}>
            <CardHeader>
              <CardTitle className="text-xl">Meeting Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {transcript.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-4 p-4 rounded-lg",
                        "transition-all duration-200 hover:bg-muted/50",
                        "hover:translate-x-1"
                      )}
                    >
                      <div className="flex-shrink-0 w-32 text-sm text-muted-foreground">
                        {message.timestamp}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-foreground mb-1">
                          {message.speaker}
                        </div>
                        <p className="text-muted-foreground">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card className={cn(hoverCard, fadeIn)}>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" />
                Chat With Meeting Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] flex flex-col">
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-start gap-4 max-w-[80%]",
                          "animate-in fade-in duration-200",
                          message.type === "user"
                            ? "ml-auto flex-row-reverse"
                            : "mr-auto"
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
                            <span className="text-white text-sm">JD</span>
                          ) : (
                            <Bot className="h-4 w-4 text-indigo-500" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "rounded-lg p-4",
                            message.type === "user"
                              ? "bg-indigo-500 text-white"
                              : "bg-muted border"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex gap-4 max-w-[80%] mr-auto animate-in fade-in duration-200">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="rounded-lg p-4 bg-muted border">
                          <div className="flex gap-1">
                            <span
                              className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Ask anything about the meeting..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white"
                    disabled={!newMessage.trim() || isTyping}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}