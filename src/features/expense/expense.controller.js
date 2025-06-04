import Expense from './expense.model.js'
import GroupMember from '../groupMember/groupMember.model.js'
import Balance from '../balance/balance.model.js'
import mongoose from 'mongoose'

const updateBalances = async (groupId, payerId, participants, sharePerUser, session) => {
    for (const participantId of participants) {
        if (participantId.toString() === payerId.toString()) {
            continue; 
        }

        const userOwedId = payerId;
        const userOwingId = participantId;
        const amountToUpdate = sharePerUser;

        await Balance.findOneAndUpdate(
            {
                groupId,
                userOwedId,
                userOwingId,
            },
            {
                $inc: { amount: amountToUpdate }, 
                $set: { lastUpdated: Date.now() } 
            },
            {
                upsert: true, 
                new: true,   
                session 
            }
        );
    }
};


// Create a new expense in a group

export const createExpense = async (req, res) => {
    const { groupId } = req.params;
    const { title, amount, payerId, participants, date } = req.body;
    const currentUserId = req.user._id; 

    if (!title || !amount || !payerId || !participants || participants.length === 0) {
        return res.status(400).json({ message: 'Please provide title, amount, payer, and at least one participant.' });
    }
    if (amount <= 0) {
        return res.status(400).json({ message: 'Amount must be positive.' });
    }

    try {
        const isMember = await GroupMember.findOne({ groupId, userId: currentUserId });
        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this group.' });
        }

        const payerIsMember = await GroupMember.findOne({ groupId, userId: payerId });
        if (!payerIsMember) {
            return res.status(400).json({ message: 'Payer is not a member of this group.' });
        }

        const participantIds = participants.map(p => new mongoose.Types.ObjectId(p)); 
        const validParticipantsCount = await GroupMember.countDocuments({
            groupId,
            userId: { $in: participantIds }
        });

        if (validParticipantsCount !== participants.length) {
            return res.status(400).json({ message: 'One or more participants are not members of this group.' });
        }

        const sharePerUser = amount / participants.length;
        const session = await mongoose.startSession();
        session.startTransaction();

        try {

            const expense = await Expense.create([{
                groupId,
                title,
                amount,
                date: date || Date.now(), 
                payerId,
                participants: participantIds,
                sharePerUser,
            }], { session }); 

            await updateBalances(groupId, payerId, participantIds, sharePerUser, session);


            await session.commitTransaction();
            session.endSession();

            res.status(201).json({
                message: 'Expense created successfully and balances updated!',
                expense: expense[0] 
            });

        } catch (transactionError) {
            await session.abortTransaction();
            session.endSession();
            console.error('Transaction failed during expense creation:', transactionError);
            res.status(500).json({ message: 'Failed to create expense and update balances due to a transaction error.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating expense' });
    }
};

// Get all expenses for a specific group
export const getGroupExpenses = async (req, res) => {
    const { groupId } = req.params;
    const currentUserId = req.user._id; 

    try {
        const isMember = await GroupMember.findOne({ groupId, userId: currentUserId });
        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this group.' });
        }

        const expenses = await Expense.find({ groupId })
            .populate('payerId', 'email') 
            .populate('participants', 'email')
            .sort({ date: -1, createdAt: -1 }); 
        res.status(200).json(expenses);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching group expenses' });
    }
};


