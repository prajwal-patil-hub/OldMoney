'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { STALE_TIME } from '@/lib/constants'

// ─── Types ──────────────────────────────────────────────────────────────────

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL'

export interface AIMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string | null
  tool_calls: unknown[] | null
  token_count: number | null
  latency_ms: number | null
  created_at: string
}

export interface AIConversation {
  id: string
  org_id: string
  user_id: string
  title: string | null
  portfolio_context_id: string | null
  provider: string
  model: string
  created_at: string
}

export interface AIConversationDetail extends AIConversation {
  messages: AIMessage[]
}

export interface AIStatus {
  provider: string
  model: string
  is_available: boolean
  latency_ms: number | null
  error: string | null
}

export interface CreateConversationInput {
  title?: string
  portfolio_context_id?: string
}

// ─── Query keys ─────────────────────────────────────────────────────────────

export const AI_QUERY_KEYS = {
  conversations: ['ai', 'conversations'] as const,
  conversation: (id: string) => ['ai', 'conversations', id] as const,
  status: ['ai', 'status'] as const,
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useConversations() {
  return useQuery({
    queryKey: AI_QUERY_KEYS.conversations,
    queryFn: async () => {
      const res = await api.get<{ data: AIConversation[] }>('/ai/conversations')
      return res.data.data
    },
    staleTime: STALE_TIME.SHORT,
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: AI_QUERY_KEYS.conversation(id),
    queryFn: async () => {
      const res = await api.get<{ data: AIConversationDetail }>(`/ai/conversations/${id}`)
      return res.data.data
    },
    staleTime: STALE_TIME.SHORT,
    enabled: !!id,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateConversationInput = {}) => {
      const res = await api.post<{ data: AIConversation }>('/ai/conversations', input)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_QUERY_KEYS.conversations })
    },
  })
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai/conversations/${id}`)
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: AI_QUERY_KEYS.conversations })
      queryClient.removeQueries({ queryKey: AI_QUERY_KEYS.conversation(id) })
    },
  })
}

export function useAIStatus() {
  return useQuery({
    queryKey: AI_QUERY_KEYS.status,
    queryFn: async () => {
      const res = await api.get<{ data: AIStatus }>('/ai/status')
      return res.data.data
    },
    staleTime: STALE_TIME.SHORT,
    retry: false,
  })
}
