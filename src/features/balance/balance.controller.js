import mongoose from 'mongoose';
import Balance from './balance.model.js';
import Settlement from '../settlement/settlement.model.js';
import GroupMember from '../groupMember/groupMember.model.js';

// Get current balance sheet for a group
export const getGroupBalances = async (req, res) => {
    const { groupId } = req.params;
    const currentUserId = req.user._id; 

    try {
        const isMember = await GroupMember.findOne({ groupId, userId: currentUserId });
        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this group.' });
        }

        const balances = await Balance.find({ groupId, amount: { $gt: 0 } }) 
            .populate('userOwedId', 'email')  
            .populate('userOwingId', 'email'); 

        const formattedBalances = balances.map(balance => ({
            userOwed: balance.userOwedId.email,
            userOwing: balance.userOwingId.email,
            amount: balance.amount.toFixed(2), 
            lastUpdated: balance.lastUpdated
        }));

        res.status(200).json(formattedBalances);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching group balances' });
    }
};

// Record a settlement transaction
export const recordSettlement = async (req, res) => {
    const { groupId } = req.params;
    const { payerId, payeeId, amount } = req.body;
    const currentUserId = req.user._id; 
    if (!payerId || !payeeId || !amount) {
        return res.status(400).json({ message: 'Please provide payer, payee, and amount for settlement.' });
    }
    if (amount <= 0) {
        return res.status(400).json({ message: 'Settlement amount must be positive.' });
    }
    if (payerId === payeeId) {
        return res.status(400).json({ message: 'Payer and Payee cannot be the same for a settlement.' });
    }

    try {
        const isMember = await GroupMember.findOne({ groupId, userId: currentUserId });
        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this group.' });
        }
        const members = await GroupMember.find({ groupId, userId: { $in: [payerId, payeeId] } });
        if (members.length !== 2) {
            return res.status(400).json({ message: 'Both payer and payee must be members of this group.' });
        }
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const settlement = await Settlement.create([{
                groupId,
                payerId,
                payeeId,
                amount,
            }], { session }); 
            let balanceToUpdate = await Balance.findOne({
                groupId,
                userOwedId: payeeId, 
                userOwingId: payerId 
            }).session(session);

            if (balanceToUpdate && balanceToUpdate.amount > 0) {
                balanceToUpdate.amount = Math.max(0, balanceToUpdate.amount - amount);
                await balanceToUpdate.save({ session });
            } else {
                await Balance.findOneAndUpdate(
                    {
                        groupId,
                        userOwedId: payerId,
                        userOwingId: payeeId  
                    },
                    {
                        $inc: { amount: amount }, 
                        $set: { lastUpdated: Date.now() }
                    },
                    {
                        upsert: true,
                        new: true,
                        session
                    }
                );
            }

            await session.commitTransaction();
            session.endSession();

            res.status(201).json({
                message: 'Settlement recorded successfully and balances adjusted!',
                settlement: settlement[0] 
            });

        } catch (transactionError) {
            await session.abortTransaction();
            session.endSession();
            console.error('Transaction failed during settlement recording:', transactionError);
            res.status(500).json({ message: 'Failed to record settlement and adjust balances due to a transaction error.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error recording settlement' });
    }
};

//List a user's pending settlements across groups

export const getUserPendingSettlements = async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id; 
    if (currentUserId.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized to view other users\' pending settlements.' });
    }

    try {
        const balancesOwedToUser = await Balance.find({
            userOwedId: userId,
            amount: { $gt: 0 }
        })
        .populate('groupId', 'name')
        .populate('userOwingId', 'email');

        const balancesUserOwes = await Balance.find({
            userOwingId: userId,
            amount: { $gt: 0 }
        })
        .populate('groupId', 'name')
        .populate('userOwedId', 'email');

        const pendingSettlements = [];

        balancesOwedToUser.forEach(balance => {
            pendingSettlements.push({
                groupId: balance.groupId._id,
                groupName: balance.groupId.name,
                type: 'You are owed',
                from: balance.userOwingId.email,
                amount: balance.amount.toFixed(2)
            });
        });

        balancesUserOwes.forEach(balance => {
            pendingSettlements.push({
                groupId: balance.groupId._id,
                groupName: balance.groupId.name,
                type: 'You owe',
                to: balance.userOwedId.email,
                amount: balance.amount.toFixed(2)
            });
        });

        res.status(200).json(pendingSettlements);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching pending settlements' });
    }
};

