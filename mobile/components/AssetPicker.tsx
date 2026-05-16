import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SUPPORTED_ASSETS, SupportedAsset } from "@/lib/utils/constants";
import { colors, spacing, typography } from "@/lib/utils/theme";

type AssetPickerProps = {
  value: SupportedAsset;
  onChange: (asset: SupportedAsset) => void;
};

export function AssetPicker({ value, onChange }: AssetPickerProps) {
  return (
    <View style={styles.wrapper}>
      {SUPPORTED_ASSETS.map((asset) => {
        const selected = value === asset;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={asset}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(asset);
            }}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={[styles.text, selected && styles.selectedText]}>{asset}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusFull,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4
  },
  option: {
    alignItems: "center",
    borderRadius: spacing.radiusFull,
    flex: 1,
    paddingVertical: 10
  },
  selected: {
    backgroundColor: colors.brand.primaryMuted
  },
  text: {
    ...typography.caption,
    color: colors.text.tertiary
  },
  selectedText: {
    color: colors.brand.primaryLight
  }
});
