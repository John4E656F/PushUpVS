// Trial-then-subscription paywall. The 7-day trial starts automatically on
// first sign-in (server-side). Checkout runs through Clerk Billing's hosted
// page in the browser; entitlement lands via the Clerk webhook → /v1/me.

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';

import { Btn, Icon } from '@/components/ui';
import { Scroll } from '@/components/scroll';
import { useStore } from '@/lib/store';
import { T, wfont, wfontDisplay } from '@/lib/theme';

const BILLING_URL = process.env.EXPO_PUBLIC_BILLING_URL ?? '';

const FEATURES: [string, string, string][] = [
  ['target', 'AI camera counting', 'Every rep tracked automatically'],
  ['chart', 'Full history & trends', 'Streaks, records and weekly charts'],
  ['play', 'Cloud video library', 'Record sets, review your form anywhere'],
  ['swap', 'Data exports', 'Your complete log as CSV or JSON'],
];

type PlanKey = 'annual' | 'monthly';

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const me = useStore((s) => s.me);
  const refresh = useStore((s) => s.refresh);
  const [plan, setPlan] = useState<PlanKey>('annual');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const trialDaysLeft = me
    ? Math.max(0, Math.ceil((new Date(me.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;
  const trialActive = me?.entitled === true && me.plan !== 'pro';
  const isPro = me?.plan === 'pro';

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const subscribe = async () => {
    setNotice('');
    if (!BILLING_URL) {
      setNotice('Billing is not configured yet — set EXPO_PUBLIC_BILLING_URL to your Clerk Billing page.');
      return;
    }
    setBusy(true);
    try {
      await WebBrowser.openBrowserAsync(`${BILLING_URL}?plan=${plan}`);
      // Back from the browser: pick up the new plan if checkout completed.
      await refresh(getToken);
    } finally {
      setBusy(false);
    }
  };

  const plans: [PlanKey, string, string, string, string | null][] = [
    ['annual', 'Annual', '$39.99/yr', '$3.33 / mo', 'SAVE 44%'],
    ['monthly', 'Monthly', '$5.99/mo', 'Billed monthly', null],
  ];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#0E2A1D', T.bg]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.55 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      <Scroll style={{ backgroundColor: 'transparent' }} contentStyle={{ paddingBottom: 190 }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable onPress={close} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface2, borderWidth: 1, borderColor: T.line, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} color={T.text2} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: `0px 10px 34px ${T.accentGlow}` as unknown as string }}>
            <Icon name="bodyweight" size={32} color={T.accentInk} strokeWidth={2.2} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 11, borderRadius: 999, backgroundColor: 'rgba(60,228,155,0.14)', marginBottom: 12 }}>
            <Text style={{ color: T.accent, fontSize: 12, fontFamily: wfont(700) }}>PUSHUP PRO</Text>
          </View>
          <Text style={{ fontFamily: wfontDisplay(600), fontSize: 36, lineHeight: 36, textAlign: 'center', textTransform: 'uppercase', color: T.text }}>
            {isPro ? 'You’re Pro.' : 'Keep every\nrep counted'}
          </Text>
          <Text style={{ fontSize: 15, color: T.text2, marginTop: 10, textAlign: 'center' }}>
            {isPro
              ? 'Manage your subscription from the billing portal below.'
              : trialActive
                ? `Your free trial has ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left.`
                : 'Your free trial has ended — subscribe to keep training.'}
          </Text>
        </View>

        <View style={{ marginTop: 26, gap: 14 }}>
          {FEATURES.map(([icon, title, sub]) => (
            <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(60,228,155,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size={15} color={T.accent} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: wfont(700), fontSize: 15, color: T.text }}>{title}</Text>
                <Text style={{ fontSize: 12.5, color: T.text2 }}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isPro && (
          <View style={{ marginTop: 24, gap: 10 }}>
            {plans.map(([key, label, price, sub2, badge]) => {
              const on = plan === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setPlan(key)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 18,
                    backgroundColor: on ? 'rgba(60,228,155,0.10)' : T.surface,
                    borderWidth: 1.5, borderColor: on ? T.accent : T.line,
                  }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? T.accent : T.line2, backgroundColor: on ? T.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Icon name="check" size={12} color={T.accentInk} strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: wfontDisplay(600), fontSize: 18, textTransform: 'uppercase', color: T.text }}>{label}</Text>
                      {badge && <Text style={{ fontSize: 10.5, fontFamily: wfont(700), color: T.accentInk, backgroundColor: T.accent, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6, overflow: 'hidden' }}>{badge}</Text>}
                    </View>
                    <Text style={{ fontSize: 12.5, color: T.text2, marginTop: 1 }}>{sub2}</Text>
                  </View>
                  <Text style={{ fontFamily: wfontDisplay(500), fontSize: 18, color: T.text, fontVariant: ['tabular-nums'] }}>{price}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!!notice && <Text style={{ color: T.heat, fontSize: 13.5, marginTop: 14, textAlign: 'center' }}>{notice}</Text>}
      </Scroll>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 8 }}>
        <LinearGradient colors={[T.bg, 'transparent']} locations={[0.55, 1]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <Btn variant="primary" full size="lg" iconRight="arrowR" onPress={subscribe} disabled={busy}>
          {busy ? <ActivityIndicator color={T.accentInk} /> : isPro ? 'Manage subscription' : 'Subscribe with Clerk'}
        </Btn>
        <Text style={{ textAlign: 'center', fontSize: 11.5, color: T.text3, marginTop: 9, lineHeight: 16 }}>
          {isPro
            ? 'Payments and invoices are handled securely by Clerk Billing.'
            : trialActive
              ? 'Nothing charged until your trial ends · Cancel anytime'
              : 'Secure checkout by Clerk Billing · Cancel anytime'}
        </Text>
        {trialActive && (
          <Pressable onPress={close} style={{ marginTop: 12 }}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: T.text2, fontFamily: wfont(600) }}>Keep training on my trial</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
