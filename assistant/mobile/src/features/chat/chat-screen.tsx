import { Bot, History, MessageSquarePlus, Send, Settings, Square } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "../../components/controls.tsx";
import { colors } from "../../theme.ts";
import { HistoryModal } from "../conversations/history-modal.tsx";
import { MessageView } from "./message-view.tsx";
import { chatStyles as styles } from "./styles.ts";
import { useMobileChat } from "./use-mobile-chat.ts";
import { useDefaultModel } from "./use-default-model.ts";
import { ConversationModelPicker } from "./conversation-model-picker.tsx";

/**
 * 聊天主屏：消息流、输入框与历史/设置入口。
 * @param props.baseUrl Assistant API 基础地址。
 * @param props.onOpenSettings 打开设置的回调。
 * @param props.settingsOpen 设置是否打开，用于刷新默认模型。
 * @returns 聊天主屏视图。
 */
export const ChatScreen = ({
  baseUrl,
  onOpenSettings,
  settingsOpen,
}: {
  baseUrl: string;
  onOpenSettings: () => void;
  settingsOpen: boolean;
}): React.JSX.Element => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  // 记录已展示的审批弹窗，防止同一审批重复弹出。
  const shownApproval = useRef<string | null>(null);
  const chat = useMobileChat(baseUrl);
  const defaultModel = useDefaultModel(baseUrl, settingsOpen);
  const selectedModel = chat.selectedConversation?.model ?? defaultModel.model;
  const modelBusy = chat.loading || chat.modelSaving || (chat.generating && !chat.traceRunId);

  // 新消息到达后自动滚到底部；延迟 30ms 等待布局完成。
  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 30);
    return () => clearTimeout(timer);
  }, [chat.messages]);

  // 收到工具审批请求时弹出原生 Alert，选择结果回传给服务端。
  useEffect(() => {
    if (!chat.approval || shownApproval.current === chat.approval.approvalId) return;
    const approvalId = chat.approval.approvalId;
    shownApproval.current = approvalId;
    const detail = JSON.stringify(chat.approval.arguments, null, 2);
    Alert.alert(
      `允许 ${chat.approval.server} 调用工具？`,
      `${chat.approval.tool}\n\n参数：\n${detail.slice(0, 2_000)}`,
      [
        {
          text: "拒绝",
          style: "destructive",
          onPress: () => void chat.decideApproval(false, approvalId),
        },
        { text: "允许", onPress: () => void chat.decideApproval(true, approvalId) },
      ],
      { cancelable: false },
    );
  }, [chat.approval, chat.decideApproval]);

  /**
   * 选择会话并关闭历史弹窗；不传 ID 表示新建空会话。
   * @param id 会话 ID，可空。
   * @returns 无返回值。
   */
  const select = (id?: string): void => {
    setHistoryOpen(false);
    void chat.selectConversation(id);
  };

  /**
   * 发送输入框内容并清空草稿。
   * @returns 无返回值。
   */
  const send = (): void => {
    const content = draft.trim();
    if (!content || !selectedModel || modelBusy || chat.generating) return;
    setDraft("");
    void chat.sendMessage(content, selectedModel);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.header}>
          <IconButton
            icon={<History color={colors.text} size={21} />}
            label="历史对话"
            onPress={() => setHistoryOpen(true)}
          />
          <View style={styles.headerTitle}>
            <Text numberOfLines={1} style={styles.headerTitleText}>
              {chat.selectedConversation?.title || "通用助手"}
            </Text>
            <Text style={styles.headerSubtitle}>MCP + Skills</Text>
          </View>
          <IconButton icon={<Settings color={colors.text} size={21} />} label="设置" onPress={onOpenSettings} />
          <IconButton
            icon={<MessageSquarePlus color={colors.text} size={21} />}
            label="新建对话"
            onPress={() => select()}
          />
        </View>
        {chat.loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !chat.messages.length ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Bot color={colors.primary} size={30} />
            </View>
            <Text style={styles.emptyTitle}>今天想做什么？</Text>
            <Text style={styles.emptyText}>和助手对话，按需使用 Skill 和已配置的 HTTP MCP 工具。</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" ref={scrollRef}>
            {chat.messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}
          </ScrollView>
        )}
        {chat.error ? <Text style={styles.bannerError}>{chat.error}</Text> : null}
        {!selectedModel && defaultModel.error ? <Text style={styles.bannerError}>{defaultModel.error}</Text> : null}
        <View style={styles.composerArea}>
          <ConversationModelPicker model={selectedModel} disabled={modelBusy} onSelect={chat.modelSelection.select} />
          <View style={styles.composer}>
            <TextInput
              editable={!chat.generating}
              maxLength={20_000}
              multiline
              onChangeText={setDraft}
              placeholder="给助手发送消息"
              placeholderTextColor={colors.muted}
              style={styles.composerInput}
              value={draft}
            />
            <IconButton
              disabled={!chat.generating && (!draft.trim() || !selectedModel || modelBusy)}
              icon={
                chat.generating ? (
                  <Square color={colors.primary} fill={colors.primary} size={18} />
                ) : (
                  <Send color={draft.trim() ? colors.surface : colors.muted} size={19} />
                )
              }
              label={chat.generating ? "停止生成" : "发送"}
              onPress={() => (chat.generating ? void chat.stopGeneration() : send())}
              style={chat.generating ? styles.stopButton : styles.sendButton}
            />
          </View>
          <Text style={styles.disclaimer}>AI 可能出错，请核对重要信息</Text>
        </View>
      </KeyboardAvoidingView>
      <HistoryModal
        conversations={chat.conversations}
        onClose={() => setHistoryOpen(false)}
        onRemove={chat.deleteConversation}
        onSelect={select}
        open={historyOpen}
      />
    </SafeAreaView>
  );
};
