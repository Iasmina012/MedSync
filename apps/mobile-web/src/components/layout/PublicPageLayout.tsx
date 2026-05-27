import React, { ReactNode } from 'react';
import { Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import WebNavbar from './WebNavbar';
import FloatingChatButton from '../../common/FloatingChatButton';

export default function PublicPageLayout({
  children,
  showWebNavbar = true,
  showWebFloatingChat = true,
}: {
  children: ReactNode;
  showWebNavbar?: boolean;
  showWebFloatingChat?: boolean;
}) {

  const isWeb = Platform.OS === 'web';

  return (

    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        {isWeb && showWebNavbar && <WebNavbar />}
        <View style={styles.main}>{children}</View>
        {isWeb && showWebFloatingChat && <FloatingChatButton />}
      </View>
    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  main: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#F8FAFC',
  },

});