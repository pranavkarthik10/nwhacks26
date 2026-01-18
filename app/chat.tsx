import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HealthChart } from "@/components/HealthChart";
import { ModelSettings } from "@/components/ModelSettings";
import { processHealthQuery } from "@/utils/aiHealthTools";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  chartData?: any;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const CHAT_SESSIONS_KEY = "@health_chat_sessions";
const CURRENT_CHAT_KEY = "@health_current_chat_id";

const SUGGESTIONS = [
  { icon: "footsteps", text: "How many steps today?", color: "#FF9500" },
  { icon: "heart", text: "Show heart rate trends", color: "#FF2D55" },
  { icon: "moon", text: "How did I sleep?", color: "#5856D6" },
  { icon: "flame", text: "Calories burned today", color: "#FF3B30" },
  { icon: "trending-up", text: "Weekly activity summary", color: "#34C759" },
  { icon: "pulse", text: "Health insights", color: "#007AFF" },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey! 👋 I'm your AI health companion. Ask me anything about your health data — steps, sleep, heart rate, and more.",
  timestamp: new Date(),
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Track keyboard visibility
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardWillHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Load chat sessions on mount
  useEffect(() => {
    loadChatSessions();
  }, []);

  // Save current chat whenever messages change
  useEffect(() => {
    if (!isLoadingHistory && messages.length > 0 && currentChatId) {
      saveCurrentChat();
    }
  }, [messages, isLoadingHistory, currentChatId]);

  // Auto-scroll when messages update
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadChatSessions = async () => {
    try {
      const [sessionsJson, currentIdJson] = await Promise.all([
        AsyncStorage.getItem(CHAT_SESSIONS_KEY),
        AsyncStorage.getItem(CURRENT_CHAT_KEY),
      ]);

      let sessions: ChatSession[] = [];

      if (sessionsJson) {
        sessions = JSON.parse(sessionsJson).map((session: any) => ({
          ...session,
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        }));
        setChatSessions(sessions);
      }

      if (currentIdJson) {
        const currentSession = sessions.find((s) => s.id === currentIdJson);
        if (currentSession) {
          setMessages(currentSession.messages);
          setCurrentChatId(currentIdJson);
        } else {
          await createNewChat();
        }
      } else {
        await createNewChat();
      }
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      await createNewChat();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveCurrentChat = async () => {
    try {
      const updatedSessions = [...chatSessions];
      const sessionIndex = updatedSessions.findIndex((s) => s.id === currentChatId);

      const currentSession: ChatSession = {
        id: currentChatId,
        title: generateChatTitle(messages),
        messages,
        createdAt: sessionIndex >= 0 ? updatedSessions[sessionIndex].createdAt : new Date(),
        updatedAt: new Date(),
      };

      if (sessionIndex >= 0) {
        updatedSessions[sessionIndex] = currentSession;
      } else {
        updatedSessions.unshift(currentSession);
      }

      setChatSessions(updatedSessions);
      await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error("Error saving current chat:", error);
    }
  };

  const generateChatTitle = (msgs: Message[]): string => {
    const userMessages = msgs.filter((m) => m.role === "user");
    if (userMessages.length === 0) return "New Chat";
    const firstUserMsg = userMessages[0].content;
    return firstUserMsg.length > 35 ? firstUserMsg.substring(0, 35) + "..." : firstUserMsg;
  };

  const createNewChat = async () => {
    const newChatId = Date.now().toString();
    setCurrentChatId(newChatId);
    setMessages([WELCOME_MESSAGE]);
    await AsyncStorage.setItem(CURRENT_CHAT_KEY, newChatId);
    setShowChatHistory(false);
  };

  const switchToChat = async (chatId: string) => {
    const session = chatSessions.find((s) => s.id === chatId);
    if (session) {
      setCurrentChatId(chatId);
      setMessages(session.messages);
      await AsyncStorage.setItem(CURRENT_CHAT_KEY, chatId);
      setShowChatHistory(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    const updatedSessions = chatSessions.filter((s) => s.id !== chatId);
    setChatSessions(updatedSessions);
    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));

    if (chatId === currentChatId) {
      if (updatedSessions.length > 0) {
        await switchToChat(updatedSessions[0].id);
      } else {
        await createNewChat();
      }
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await processHealthQuery(messageText);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.text,
        chartData: response.chartData,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error processing query:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoicePress = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice input with Eleven Labs
    Alert.alert("Voice Input", "Voice input coming soon with Eleven Labs integration!");
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === "user";
    const isFirst = index === 0 || messages[index - 1].role !== message.role;

    return (
      <View key={message.id} style={[styles.messageWrapper, isUser && styles.messageWrapperUser]}>
        {!isUser && isFirst && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
          </View>
        )}
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessage : styles.assistantMessage,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={[styles.messageText, isUser && styles.userText]}>
              {message.content}
            </Text>
          </View>

          {message.chartData && !isUser && (
            <View style={styles.chartContainer}>
              <HealthChart
                type={message.chartData.type || "line"}
                data={message.chartData.data}
                title={message.chartData.title || "Health Data"}
                color={message.chartData.color}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  const showOnlyWelcome = messages.length === 1 && messages[0].id === "welcome";

  if (isLoadingHistory) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Minimal Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => setShowChatHistory(true)}
          style={styles.iconButton}
        >
          <Ionicons name="time-outline" size={26} color="#007AFF" />
          {chatSessions.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{chatSessions.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setShowModelSettings(true)} 
          style={styles.headerCenter}
          activeOpacity={0.7}
        >
          <Text style={styles.headerTitle}>Health AI</Text>
          <View style={styles.statusDot} />
          <Ionicons name="chevron-down" size={16} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity onPress={createNewChat} style={styles.iconButton}>
          <Ionicons name="add" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Model Settings Modal */}
      <ModelSettings
        visible={showModelSettings}
        onClose={() => setShowModelSettings(false)}
      />

      {/* Chat History Modal */}
      <Modal
        visible={showChatHistory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChatHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalDismiss} 
            onPress={() => setShowChatHistory(false)} 
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setShowChatHistory(false)}>
                <Ionicons name="close-circle" size={28} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
              {chatSessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyText}>No previous chats</Text>
                  <Text style={styles.emptySubtext}>Start a conversation to see it here</Text>
                </View>
              ) : (
                chatSessions.map((session, index) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.chatItem,
                      session.id === currentChatId && styles.chatItemActive,
                    ]}
                    onPress={() => switchToChat(session.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.chatItemIcon}>
                      <Ionicons 
                        name="chatbubble" 
                        size={20} 
                        color={session.id === currentChatId ? "#007AFF" : "#8E8E93"} 
                      />
                    </View>
                    <View style={styles.chatItemContent}>
                      <Text 
                        style={[
                          styles.chatItemTitle,
                          session.id === currentChatId && styles.chatItemTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {session.title}
                      </Text>
                      <Text style={styles.chatItemMeta}>
                        {new Date(session.updatedAt).toLocaleDateString()} · {session.messages.length} messages
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert("Delete Chat", "Delete this conversation?", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => deleteChat(session.id) },
                        ]);
                      }}
                      style={styles.deleteButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            showOnlyWelcome && styles.messagesContentCentered,
            { paddingBottom: 120 },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, idx) => renderMessage(msg, idx))}
          
          {isLoading && (
            <View style={styles.messageWrapper}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                </View>
              </View>
              <View style={[styles.messageContainer, styles.assistantMessage]}>
                <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions - only show on welcome screen when keyboard is closed */}
        {showOnlyWelcome && !keyboardVisible && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Try asking</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {SUGGESTIONS.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(suggestion.text)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.suggestionIcon, { backgroundColor: suggestion.color + "20" }]}>
                    <Ionicons name={suggestion.icon as any} size={16} color={suggestion.color} />
                  </View>
                  <Text style={styles.suggestionText}>{suggestion.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Input Area */}
        <View style={[styles.inputWrapper, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 16) + 80 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your health..."
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            
            <View style={styles.inputActions}>
              <TouchableOpacity
                onPress={handleVoicePress}
                style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
              >
                <Ionicons 
                  name={isRecording ? "mic" : "mic-outline"} 
                  size={22} 
                  color={isRecording ? "#fff" : "#007AFF"} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {!keyboardVisible && (
            <Text style={styles.disclaimer}>
              AI can make mistakes. Verify health information with professionals.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
    fontWeight: "500",
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F2F2F7",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 34,
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: "#E5E5EA",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.3,
  },
  chatList: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#C7C7CC",
    marginTop: 4,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    marginBottom: 8,
  },
  chatItemActive: {
    backgroundColor: "#E8F0FE",
  },
  chatItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 2,
  },
  chatItemTitleActive: {
    color: "#007AFF",
  },
  chatItemMeta: {
    fontSize: 13,
    color: "#8E8E93",
  },
  deleteButton: {
    padding: 8,
  },

  // Chat Area
  chatArea: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messagesContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  messageWrapperUser: {
    justifyContent: "flex-end",
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  messageContainer: {
    maxWidth: "75%",
  },
  userMessage: {
    alignItems: "flex-end",
  },
  assistantMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderBottomLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#1C1C1E",
  },
  userText: {
    color: "#fff",
  },
  chartContainer: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  typingDots: {
    flexDirection: "row",
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8E8E93",
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },

  // Suggestions
  suggestionsContainer: {
    paddingVertical: 12,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
    marginLeft: 20,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1C1E",
  },

  // Input
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "#F2F2F7",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1C1C1E",
    maxHeight: 100,
    paddingVertical: 10,
    paddingRight: 8,
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  voiceButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,122,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceButtonActive: {
    backgroundColor: "#FF3B30",
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  disclaimer: {
    fontSize: 11,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
});
