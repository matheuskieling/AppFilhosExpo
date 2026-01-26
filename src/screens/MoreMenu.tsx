import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import haptics from '../utils/haptics';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  showChevron?: boolean;
}

const MenuItem = ({ icon, label, onPress, color = '#333', showChevron = true }: MenuItemProps) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={[styles.menuItemText, { color }]}>{label}</Text>
    {showChevron && <Ionicons name="chevron-forward" size={20} color="#ccc" />}
  </TouchableOpacity>
);

export default function MoreMenu({ navigation }: any) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    haptics.warning();
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            haptics.medium();
            signOut();
          },
        },
      ]
    );
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Mais</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color="#4285F4" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userLabel}>Conta conectada</Text>
          </View>
        </View>

        {/* Manage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gerenciar</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="folder-outline"
              label="Categorias"
              onPress={() => {
                haptics.light();
                navigation.navigate('Categories');
              }}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="log-out-outline"
              label="Sair"
              onPress={handleSignOut}
              color="#dc3545"
              showChevron={false}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          <View style={styles.menuGroup}>
            <View style={styles.aboutItem}>
              <Ionicons name="paw" size={24} color="#4285F4" />
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutTitle}>FilhosApp</Text>
                <Text style={styles.aboutSubtitle}>Controle de estoque dos pets</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.versionItem}>
              <Text style={styles.versionLabel}>Versão</Text>
              <Text style={styles.versionValue}>{appVersion}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  // User Section
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 15,
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userLabel: {
    fontSize: 13,
    color: '#28a745',
    marginTop: 2,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 56,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 52,
  },
  // About
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  aboutInfo: {
    marginLeft: 12,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  aboutSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  versionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  versionLabel: {
    fontSize: 16,
    color: '#333',
  },
  versionValue: {
    fontSize: 16,
    color: '#888',
  },
});
