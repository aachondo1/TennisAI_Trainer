import { Session } from './supabase';

export type RadarDataPoint = {
  dimension: string;
  session1_forehand: number | null;
  session1_backhand: number | null;
  session1_saque: number | null;
  session2_forehand: number | null;
  session2_backhand: number | null;
  session2_saque: number | null;
};

export type GolpeComparisonData = {
  forehand: { score1: number; score2: number; delta: number; percentDelta: number };
  backhand: { score1: number; score2: number; delta: number; percentDelta: number };
  saque: { score1: number; score2: number; delta: number; percentDelta: number };
};

export type DimensionComparisonData = {
  [golpe: string]: {
    [dimension: string]: {
      score1: number;
      score2: number;
      delta: number;
      percentDelta: number;
    };
  };
};

export type ComparisonSummary = {
  globalDelta: number;
  globalPercentDelta: number;
  bestGolpe: string;
  worstGolpe: string;
  improvementAreas: string[];
  regressionAreas: string[];
};

/**
 * Normaliza un score a escala 0-20 basado en el tipo de dimensión
 * Algunas dimensiones usan escala 0-20, otras 0-10
 */
const normalizeScore = (score: number | undefined, dimension: string): number => {
  if (score === undefined || score === null) return 0;

  // Dimensiones que usan escala 0-10
  const scale10Dimensions = ['ritmo_cadencia', 'potencia_pelota'];

  const isScale10 = scale10Dimensions.some(d => dimension.includes(d));

  if (isScale10) {
    return Math.round((score / 10) * 20);
  } else {
    // Para escala 0-20, simplemente asegurar que esté normalizado
    return Math.round((score / 20) * 20);
  }
};

/**
 * Construye datos para radar de comparación entre dos sesiones
 */
export const buildRadarDataForComparison = (
  session1: Session,
  session2: Session
): RadarDataPoint[] => {
  const s1 = session1.scores_detalle || {};
  const s2 = session2.scores_detalle || {};

  const getDimensionScore = (scores: any, golpe: string, dimension: string): number | null => {
    const golpeData = scores[golpe];
    if (!golpeData || !golpeData.scores) return null;

    const dimensionData = golpeData.scores[dimension];
    if (!dimensionData) return null;

    return normalizeScore(dimensionData.score, dimension);
  };

  return [
    {
      dimension: 'Preparación',
      session1_forehand: getDimensionScore(s1, 'forehand', 'preparacion'),
      session1_backhand: getDimensionScore(s1, 'backhand', 'preparacion'),
      session1_saque: getDimensionScore(s1, 'saque', 'preparacion_toss'),
      session2_forehand: getDimensionScore(s2, 'forehand', 'preparacion'),
      session2_backhand: getDimensionScore(s2, 'backhand', 'preparacion'),
      session2_saque: getDimensionScore(s2, 'saque', 'preparacion_toss'),
    },
    {
      dimension: 'Impacto',
      session1_forehand: getDimensionScore(s1, 'forehand', 'punto_impacto'),
      session1_backhand: getDimensionScore(s1, 'backhand', 'punto_impacto'),
      session1_saque: getDimensionScore(s1, 'saque', 'punto_impacto'),
      session2_forehand: getDimensionScore(s2, 'forehand', 'punto_impacto'),
      session2_backhand: getDimensionScore(s2, 'backhand', 'punto_impacto'),
      session2_saque: getDimensionScore(s2, 'saque', 'punto_impacto'),
    },
    {
      dimension: 'Follow',
      session1_forehand: getDimensionScore(s1, 'forehand', 'follow_through'),
      session1_backhand: getDimensionScore(s1, 'backhand', 'follow_through'),
      session1_saque: getDimensionScore(s1, 'saque', 'follow_through'),
      session2_forehand: getDimensionScore(s2, 'forehand', 'follow_through'),
      session2_backhand: getDimensionScore(s2, 'backhand', 'follow_through'),
      session2_saque: getDimensionScore(s2, 'saque', 'follow_through'),
    },
    {
      dimension: 'Pies',
      session1_forehand: getDimensionScore(s1, 'forehand', 'posicion_pies'),
      session1_backhand: getDimensionScore(s1, 'backhand', 'posicion_pies'),
      session1_saque: null, // No aplica para saque
      session2_forehand: getDimensionScore(s2, 'forehand', 'posicion_pies'),
      session2_backhand: getDimensionScore(s2, 'backhand', 'posicion_pies'),
      session2_saque: null,
    },
    {
      dimension: 'Ritmo',
      session1_forehand: getDimensionScore(s1, 'forehand', 'ritmo_cadencia'),
      session1_backhand: getDimensionScore(s1, 'backhand', 'ritmo_cadencia'),
      session1_saque: getDimensionScore(s1, 'saque', 'ritmo_cadencia'),
      session2_forehand: getDimensionScore(s2, 'forehand', 'ritmo_cadencia'),
      session2_backhand: getDimensionScore(s2, 'backhand', 'ritmo_cadencia'),
      session2_saque: getDimensionScore(s2, 'saque', 'ritmo_cadencia'),
    },
    {
      dimension: 'Potencia',
      session1_forehand: getDimensionScore(s1, 'forehand', 'potencia_pelota'),
      session1_backhand: getDimensionScore(s1, 'backhand', 'potencia_pelota'),
      session1_saque: getDimensionScore(s1, 'saque', 'potencia_pelota'),
      session2_forehand: getDimensionScore(s2, 'forehand', 'potencia_pelota'),
      session2_backhand: getDimensionScore(s2, 'backhand', 'potencia_pelota'),
      session2_saque: getDimensionScore(s2, 'saque', 'potencia_pelota'),
    },
  ];
};

