import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import { userRouter } from './src/features/user/user.routes.js';
import { groupRouter } from './src/features/group/group.routes.js';
import { expenseRouter } from './src/features/expense/expense.routes.js';
import { balanceRouter } from './src/features/balance/balance.routes.js';


dotenv.config();
connectDB();
const app = express();
app.use(express.json());

// Basic route for testing server status
app.get('/', (req, res) => {
    res.send('Welcome to Expense Sharing API');
});

app.use('/api/auth', userRouter);
app.use('/api/groups', groupRouter);
app.use('/api', expenseRouter); 
app.use('/api', balanceRouter); 

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});
