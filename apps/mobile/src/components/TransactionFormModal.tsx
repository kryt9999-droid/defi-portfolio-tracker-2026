import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  networkOptions,
  transactionActionOptions,
  type Position,
  type TransactionInput
} from "@defi/shared";
import { theme } from "../utils/theme";

interface TransactionFormModalProps {
  visible: boolean;
  positions: Position[];
  onClose: () => void;
  onSubmit: (value: TransactionInput) => Promise<void>;
}

const blankTransaction: TransactionInput = {
  position_id: null,
  network: "Ethereum",
  protocol: "",
  action: "deposit",
  asset: "",
  amount_usd: 0,
  quantity: 0,
  tx_date: new Date().toISOString().slice(0, 10),
  notes: ""
};

export function TransactionFormModal({
  visible,
  positions,
  onClose,
  onSubmit
}: TransactionFormModalProps) {
  const [form, setForm] = useState<TransactionInput>(blankTransaction);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(blankTransaction);
    }
  }, [visible]);

  const updateField = (
    field: keyof TransactionInput,
    value: string | number | null
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Add Transaction</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>Related Position</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipWrap}>
                <Pressable
                  onPress={() => updateField("position_id", null)}
                  style={[
                    styles.chip,
                    form.position_id === null && styles.chipActive
                  ]}
                >
                  <Text style={styles.chipText}>None</Text>
                </Pressable>
                {positions.map((position) => (
                  <Pressable
                    key={position.id}
                    onPress={() => updateField("position_id", position.id)}
                    style={[
                      styles.chip,
                      form.position_id === position.id && styles.chipActive
                    ]}
                  >
                    <Text style={styles.chipText}>{position.protocol}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Network</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipWrap}>
                {networkOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => updateField("network", option)}
                    style={[styles.chip, form.network === option && styles.chipActive]}
                  >
                    <Text style={styles.chipText}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Protocol</Text>
            <TextInput
              style={styles.input}
              value={form.protocol}
              onChangeText={(text) => updateField("protocol", text)}
            />

            <Text style={styles.label}>Action</Text>
            <View style={styles.chipWrap}>
              {transactionActionOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => updateField("action", option)}
                  style={[styles.chip, form.action === option && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{option}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Asset</Text>
            <TextInput
              style={styles.input}
              value={form.asset}
              onChangeText={(text) => updateField("asset", text)}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Amount (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={String(form.amount_usd)}
                  keyboardType="numeric"
                  onChangeText={(text) => updateField("amount_usd", Number(text || 0))}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={String(form.quantity ?? 0)}
                  keyboardType="numeric"
                  onChangeText={(text) => updateField("quantity", Number(text || 0))}
                />
              </View>
            </View>

            <Text style={styles.label}>Transaction Date</Text>
            <TextInput
              style={styles.input}
              value={form.tx_date}
              onChangeText={(text) => updateField("tx_date", text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              value={form.notes ?? ""}
              onChangeText={(text) => updateField("notes", text)}
              multiline
            />
          </ScrollView>
          <Pressable
            style={styles.primaryButton}
            disabled={submitting}
            onPress={async () => {
              setSubmitting(true);
              try {
                await onSubmit(form);
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "Saving..." : "Save Transaction"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end"
  },
  modal: {
    maxHeight: "88%",
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    gap: 12
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700"
  },
  link: {
    color: theme.colors.teal,
    fontWeight: "600"
  },
  formContent: {
    gap: 10,
    paddingBottom: 24
  },
  label: {
    color: theme.colors.muted,
    fontSize: 13
  },
  input: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  notes: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  chipActive: {
    backgroundColor: theme.colors.teal,
    borderColor: theme.colors.teal
  },
  chipText: {
    color: theme.colors.text
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  half: {
    flex: 1
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.teal
  },
  primaryButtonText: {
    color: "#06110D",
    fontWeight: "700"
  }
});
