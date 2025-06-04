import express from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import {getGroupBalances, getUserPendingSettlements, recordSettlement} from './balance.controller.js'

export const balanceRouter = express.Router();

balanceRouter.get('/:groupId/balances', protect, getGroupBalances); 
balanceRouter.post('/:groupId/settlements', protect, recordSettlement);
balanceRouter.get('/users/:userId/settlements', protect, getUserPendingSettlements); 

