import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

// Get Google OAuth client IDs from app config (set via EAS secrets or local env)
const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId;
const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId;

export default function Login() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    } else if (response?.type === 'error' || response?.type === 'dismiss') {
      if (response?.type === 'error') {
        setError('Erro ao fazer login com Google');
      }
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setLoading(true);
      setError(null);
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Falha ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    await promptAsync();
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Preencha email e senha');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);

      // Mensagens de erro amigáveis
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Este email já está cadastrado');
          break;
        case 'auth/invalid-email':
          setError('Email inválido');
          break;
        case 'auth/user-not-found':
          setError('Usuário não encontrado');
          break;
        case 'auth/wrong-password':
          setError('Senha incorreta');
          break;
        case 'auth/invalid-credential':
          setError('Email ou senha incorretos');
          break;
        default:
          setError('Erro ao autenticar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.scrollContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>FilhosApp</Text>
      <Text style={styles.subtitle}>{isRegistering ? 'Criar conta' : 'Bem-vindo!'}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Senha"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#666"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegistering ? 'Criar conta' : 'Entrar'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => {
          setIsRegistering(!isRegistering);
          setError(null);
        }}
      >
        <Text style={styles.switchText}>
          {isRegistering ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
        </Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.googleButton, (!request || loading) && styles.buttonDisabled]}
        onPress={handleGoogleLogin}
        disabled={!request || loading}
      >
        <Text style={styles.googleButtonText}>Entrar com Google</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    maxWidth: 300,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    paddingHorizontal: 15,
    height: '100%',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 15,
  },
  switchText: {
    color: '#4285F4',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 10,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#dc3545',
    marginBottom: 15,
    textAlign: 'center',
  },
});
