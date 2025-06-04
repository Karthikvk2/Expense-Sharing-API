import mongoose from "mongoose";

const BalanceSchema = new mongoose.Schema({
    groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true
        },
        userOwedId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        userOwingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            default: 0,
            min: [0, 'Balance cannnot be negative']
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
});

BalanceSchema.index({ groupId: 1, userOwedId: 1, userOwingId: 1 }, { unique: true });
const Balance= mongoose.model('Balance', BalanceSchema)
export default Balance 