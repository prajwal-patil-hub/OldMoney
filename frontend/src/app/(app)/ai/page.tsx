'use client'

import * as React from 'react'
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react'
import { ArrowUp, ChevronDown, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useAIStatus,
  type AIConversation,
} from '@/lib/hooks/useAI'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function groupConversationsByTime(conversations: AIConversation[]) {
  const now = Date.now()
  const DAY = 86_400_000

  const groups: { label: string; items: AIConversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Older', items: [] },
  ]

  for (const c of conversations) {
    const age = now - new Date(c.created_at).getTime()
    if (age < DAY) groups[0].items.push(c)
    else if (age < 2 * DAY) groups[1].items.push(c)
    else if (age < 7 * DAY) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter((g) => g.items.length > 0)
}

// ─── ToolCallBlock ─────────────────────────────────────────────────────────────

function ToolCallBlock({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()

  return (
    <div className="mb-2 rounded bg-surface-muted border border-border text-xs overflow-hidden">
      <button
        type="button"
        className="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-surface-inset transition-colors duration-fast text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={id}
      >
        <span className="text-text-muted flex-1 font-mono truncate">
          Used: {toolCall.name}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-text-muted shrink-0 transition-transform duration-fast',
            expanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div id={id} className="border-t border-border p-2 bg-surface-inset">
          <p className="text-text-muted mb-1 uppercase tracking-wider text-[10px]">Arguments</p>
          <pre className="font-mono text-text-secondary whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex flex-col',
          isUser ? 'items-end max-w-[70%] ml-auto' : 'items-start max-w-[80%]'
        )}
      >
        {/* Tool calls (AI only, above content) */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full mb-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBlock key={i} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-brand-subtle border border-brand-muted rounded-xl rounded-tr-sm text-text-primary'
              : 'bg-surface border border-border rounded-xl rounded-tl-sm text-text-primary shadow-xs'
          )}
          role="article"
        >
          {message.isStreaming && !message.content ? (
            <span className="flex items-center gap-1" aria-label="AI is thinking">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-accent-text inline-block animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                  aria-hidden="true"
                />
              ))}
            </span>
          ) : (
            <span className="whitespace-pre-wrap">
              {message.content}
              {message.isStreaming && (
                <span
                  className="inline-block w-[2px] h-[1em] bg-current ml-0.5 align-middle animate-pulse"
                  aria-hidden="true"
                />
              )}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <time
          className={cn(
            'text-2xs text-text-muted mt-1',
            isUser ? 'text-right' : 'text-left'
          )}
          dateTime={message.timestamp.toISOString()}
        >
          {formatDate(message.timestamp, 'HH:mm')}
        </time>
      </div>
    </div>
  )
}

// ─── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "What's my total portfolio value?",
  'Show my top 10 holdings by value',
  'How has my portfolio performed this month?',
  "What's my technology sector exposure?",
] as const

// ─── Page ─────────────────────────────────────────────────────────────────────

let msgSeq = 0

