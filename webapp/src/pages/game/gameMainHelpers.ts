import { getSizeLabelKey } from '../../utils/gameLabelUtils';
import { TURN_TIME_LIMIT, UI_TO_ENGLISH_DIFFICULTY } from '../../constants/config';
import type { DifficultyChoice, SizeChoice } from '../../types/game';

export const resolveHistoryLocale = (resolvedLanguage?: string | null, language?: string | null) =>
  (resolvedLanguage || language || 'es').split('-')[0];

export const resolveBoardLabel = (
  sizeChoice: SizeChoice | null,
  translate: (key: string) => string,
) => (sizeChoice ? translate(`game.${getSizeLabelKey(sizeChoice)}`) : null);

export const resolveTurnTimeLimit = (difficultyChoice: DifficultyChoice | null) =>
  (difficultyChoice ? (TURN_TIME_LIMIT[UI_TO_ENGLISH_DIFFICULTY[difficultyChoice] ?? difficultyChoice] ?? null) : null);

