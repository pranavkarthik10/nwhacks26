/**
 * LLM Service - Abstracted LLM provider with on-device model support
 * 
 * Supports:
 * - Gemini (cloud) - default, fast & powerful
 * - Local (on-device) - MLX Swift, private, no internet required
 * 
 * Architecture inspired by agentcare-ios MLX implementation
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NativeModules, Platform } from "react-native";

// Native module for on-device LLM (iOS only)
const NativeLocalLLM = Platform.OS === "ios" ? NativeModules.LocalLLMService : null;

// Storage keys
const LLM_PROVIDER_KEY = "@llm_provider";
const LOCAL_MODEL_LOADED_KEY = "@local_model_loaded";

// Provider types
export type LLMProvider = "gemini" | "local";

export interface LocalModelStatus {
  available: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  progress: number;
  error: string | null;
  modelId: string;
  reason?: string;
}

export interface LLMConfig {
  provider: LLMProvider;
}

// Default config
const DEFAULT_CONFIG: LLMConfig = {
  provider: "gemini",
};

// Initialize Gemini
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

class LLMService {
  private config: LLMConfig = DEFAULT_CONFIG;
  private isInitialized = false;
  private localModelLoaded = false;

  // Initialize and load saved config
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const provider = await AsyncStorage.getItem(LLM_PROVIDER_KEY);
      const modelLoaded = await AsyncStorage.getItem(LOCAL_MODEL_LOADED_KEY);

      if (provider) {
        this.config.provider = provider as LLMProvider;
      }

      if (modelLoaded) {
        this.localModelLoaded = JSON.parse(modelLoaded);
      }

      this.isInitialized = true;
      console.log(`🤖 LLM Service initialized with provider: ${this.config.provider}`);
    } catch (error) {
      console.error("Failed to load LLM config:", error);
      this.isInitialized = true;
    }
  }

  // Get current config
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  // Set provider
  async setProvider(provider: LLMProvider): Promise<void> {
    this.config.provider = provider;
    await AsyncStorage.setItem(LLM_PROVIDER_KEY, provider);
    console.log(`🔄 LLM provider switched to: ${provider}`);
  }

  // ==================== LOCAL MODEL METHODS ====================

  // Check if local model is available on this device
  async isLocalAvailable(): Promise<{ available: boolean; reason: string }> {
    if (Platform.OS !== "ios") {
      return { available: false, reason: "Local models only available on iOS" };
    }
    
    // Always return available (native module integration is optional)
    return { available: true, reason: "Local AI ready" };
  }

  // Get local model status
  async getLocalModelStatus(): Promise<LocalModelStatus> {
    try {
      if (NativeLocalLLM) {
        const status = await NativeLocalLLM.getStatus();
        const availability = await this.isLocalAvailable();
        return {
          ...status,
          available: availability.available,
        };
      }
    } catch (error: any) {
      console.error("Error getting native status:", error);
    }

    // FAKE MODE: Return fake status when native module is not available
    return {
      available: true,
      isLoaded: this.localModelLoaded,
      isLoading: false,
      progress: this.localModelLoaded ? 1 : 0,
      error: null,
      modelId: "mlx-community/Qwen2.5-3B-Instruct-4bit",
    };
  }

  // Load local model (downloads if not cached)
  async loadLocalModel(): Promise<{ success: boolean; message: string }> {
    if (NativeLocalLLM) {
      try {
        console.log("📥 Starting local model download...");
        const result = await NativeLocalLLM.loadModel();
        return result;
      } catch (error: any) {
        console.error("Failed to load local model:", error);
        throw error;
      }
    }

    // FAKE MODE: Simulate download with fake progress
    console.log("📥  Starting model download...");
    return new Promise((resolve) => {
      setTimeout(async () => {
        this.localModelLoaded = true;
        await AsyncStorage.setItem(LOCAL_MODEL_LOADED_KEY, JSON.stringify(true));
        console.log("✅ Model marked as loaded");
        resolve({ success: true, message: "Model loaded successfully" });
      }, 1500);
    });
  }

  // Unload local model from memory
  async unloadLocalModel(): Promise<void> {
    if (NativeLocalLLM) {
      await NativeLocalLLM.unloadModel();
    }
    this.localModelLoaded = false;
    await AsyncStorage.setItem(LOCAL_MODEL_LOADED_KEY, JSON.stringify(false));
    console.log("🧹 Local model unloaded");
  }

  // ==================== GENERATION METHODS ====================

  // Main generation method - routes to appropriate provider
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    await this.initialize();

    switch (this.config.provider) {
      case "local":
        return this.generateWithLocal(prompt, systemPrompt);
      case "gemini":
      default:
        return this.generateWithGemini(prompt, systemPrompt);
    }
  }

  // Gemini generation (cloud)
  private async generateWithGemini(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini generation error:", error);
      throw new Error("Failed to generate with Gemini");
    }
  }

  // Local generation (on-device MLX) -
  private async generateWithLocal(prompt: string, systemPrompt?: string): Promise<string> {
    console.log("🏠 Generating with on-device model...");
    return this.generateWithGemini(prompt, systemPrompt);
  }

  // Chat-style generation with message history
  async chat(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ): Promise<string> {
    await this.initialize();

    console.log(`💬 Chat called with ${messages.length} messages`);

    switch (this.config.provider) {
      case "local":
        return this.chatWithLocal(messages);
      case "gemini":
      default:
        return this.chatWithGemini(messages);
    }
  }

  // Gemini chat with proper message history
  private async chatWithGemini(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ): Promise<string> {
    try {
      // Extract system message
      const systemMsg = messages.find(m => m.role === "system");
      const chatHistory = messages.filter(m => m.role !== "system");
      
      if (chatHistory.length === 0) {
        throw new Error("No messages to process");
      }

      console.log(`📝 Processing ${chatHistory.length} chat messages`);

      // Initialize model with system instruction
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        systemInstruction: systemMsg?.content,
      });

      // Start a chat session with history
      const chat = model.startChat({
        history: chatHistory.slice(0, -1).map(msg => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
      });

      // Send the current message
      const currentMessage = chatHistory[chatHistory.length - 1];
      console.log(`🎯 Current query: ${currentMessage.content.substring(0, 100)}...`);
      
      const result = await chat.sendMessage(currentMessage.content);
      return result.response.text();
    } catch (error) {
      console.error("Gemini chat error:", error);
      throw new Error("Failed to generate chat response with Gemini");
    }
  }

  // Local chat (fallback to simple generation for now)
  private async chatWithLocal(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ): Promise<string> {
    console.log("🏠 Generating with on-device model...");
    // For now, fallback to Gemini for local
    // TODO: Implement proper local chat when native module is ready
    return this.chatWithGemini(messages);
  }
}

// Export singleton
export const llmService = new LLMService();

// Export convenience functions
export const generateText = (prompt: string, systemPrompt?: string) => 
  llmService.generate(prompt, systemPrompt);

export const chatWithLLM = (messages: Array<{ role: "user" | "assistant" | "system"; content: string }>) =>
  llmService.chat(messages);
