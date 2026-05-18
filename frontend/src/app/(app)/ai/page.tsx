'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Bot, User, ChevronDown, ChevronUp, Wrench, AlertCircle, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateTime } from '@/lib/utils'

interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  output?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  error?: boolean
}

const SUGGESTED_PROMPTS = [
  'What is my total portfolio value today?',
  'Which of my holdings have the best YTD performance?',
  'Show me my largest asset allocation by sector.',
  'What was my realized P&L last quarter?',
  'Generate a portfolio risk summary.',
]

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-surface-muted text-xs overflow-hidden">
      <button
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-border/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Toggle tool call: ${toolCall.name}`}
      >
        <Wrench className="size-3 text-brand-gold flex-shrink-0" aria-hidden="true" />
        <span className="font-mono font-medium text-text-secondary flex-1 text-left">
          {toolCall.name}
        </span>
        {expanded ? (
          <ChevronUp className="size-3 text-text-muted" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3 text-text-muted" aria-hidden="true" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Input</p>
            <pre className="font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.output && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Output</p>
              <pre className="font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap break-all">
                {toolCall.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'size-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          isUser ? 'bg-brand-primary' : 'bg-surface-muted border border-border'
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="size-4 text-text-inverse" />
        ) : (
          <Bot className="size-4 text-brand-gold" />
        )}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-2 max-w-[78%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-card px-4 py-3 text-sm',
            isUser
              ? 'bg-brand-primary text-text-inverse rounded-tr-sm'
              : 'bg-surface border border-border text-text-primary rounded-tl-sm',
            message.error && 'bg-danger-bg border-danger/30 text-danger'
          )}
          role="article"
          aria-label={isUser ? 'Your message' : 'AI response'}
        >
          {message.error && (
            <div className="flex items-center gap-2 mb-2 text-danger text-xs font-medium">
              <AlertCircle className="size-3.5" aria-hidden="true" />
              Error generating response
            </div>
          )}
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-1" aria-label="AI is thinking">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-brand-gold animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )}
          {message.isStreaming && message.content && (
            <span
              className="inline-block size-0.5 w-2 h-4 bg-current ml-0.5 animate-pulse"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full space-y-1.5">
            {message.toolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-text-muted px-1">
          {formatDateTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  )
}

let messageCounter = 0

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your OldMoney AI Copilot. I have access to your complete portfolio data and can help you analyze performance, identify trends, and answer questions about your wealth. What would you like to explore today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const conversationId = useRef<string | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      const userMessage: Message = {
        id: `msg-${++messageCounter}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      }

      const assistantId = `msg-${++messageCounter}`
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setInput('')
      setIsLoading(true)

      try {
        // Simulate streaming response (replace with actual SSE in production)
        const mockResponses = [
          `Based on your portfolio data, here's what I found:\n\n`,
          `Your total AUM as of today is **$2.45M**, `,
          `which represents a **+8.27% YTD return**. `,
          `\n\nYour top performing holding is **Apple (AAPL)** at +32.57% unrealized gain, `,
          `followed by **Microsoft (MSFT)** at +37.13%.\n\n`,
          `Your equity allocation is 50% of total portfolio value, which is within your target range. `,
          `Would you like me to drill deeper into any specific area?`,
        ]

        let accumulated = ''
        for (const chunk of mockResponses) {
          await new Promise<void>((resolve) => setTimeout(resolve, 80 + Math.random() * 120))
          accumulated += chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated, isStreaming: true }
                : m
            )
          )
        }

        // Simulate tool calls
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isStreaming: false,
                  toolCalls: [
                    {
                      id: 'tc-1',
                      name: 'get_portfolio_metrics',
                      input: { metric: 'aum', period: 'current' },
                      output: '{"total_aum": 2450000, "currency": "USD"}',
                    },
                    {
                      id: 'tc-2',
                      name: 'get_holdings',
                      input: { sort_by: 'unrealized_gain_pct', limit: 5 },
                      output: '[{"symbol": "MSFT", "gain_pct": 37.13}, {"symbol": "AAPL", "gain_pct": 32.57}]',
                    },
                  ],
                }
              : m
          )
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false, error: true }
              : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleReset = () => {
    conversationId.current = null
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: "Conversation reset. How can I help you analyze your portfolio?",
        timestamp: new Date(),
      },
    ])
  }

  const handlePromptSuggestion = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-surface-muted border border-border flex items-center justify-center">
            <Sparkles className="size-5 text-brand-gold" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-heading text-text-primary">AI Copilot</h1>
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success inline-block" aria-hidden="true" />
              <p className="text-xs text-text-muted">Connected · Claude-powered</p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          aria-label="Start new conversation"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          New Chat
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation history"
        >
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts (shown when minimal messages) */}
        {messages.length <= 2 && !isLoading && (
          <div className="px-4 pb-3 border-t border-border pt-3">
            <p className="text-xs font-medium text-text-muted mb-2">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptSuggestion(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-muted text-text-secondary hover:bg-border hover:text-text-primary transition-colors duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio... (⌘+Enter to send)"
                rows={1}
                disabled={isLoading}
                className={cn(
                  'w-full rounded-button border border-border bg-surface px-4 py-2.5 text-sm text-text-primary',
                  'placeholder:text-text-muted resize-none transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:border-brand-primary',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'min-h-[40px] max-h-[120px]'
                )}
                style={{
                  height: 'auto',
                  overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
                aria-label="Message input"
                aria-multiline="true"
              />
            </div>
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              loading={isLoading}
              size="icon"
              className="flex-shrink-0 h-10 w-10"
              aria-label="Send message"
            >
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <p className="text-[10px] text-text-muted mt-2 pl-1">
            AI responses are based on your portfolio data. Always verify important financial decisions.
          </p>
        </div>
      </Card>
    </div>
  )
}
