import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { T } from '@/lib/theme';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
        <ActivityIndicator color={T.accent} />
      </View>
    );
  }
  return isSignedIn ? <Redirect href="/(tabs)" /> : <Redirect href="/welcome" />;
}
