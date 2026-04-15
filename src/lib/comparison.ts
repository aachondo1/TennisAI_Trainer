import { Session } from './supabase';

export type RadarDataPoint = {
  dimension: string;
  session1_forehand: number | null;
  session1_backhand: number | null;
  session1_saque: number | null;
  session2_forehand: number | null;
  session2_backhand: number | null;
  session2_saque: number | null;
  session1_avg: number;
  session2_avg: number;
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

  // Calculates average of non-null scores for a dimension across given fields
  const avg = (...values: (number | null)[]): number => {
    const valid = values.filter((v): v is number => v !== null);
    return valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : 0;
  };

  const rows: Array<{ dimension: string; fhKey: string; bhKey: string; saqueKey: string | null }> = [
    { dimension: 'Preparación', fhKey: 'preparacion',    bhKey: 'preparacion',    saqueKey: 'preparacion_toss' },
    { dimension: 'Impacto',     fhKey: 'punto_impacto',  bhKey: 'punto_impacto',  saqueKey: 'punto_impacto' },
    { dimension: 'Follow',      fhKey: 'follow_through', bhKey: 'follow_through', saqueKey: 'follow_through' },
    { dimension: 'Pies',        fhKey: 'posicion_pies',  bhKey: 'posicion_pies',  saqueKey: null },
    { dimension: 'Ritmo',       fhKey: 'ritmo_cadencia', bhKey: 'ritmo_cadencia', saqueKey: 'ritmo_cadencia' },
    { dimension: 'Potencia',    fhKey: 'potencia_pelota',bhKey: 'potencia_pelota',saqueKey: 'potencia_pelota' },
  ];

  return rows.map(({ dimension, fhKey, bhKey, saqueKey }) => {
    const s1fh = getDimensionScore(s1, 'forehand', fhKey);
    const s1bh = getDimensionScore(s1, 'backhand', bhKey);
    const s1sa = saqueKey ? getDimensionScore(s1, 'saque', saqueKey) : null;
    const s2fh = getDimensionScore(s2, 'forehand', fhKey);
    const s2bh = getDimensionScore(s2, 'backhand', bhKey);
    const s2sa = saqueKey ? getDimensionScore(s2, 'saque', saqueKey) : null;

    return {
      dimension,
      session1_forehand: s1fh,
      session1_backhand: s1bh,
      session1_saque: s1sa,
      session2_forehand: s2fh,
      session2_backhand: s2bh,
      session2_saque: s2sa,
      session1_avg: avg(s1fh, s1bh, s1sa),
      session2_avg: avg(s2fh, s2bh, s2sa),
    };
  });
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
      // Skip dimensions that don't apply to this golpe
      if (golpe !== 'saque' && dim.key === 'preparacion_toss') continue;
      if (golpe === 'saque' && dim.key === 'preparacion') continue;
      if (golpe === 'saque' && dim.key === 'posicion_pies') continue;

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

  // Find best and worst golpe — provide initial value to guard against empty array
  const golpeEntries = Object.entries(golpeDeltas);
  const bestGolpe = golpeEntries.length > 0
    ? golpeEntries.reduce((best, cur) =>
        (cur[1] as any).delta > (best[1] as any).delta ? cur : best,
        golpeEntries[0]
      )[0]
    : 'N/A';

  const worstGolpe = golpeEntries.length > 0
    ? golpeEntries.reduce((worst, cur) =>
        (cur[1] as any).delta < (worst[1] as any).delta ? cur : worst,
        golpeEntries[0]
      )[0]
    : 'N/A';

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
