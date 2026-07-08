import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';

import { Card, Icon } from '@/components/ui';
import { Scroll } from '@/components/scroll';
import { api, ApiUnavailableError, SubscriptionRequiredError } from '@/lib/api';
import { useStore } from '@/lib/store';
import { T, wfont, wfontDisplay } from '@/lib/theme';
import { uploadFile } from '@/lib/uploads';

function Row({
  icon, label, sub, onPress, trailing, tint,
}: {
  icon: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  tint?: string;
}) {
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: T.surface3, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={tint ?? T.text2} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: wfont(600), fontSize: 15, color: tint ?? T.text }}>{label}</Text>
        {sub && <Text style={{ fontSize: 12.5, color: T.text2, marginTop: 1 }}>{sub}</Text>}
      </View>
      {trailing ?? (onPress ? <Icon name="chevR" size={17} color={T.text3} /> : null)}
    </Card>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken, signOut } = useAuth();
  const me = useStore((s) => s.me);
  const dailyGoal = useStore((s) => s.dailyGoal);
  const setDailyGoal = useStore((s) => s.setDailyGoal);
  const refresh = useStore((s) => s.refresh);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const trialDaysLeft = me
    ? Math.max(0, Math.ceil((new Date(me.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const planLabel =
    me == null
      ? 'Offline — sign-in synced when server is reachable'
      : me.plan === 'pro'
        ? 'PushUp Pro — active'
        : me.entitled
          ? `Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left`
          : 'Trial ended — subscribe to keep training';

  const changeAvatar = async () => {
    setNotice('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setAvatarBusy(true);
    try {
      const key = await uploadFile(getToken, 'avatar', result.assets[0].uri);
      await api.patchMe(getToken, { avatarKey: key });
      await refresh(getToken);
    } catch (e) {
      setNotice(
        e instanceof ApiUnavailableError
          ? 'Avatar upload needs the server — configure EXPO_PUBLIC_API_URL.'
          : e instanceof SubscriptionRequiredError
            ? 'Subscribe to upload an avatar.'
            : 'Avatar upload failed — try again.',
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  const changeGoal = (delta: number) => {
    const next = Math.min(1000, Math.max(5, dailyGoal + delta));
    if (next !== dailyGoal) setDailyGoal(getToken, next).catch(() => {});
  };

  const exportData = async (format: 'csv' | 'json') => {
    setExportBusy(true);
    setNotice('');
    try {
      const { url } = await api.export(getToken, format);
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setNotice(
        e instanceof ApiUnavailableError
          ? 'Exports need the server — configure EXPO_PUBLIC_API_URL.'
          : e instanceof SubscriptionRequiredError
            ? 'Subscribe to export your history.'
            : 'Export failed — try again.',
      );
    } finally {
      setExportBusy(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your synced history stays safe in your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const avatarUrl = me?.avatarUrl ?? user?.imageUrl;

  return (
    <Scroll bottomNav>
      <Text style={{ fontFamily: wfontDisplay(600), fontSize: 30, lineHeight: 32, textTransform: 'uppercase', color: T.text, marginTop: 6, marginBottom: 16 }}>
        You
      </Text>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={changeAvatar} disabled={avatarBusy}>
          <View style={{ width: 62, height: 62, borderRadius: 22, backgroundColor: T.surface3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarBusy ? (
              <ActivityIndicator color={T.accent} />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 62, height: 62 }} />
            ) : (
              <Icon name="user" size={28} color={T.text3} />
            )}
          </View>
          <View style={{ position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.bg }}>
            <Icon name="edit" size={12} color={T.accentInk} strokeWidth={2.4} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: wfont(700), fontSize: 17, color: T.text }}>
            {user?.fullName || me?.name || 'Pushup athlete'}
          </Text>
          <Text style={{ fontSize: 13, color: T.text2, marginTop: 2 }}>
            {user?.primaryEmailAddress?.emailAddress ?? me?.email ?? ''}
          </Text>
        </View>
      </Card>

      {!!notice && <Text style={{ color: T.heat, fontSize: 13.5, marginTop: 10 }}>{notice}</Text>}

      <Text style={{ fontFamily: wfontDisplay(600), fontSize: 16, textTransform: 'uppercase', color: T.text2, marginTop: 22, marginBottom: 8 }}>
        Training
      </Text>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: T.surface3, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="target" size={19} color={T.accent} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: wfont(600), fontSize: 15, color: T.text }}>Daily goal</Text>
          <Text style={{ fontSize: 12.5, color: T.text2, marginTop: 1 }}>{dailyGoal} pushups a day</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {[
            ['-', -5],
            ['+', +5],
          ].map(([label, delta]) => (
            <Pressable
              key={label}
              onPress={() => changeGoal(delta as number)}
              style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: T.surface3, borderWidth: 1, borderColor: T.line2, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: wfont(700), fontSize: 18, color: T.text, marginTop: -1 }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Text style={{ fontFamily: wfontDisplay(600), fontSize: 16, textTransform: 'uppercase', color: T.text2, marginTop: 22, marginBottom: 8 }}>
        Membership
      </Text>
      <Row
        icon="bolt"
        tint={me?.entitled === false ? T.heat : undefined}
        label={me?.plan === 'pro' ? 'PushUp Pro' : 'Your plan'}
        sub={planLabel}
        onPress={() => router.push('/paywall')}
      />

      <Text style={{ fontFamily: wfontDisplay(600), fontSize: 16, textTransform: 'uppercase', color: T.text2, marginTop: 22, marginBottom: 8 }}>
        Your data
      </Text>
      <View style={{ gap: 9 }}>
        <Row
          icon="chart"
          label="Export as CSV"
          sub="Spreadsheet-ready history, stored in your cloud space"
          onPress={exportBusy ? undefined : () => exportData('csv')}
          trailing={exportBusy ? <ActivityIndicator color={T.accent} /> : undefined}
        />
        <Row
          icon="swap"
          label="Export as JSON"
          sub="Full structured export of every set"
          onPress={exportBusy ? undefined : () => exportData('json')}
        />
      </View>

      <View style={{ marginTop: 22, gap: 9 }}>
        <Row icon="close" label="Sign out" tint={T.heat} onPress={confirmSignOut} />
      </View>

      <Text style={{ textAlign: 'center', fontSize: 12, color: T.text3, marginTop: 26 }}>
        PushUp v1.0.0 · every rep counted
      </Text>
    </Scroll>
  );
}
