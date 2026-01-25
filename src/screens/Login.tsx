import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, KeyboardAvoidingView, Platform, TextInput as TextInputType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function Login() {
  const passwordRef = useRef<TextInputType>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

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

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color="#dc3545" />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      <TextInput
        style={[
          styles.input,
          focusedInput === 'email' && styles.inputFocused
        ]}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocusedInput('email')}
        onBlur={() => setFocusedInput(null)}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <View style={[
        styles.passwordContainer,
        focusedInput === 'password' && styles.inputFocused
      ]}>
        <TextInput
          ref={passwordRef}
          style={styles.passwordInput}
          placeholder="Senha"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          onFocus={() => setFocusedInput('password')}
          onBlur={() => setFocusedInput(null)}
          returnKeyType="done"
          onSubmitEditing={handleEmailAuth}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
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
        activeOpacity={0.7}
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
        activeOpacity={0.7}
      >
        <Text style={styles.switchText}>
          {isRegistering ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
        </Text>
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
  inputFocused: {
    borderColor: '#4285F4',
    borderWidth: 2,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    maxWidth: 300,
  },
  error: {
    color: '#dc3545',
    marginLeft: 8,
    flex: 1,
  },
});
