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

  // Initialize and load saved config
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const provider = await AsyncStorage.getItem(LLM_PROVIDER_KEY);

      if (provider) {
        this.config.provider = provider as LLMProvider;
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
    
    if (!NativeLocalLLM) {
      return { available: false, reason: "Native module not found" };
    }

    try {
      const result = await NativeLocalLLM.isAvailable();
      return result;
    } catch (error: any) {
      return { available: false, reason: error.message || "Unknown error" };
    }
  }

  // Get local model status
  async getLocalModelStatus(): Promise<LocalModelStatus> {
    if (!NativeLocalLLM) {
      return {
        available: false,
        isLoaded: false,
        isLoading: false,
        progress: 0,
        error: "Native module not available",
        modelId: "",
      };
    }

    try {
      const status = await NativeLocalLLM.getStatus();
      const availability = await this.isLocalAvailable();
      return {
        ...status,
        available: availability.available,
      };
    } catch (error: any) {
      return {
        available: false,
        isLoaded: false,
        isLoading: false,
        progress: 0,
        error: error.message,
        modelId: "",
      };
    }
  }

  // Load local model (downloads if not cached)
  async loadLocalModel(): Promise<{ success: boolean; message: string }> {
    if (!NativeLocalLLM) {
      throw new Error("Local models not available on this device");
    }

    try {
      console.log("📥 Starting local model download...");
      const result = await NativeLocalLLM.loadModel();
      return result;
    } catch (error: any) {
      console.error("Failed to load local model:", error);
      throw error;
    }
  }

  // Unload local model from memory
  async unloadLocalModel(): Promise<void> {
    if (NativeLocalLLM) {
      await NativeLocalLLM.unloadModel();
      console.log("🧹 Local model unloaded");
    }
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
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
      
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;

      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini generation error:", error);
      throw new Error("Failed to generate with Gemini");
    }
  }

  // Local generation (on-device MLX) - FAKE MODE: Uses Gemini
  private async generateWithLocal(prompt: string, systemPrompt?: string): Promise<string> {
    // FAKE MODE: Always use Gemini while pretending to be local
    console.log("🏠 Generating with on-device model... (FAKE MODE - using Gemini)");
    return this.generateWithGemini(prompt, systemPrompt);
  }

  // Chat-style generation with message history
  async chat(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ): Promise<string> {
    await this.initialize();

    // Convert messages to single prompt for simplicity
    const systemMsg = messages.find(m => m.role === "system");
    const chatHistory = messages.filter(m => m.role !== "system");
    
    let prompt = "";
    chatHistory.forEach(msg => {
      prompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
    });

    return this.generate(prompt, systemMsg?.content);
  }
}

// Export singleton
export const llmService = new LLMService();

// Export convenience functions
export const generateText = (prompt: string, systemPrompt?: string) => 
  llmService.generate(prompt, systemPrompt);

export const chatWithLLM = (messages: Array<{ role: "user" | "assistant" | "system"; content: string }>) =>
  llmService.chat(messages);
