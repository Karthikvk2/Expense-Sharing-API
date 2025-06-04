import mongoose from "mongoose";

const  ExpenseSchema = new mongoose.Schema({
    groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true
    },
    title: {
        type: String,
        required: [true, 'Expense title is required'],
        trim: true,
    },
    amount: {
        type: Number,
        required: [true, 'Expense amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    date: {
        type: Date,
        default: Date.now
    },
    payerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    sharePerUser: {
        type: Number,
        required: true,
        min: [0, 'Share Amount cannot be negative']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const Expense = mongoose.model('Expense', ExpenseSchema)
export default Expense