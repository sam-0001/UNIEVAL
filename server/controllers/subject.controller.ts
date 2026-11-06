/**
 * server/controllers/subject.controller.ts
 * Subject catalog and academic taxonomy controller.
 */

import express from 'express';
import { Subject } from '../models/index.js';
import { generateId } from './auth.controller.js';
import { cache } from '../services/cache.service.js';
import logger from '../logger.js';

export async function getSubjects(req: express.Request, res: express.Response): Promise<void> {
    const query: any = {};
    if (req.query.year) query.year = Number(req.query.year as string);
    if (req.query.branch) query.branch = String(req.query.branch);
    try {
        const cacheKey = `subjects:${query.branch || 'all'}:${query.year || 'all'}`;
        const subjects = await cache.getOrSet(cacheKey, () => Subject.find(query).lean(), 1800);
        res.json(subjects);
    } catch (err) {
        logger.error('[Subjects] getSubjects:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}

export async function createSubject(req: express.Request, res: express.Response): Promise<void> {
    const { name, code, branch, year } = req.body;
    if (!name || !branch || !year) {
        res.status(400).json({ error: 'Name, branch, and year are required' });
        return;
    }
    try {
        const existing = await Subject.findOne({
            name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            branch,
            year
        });
        if (existing) {
            res.json(existing);
            return;
        }
        const newSubject = await Subject.create({
            id: generateId(),
            name,
            code: code || name.substring(0, 3).toUpperCase(),
            branch,
            year
        });
        await cache.invalidate('subjects:*');
        res.json(newSubject);
    } catch (err) {
        logger.error('[Subjects] createSubject:', err);
        res.status(500).json({ error: 'An internal error occurred' });
    }
}
