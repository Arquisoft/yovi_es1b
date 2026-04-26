export const mapUiDifficultyToBackend = (uiDiff: string): string => {
  const backendMap: Record<string, string> = {
    'Fácil': 'facil',
    'Medio': 'medio',
    'Difícil': 'dificil',
    'Easy': 'facil',
    'Medium': 'medio',
    'Hard': 'dificil',
  }

  return backendMap[uiDiff] || 'facil'
}

export const resolveIconFromAssets = (
  rawIcon: string | null | undefined,
  iconModules: Record<string, string>
): string | null => {
  const iconValue = String(rawIcon || '').trim();
  if (!iconValue) return null;

  // Sanitizamos para que SonarCloud esté feliz
  const safeValue = iconValue.replace(/[<>\"\'\\]/g, '');

  if (
    safeValue.startsWith('http://') ||
    safeValue.startsWith('https://') ||
    safeValue.startsWith('/') ||
    safeValue.startsWith('data:')
  ) {
    return safeValue;
  }

  const match = Object.entries(iconModules).find(([path]) =>
    path.toLowerCase().includes(safeValue.toLowerCase())
  );

  return match ? match[1] : null; 
};

export const getGameIdentity = (isGuestMode: boolean, storedUsername: string) => ({
  displayName: isGuestMode ? 'Invitado' : (localStorage.getItem('yovi_user_nickname') || storedUsername),
  friendCode: isGuestMode ? '' : (localStorage.getItem('yovi_friend_code') || ''),
  username: isGuestMode ? 'Invitado' : storedUsername,
})

