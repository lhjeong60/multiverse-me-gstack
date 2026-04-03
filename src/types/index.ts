export interface Universe {
  name: string;
  theme: string;
  story: string;
  image_url: string;
  tier: 1 | 2 | 3;
  prompt: string;
}

export interface Result {
  id: string;
  name: string;
  score: number;
  tier_distribution: TierDistribution;
  universes: Universe[];
  created_at: string;
  expires_at: string;
}

export interface TierDistribution {
  tier1: number;
  tier2: number;
  tier3: number;
}

export interface VerseChoice {
  text: string;
  score: 1 | 2 | 3;
}

export interface GenerateRequest {
  name: string;
  photo: string; // base64
  score: number;
  tier_distribution: TierDistribution;
}

export interface GenerateResponse {
  result_id: string;
  universes: Universe[];
  // 첫 번째 이미지만 즉시 포함, 나머지는 polling
  ready_count: number;
}

export interface PollResponse {
  universes: Universe[];
  ready_count: number;
  done: boolean;
}
