/**
 * auth.ts — Auth routes.
 */

import { Router } from 'express';
import { signup, login, refresh } from '../controllers/authController';
import { googleAuth } from '../controllers/googleAuthController';

const router = Router();

router.post('/signup',  (req, res) => { void signup(req, res); });
router.post('/login',   (req, res) => { void login(req, res); });
router.post('/refresh', refresh);
router.post('/google',  (req, res) => { void googleAuth(req, res); });

export default router;
