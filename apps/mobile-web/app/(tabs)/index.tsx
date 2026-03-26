import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function Index() {
  useEffect(() => {
    const test = async () => {
      const { data, error } = await supabase.from('clinics').select('*');
      console.log('clinics:', data);
      console.log('error:', error);
    };

    test();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Supabase Connection Test</Text>
    </View>
  );
}