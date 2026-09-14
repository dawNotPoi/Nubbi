import { MessageSquarePlus, Trash2, X } from "lucide-react-native";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "../../components/controls";
import { colors } from "../../theme";
import type { ConversationSummary } from "../../types";
import { chatStyles as styles } from "./styles";

/** 历史对话抽屉：列出会话，支持选中切换、新建与删除。 */
export const HistoryModal = ({
  conversations,
  open,
  onClose,
  onRemove,
  onSelect,
}: {
  conversations: ConversationSummary[];
  open: boolean;
  onClose: () => void;
  onRemove: (conversation: ConversationSummary) => void;
  onSelect: (id?: string) => void;
}) => (
  <Modal animationType="slide" onRequestClose={onClose} visible={open}>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>历史对话</Text>
        <IconButton icon={<X color={colors.text} size={22} />} label="关闭" onPress={onClose} />
      </View>
      <Pressable style={styles.newConversation} onPress={() => onSelect()}>
        <MessageSquarePlus color={colors.primary} size={19} />
        <Text style={styles.newConversationText}>新建对话</Text>
      </Pressable>
      <FlatList
        contentContainerStyle={styles.historyList}
        data={conversations}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyHistory}>暂无历史对话</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.historyItem} onPress={() => onSelect(item.id)}>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={styles.historyTitle}>{item.title}</Text>
              <Text style={styles.historyDate}>{new Date(item.updatedAt).toLocaleString()}</Text>
            </View>
            <IconButton icon={<Trash2 color={colors.danger} size={18} />} label={`删除 ${item.title}`} onPress={() => onRemove(item)} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  </Modal>
);
