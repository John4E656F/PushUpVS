import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

import { TabBar } from '@/components/tab-bar';
import { useStore } from '@/lib/store';

export default function TabsLayout() {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const refresh = useStore((s) => s.refresh);
  const entitled = useStore((s) => s.entitled);
  const usingServer = useStore((s) => s.usingServer);
  const markEntered = useStore((s) => s.markEntered);

  // Guests included: refresh falls back to locally computed stats when
  // there's no session token or the server is unreachable.
  useEffect(() => {
    markEntered();
    refresh(getToken).catch(() => {});
  }, [isSignedIn, refresh, getToken, markEntered]);

  // Pro features locked (trial over, no plan) → offer the upgrade once.
  useEffect(() => {
    if (usingServer && !entitled) router.push('/paywall');
  }, [usingServer, entitled, router]);

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...(props as any)} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
