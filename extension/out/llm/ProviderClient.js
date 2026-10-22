"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderClient = void 0;
class ProviderClient {
    config;
    constructor(config) {
        this.config = config;
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    getTimeoutSeconds() {
        return this.config.timeoutSeconds && this.config.timeoutSeconds > 0
            ? this.config.timeoutSeconds
            : 600;
    }
    getTimeoutMs() {
        return this.getTimeoutSeconds() * 1000;
    }
    async chat(params) {
        switch (this.config.provider) {
            case "anthropic":
                return this.chatAnthropic(params);
            case "gemini":
                return this.chatGemini(params);
            case "openrouter":
                return this.chatOpenRouter(params);
            case "ollama":
                return this.chatOllama(params);
            case "openai":
            default:
                return this.chatOpenAI(params);
        }
    }
    /**
     * Anthropic Messages API with native Prompt Caching enabled on the static system prompt!
     */
    async chatAnthropic(params) {
        const url = "https://api.anthropic.com/v1/messages";
        // Format tools for Anthropic
        const anthropicTools = params.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters,
        }));
        // Convert messages to Anthropic format
        const rawAnthropic = [];
        let i = 0;
        while (i < params.messages.length) {
            const msg = params.messages[i];
            if (msg.role === "system") {
                i++;
                continue; // system prompt passed in top-level system parameter
            }
            if (msg.role === "tool") {
                const toolResults = [];
                while (i < params.messages.length && params.messages[i].role === "tool") {
                    const tm = params.messages[i];
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: tm.tool_call_id,
                        content: tm.content,
                    });
                    i++;
                }
                rawAnthropic.push({
                    role: "user",
                    content: toolResults,
                });
                continue;
            }
            else if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
                const contentBlocks = [];
                if (msg.content) {
                    contentBlocks.push({ type: "text", text: msg.content });
                }
                for (const tc of msg.tool_calls) {
                    contentBlocks.push({
                        type: "tool_use",
                        id: tc.id,
                        name: tc.name,
                        input: tc.args,
                    });
                }
                rawAnthropic.push({ role: "assistant", content: contentBlocks });
            }
            else {
                rawAnthropic.push({
                    role: msg.role === "assistant" ? "assistant" : "user",
                    content: msg.content,
                });
            }
            i++;
        }
        // Anthropic strictly requires alternating roles: merge any consecutive messages with the same role
        const anthropicMessages = [];
        for (const m of rawAnthropic) {
            const last = anthropicMessages[anthropicMessages.length - 1];
            if (last && last.role === m.role) {
                const lastBlocks = Array.isArray(last.content) ? last.content : [{ type: "text", text: String(last.content) }];
                const currBlocks = Array.isArray(m.content) ? m.content : [{ type: "text", text: String(m.content) }];
                last.content = [...lastBlocks, ...currBlocks];
            }
            else {
                anthropicMessages.push(m);
            }
        }
        // Anthropic requires the first message to have role "user"
        while (anthropicMessages.length > 0 && anthropicMessages[0].role === "assistant") {
            anthropicMessages.shift();
        }
        if (anthropicMessages.length === 0) {
            anthropicMessages.push({ role: "user", content: "Hello" });
        }
        // System prompt with cache_control enabled on the massive static block
        const systemPayload = [
            {
                type: "text",
                text: params.system,
                cache_control: { type: "ephemeral" },
            },
        ];
        const maxTokens = this.config.maxTokens || 16384;
        const body = {
            model: this.config.model || "claude-3-7-sonnet-20250219",
            max_tokens: maxTokens,
            temperature: this.config.temperature ?? 0.2,
            system: systemPayload,
            messages: anthropicMessages,
            tools: anthropicTools,
        };
        const timeoutSeconds = this.getTimeoutSeconds();
        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.config.apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-beta": "prompt-caching-2024-07-31",
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(this.getTimeoutMs()),
            });
        }
        catch (err) {
            if (err.name === "TimeoutError" || (err.message && err.message.includes("timeout"))) {
                throw new Error(`Anthropic API request timed out after ${timeoutSeconds}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`);
            }
            throw err;
        }
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Anthropic API error (${res.status}): ${errText}`);
        }
        const data = await res.json();
        let textContent = "";
        const toolCalls = [];
        for (const block of data.content || []) {
            if (block.type === "text") {
                textContent += block.text;
                if (params.onToken)
                    params.onToken(block.text);
            }
            else if (block.type === "tool_use") {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    args: block.input || {},
                });
            }
        }
        const stopReason = data.stop_reason;
        const isTruncated = stopReason === "max_tokens";
        if (isTruncated) {
            console.warn(`[ProviderClient] Anthropic generation cut off: hit max_tokens limit (${maxTokens}).`);
        }
        const cacheRead = data.usage?.cache_read_input_tokens || 0;
        const cacheCreation = data.usage?.cache_creation_input_tokens || 0;
        const rawInput = data.usage?.input_tokens || 0;
        const completionTokens = data.usage?.output_tokens || 0;
        const promptTokens = rawInput + cacheRead + cacheCreation;
        const totalTokens = promptTokens + completionTokens;
        const usage = {
            promptTokens,
            completionTokens,
            totalTokens,
            cachedPromptTokens: cacheRead,
        };
        return {
            content: textContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            usage,
            finishReason: stopReason,
            truncationDetected: isTruncated,
        };
    }
    /**
     * Google Gemini API implementation
     */
    async chatGemini(params) {
        const model = this.config.model || "gemini-1.5-pro";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;
        // Convert tools to Gemini function declarations
        const geminiTools = [
            {
                functionDeclarations: params.tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                })),
            },
        ];
        // Format Gemini contents
        const rawContents = [];
        let j = 0;
        while (j < params.messages.length) {
            const msg = params.messages[j];
            if (msg.role === "system") {
                j++;
                continue;
            }
            if (msg.role === "tool") {
                const functionParts = [];
                while (j < params.messages.length && params.messages[j].role === "tool") {
                    const tm = params.messages[j];
                    functionParts.push({
                        functionResponse: {
                            name: tm.tool_name || tm.tool_call_id || "tool_result",
                            response: { output: tm.content },
                        },
                    });
                    j++;
                }
                rawContents.push({ role: "user", parts: functionParts });
                continue;
            }
            else if (msg.role === "assistant" && msg.tool_calls) {
                const parts = [];
                if (msg.content)
                    parts.push({ text: msg.content });
                for (const tc of msg.tool_calls) {
                    parts.push({
                        functionCall: {
                            name: tc.name,
                            args: tc.args,
                        },
                    });
                }
                rawContents.push({ role: "model", parts });
            }
            else {
                rawContents.push({
                    role: msg.role === "assistant" ? "model" : "user",
                    parts: [{ text: msg.content }],
                });
            }
            j++;
        }
        // Gemini requires alternating roles: consolidate consecutive turns with identical roles
        const contents = [];
        for (const c of rawContents) {
            const last = contents[contents.length - 1];
            if (last && last.role === c.role) {
                last.parts.push(...c.parts);
            }
            else {
                contents.push(c);
            }
        }
        // Gemini requires the first content to have role "user"
        while (contents.length > 0 && contents[0].role === "model") {
            contents.shift();
        }
        if (contents.length === 0) {
            contents.push({ role: "user", parts: [{ text: "Hello" }] });
        }
        const maxTokens = this.config.maxTokens || 16384;
        const body = {
            systemInstruction: {
                parts: [{ text: params.system }],
            },
            contents,
            tools: geminiTools,
            generationConfig: {
                temperature: this.config.temperature ?? 0.2,
                maxOutputTokens: maxTokens,
            },
        };
        const timeoutSeconds = this.getTimeoutSeconds();
        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(this.getTimeoutMs()),
            });
        }
        catch (err) {
            if (err.name === "TimeoutError" || (err.message && err.message.includes("timeout"))) {
                throw new Error(`Gemini API request timed out after ${timeoutSeconds}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`);
            }
            throw err;
        }
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API error (${res.status}): ${errText}`);
        }
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const isTruncated = finishReason === "MAX_TOKENS";
        if (isTruncated) {
            console.warn(`[ProviderClient] Gemini generation cut off: hit MAX_TOKENS limit (${maxTokens}).`);
        }
        let textContent = "";
        const toolCalls = [];
        for (const part of candidate?.content?.parts || []) {
            if (part.text) {
                textContent += part.text;
                if (params.onToken)
                    params.onToken(part.text);
            }
            if (part.functionCall) {
                toolCalls.push({
                    id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    name: part.functionCall.name,
                    args: part.functionCall.args || {},
                });
            }
        }
        const promptTokens = data.usageMetadata?.promptTokenCount || 0;
        const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
        const cachedPromptTokens = data.usageMetadata?.cachedContentTokenCount || 0;
        const totalTokens = data.usageMetadata?.totalTokenCount ?? (promptTokens + completionTokens);
        const usage = {
            promptTokens,
            completionTokens,
            totalTokens,
            cachedPromptTokens,
        };
        return {
            content: textContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            usage,
            finishReason,
            truncationDetected: isTruncated,
        };
    }
    /**
     * OpenAI / Compatible API implementation
     */
    async chatOpenAI(params) {
        const baseUrl = this.config.baseUrl || "https://api.openai.com/v1";
        const url = `${baseUrl}/chat/completions`;
        const openAiTools = params.tools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
        const formattedMessages = [{ role: "system", content: params.system }];
        for (const msg of params.messages) {
            if (msg.role === "tool") {
                formattedMessages.push({
                    role: "tool",
                    tool_call_id: msg.tool_call_id,
                    content: msg.content,
                });
            }
            else if (msg.role === "assistant" && msg.tool_calls) {
                formattedMessages.push({
                    role: "assistant",
                    content: msg.content || null,
                    tool_calls: msg.tool_calls.map((tc) => ({
                        id: tc.id,
                        type: "function",
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.args),
                        },
                    })),
                });
            }
            else {
                formattedMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }
        const maxTokens = this.config.maxTokens || 16384;
        const body = {
            model: this.config.model || "gpt-4o",
            messages: formattedMessages,
            tools: openAiTools.length > 0 ? openAiTools : undefined,
            temperature: this.config.temperature ?? 0.2,
            max_tokens: maxTokens,
        };
        const timeoutSeconds = this.getTimeoutSeconds();
        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(this.getTimeoutMs()),
            });
        }
        catch (err) {
            if (err.name === "TimeoutError" || (err.message && err.message.includes("timeout"))) {
                throw new Error(`OpenAI API request timed out after ${timeoutSeconds}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`);
            }
            throw err;
        }
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenAI API error (${res.status}): ${errText}`);
        }
        const data = await res.json();
        const message = data.choices?.[0]?.message;
        const finishReason = data.choices?.[0]?.finish_reason;
        const isTruncated = finishReason === "length" || finishReason === "max_tokens";
        const textContent = message?.content || "";
        if (textContent && params.onToken) {
            params.onToken(textContent);
        }
        const toolCalls = [];
        for (const tc of message?.tool_calls || []) {
            try {
                toolCalls.push({
                    id: tc.id,
                    name: tc.function.name,
                    args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {},
                });
            }
            catch (err) {
                console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
                if (isTruncated) {
                    console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}". Tool call JSON was incomplete.`);
                }
            }
        }
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const cachedPromptTokens = data.usage?.prompt_tokens_details?.cached_tokens || 0;
        const totalTokens = data.usage?.total_tokens ?? (promptTokens + completionTokens);
        const usage = {
            promptTokens,
            completionTokens,
            totalTokens,
            cachedPromptTokens,
        };
        return {
            content: textContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            usage,
            finishReason,
            truncationDetected: isTruncated,
        };
    }
    /**
     * OpenRouter API implementation (Unified gateway for Claude, DeepSeek, Llama, Qwen, etc.)
     */
    async chatOpenRouter(params) {
        const baseUrl = (this.config.baseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
        const url = `${baseUrl}/chat/completions`;
        const openAiTools = params.tools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
        const formattedMessages = [{ role: "system", content: params.system }];
        for (const msg of params.messages) {
            if (msg.role === "tool") {
                formattedMessages.push({
                    role: "tool",
                    tool_call_id: msg.tool_call_id,
                    content: msg.content,
                });
            }
            else if (msg.role === "assistant" && msg.tool_calls) {
                formattedMessages.push({
                    role: "assistant",
                    content: msg.content || null,
                    tool_calls: msg.tool_calls.map((tc) => ({
                        id: tc.id,
                        type: "function",
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.args),
                        },
                    })),
                });
            }
            else {
                formattedMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }
        const maxTokens = this.config.maxTokens || 32768;
        const body = {
            model: this.config.model || "anthropic/claude-3.7-sonnet",
            messages: formattedMessages,
            tools: openAiTools.length > 0 ? openAiTools : undefined,
            temperature: this.config.temperature ?? 0.2,
            max_tokens: maxTokens,
        };
        const timeoutSeconds = this.getTimeoutSeconds();
        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.config.apiKey}`,
                    "HTTP-Referer": "https://github.com/tidyproteomicsagent",
                    "X-Title": "TidyProteomicsAgent",
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(this.getTimeoutMs()),
            });
        }
        catch (err) {
            if (err.name === "TimeoutError" || (err.message && err.message.includes("timeout"))) {
                throw new Error(`OpenRouter API request timed out after ${timeoutSeconds}s. Increase Request Timeout in settings if running large models or heavy synthesis turns.`);
            }
            throw err;
        }
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
        }
        const data = await res.json();
        const message = data.choices?.[0]?.message;
        const finishReason = data.choices?.[0]?.finish_reason;
        const isTruncated = finishReason === "length" || finishReason === "max_tokens";
        const textContent = message?.content || "";
        if (textContent && params.onToken) {
            params.onToken(textContent);
        }
        const toolCalls = [];
        for (const tc of message?.tool_calls || []) {
            try {
                toolCalls.push({
                    id: tc.id,
                    name: tc.function.name,
                    args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {},
                });
            }
            catch (err) {
                console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
                if (isTruncated) {
                    console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}". Tool call JSON was incomplete.`);
                }
            }
        }
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const cachedPromptTokens = data.usage?.prompt_tokens_details?.cached_tokens ??
            data.usage?.cache_read_input_tokens ??
            0;
        const totalTokens = data.usage?.total_tokens ?? (promptTokens + completionTokens);
        const usage = {
            promptTokens,
            completionTokens,
            totalTokens,
            cachedPromptTokens,
        };
        return {
            content: textContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            usage,
            finishReason,
            truncationDetected: isTruncated,
        };
    }
    /**
     * Remote Hosted Ollama API implementation (OpenAI-compatible endpoint with function calling)
     */
    async chatOllama(params) {
        let baseUrl = (this.config.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
        if (!baseUrl.endsWith("/v1")) {
            baseUrl += "/v1";
        }
        const url = `${baseUrl}/chat/completions`;
        const openAiTools = params.tools.map((t) => ({
            type: "function",
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            },
        }));
        const formattedMessages = [{ role: "system", content: params.system }];
        for (const msg of params.messages) {
            if (msg.role === "tool") {
                formattedMessages.push({
                    role: "tool",
                    tool_call_id: msg.tool_call_id,
                    content: msg.content,
                });
            }
            else if (msg.role === "assistant" && msg.tool_calls) {
                formattedMessages.push({
                    role: "assistant",
                    content: msg.content || null,
                    tool_calls: msg.tool_calls.map((tc) => ({
                        id: tc.id,
                        type: "function",
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify(tc.args),
                        },
                    })),
                });
            }
            else {
                formattedMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }
        const maxTokens = this.config.maxTokens || 16384;
        const body = {
            model: this.config.model || "llama3.3:70b",
            messages: formattedMessages,
            tools: openAiTools.length > 0 ? openAiTools : undefined,
            temperature: this.config.temperature ?? 0.2,
            max_tokens: maxTokens,
            options: {
                num_predict: maxTokens,
            },
            stream: false,
        };
        const headers = {
            "Content-Type": "application/json",
        };
        // If remote Ollama is authenticated or behind an auth proxy
        if (this.config.apiKey) {
            headers["Authorization"] = `Bearer ${this.config.apiKey}`;
        }
        const timeoutSeconds = this.getTimeoutSeconds();
        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(this.getTimeoutMs()),
            });
        }
        catch (err) {
            if (err.name === "TimeoutError" || (err.message && err.message.includes("timeout"))) {
                throw new Error(`Remote Ollama API request timed out after ${timeoutSeconds}s at ${url}. For local/remote 70B models, increase Request Timeout in settings.`);
            }
            throw err;
        }
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Remote Ollama API error at ${url} (${res.status}): ${errText}`);
        }
        const data = await res.json();
        const message = data.choices?.[0]?.message;
        const finishReason = data.choices?.[0]?.finish_reason || data.done_reason;
        const isTruncated = finishReason === "length";
        const textContent = message?.content || "";
        if (textContent && params.onToken) {
            params.onToken(textContent);
        }
        const toolCalls = [];
        for (const tc of message?.tool_calls || []) {
            try {
                toolCalls.push({
                    id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    name: tc.function.name,
                    args: typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments || {},
                });
            }
            catch (err) {
                console.error(`[ProviderClient] Failed to parse tool call arguments for ${tc.function?.name}:`, err);
                if (isTruncated) {
                    console.error(`[ProviderClient] Output truncated at max_tokens (${maxTokens}) with finish_reason="${finishReason}".`);
                }
            }
        }
        // Extract usage metrics (OpenAI format or native Ollama stats)
        const promptTokens = data.usage?.prompt_tokens ?? data.prompt_eval_count ?? 0;
        const completionTokens = data.usage?.completion_tokens ?? data.eval_count ?? 0;
        const totalTokens = data.usage?.total_tokens ?? (promptTokens + completionTokens);
        const usage = {
            promptTokens,
            completionTokens,
            totalTokens,
            cachedPromptTokens: 0,
        };
        return {
            content: textContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            usage,
            finishReason,
            truncationDetected: isTruncated,
        };
    }
}
exports.ProviderClient = ProviderClient;
//# sourceMappingURL=ProviderClient.js.map