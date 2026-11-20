export function isHealthConnect(health) {
  return health?.provider === 'health-connect';
}

export function healthBrand(health) {
  return isHealthConnect(health) ? 'Health Connect' : 'Apple Health';
}

export function healthConnectUnavailableMessage(reason) {
  const text = String(reason || '');
  if (/update/i.test(text)) {
    return 'Health Connect needs an update. Update it from the Play Store, then try again.';
  }
  return 'Health Connect is not available on this phone. Android 14 and later include it. On earlier versions, install Health Connect from the Play Store, then try again.';
}

export function healthConnectReadGranted(status) {
  const authorized = status?.readAuthorized || [];
  return authorized.includes('steps') || authorized.includes('workouts');
}