export default function AIPage() {
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data: conversations } = useConversations()
  const { data: aiStatus } = useAIStatus()
  const createConversation = useCreateConversation()
  const deleteConversation = useDeleteConversation()

  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-resize textarea
  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 20
    const maxRows = 6
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * maxRows + 16)}px`
  }

  function appendToLastMessage(delta: string) {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return [
        ...prev.slice(0, -1),
        { ...last, content: last.content + delta },
      ]
    })
  }

  const sendMessage = useCallback(
    async (content: string) => {
      const text = content.trim()
      if (!text || isStreaming) return

      // Ensure conversation exists
      let convId = activeConvId
      if (!convId) {
        try {
          const conv = await createConversation.mutateAsync({
            title: text.slice(0, 60),
          })
          convId = conv.id
          setActiveConvId(conv.id)
        } catch {
          setStreamError('Failed to create conversation.')
          return
        }
      }

      // Add user message
      const userId = `u-${++msgSeq}`
      const assistantId = `a-${++msgSeq}`
      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', content: text, timestamp: new Date() },
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true },
      ])
      setInputValue('')
      setIsStreaming(true)
      setStreamError(null)

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
        const response = await fetch(
          `${apiUrl}/api/v1/ai/conversations/${convId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: text }),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw || raw === '[DONE]') continue
            try {
              const data = JSON.parse(raw) as {
                type: 'delta' | 'done' | 'error' | 'tool_call'
                content?: string
                message?: string
                tool_call?: ToolCall
              }
              if (data.type === 'delta' && data.content) {
                appendToLastMessage(data.content)
              }
              if (data.type === 'tool_call' && data.tool_call) {
                setMessages((prev) => {
                  const last = prev[prev.length - 1]
                  if (!last || last.role !== 'assistant') return prev
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...last,
                      toolCalls: [...(last.toolCalls ?? []), data.tool_call!],
                    },
                  ]
                })
              }
              if (data.type === 'done') {
                setMessages((prev) => {
                  const last = prev[prev.length - 1]
                  if (!last) return prev
                  return [...prev.slice(0, -1), { ...last, isStreaming: false }]
                })
                setIsStreaming(false)
              }
              if (data.type === 'error') {
                setStreamError(data.message ?? 'An error occurred.')
                setIsStreaming(false)
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed.'
        setStreamError(msg)
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (!last) return prev
          return [
            ...prev.slice(0, -1),
            { ...last, isStreaming: false, content: last.content || 'Failed to get a response.' },
          ]
        })
      } finally {
        setIsStreaming(false)
      }
    },
    [activeConvId, accessToken, isStreaming, createConversation]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  function handleNewChat() {
    setActiveConvId(null)
    setMessages([])
    setStreamError(null)
  }

  async function handleDeleteConversation(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await deleteConversation.mutateAsync(id)
    if (activeConvId === id) {
      handleNewChat()
    }
  }

  function handleSelectConversation(conv: AIConversation) {
    setActiveConvId(conv.id)
    setMessages([]) // would load messages here in full impl
    setStreamError(null)
  }

  const grouped = groupConversationsByTime(conversations ?? [])
  const isEmpty = messages.length === 0

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface overflow-hidden">
        {/* Header */}
        <div className="px-3 pt-4 pb-2">
          <p className="text-sm font-semibold text-text-primary mb-2">AI Copilot</p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-1.5"
            onClick={handleNewChat}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            New Chat
          </Button>
        </div>

        {/* Conversation list */}
        <nav
          className="flex-1 overflow-y-auto px-1 pb-2"
          aria-label="Conversations"
        >
          {grouped.length === 0 ? (
            <p className="text-xs text-text-muted px-3 pt-2">No conversations yet</p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="text-2xs text-text-muted px-3 py-1 uppercase tracking-wider font-medium">
                  {group.label}
                </p>
                {group.items.map((conv) => {
                  const isActive = conv.id === activeConvId
                  const isHovered = conv.id === hoveredConvId
                  return (
                    <div
                      key={conv.id}
                      className="relative"
                      onMouseEnter={() => setHoveredConvId(conv.id)}
                      onMouseLeave={() => setHoveredConvId(null)}
                    >
                      <button
                        type="button"
                        className={cn(
                          'flex items-center w-full h-8 px-3 rounded text-sm truncate text-left transition-colors duration-fast',
                          isActive
                            ? 'bg-brand-subtle text-brand-primary'
                            : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                        )}
                        onClick={() => handleSelectConversation(conv)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="truncate pr-5">
                          {conv.title ?? 'Untitled conversation'}
                        </span>
                      </button>
                      {isHovered && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-danger transition-colors duration-fast"
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                          aria-label="Delete conversation"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </nav>

        {/* AI status */}
        <div className="px-3 pb-4 border-t border-border pt-3">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'size-1.5 rounded-full shrink-0',
                aiStatus?.is_available ? 'bg-success' : 'bg-danger'
              )}
              aria-hidden="true"
            />
            <span className="text-xs text-text-muted truncate">
              {aiStatus?.is_available ? 'Ollama connected' : 'Offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main chat area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Message area */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {isEmpty ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center text-center">
              <span
                className="text-3xl text-accent-text mb-4 select-none leading-none"
                aria-hidden="true"
              >
                ✦
              </span>
              <h2 className="font-display text-xl text-text-primary tracking-tight mb-2">
                What would you like to know?
              </h2>
              <p className="text-sm text-text-muted mb-8">
                Ask about your portfolios, holdings, or performance
              </p>

              {/* Suggested prompts 2×2 grid */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="border border-border rounded-lg p-3 hover:bg-surface-muted transition-colors duration-fast text-sm text-text-secondary text-left leading-snug"
                    onClick={() => {
                      setInputValue(prompt)
                      textareaRef.current?.focus()
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          )}
          <div ref={scrollAnchorRef} />
        </div>

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="px-6 py-1.5 bg-surface border-t border-border flex items-center gap-2">
            <span className="flex items-center gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 rounded-full bg-accent-text animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </span>
            <span className="text-xs text-text-muted">OldMoney AI is thinking...</span>
          </div>
        )}

        {/* Stream error */}
        {streamError && !isStreaming && (
          <div className="px-6 py-2 bg-danger-bg border-t border-danger/20">
            <p className="text-xs text-danger-text">{streamError}</p>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border px-4 py-3 bg-surface shrink-0">
          <div className="max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                resizeTextarea()
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your portfolios..."
              rows={1}
              disabled={isStreaming}
              className={cn(
                'w-full bg-surface-inset rounded-lg px-3 py-2.5 text-sm text-text-primary',
                'placeholder:text-text-placeholder resize-none',
                'border border-border',
                'focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-transparent',
                'transition-[border-color,box-shadow] duration-fast',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'min-h-[40px]'
              )}
              aria-label="Message input"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-muted">Ctrl + Enter to send</span>
              <Button
                type="button"
                size="icon-sm"
                className="size-8"
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isStreaming}
                aria-label="Send message"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
