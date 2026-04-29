import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

export type ClinicTheme = {

  primary: string;
  secondary: string;
  soft: string;
  borderSoft: string;

};

type ClinicThemeRow = {

  primary_color: string | null;
  secondary_color: string | null;
  soft_color: string | null;

};

const DEFAULT_THEME: ClinicTheme = {

  primary: '#1D4ED8',
  secondary: '#0F172A',
  soft: '#EFF6FF',
  borderSoft: 'rgba(29, 78, 216, 0.20)',

};

function hexToRgba(hex: string, alpha: number) {

  const clean = hex.replace('#', '');

  if (clean.length !== 6) {
    return `rgba(29, 78, 216, ${alpha})`;
  }

  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;

}

function buildTheme(row?: ClinicThemeRow | null): ClinicTheme {

  const primary = row?.primary_color || DEFAULT_THEME.primary;
  const secondary = row?.secondary_color || DEFAULT_THEME.secondary;
  const soft = row?.soft_color || hexToRgba(primary, 0.08);
  const borderSoft = hexToRgba(primary, 0.20);

  return {
    primary,
    secondary,
    soft,
    borderSoft,
  };

}

export function useClinicTheme(clinicId?: string | null) {

  const [theme, setTheme] = useState<ClinicTheme>(DEFAULT_THEME);
  const [themeLoading, setThemeLoading] = useState(true);

  useEffect(() => {

    const loadTheme = async () => {
      if (!clinicId) {
        setTheme(DEFAULT_THEME);
        setThemeLoading(false);
        return;
      }

      setThemeLoading(true);

      const { data } = await supabase
        .from('clinics')
        .select('primary_color, secondary_color, soft_color')
        .eq('id', clinicId)
        .maybeSingle<ClinicThemeRow>();

      setTheme(buildTheme(data));
      setThemeLoading(false);
    };

    loadTheme();
  
  }, [clinicId]);

  return useMemo(
    () => ({
      theme,
      themeLoading,
    }),
    [theme, themeLoading]
  );

}