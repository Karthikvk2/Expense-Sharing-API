import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import {createExpense, getGroupExpenses} from './expense.controller.js'

export const expenseRouter = express.Router(); 

expenseRouter.post('/:groupId/expenses', protect, createExpense);
expenseRouter.get('/:groupId/expenses', protect, getGroupExpenses);

