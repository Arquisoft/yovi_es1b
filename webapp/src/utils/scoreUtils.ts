const normalizeDifficulty = (difficulty: string): string =>
  difficulty
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '');

const getVictoryPoints = (difficulty: string | null, boardSize: number): number => {
  if (!Number.isFinite(boardSize) || boardSize <= 0) return 0;

  const normalizedDifficulty = normalizeDifficulty(difficulty || '');
  if (!normalizedDifficulty || normalizedDifficulty === 'sinseleccionar') return 0;

  let difficultyMultiplier = 1;
  if (normalizedDifficulty === 'medio' || normalizedDifficulty === 'medium') {
    difficultyMultiplier = 2;
  } else if (normalizedDifficulty === 'dificil' || normalizedDifficulty === 'hard') {
    difficultyMultiplier = 3;
  }

  const sizeMultiplier = boardSize / 6;
  return Math.round(100 * difficultyMultiplier * sizeMultiplier);
};

const getVictoryPointsLabel = (difficulty: string | null, boardSize: number): string =>
  `${getVictoryPoints(difficulty, boardSize).toLocaleString()} XP`;

export { getVictoryPoints, getVictoryPointsLabel };
