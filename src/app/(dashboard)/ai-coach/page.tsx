"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Send,
  Loader2,
  User,
  Sparkles,
  Target,
  Dumbbell,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface FamilyMember {
  id: string;
  name: string;
}

const quickPrompts = [
  {
    icon: Target,
    label: "Create milestones",
    prompt: "Help me create specific milestones to achieve my current goals. Break them down into weekly or bi-weekly targets.",
  },
  {
    icon: Dumbbell,
    label: "Recommend workout",
    prompt: "Based on my goals and recent workout history, recommend a workout for today with specific exercises, sets, reps, and weights.",
  },
  {
    icon: Lightbulb,
    label: "Training tips",
    prompt: "What are some training tips to help me improve based on my current progress and goals?",
  },
  {
    icon: RefreshCw,
    label: "Recovery advice",
    prompt: "Based on my recent workouts, what recovery strategies should I focus on?",
  },
];

export default function AICoachPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    append,
  } = useChat({
    api: "/api/ai/chat",
    body: {
      memberId: selectedMember,
    },
    onError: (error) => {
      toast.error("Failed to get AI response. Please check your API key.");
    },
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setMessages([]);
  }, [selectedMember, setMessages]);

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members");
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
        if (data.length > 0) {
          setSelectedMember(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    append({
      role: "user",
      content: prompt,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Coach
          </h1>
          <p className="text-muted-foreground">
            Get personalized fitness advice and recommendations
          </p>
        </div>
        <Select value={selectedMember} onValueChange={setSelectedMember}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedMember ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No member selected</h3>
            <p className="text-muted-foreground">
              Please add family members to use the AI Coach
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickPrompts.map((qp, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  disabled={isLoading}
                >
                  <qp.icon className="mr-2 h-4 w-4" />
                  {qp.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Chat */}
          <Card className="lg:col-span-3 flex flex-col h-[600px]">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Chat with AI Coach
              </CardTitle>
            </CardHeader>
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Hi! I&apos;m your AI fitness coach.
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    I can help you create training plans, set milestones for your
                    goals, recommend workouts, and provide personalized fitness
                    advice based on your profile.
                  </p>
                  <div className="mt-6">
                    <p className="text-sm text-muted-foreground mb-2">
                      Try asking me:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {["How can I hit my bench press goal?", "Create a weekly plan", "What should I work on?"].map(
                        (suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80"
                            onClick={() => handleQuickPrompt(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask about training, goals, or get recommendations..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
