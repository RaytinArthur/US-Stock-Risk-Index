
import { RiskLevel } from './types';

export const RISK_THRESHOLDS = [
  { min: 0, max: 20, level: RiskLevel.VERY_LOW, color: '#22c55e' }, // Green-500
  { min: 20, max: 40, level: RiskLevel.LOW, color: '#84cc16' }, // Lime-500
  { min: 40, max: 60, level: RiskLevel.MODERATE, color: '#eab308' }, // Yellow-500
  { min: 60, max: 80, level: RiskLevel.ELEVATED, color: '#f97316' }, // Orange-500
  { min: 80, max: 100, level: RiskLevel.EXTREME, color: '#ef4444' }, // Red-500
];

export const CATEGORIES = [
  'All',
  'Volatility',
  'Credit/Stress',
  'Valuation',
  'Liquidity',
  'Macro'
];
