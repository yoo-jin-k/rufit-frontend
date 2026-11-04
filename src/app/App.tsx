import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from '../features/home/HomeScreen';

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><HomeScreen /></SafeAreaProvider>;
}
