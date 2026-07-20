import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useSession } from '@/ctx';
import { API_BASE_URL } from '@/config';

const features = [
  { icon: 'location-outline', label: 'GPS Tracking' },
  { icon: 'shield-checkmark-outline', label: 'Safe & Secure' },
  { icon: 'camera-outline', label: 'Photo / Video\nCapture' },
] as const;

export default function SignInScreen() {
  const { signIn } = useSession();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const id = employeeId.trim();
    const pw = password.trim();
    if (!id || !pw) {
      setError('Enter your ID and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(id, pw);
    } catch (err: any) {
      if (axios.isAxiosError(err) && !err.response) {
        setError(
          `Can't reach the server at ${API_BASE_URL}. Check that your phone and ` +
            `computer are on the same Wi-Fi.`,
        );
      } else if (err?.response?.status === 401) {
        setError('Invalid ID or password.');
      } else {
        setError(err?.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const comingSoon = (what: string) => Alert.alert(what, `${what} will be available soon.`);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#e8f1ff', '#eef0fe', '#f2ecfd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            {/* Top: logo + tagline */}
            <View style={styles.topGroup}>
              <Image
                source={require('../../assets/images/veps-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.tagline}>
                Vehicle Mounted Vacuum-Based{'\n'}Litter Picker Operations
              </Text>
            </View>

            {/* Middle: card */}
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={24} color="#2563eb" />
              </View>

              <Text style={styles.cardTitle}>Driver Login</Text>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Please login to continue</Text>
                <View style={styles.dividerLine} />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputRow}>
                <Ionicons name="phone-portrait-outline" size={18} color="#94a3b8" />
                <TextInput
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  placeholder="Mobile Number / Employee ID"
                  placeholderTextColor="#9aa3b2"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#9aa3b2"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={styles.input}
                  onSubmitEditing={onSubmit}
                  returnKeyType="go"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </Pressable>
              </View>

              <Pressable onPress={() => comingSoon('Forgot Password')} style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>

              <Pressable
                onPress={onSubmit}
                disabled={loading}
                style={({ pressed }) => [styles.loginWrap, pressed && !loading && styles.pressed]}
              >
                <LinearGradient
                  colors={['#3b6ef6', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color="#fff" />
                      <Text style={styles.loginText}>Login</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={() => comingSoon('Login with OTP')}
                style={({ pressed }) => [styles.otpBtn, pressed && styles.pressed]}
              >
                <Ionicons name="shield-checkmark-outline" size={19} color="#6366f1" />
                <Text style={styles.otpText}>Login with OTP</Text>
              </Pressable>
            </View>

            {/* Bottom: features + version */}
            <View style={styles.bottomGroup}>
              <View style={styles.features}>
                {features.map((f) => (
                  <View key={f.label} style={styles.feature}>
                    <View style={styles.featureIcon}>
                      <Ionicons name={f.icon} size={21} color="#6366f1" />
                    </View>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.version}>v 1.0.0</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eef0fe' },
  flex: { flex: 1 },
  // Fills the viewport and spreads the three groups top / middle / bottom (no scroll at rest).
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 10,
  },

  blob: { position: 'absolute', borderRadius: 999, opacity: 0.35 },
  blobOne: { width: 260, height: 260, top: -90, right: -70, backgroundColor: '#cfe0ff' },
  blobTwo: { width: 220, height: 220, top: 60, left: -80, backgroundColor: '#e4d8ff' },

  topGroup: { alignItems: 'center' },
  logo: { width: 200, height: 64 },
  tagline: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 18,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 36,
    paddingBottom: 16,
    marginTop: 22,
    shadowColor: '#1e293b',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  avatar: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eef4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  cardTitle: { fontSize: 21, fontWeight: '800', color: '#1e293b', textAlign: 'center' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 11 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { color: '#94a3b8', fontSize: 12, marginHorizontal: 10 },
  orText: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginHorizontal: 12 },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: '#b91c1c', fontSize: 12.5 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f8fb',
    borderWidth: 1,
    borderColor: '#e9edf3',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 14.5, color: '#0f172a' },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 14, marginTop: -1 },
  forgotText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },

  loginWrap: { borderRadius: 12, overflow: 'hidden' },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
  },
  loginText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },

  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    backgroundColor: '#fff',
  },
  otpText: { color: '#6366f1', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },

  bottomGroup: { marginTop: 20 },
  features: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 6 },
  feature: { alignItems: 'center', flex: 1 },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  featureLabel: { color: '#64748b', fontSize: 11.5, textAlign: 'center', lineHeight: 15 },

  version: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 16 },
});
