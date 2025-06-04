import User  from './user.model.js'
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '30d'});
}

// Register a new User
export const registerUser = async(req, res) => {
    const { email, password } = req.body;
    if(!email || !password) {
        return res.status(400).json({message: 'Please enter all the fields'})
    }

    try {
        const userExists = await User.findOne({email});

        if(userExists){
            return res.status(400).json({message: 'User  Already exists'});
        }
        const user = await User.create({
            email,
            password:password
        });

        if(user){
            res.status(201).json({
                _id: user._id,
                email: user.email,
                // token: generateToken(user._id)
            });
        }else{
            return res.status(400).json({message: 'Invalid user data'});
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration'})
    }
}

// user login
export const  loginUser = async(req,res)=>{
    const {email, password}= req.body;
    if(!email || !password) {
        return res.status(400).json({message: 'Please enter all the fields'})
    }

    try {
        const user = await User.findOne({email});
        if(user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                email: user.email,
                token: generateToken(user._id)
            })
        }else{
            return res.status(400).json({message: 'Invalid Credentials'});
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login'})
    }
}

