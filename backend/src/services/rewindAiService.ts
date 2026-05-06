import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { geminiJSON, proModel } from './gemini.js';
import { rewindInsightsPrompt, type RewindInsightsResponse } from '../prompts/rewind.js';
import { getRewindForYear, type RewindData } from './rewindService.js';

export interface RewindInsightsResult {
  insights: RewindInsightsResponse;
  data: RewindData;
}

export async function generateRewindInsights(
  userId: string,
  year: number
): Promise<RewindInsightsResult> {
  const data = await getRewindForYear(userId, year);
  if (!data.hasData) {
    throw ApiError.badRequest('Not enough activity this year to generate a rewind');
  }
  const user = await User.findById(userId).select('name').lean();
  const insights = await geminiJSON<RewindInsightsResponse>(
    rewindInsightsPrompt(data, user?.name ?? 'there'),
    { model: proModel() }
  );
  return { insights, data };
}
