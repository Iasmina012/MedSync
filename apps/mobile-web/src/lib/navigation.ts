export function getDashboardPathByRole(role?: string | null) {

  switch (role) {
    case 'platform_admin':
      return '/main-platform-admin';
    case 'clinic_admin':
      return '/main-clinic-admin';
    case 'doctor':
      return '/main-doctor';
    case 'patient':
    default:
      return '/main-patient';
  }

}

export function getBackPathWithClinicFallback(
  role?: string | null,
  clinicId?: string,
  clinicName?: string
) {

  const hasClinicContext = Boolean(clinicId || clinicName);

  if (!hasClinicContext) {
    return {
      pathname: '/clinic-selection' as const,
      params: {},
    };
  }

  return {
    pathname: getDashboardPathByRole(role) as any,
    params: { clinicId, clinicName },
  };

}