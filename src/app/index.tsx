import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useStore } from '@/lib/store';
import { T } from '@/lib/theme';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasEntered = useStore((s) => s.hasEntered);
  // Wait for the persisted store so returning guests don't flash the welcome.
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  useEffect(() => useStore.persist.onFinishHydration(() => setHydrated(true)), []);

  if (!isLoaded || !hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
        <ActivityIndicator color={T.accent} />
      </View>
    );
  }
  return isSignedIn || hasEntered ? <Redirect href="/(tabs)" /> : <Redirect href="/welcome" />;
}
