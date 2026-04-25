import { describe, expect, test } from 'vitest';
import { getVictoryPoints, getVictoryPointsLabel } from '../utils/scoreUtils';

describe('scoreUtils', () => {
  test('calcula los puntos por victoria segun dificultad y tablero', () => {
    expect(getVictoryPoints('Fácil', 6)).toBe(100);
    expect(getVictoryPoints('Medio', 9)).toBe(300);
    expect(getVictoryPoints('Difícil', 12)).toBe(600);
  });

  test('normaliza nombres de dificultad en distintos formatos', () => {
    expect(getVictoryPoints('easy', 6)).toBe(100);
    expect(getVictoryPoints('Medium', 6)).toBe(200);
    expect(getVictoryPoints('dificil', 6)).toBe(300);
  });

  test('devuelve 0 si no hay dificultad seleccionada', () => {
    expect(getVictoryPoints('Sin seleccionar', 6)).toBe(0);
  });

  test('expone la etiqueta lista para mostrar en pantalla', () => {
    expect(getVictoryPointsLabel('Medio', 9)).toBe('300 XP');
  });
});
