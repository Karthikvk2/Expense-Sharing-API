import express from 'express';
import {protect} from '../../middleware/auth.middleware.js';
import {createGroup, deleteGroup, inviteUserToGroup, joinGroup, listUserGroups} from './group.controller.js'

export const groupRouter = express.Router();

groupRouter.post('/', protect, createGroup); 
groupRouter.delete('/:groupId', protect, deleteGroup); 
groupRouter.post('/:groupId/invite', protect, inviteUserToGroup); 
groupRouter.get('/:groupId/join', joinGroup); 
groupRouter.get('/users/:userId/groups', protect, listUserGroups); 

