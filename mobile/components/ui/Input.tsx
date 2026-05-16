import { forwardRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View
} from "react-native";

import { colors, spacing, typography } from "@/lib/utils/theme";

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, onBlur, onFocus, style, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.text.tertiary}
        selectionColor={colors.brand.primary}
        {...props}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        style={[
          styles.input,
          focused && styles.focused,
          error && styles.error,
          style
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: 6
  },
  input: {
    ...typography.bodyLg,
    backgroundColor: colors.bg.tertiary,
    borderColor: colors.border.subtle,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    color: colors.text.primary,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  focused: {
    borderColor: colors.border.focus
  },
  error: {
    borderColor: colors.error
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    marginTop: 6
  }
});
