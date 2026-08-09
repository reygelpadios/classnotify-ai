"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What assignments do I still need to submit?",
  "What tasks have I missed?",
  "Which assignments are due today?",
  "What are my overdue assignments?",
  "Show me recent announcements",
  "What should I prioritize today?",
  "Which course has the most pending work?",
];

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load courses on mount
  useEffect(() => {
    apiFetch<{ courses: Course[] }>("/courses")
      .then((d) => setCourses(d.courses))
      .finally(() => setLoadingCourses(false));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
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

  const selectAllCourses = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(courses.map((c) => c.id));
    }
  };

  return (
    <div className="flex h-screen flex-col gap-4 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Classroom Assistant</h2>

        {/* Course Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={selectAllCourses}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selectedCourses.length === 0
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            All Courses
          </button>
          {loadingCourses ? (
            <span className="text-xs text-gray-400">Loading courses…</span>
          ) : (
            courses.map((course) => (
              <button
                key={course.id}
                onClick={() => toggleCourse(course.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedCourses.includes(course.id)
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {course.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="text-4xl">🎓</div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Classroom Assistant</h3>
            <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Ask me about your assignments, deadlines, announcements, or what you should focus on today.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white dark:bg-blue-600"
                    : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className="text-xs opacity-70">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="mb-4 flex justify-start">
            <div className="rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                <div className="animation-delay-200 h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                <div className="animation-delay-400 h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(question)}
                disabled={loading}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask me anything about your assignments…"
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
