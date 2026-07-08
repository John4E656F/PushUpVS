import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import Svg, { Path } from 'react-native-svg';

import { Btn, Icon } from '@/components/ui';
import { Scroll } from '@/components/scroll';
import { TopRow } from '@/components/top-row';
import { T, wfont, wfontDisplay } from '@/lib/theme';

function AppleGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="#000">
      <Path d="M17.05 12.7c0-2.3 1.9-3.4 2-3.45-1.1-1.6-2.8-1.82-3.4-1.84-1.45-.15-2.83.85-3.56.85-.74 0-1.86-.83-3.06-.81-1.57.02-3.02.91-3.83 2.32-1.64 2.84-.42 7.04 1.17 9.34.78 1.13 1.7 2.39 2.91 2.34 1.17-.05 1.61-.75 3.02-.75s1.81.75 3.05.73c1.26-.02 2.06-1.14 2.83-2.28.9-1.31 1.27-2.58 1.29-2.64-.03-.01-2.47-.95-2.5-3.76M14.7 5.6c.64-.78 1.08-1.86.96-2.94-.93.04-2.05.62-2.72 1.39-.6.69-1.12 1.79-.98 2.85 1.04.08 2.1-.53 2.74-1.3" />
    </Svg>
  );
}

function GoogleGlyph() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.5 12.2c0-.7-.06-1.4-.18-2H12v3.8h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8" />
      <Path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .65-2.3 1-3.8 1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23" />
      <Path fill="#FBBC05" d="M5.7 14c-.25-.7-.4-1.5-.4-2.3s.15-1.6.4-2.3V6.6H2a11 11 0 0 0 0 9.9z" />
      <Path fill="#EA4335" d="M12 5.4c1.6 0 3 .55 4.2 1.6l3-3C17.5 2.2 15 1.2 12 1.2A11 11 0 0 0 2 6.6L5.7 9.4C6.6 6.8 9.1 5.4 12 5.4" />
    </Svg>
  );
}

