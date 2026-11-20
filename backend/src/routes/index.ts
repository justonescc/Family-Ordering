import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { familiesRouter } from './families';
import { menuRouter } from './menu';
import { categoriesRouter } from './categories';
import { dishesRouter } from './dishes';
import { mealsRouter } from './meals';
import { membersRouter } from './members';
import { ordersRouter } from './orders';

export const routes = Router();

routes.use('/healthz', healthRouter);
routes.use('/auth', authRouter);
routes.use('/families', familiesRouter);
routes.use('/menu', menuRouter);
routes.use('/families/me/categories', categoriesRouter);
routes.use('/families/me/dishes', dishesRouter);
routes.use('/families/me/meals', mealsRouter);
routes.use('/families/me/members', membersRouter);
routes.use('/orders', ordersRouter);
