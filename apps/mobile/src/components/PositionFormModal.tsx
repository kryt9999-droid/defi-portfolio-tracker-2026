import { useEffect, useMemo, useState } from "react";
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
  calcAutoApy,
  networkOptions,
  positionTypeOptions,
  riskOptions,
  type Position,
  type PositionInput
} from "@defi/shared";
import { theme } from "../utils/theme";

interface PositionFormModalProps {
  visible: boolean;
  initialValue?: Position | null;
  onClose: () => void;
  onSubmit: (value: PositionInput) => Promise<void>;
}

const blankPosition: PositionInput = {
  network: "Ethereum",
  protocol: "",
  type: "LP",
  assets: "",
  deposited: 0,
  current_value: 0,
  apy: 0,
  realized_yield: 0,
  entry_date: new Date().toISOString().slice(0, 10),
  risk: "medium",
  notes: ""
};

function ChipPicker({
  options,
  value,
  onChange
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          style={[styles.chip, value === option && styles.chipActive]}
        >
          <Text
            style={[
              styles.chipText,
              value === option && { color: "#06110D", fontWeight: "700" }
            ]}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PositionFormModal({
  visible,
  initialValue,
  onClose,
  onSubmit
}: PositionFormModalProps) {
  const [form, setForm] = useState<PositionInput>(blankPosition);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setForm({
        id: initialValue.id,
        network: initialValue.network,
        protocol: initialValue.protocol,
        type: initialValue.type,
        assets: initialValue.assets,
        deposited: initialValue.deposited,
        current_value: initialValue.current_value,
        apy: initialValue.apy,
        realized_yield: initialValue.realized_yield,
        entry_date: initialValue.entry_date,
        risk: initialValue.risk,
        notes: initialValue.notes ?? ""
      });
    } else {
      setForm(blankPosition);
    }
  }, [initialValue, visible]);

  const updateField = (field: keyof PositionInput, value: string | number) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const autoApy = useMemo(() => calcAutoApy(form), [form]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{initialValue ? "Edit Position" : "Add Position"}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            <Text style={styles.label}>Network</Text>
            <ChipPicker
              options={networkOptions}
              value={form.network}
              onChange={(next) => updateField("network", next)}
            />

            <Text style={styles.label}>Protocol</Text>
            <TextInput
              style={styles.input}
              value={form.protocol}
              onChangeText={(text) => updateField("protocol", text)}
            />

            <Text style={styles.label}>Type</Text>
            <ChipPicker
              options={positionTypeOptions}
              value={form.type}
              onChange={(next) => updateField("type", next)}
            />

            <Text style={styles.label}>Assets</Text>
            <TextInput
              style={styles.input}
              value={form.assets}
              onChangeText={(text) => updateField("assets", text)}
              placeholder="1.4 ETH, 800 USDC"
              placeholderTextColor={theme.colors.muted}
            />

            <FieldRow
              leftLabel="Deposited (USD)"
              leftValue={String(form.deposited)}
              onLeftChange={(text) => updateField("deposited", Number(text || 0))}
              rightLabel="Current Value (USD)"
              rightValue={String(form.current_value)}
              onRightChange={(text) => updateField("current_value", Number(text || 0))}
            />

            <FieldRow
              leftLabel="APY (%) Auto"
              leftValue={String(autoApy)}
              onLeftChange={() => undefined}
              leftEditable={false}
              rightLabel="Realized Yield (USD)"
              rightValue={String(form.realized_yield)}
              onRightChange={(text) =>
                updateField("realized_yield", Number(text || 0))
              }
            />

            <Text style={styles.label}>Entry Date</Text>
            <TextInput
              style={styles.input}
              value={form.entry_date}
              onChangeText={(text) => updateField("entry_date", text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.muted}
            />

            <Text style={styles.label}>Risk</Text>
            <ChipPicker
              options={riskOptions}
              value={form.risk}
              onChange={(next) => updateField("risk", next)}
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
                await onSubmit({
                  ...form,
                  apy: autoApy
                });
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "Saving..." : "Save Position"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function FieldRow({
  leftLabel,
  leftValue,
  onLeftChange,
  leftEditable = true,
  rightLabel,
  rightValue,
  onRightChange
}: {
  leftLabel: string;
  leftValue: string;
  onLeftChange: (text: string) => void;
  leftEditable?: boolean;
  rightLabel: string;
  rightValue: string;
  onRightChange: (text: string) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.half}>
        <Text style={styles.label}>{leftLabel}</Text>
        <TextInput
          style={styles.input}
          value={leftValue}
          editable={leftEditable}
          keyboardType="numeric"
          onChangeText={onLeftChange}
        />
      </View>
      <View style={styles.half}>
        <Text style={styles.label}>{rightLabel}</Text>
        <TextInput
          style={styles.input}
          value={rightValue}
          keyboardType="numeric"
          onChangeText={onRightChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end"
  },
  modal: {
    maxHeight: "92%",
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
    fontSize: 13,
    marginTop: 2
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
