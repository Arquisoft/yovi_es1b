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
  const iconValue = String(rawIcon || '').trim()
  if (!iconValue) return null

  if (
    iconValue.startsWith('http://') ||
    iconValue.startsWith('https://') ||
    iconValue.startsWith('/') ||
    iconValue.startsWith('data:')
  ) {
    return iconValue
  }

  const match = Object.entries(iconModules).find(([path]) =>
    path.toLowerCase().includes(iconValue.toLowerCase())
  )
  return match ? match[1] : iconValue
}

export const getGameIdentity = (isGuestMode: boolean, storedUsername: string) => ({
  displayName: isGuestMode ? 'Invitado' : (localStorage.getItem('yovi_user_nickname') || storedUsername),
  friendCode: isGuestMode ? '' : (localStorage.getItem('yovi_friend_code') || ''),
  username: isGuestMode ? 'Invitado' : storedUsername,
})