/**
 * Calcula diferencias de scores por golpe
 */
export const calculateGolpeDeltas = (
  session1: Session,
  session2: Session
): GolpeComparisonData => {
  const golpes = ['forehand', 'backhand', 'saque'] as const;
  const result: any = {};

  for (const golpe of golpes) {
    const score1 = session1.scores_detalle?.[golpe]?.total ?? 0;
    const score2 = session2.scores_detalle?.[golpe]?.total ?? 0;
    const delta = score2 - score1;
    const percentDelta = score1 > 0 ? (delta / score1) * 100 : 0;

    result[golpe] = {
      score1,
      score2,
      delta,
      percentDelta,
    };
  }

  return result;
};

/**
 * Calcula deltas por dimensión técnica para cada golpe
 */
export const calculateDimensionDeltas = (
  session1: Session,
  session2: Session
): DimensionComparisonData => {
  const dimensions = [
    { key: 'preparacion', name: 'Preparación' },
    { key: 'preparacion_toss', name: 'Prep Saque' },
    { key: 'punto_impacto', name: 'Impacto' },
    { key: 'follow_through', name: 'Follow' },
    { key: 'posicion_pies', name: 'Pies' },
    { key: 'ritmo_cadencia', name: 'Ritmo' },
    { key: 'potencia_pelota', name: 'Potencia' },
  ];

  const golpes = ['forehand', 'backhand', 'saque'] as const;
  const result: any = {};

  for (const golpe of golpes) {
    result[golpe] = {};

    for (const dim of dimensions) {
      // Skip saque-only dimensions for non-saque golpes
      if (golpe !== 'saque' && dim.key === 'preparacion_toss') continue;
      if (golpe === 'saque' && dim.key === 'preparacion') continue;
      if (golpe !== 'saque' && dim.key === 'posicion_pies' && golpe === 'saque') continue;

      const dimensionKey = golpe === 'saque' && dim.key === 'preparacion_toss' ? 'preparacion_toss' : dim.key;

      const score1Data = session1.scores_detalle?.[golpe]?.scores?.[dimensionKey];
      const score2Data = session2.scores_detalle?.[golpe]?.scores?.[dimensionKey];

      const score1 = score1Data?.score ?? 0;
      const score2 = score2Data?.score ?? 0;
      const delta = score2 - score1;
      const percentDelta = score1 > 0 ? (delta / score1) * 100 : 0;

      result[golpe][dim.name] = {
        score1,
        score2,
        delta,
        percentDelta,
      };
    }
  }

  return result;
};

/**
 * Genera resumen de comparación
 */
export const getComparisonSummary = (
  session1: Session,
  session2: Session
): ComparisonSummary => {
  const golpeDeltas = calculateGolpeDeltas(session1, session2);

  const globalDelta = session2.global_score - session1.global_score;
  const globalPercentDelta = session1.global_score > 0
    ? (globalDelta / session1.global_score) * 100
    : 0;

  // Find best and worst golpe
  const golpeEntries = Object.entries(golpeDeltas);
  const bestGolpe = golpeEntries.reduce((best, [golpe, data]) =>
    (data as any).delta > (best[1] as any).delta ? [golpe, data] : best
  )[0];

  const worstGolpe = golpeEntries.reduce((worst, [golpe, data]) =>
    (data as any).delta < (worst[1] as any).delta ? [golpe, data] : worst
  )[0];

  // Identify improvement/regression areas
  const improvementAreas: string[] = [];
  const regressionAreas: string[] = [];

  const dimensionDeltas = calculateDimensionDeltas(session1, session2);

  for (const golpe in dimensionDeltas) {
    for (const dimension in dimensionDeltas[golpe]) {
      const data = dimensionDeltas[golpe][dimension];
      if (data.delta > 2) {
        improvementAreas.push(`${dimension} (${golpe})`);
      } else if (data.delta < -2) {
        regressionAreas.push(`${dimension} (${golpe})`);
      }
    }
  }

  // Remove duplicates and limit
  const uniqueImprovements = [...new Set(improvementAreas)].slice(0, 3);
  const uniqueRegressions = [...new Set(regressionAreas)].slice(0, 3);

  return {
    globalDelta,
    globalPercentDelta,
    bestGolpe: bestGolpe || 'N/A',
    worstGolpe: worstGolpe || 'N/A',
    improvementAreas: uniqueImprovements,
    regressionAreas: uniqueRegressions,
  };
};
