import QRCodeSvg from "react-native-qrcode-svg";
import { StyleSheet, View } from "react-native";

import { colors, spacing } from "@/lib/utils/theme";

type QRCodeProps = {
  value: string;
  size?: number;
};

export function QRCode({ value, size = 220 }: QRCodeProps) {
  return (
    <View style={styles.wrapper}>
      <QRCodeSvg
        backgroundColor={colors.text.primary}
        color={colors.bg.primary}
        size={size}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.text.primary,
    borderRadius: spacing.radiusLg,
    padding: 12
  }
});
