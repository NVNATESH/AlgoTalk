import type { Request, Response } from 'express';
import { getDashboardReport, getGoalReport } from '../services/reportService.js';
import { generateWeeklyReport } from '../services/automationService.js';

export async function weeklyReport(req: Request, res: Response) {
  const userId = (req as any).userId;
  const report = await generateWeeklyReport(userId);
  res.json({ report });
}

export async function dashboardReport(req: Request, res: Response) {
  const userId = (req as any).userId;
  const report = await getDashboardReport(userId);
  res.json({ report });
}

export async function goalReport(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { goalId } = req.params;
  const report = await getGoalReport(userId, goalId);
  res.json({ report });
}
