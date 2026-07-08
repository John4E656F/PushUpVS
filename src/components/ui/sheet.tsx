import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { T, wfontDisplay } from '@/lib/theme';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
};

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      translateY.setValue(60);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [open, translateY, opacity]);

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity }} />
        </Pressable>
        <Animated.View
          style={{
            backgroundColor: T.surface,
            borderTopLeftRadius: 26, borderTopRightRadius: 26,
            borderWidth: 1, borderColor: T.line, borderBottomWidth: 0,
            paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18 + T.safeBottom,
            transform: [{ translateY }],
          }}
        >
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: T.line2, alignSelf: 'center', marginBottom: 14 }} />
          {title && (
            <Text style={{ fontFamily: wfontDisplay(600), fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5, color: T.text, marginBottom: 12 }}>
              {title}
            </Text>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
