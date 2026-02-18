import { useState } from 'react';
import CustomAlert from '../components/CustomAlert';

/**
 * Custom Alert Hook
 * Alert.alert yerine kullanılır
 * 
 * Usage:
 * const alert = useAlert();
 * alert.show('Başarılı', 'İşlem başarıyla tamamlandı');
 * alert.show('Hata', 'Bir hata oluştu', [{text: 'Tamam', onPress: () => {}}]);
 */
export const useAlert = () => {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const show = (title, message, buttons) => {
    setAlertState({
      visible: true,
      title: title || '',
      message: message || '',
      buttons: buttons || [{ text: 'Tamam', onPress: () => {} }],
    });
  };

  const hide = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <CustomAlert
      visible={alertState.visible}
      title={alertState.title}
      message={alertState.message}
      buttons={alertState.buttons}
      onClose={hide}
    />
  );

  return {
    show,
    hide,
    AlertComponent,
  };
};

export default useAlert;




















