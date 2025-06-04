import Group from './group.model.js';
import GroupMember from '../groupMember/groupMember.model.js';
import User from '../user/user.model.js';
import { sendEmail } from '../../utils/emailServicce.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Create a new group

export const createGroup = async (req, res) => {
    const { name } = req.body;
    const ownerId = req.user._id;

    if (!name) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    try {
        const existingGroup = await Group.findOne({ name });
        if (existingGroup) {
            return res.status(400).json({ message: 'Group with this name already exists' });
        }

        const group = await Group.create({
            name,
            ownerId,
        });

        await GroupMember.create({
            groupId: group._id,
            userId: ownerId,
        });

        res.status(201).json({
            message: 'Group created successfully and you are now a member!',
            group: {
                _id: group._id,
                name: group.name,
                ownerId: group.ownerId,
                createdAt: group.createdAt,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating group' });
    }
};

// Delete a group (only by owner)

export const deleteGroup = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user._id; 

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to delete this group' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await Group.deleteOne({ _id: groupId }, { session });
            await GroupMember.deleteMany({ groupId: groupId }, { session });

            await session.commitTransaction();
            session.endSession();

            res.status(200).json({ message: 'Group and all associated data deleted successfully' });
        } catch (transactionError) {
            await session.abortTransaction();
            session.endSession();
            console.error('Transaction failed during group deletion:', transactionError);
            res.status(500).json({ message: 'Failed to delete group and associated data due to a transaction error' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting group' });
    }
};

// Invite a user to a group by email

export const inviteUserToGroup = async (req, res) => {
    const { groupId } = req.params;
    const { email } = req.body;
    const inviterId = req.user._id; 

    if (!email) {
        return res.status(400).json({ message: 'Email is required for invitation' });
    }

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const inviterIsMember = await GroupMember.findOne({ groupId, userId: inviterId });
        if (!inviterIsMember) {
            return res.status(403).json({ message: 'You must be a member of this group to invite others' });
        }

        const invitedUser = await User.findOne({ email });
        if (!invitedUser) {
            return res.status(404).json({ message: 'No user found with this email address' });
        }

        const alreadyMember = await GroupMember.findOne({ groupId, userId: invitedUser._id });
        if (alreadyMember) {
            return res.status(400).json({ message: 'This user is already a member of the group' });
        }

        const inviteToken = jwt.sign(
            { groupId: group._id, userId: invitedUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const inviteLink = `${process.env.BASE_URL}/api/groups/${group._id}/join?token=${inviteToken}`;

        const emailSubject = `Invitation to join ${group.name} on Expense Sharing App`;

        const emailHtml = `
            <p>Hello ${invitedUser.email},</p>
            <p>You have been invited to join the group <strong>${group.name}</strong> on the Expense Sharing App.</p>
            <p>Click the link below to join the group:</p>
            <p><a href="${inviteLink}">Join Group: ${group.name}</a></p>
            <p>This link is valid for 24 hours.</p>
            <p>Thanks,</p>
            <p>The Expense Sharing App Team</p>
        `;

        const emailSent = await sendEmail(email, emailSubject, emailHtml);

        if (emailSent) {
            res.status(200).json({ message: 'Invitation email sent successfully!' });
        } else {
            res.status(500).json({ message: 'Failed to send invitation email.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error sending invitation' });
    }
};

// Join a group via tokenized link

export const joinGroup = async (req, res) => {
    const { groupId } = req.params;
    const { token } = req.query; 

    if (!token) {
        return res.status(400).json({ message: 'Invitation token is missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.groupId !== groupId) {
            return res.status(400).json({ message: 'Invalid invitation link for this group' });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const userToJoin = await User.findById(decoded.userId);
        if (!userToJoin) {
            return res.status(404).json({ message: 'User specified in token not found' });
        }

        const alreadyMember = await GroupMember.findOne({ groupId, userId: userToJoin._id });
        if (alreadyMember) {
            return res.status(200).json({ message: 'You are already a member of this group!' });
        }

        await GroupMember.create({
            groupId: group._id,
            userId: userToJoin._id,
        });

        res.status(200).json({
            message: `Successfully joined group: ${group.name}!`,
            group: {
                _id: group._id,
                name: group.name,
            },
            user: {
                _id: userToJoin._id,
                email: userToJoin.email,
            }
        });

    } catch (error) {
        console.error(error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invitation link has expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid invitation token' });
        }
        res.status(500).json({ message: 'Server error joining group' });
    }
};

// List all groups a user belongs to

export const listUserGroups = async (req, res) => {
    const { userId } = req.params;
    const authenticatedUserId = req.user._id; 
    if (authenticatedUserId.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized to view other users\' groups' });
    }

    try {
        const groupMemberships = await GroupMember.find({ userId }).populate('groupId');

        const groups = groupMemberships.map(membership => membership.groupId);

        res.status(200).json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching user groups' });
    }
};