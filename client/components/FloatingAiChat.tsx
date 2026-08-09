"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Bot } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What assignments are pending?",
  "What did I miss today?",
  "Due today?",
  "Overdue tasks?",
  "Recent announcements",
  "Upcoming deadlines",
  "Weekly summary",
];

export function FloatingAiChat() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load courses on mount
  useEffect(() => {
    if (!open) return;
    apiFetch<{ courses: Course[] }>("/courses").then((d) => setCourses(d.courses));
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize position (bottom-right)
  useEffect(() => {
    setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 680 });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, [role='button']")) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  async function handleSendMessage(text: string = input) {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiFetch<{ response: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          courseIds: selectedCourses.length > 0 ? selectedCourses : "all",
        }),
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `Error: ${err instanceof ApiError ? err.message : "Something went wrong"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg transition hover:shadow-xl dark:from-blue-600 dark:to-blue-700"
      >
        <Bot className="h-8 w-8 text-white" />
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 40,
      }}
      className="w-96"
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex flex-col gap-3 rounded-2xl bg-white/95 shadow-2xl backdrop-blur dark:bg-gray-900/95"
      >
        {/* Header */}
        <div className="cursor-move border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Classroom Assistant</h3>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setMinimized(!minimized)}
                className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {minimized ? "□" : "−"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {!minimized && (
          <>
            {/* Course Filter */}
            <div className="border-b border-gray-200 px-4 pb-3 dark:border-gray-800">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCourses([])}
                  className={`rounded-full px-2 py-1 text-xs font-medium transition ${
                    selectedCourses.length === 0
                      ? "bg-blue-500 text-white dark:bg-blue-600"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  All
                </button>
                {courses.slice(0, 3).map((course) => (
                  <button
                    key={course.id}
                    onClick={() => toggleCourse(course.id)}
                    className={`rounded-full px-2 py-1 text-xs font-medium transition ${
                      selectedCourses.includes(course.id)
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {course.name.split(" - ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="h-64 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                  <Bot className="h-6 w-6 mb-1" />
                  <p>Ask me about your assignments</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-3 py-2 text-xs ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white dark:bg-blue-600"
                          : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="mb-2 flex justify-start">
                  <div className="rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                      <div className="animation-delay-200 h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                      <div className="animation-delay-400 h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length === 0 && (
              <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-800">
                <div className="flex flex-wrap gap-1">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(q)}
                      disabled={loading}
                      className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-200 p-3 dark:border-gray-800">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask…"
                  disabled={loading}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none placeholder:text-gray-400 focus:border-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !input.trim()}
                  className="rounded-lg bg-blue-500 px-2 py-1 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}