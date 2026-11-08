/** 모달은 별도의 네이티브 화면이므로 자체 안전 영역을 측정합니다. 상위 화면의 좌표를 재사용하지 않습니다. */
import { Modal, type ModalProps } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
export function AppModal({ children, ...props }: ModalProps) {
  return <Modal {...props}><SafeAreaProvider>{children}</SafeAreaProvider></Modal>;
}
