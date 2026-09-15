import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { appUrl, navigationTarget, startsWhoop, THRIVV_URL } from '../lib/navigation';

export default function App() {
  const webView = useRef<WebView>(null);
  const whoopActive = useRef(false);
  const currentUrl = useRef(THRIVV_URL);
  const [source, setSource] = useState(THRIVV_URL);
  const [instance, setInstance] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [providerHost, setProviderHost] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(false);

  const back = useCallback(() => {
    if (!canGoBack) return false;
    setError(false);
    webView.current?.goBack();
    return true;
  }, [canGoBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    return () => subscription.remove();
  }, [back]);

  function restart(url: string) {
    setError(false);
    setHasLoaded(false);
    setLoading(true);
    setCanGoBack(false);
    setSource(url);
    setInstance(value => value + 1);
  }

  function returnToThrivv() {
    whoopActive.current = false;
    setProviderHost('');
    currentUrl.current = THRIVV_URL;
    restart(THRIVV_URL);
  }

  async function openExternal(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', 'Please try again or open Thrivv in your browser.');
    }
  }

  function allowNavigation(url: string): boolean {
    const target = navigationTarget(url, whoopActive.current);
    if (target === 'external') {
      void openExternal(url);
      return false;
    }
    if (target === 'blocked') return false;
    if (startsWhoop(url)) whoopActive.current = true;
    else if (target === 'app') whoopActive.current = false;
    return true;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'right', 'bottom', 'left']}>
      {(canGoBack || Boolean(providerHost)) && (
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={!canGoBack}
            onPress={back} hitSlop={8} style={[styles.navigationButton, !canGoBack && styles.disabled]}>
            <Text style={styles.link}>‹ Back</Text>
          </Pressable>
          <View style={styles.toolbarTitle}>
            <Text style={styles.brand}>{providerHost ? 'WHOOP CONNECTION' : 'THRIVV'}</Text>
            {!!providerHost && <Text numberOfLines={1} style={styles.host}>{providerHost}</Text>}
          </View>
          {!!providerHost && (
            <Pressable accessibilityRole="button" accessibilityLabel="Return to Thrivv" onPress={returnToThrivv}
              hitSlop={8} style={styles.navigationButton}>
              <Text style={styles.link}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.content}>
        <WebView
          key={instance}
          ref={webView}
          source={{ uri: source }}
          style={styles.webView}
          containerStyle={styles.webView}
          // All schemes reach our policy so WebView cannot auto-open an unsafe
          // scheme before onShouldStartLoadWithRequest can reject it.
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={request => request.isTopFrame === false
            ? request.url.startsWith('https://') || request.url === 'about:blank'
            : allowNavigation(request.url)}
          onOpenWindow={({ nativeEvent }) => {
            if (allowNavigation(nativeEvent.targetUrl)) {
              // Navigate the existing page so repeated target="_blank" links
              // still work after back navigation and keep the OAuth cookie store.
              webView.current?.injectJavaScript(
                `window.location.assign(${JSON.stringify(nativeEvent.targetUrl)}); true;`,
              );
            }
          }}
          onNavigationStateChange={state => {
            currentUrl.current = state.url;
            setCanGoBack(state.canGoBack);
            if (appUrl(state.url)) setProviderHost('');
            else {
              try { setProviderHost(new URL(state.url).hostname); } catch { setProviderHost(''); }
            }
          }}
          onLoadStart={() => { setLoading(true); setError(false); }}
          onLoad={() => setHasLoaded(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onContentProcessDidTerminate={() => { setLoading(false); setError(true); }}
          onRenderProcessGone={() => { setLoading(false); setError(true); }}
          renderError={() => <View style={styles.webView} />}
          sharedCookiesEnabled
          incognito={false}
          domStorageEnabled
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="prompt"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          autoManageStatusBarEnabled={false}
          mixedContentMode="never"
          allowFileAccess={false}
          allowsLinkPreview={false}
        />
        {loading && hasLoaded && !error && <View accessibilityLabel="Loading page" style={styles.progress} />}
        {((loading && !hasLoaded) || error) && (
          <View style={styles.overlay} accessibilityLiveRegion="polite">
            <Text style={styles.loadingBrand}>THRIVV</Text>
            {error ? <>
              <Text style={styles.title}>Let’s reconnect.</Text>
              <Text style={styles.description}>Check your connection, then try again.</Text>
              <Pressable accessibilityRole="button" onPress={() => restart(currentUrl.current)} style={styles.retry}>
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={returnToThrivv} style={styles.home}>
                <Text style={styles.link}>Return to Thrivv</Text>
              </Pressable>
            </> : <>
              <ActivityIndicator color="#D8BD7D" style={styles.spinner} />
              <Text style={styles.description}>Opening Thrivv…</Text>
            </>}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D0F14' },
  content: { flex: 1 },
  webView: { flex: 1, backgroundColor: '#0D0F14' },
  toolbar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#292D29' },
  navigationButton: { minHeight: 44, minWidth: 48, justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  toolbarTitle: { flex: 1, paddingHorizontal: 12, paddingVertical: 9 },
  brand: { color: '#D8BD7D', fontSize: 10, letterSpacing: 2, fontWeight: '600' },
  host: { color: '#B1B5B0', fontSize: 11, marginTop: 3 },
  link: { color: '#D8BD7D', fontSize: 14 },
  progress: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#D8BD7D' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0D0F14', alignItems: 'center',
    justifyContent: 'center', padding: 28 },
  loadingBrand: { color: '#D8BD7D', fontSize: 27, letterSpacing: 6, fontWeight: '500', marginBottom: 32 },
  spinner: { marginBottom: 18 },
  title: { color: '#F4F1E8', fontSize: 22, fontWeight: '600', marginBottom: 12 },
  description: { color: '#B1B5B0', textAlign: 'center', fontSize: 14, lineHeight: 21 },
  retry: { backgroundColor: '#D8BD7D', borderRadius: 12, paddingHorizontal: 30, paddingVertical: 15, marginTop: 24 },
  retryLabel: { color: '#0D0F14', fontSize: 15, fontWeight: '600' },
  home: { minHeight: 44, justifyContent: 'center', marginTop: 12 },
});
