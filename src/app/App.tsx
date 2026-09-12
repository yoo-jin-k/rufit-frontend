import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WorkoutScreen } from '../features/workout/WorkoutScreen';

export default function App() {
  return <SafeAreaProvider><StatusBar style="dark" /><WorkoutScreen /></SafeAreaProvider>;
}
