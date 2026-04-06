import { WebView } from 'react-native-webview';

export default function App() {
  return <WebView source={{ uri: 'https://thrivv.dev' }} style={{ flex: 1 }} />;
}
