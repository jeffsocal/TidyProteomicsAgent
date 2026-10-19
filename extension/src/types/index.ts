export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
  isError?: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  tool_name?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedPromptTokens?: number;
}

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  usage: TokenUsage;
  finishReason?: string;
  truncationDetected?: boolean;
}

export type LLMProviderType = "anthropic" | "gemini" | "openai" | "openrouter" | "ollama";

export interface LLMConfig {
  provider: LLMProviderType;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutSeconds?: number;
}

export type PhaseStatus = "pending" | "running" | "completed" | "failed";

export interface PhaseInfo {
  id: string;
  fileName: string;
  title: string;
  status: PhaseStatus;
  enabled: boolean;
  isMasterSetup?: boolean;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  tokenUsage?: TokenUsage;
  summary?: string;
  error?: string;
}

export interface PromptFileInfo {
  name: string;
  relPath: string;
  exists: boolean;
}

export interface FolderStatus {
  name: string;
  relPath: string;
  description: string;
  exists: boolean;
  itemCount?: number;
}

export interface PipelineState {
  workingDirectory: string;
  workspaceName?: string;
  model: string;
  provider: string;
  startTime: string;
  endTime?: string;
  isRunning?: boolean;
  isFullPipelineRunning?: boolean;
  currentPhaseIndex: number;
  phases: PhaseInfo[];
  promptFiles?: PromptFileInfo[];
  folders?: FolderStatus[];
  totalTokens: TokenUsage;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: any;
    }>;
    required: string[];
  };
}
