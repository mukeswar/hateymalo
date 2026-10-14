import { Alert, Platform } from 'react-native';

// Alert.alert has no buttons on react-native-web, so fall back to window.confirm there.
export const confirm = (title, message = '', { confirmText = 'Confirm', destructive = true } = {}) => {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm ? globalThis.confirm(message ? `${title}\n\n${message}` : title) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
};

export default confirm;
