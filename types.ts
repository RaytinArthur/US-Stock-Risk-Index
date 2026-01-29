
export enum RiskLevel {
  VERY_LOW = 'Very Low',
  LOW = 'Low',
  MODERATE = 'Moderate',
  ELEVATED = 'Elevated',
  EXTREME = 'Extreme Risk'
}

export interface Indicator {
  id: string;
  name: string;
  category: string;
  value: number;
  unit: string;
  subScore: number;
  weight: number;
  description: string;
  direction: 'higher_is_risky' | 'lower_is_risky';
  history: { date: string; value: number }[];
  explanation: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface RiskData {
  totalScore: number;
  lastUpdated: string;
  indicators: Indicator[];
  contributions: { id: string; name: string; impact: number }[];
  sources: GroundingSource[];
}
