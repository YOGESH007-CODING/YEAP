import { randomBytes } from 'crypto';
import { createElement } from 'react';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prismaClient';

const ShareSettings = z.object({ enabled: z.boolean(), trackerId: z.string().min(1).nullable().optional() });
const shareUrl = (token: string): string => `${(process.env['BACKEND_URL'] ?? 'https://yeap.app').replace(/\/$/, '')}/api/share/${token}/page`;
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
type PublicCard = { username: string; totalSolved: number; streak: number; readinessLabel: string | null; readinessScore: number | null };
type OgImageResponse = new (element: ReturnType<typeof createElement>, options: { width: number; height: number }) => { arrayBuffer(): Promise<ArrayBuffer> };

// Keep this native dynamic import: TypeScript's CommonJS transform rewrites a
// normal import into require(), while @vercel/og is ESM-only in Vercel's Node runtime.
const loadImageResponse = async (): Promise<OgImageResponse> => {
  const dynamicImport = Function('modulePath', 'return import(modulePath)') as (modulePath: string) => Promise<{ ImageResponse: OgImageResponse }>;
  return (await dynamicImport('@vercel/og')).ImageResponse;
};

const publicCard = async (token: string): Promise<PublicCard | null> => {
  const user = await prisma.user.findFirst({ where: { shareToken: token, shareEnabled: true, deletedAt: null }, include: { streak: true } });
  if (!user) return null;
  const totalSolved = await prisma.problemProgress.count({ where: { userId: user.id } });
  const tracker = user.shareTrackerId ? await prisma.companyTracker.findFirst({ where: { id: user.shareTrackerId, userId: user.id } }) : null;
  if (!tracker) return { username: user.name ?? user.leetcodeUsername ?? 'YEAP learner', totalSolved, streak: user.streak?.longestStreak ?? 0, readinessLabel: null, readinessScore: null };
  const [total, solved] = await Promise.all([prisma.problem.count({ where: { companyTags: { has: tracker.companyName } } }), prisma.problemProgress.count({ where: { userId: user.id, problem: { companyTags: { has: tracker.companyName } } } })]);
  return { username: user.name ?? user.leetcodeUsername ?? 'YEAP learner', totalSolved, streak: user.streak?.longestStreak ?? 0, readinessLabel: `${tracker.companyName} practice`, readinessScore: total ? Math.round((solved / total) * 100) : 0 };
};

export const ShareController = {
  async getSettings(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! }, select: { shareEnabled: true, shareToken: true, shareTrackerId: true } });
    res.json({ success: true, data: { enabled: user.shareEnabled, trackerId: user.shareTrackerId, shareUrl: user.shareEnabled && user.shareToken ? shareUrl(user.shareToken) : null } });
  },
  async settings(req: Request, res: Response): Promise<void> {
    const input = ShareSettings.safeParse(req.body);
    if (!input.success) { res.status(400).json({ success: false, error: 'Invalid sharing settings.' }); return; }
    if (input.data.trackerId) {
      const tracker = await prisma.companyTracker.findFirst({ where: { id: input.data.trackerId, userId: req.userId! } });
      if (!tracker) { res.status(400).json({ success: false, error: 'Selected tracker was not found.' }); return; }
    }
    const current = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! }, select: { shareToken: true } });
    const token = input.data.enabled ? current.shareToken ?? randomBytes(24).toString('base64url') : current.shareToken;
    await prisma.user.update({ where: { id: req.userId! }, data: { shareEnabled: input.data.enabled, shareToken: token, shareTrackerId: input.data.trackerId ?? null } });
    res.json({ success: true, data: { enabled: input.data.enabled, shareUrl: token && input.data.enabled ? shareUrl(token) : null } });
  },
  async data(req: Request, res: Response): Promise<void> {
    const data = await publicCard(req.params['shareToken']);
    if (!data) { res.status(404).json({ success: false, error: 'Shared progress not found.' }); return; }
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600').json({ success: true, data });
  },
  async image(req: Request, res: Response): Promise<void> {
    const data = await publicCard(req.params['shareToken']);
    if (!data) { res.status(404).end(); return; }
    const stat = (label: string, value: string) => createElement('div', { style: { display: 'flex', flexDirection: 'column', marginRight: 48 } }, createElement('span', { style: { fontSize: 22, color: '#9ca3af' } }, label), createElement('span', { style: { fontSize: 48, fontWeight: 700 } }, value));
    const element = createElement('div', { style: { height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, color: 'white', background: 'linear-gradient(135deg, #111827, #312e81)' } }, createElement('div', { style: { display: 'flex', fontSize: 28, color: '#a5b4fc', letterSpacing: 5 } }, 'YEAP'), createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, createElement('div', { style: { fontSize: 48, fontWeight: 700, marginBottom: 28 } }, `${data.username}'s prep progress`), createElement('div', { style: { display: 'flex' } }, stat('PROBLEMS SOLVED', String(data.totalSolved)), stat('LONGEST STREAK', `🔥 ${data.streak} days`), ...(data.readinessScore === null ? [] : [stat((data.readinessLabel ?? '').toUpperCase(), `${data.readinessScore}%`)]))), createElement('div', { style: { display: 'flex', fontSize: 20, color: '#c7d2fe' } }, 'Track your own interview prep · yeap.app'));
    const ImageResponse = await loadImageResponse();
    const image = new ImageResponse(element, { width: 1200, height: 630 });
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600').set('Content-Type', 'image/png').send(Buffer.from(await image.arrayBuffer()));
  },
  async page(req: Request, res: Response): Promise<void> {
    const data = await publicCard(req.params['shareToken']);
    if (!data) { res.status(404).send('Shared progress not found.'); return; }
    const base = (process.env['BACKEND_URL'] ?? 'https://yeap.app').replace(/\/$/, '');
    const imageUrl = `${base}/api/share/${req.params['shareToken']}/image.png`;
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600').type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta property="og:title" content="${escapeHtml(data.username)}'s YEAP prep progress"><meta property="og:image" content="${imageUrl}"><meta name="twitter:card" content="summary_large_image"><title>YEAP progress</title></head><body style="font-family:system-ui;background:#111827;color:#fff;text-align:center;padding:64px"><img src="${imageUrl}" alt="YEAP progress card" style="max-width:100%;border-radius:16px"><h1>${escapeHtml(data.username)} is preparing with YEAP</h1><p>${data.totalSolved} problems solved · longest streak: ${data.streak} days</p><a href="${(process.env['FRONTEND_URL'] ?? 'https://yeap.app').replace(/\/$/, '')}" style="color:#a5b4fc">Track your own prep →</a></body></html>`);
  },
};
