import { Router } from 'express';
import { validate } from '../middlewares/validate.ts';
import { authenticate } from '../middlewares/authenticate.ts';
import { loginBodySchema, registerBodySchema } from '../validators/schemas.ts';
import * as ctrl from '../controllers/authController.ts';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerBodySchema }), ctrl.register);
authRouter.post('/login', validate({ body: loginBodySchema }), ctrl.login);
authRouter.get('/me', authenticate, ctrl.me);