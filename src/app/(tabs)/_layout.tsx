import { useEffect } from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

import { TabBar } from '@/components/tab-bar';
import { useStore } from '@/lib/store';

export default function TabsLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const refresh = useStore((s) => s.refresh);
  const entitled = useStore((s) => s.entitled);
  const usingServer = useStore((s) => s.usingServer);

  useEffect(() => {
    if (isSignedIn) refresh(getToken).catch(() => {});
  }, [isSignedIn, refresh, getToken]);

  // Trial expired and no active plan → the paywall takes over.
  useEffect(() => {
    if (usingServer && !entitled) router.push('/paywall');
  }, [usingServer, entitled, router]);

  if (isLoaded && !isSignedIn) return <Redirect href="/welcome" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...(props as any)} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