function fieldStyle() {
  return {
    borderRadius: 16, borderWidth: 1, borderColor: T.line2, backgroundColor: T.surface2,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: T.text, fontFamily: wfont(400),
  } as const;
}

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [login, setLogin] = useState(params.mode === 'login');
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { startSSOFlow } = useSSO();
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();

  const goNext = () => router.replace('/(tabs)');

  const handleOAuth = async (strategy: 'oauth_apple' | 'oauth_google') => {
    setError('');
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        goNext();
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage || e?.message || 'Something went wrong — try again.');
    }
  };

  const submitEmail = async () => {
    setError('');
    if (login) {
      if (!signInLoaded) return;
      setBusy(true);
      try {
        const result = await signIn.create({ identifier: email, password });
        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId });
          goNext();
        } else {
          setError('Additional verification required — check your email.');
        }
      } catch (e: any) {
        setError(e?.errors?.[0]?.longMessage || e?.message || 'Could not sign in — check your details.');
      } finally {
        setBusy(false);
      }
    } else {
      if (!signUpLoaded) return;
      setBusy(true);
      try {
        await signUp.create({ emailAddress: email, password });
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingVerification(true);
      } catch (e: any) {
        setError(e?.errors?.[0]?.longMessage || e?.message || 'Could not create account — try again.');
      } finally {
        setBusy(false);
      }
    }
  };

  const submitCode = async () => {
    if (!signUpLoaded) return;
    setError('');
    setBusy(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId });
        goNext();
      } else {
        setError('Invalid code — check and try again.');
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.longMessage || e?.message || 'Verification failed — try again.');
    } finally {
      setBusy(false);
    }
  };

  if (pendingVerification) {
    return (
      <Scroll>
        <TopRow onBack={() => setPendingVerification(false)} />
        <View style={{ marginTop: 8 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: `0px 8px 24px ${T.accentGlow}` as unknown as string }}>
            <Icon name="mail" size={24} color={T.accentInk} />
          </View>
          <Text style={{ fontFamily: wfontDisplay(600), fontSize: 32, lineHeight: 34, textTransform: 'uppercase', color: T.text }}>Check your{'\n'}email</Text>
          <Text style={{ fontSize: 15, color: T.text2, marginTop: 10 }}>Enter the 6-digit code we sent to {email}.</Text>
        </View>
        <View style={{ marginTop: 26, gap: 12 }}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={T.text3}
            keyboardType="number-pad"
            style={[fieldStyle(), { textAlign: 'center', letterSpacing: 6, fontSize: 22 }]}
          />
          {!!error && <Text style={{ color: T.heat, fontSize: 13.5 }}>{error}</Text>}
          <Btn variant="primary" full size="lg" onPress={submitCode} disabled={busy || code.length < 6}>
            {busy ? <ActivityIndicator color={T.accentInk} /> : 'Verify & continue'}
          </Btn>
        </View>
      </Scroll>
    );
  }

  return (
    <Scroll>
      <TopRow onBack={() => router.back()} />
      <View style={{ marginTop: 8 }}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: `0px 8px 24px ${T.accentGlow}` as unknown as string }}>
          <Icon name="bodyweight" size={26} color={T.accentInk} />
        </View>
        <Text style={{ fontFamily: wfontDisplay(600), fontSize: 38, lineHeight: 38, textTransform: 'uppercase', color: T.text }}>
          {login ? 'Welcome\nback' : 'Create your\naccount'}
        </Text>
        <Text style={{ fontSize: 15, color: T.text2, marginTop: 10 }}>
          {login ? 'Log in to pick up your streak.' : 'Your pushup history, synced everywhere.'}
        </Text>
      </View>

      <View style={{ marginTop: 30, gap: 11 }}>
        <Pressable
          onPress={() => handleOAuth('oauth_apple')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 999, backgroundColor: '#fff' }}
        >
          <AppleGlyph />
          <Text style={{ fontFamily: wfont(700), fontSize: 16, color: '#000' }}>Continue with Apple</Text>
        </Pressable>
        <Pressable
          onPress={() => handleOAuth('oauth_google')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 999, backgroundColor: T.surface3, borderWidth: 1, borderColor: T.line2 }}
        >
          <GoogleGlyph />
          <Text style={{ fontFamily: wfont(700), fontSize: 16, color: T.text }}>Continue with Google</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: T.line }} />
          <Text style={{ color: T.text3, fontSize: 13 }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: T.line }} />
        </View>

        {!showEmail ? (
          <Pressable
            onPress={() => setShowEmail(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 999, borderWidth: 1, borderColor: T.line2 }}
          >
            <Icon name="mail" size={19} color={T.text2} />
            <Text style={{ fontFamily: wfont(700), fontSize: 16, color: T.text }}>Continue with email</Text>
          </Pressable>
        ) : (
          <View style={{ gap: 12 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={T.text3}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={fieldStyle()}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={T.text3}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={login ? 'current-password' : 'new-password'}
              style={fieldStyle()}
            />
            {!!error && <Text style={{ color: T.heat, fontSize: 13.5 }}>{error}</Text>}
            <Btn variant="primary" full size="lg" onPress={submitEmail} disabled={busy || !email || !password}>
              {busy ? <ActivityIndicator color={T.accentInk} /> : (login ? 'Sign in' : 'Create account')}
            </Btn>
          </View>
        )}
      </View>

      <Text style={{ textAlign: 'center', fontSize: 13, color: T.text3, marginTop: 26, lineHeight: 18 }}>
        By continuing you agree to our{'\n'}<Text style={{ color: T.text2 }}>Terms</Text> & <Text style={{ color: T.text2 }}>Privacy Policy</Text>.
      </Text>
      <Pressable
        onPress={() => { setLogin((s) => !s); setShowEmail(false); setError(''); }}
        style={{ alignItems: 'center', marginTop: 22 }}
      >
        <Text style={{ fontSize: 14.5, color: T.text2, fontFamily: wfont(600) }}>
          {login ? 'New here? ' : 'Already have an account? '}
          <Text style={{ color: T.accent }}>{login ? 'Create account' : 'Sign in'}</Text>
        </Text>
      </Pressable>
    </Scroll>
  );
}
