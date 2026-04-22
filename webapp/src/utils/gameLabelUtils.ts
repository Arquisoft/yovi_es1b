type SizeLabelKey = 'size_small' | 'size_medium' | 'size_large';
type DifficultyLabelKey = 'easy' | 'medium' | 'hard';

const SIZE_LABEL_KEY_MAP: Record<string, SizeLabelKey> = {
  Pequeño: 'size_small',
  Pequeña: 'size_small',
  Pequeno: 'size_small',
  Small: 'size_small',
  Klein: 'size_small',
  Mediano: 'size_medium',
  Medio: 'size_medium',
  Médio: 'size_medium',
  Medium: 'size_medium',
  Mittel: 'size_medium',
  Grande: 'size_large',
  Large: 'size_large',
  Groß: 'size_large',
  Gross: 'size_large',
};

const DIFFICULTY_LABEL_KEY_MAP: Record<string, DifficultyLabelKey> = {
  Fácil: 'easy',
  Facil: 'easy',
  Easy: 'easy',
  Einfach: 'easy',
  Medio: 'medium',
  Médio: 'medium',
  Medium: 'medium',
  Mittel: 'medium',
  Difícil: 'hard',
  Dificil: 'hard',
  Hard: 'hard',
  Schwer: 'hard',
};

const getSizeLabelKey = (choice: string | null | undefined): SizeLabelKey => {
  const normalizedChoice = choice?.trim() ?? '';
  return SIZE_LABEL_KEY_MAP[normalizedChoice] ?? 'size_large';
};

const getSizeLabelKeyFromDimension = (dimension: number | null | undefined): SizeLabelKey => {
  if (dimension === 6) return 'size_small';
  if (dimension === 9) return 'size_medium';
  return 'size_large';
};

const getDifficultyLabelKey = (choice: string | null | undefined): DifficultyLabelKey => {
  const normalizedChoice = choice?.trim() ?? '';
  return DIFFICULTY_LABEL_KEY_MAP[normalizedChoice] ?? 'easy';
};

const HISTORY_RESULT_KEY_MAP: Record<string, 'you_win' | 'you_lose'> = {
  Victoria: 'you_win',
  victoria: 'you_win',
  Victory: 'you_win',
  victory: 'you_win',
  win: 'you_win',
  won: 'you_win',
  Ganado: 'you_win',
  ganado: 'you_win',
  'You win': 'you_win',
  'you win': 'you_win',
  '¡Has ganado!': 'you_win',
  'You win!': 'you_win',
  'Du hast gewonnen!': 'you_win',
  'Ganhaste!': 'you_win',
  Derrota: 'you_lose',
  derrota: 'you_lose',
  Defeat: 'you_lose',
  defeat: 'you_lose',
  loss: 'you_lose',
  lost: 'you_lose',
  Perdido: 'you_lose',
  perdido: 'you_lose',
  'Has perdido': 'you_lose',
  'You lose': 'you_lose',
  'Du hast verloren': 'you_lose',
  'Perdeste': 'you_lose',
  lose: 'you_lose',
};

const getHistoryResultKey = (result: string | null | undefined): 'you_win' | 'you_lose' => {
  const normalizedResult = result?.trim() ?? '';
  return HISTORY_RESULT_KEY_MAP[normalizedResult] ?? 'you_lose';
};

const HISTORY_RESULT_DISPLAY_LABELS: Record<'you_win' | 'you_lose', 'Victoria' | 'Derrota'> = {
  you_win: 'Victoria',
  you_lose: 'Derrota',
};

const getHistoryResultDisplayLabel = (result: string | null | undefined): 'Victoria' | 'Derrota' => {
  const resultKey = getHistoryResultKey(result);
  return HISTORY_RESULT_DISPLAY_LABELS[resultKey];
};

const HISTORY_FILTER_KEY_MAP: Record<string, 'win' | 'loss'> = {
  win: 'win',
  victory: 'win',
  Victoria: 'win',
  victoria: 'win',
  'You win': 'win',
  'You win!': 'win',
  '¡Has ganado!': 'win',
  'Has ganado': 'win',
  loss: 'loss',
  defeat: 'loss',
  Derrota: 'loss',
  derrota: 'loss',
  'You lose': 'loss',
  'You lose!': 'loss',
  'Has perdido': 'loss',
  perdido: 'loss',
};

const getHistoryFilterKey = (filter: string | null | undefined): 'win' | 'loss' | null => {
  const normalizedFilter = filter?.trim() ?? '';
  if (!normalizedFilter) return null;
  return HISTORY_FILTER_KEY_MAP[normalizedFilter] ?? null;
};

export {
  getSizeLabelKey,
  getSizeLabelKeyFromDimension,
  getDifficultyLabelKey,
  getHistoryResultKey,
  getHistoryResultDisplayLabel,
  getHistoryFilterKey,
};
