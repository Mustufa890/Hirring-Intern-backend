const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const Internship = require('../models/Internship');
const Application = require("../models/Application");




exports.signup = async (req, res) => {
  try {
    const { name, companyName, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password required'
      });
    }

    const accountRole = role || 'candidate';

    if (!['candidate', 'company'].includes(accountRole)) {
      return res.status(400).json({
        message: 'Invalid role'
      });
    }

    if (accountRole === 'candidate' && !name?.trim()) {
      return res.status(400).json({
        message: 'Candidate name required'
      });
    }

    if (accountRole === 'company' && !companyName?.trim()) {
      return res.status(400).json({
        message: 'Company name required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: accountRole === 'candidate' ? name.trim() : '',
      companyName: accountRole === 'company' ? companyName.trim() : '',
      email: normalizedEmail,
      password: hashedPassword,
      role: accountRole
    });

    return res.status(201).json({
      message: 'Signup Successful'
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: 'User does not exist'
      });
    }

    const isMatched = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatched) {
      return res.status(400).json({
        message: 'Invalid password'
      });
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '40m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    user.refreshToken = refreshToken;
    await user.save();

    return res.json({
      message: 'Login Successful',
      user: {
        _id: user._id,
        name: user.name,
        companyName: user.companyName,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};


exports.refreshToken = async(req,res)=>{
   const {token} = req.body;
   if(!token){
   return res.status(400).json({message:"No refresh Token"}) 
   }
   try {
   const decoded = jwt.verify(token,process.env.REFRESH_SECRET);
   const user = await User.findById(decoded.id)
   if(!user || user.refreshToken !== token ){
   return res.status(403).json({message:"Invalid Token"}) 
   }
   const newAccessToken = jwt.sign(
   {id: user.id, role: user.role},
   process.env.JWT_SECRET,
   {expiresIn:"40m"} 
   )
   res.json({"accessToken":newAccessToken})
   } catch (err) {
   res.status(401).json({message:"Invalid or Expire Token"}) 
   } 
}


exports.getProfile = async(req,res)=>{
    try {
    const user = await User.findById(req.user.id)
    .select("-password")
    if(!user){
    return res.status(404).json({message:"User not found"})    
    }
    res.json({message:"User Profile",user})    
    } catch (err) {
    res.status(500).json({error:err.message})    
    }
}

exports.logout = async(req,res)=>{
    const user = await User.findById(req.user.id)
    user.refreshToken = null
    await user.save()
    res.json({message:"Logout Successfull"})
}

exports.roleCheck = async(req,res)=>{  
    try {  
   const totalCandidate = await User.countDocuments({ role: "candidate" })
   const totalCompanies = await User.countDocuments({ role: "company" })
   const totalInternship = await Internship.countDocuments( )
   const totalApplication = await Application.countDocuments( )  
   res.json({
    totalCandidate,
    totalCompanies,
    totalInternship,
    totalApplication
   })
    } catch (err) {
    return res.status(500).json({error:err.message})    
    } 
}


exports.changePassword = async(req,res)=>{
    try {
    const {oldPassword, newPassword} = req.body;
    const user = await User.findById(req.user.id)
    if(!user){
    return res.status(404).json({message:"User not found"})    
    }
    
    const isMatch = await bcrypt.compare(oldPassword,user.password)
    if(!isMatch){
    return res.status(400).json({message:"old Password is Incorrect"})    
    }

    if(!newPassword || newPassword.length < 6 ){
    return res.status(403).json({message:"Password must be atlest 6 character"})    
    }

    const salt = await bcrypt.genSalt(10)
    const  hahsedpassword = await bcrypt.hash(newPassword,salt)
    user.password = hahsedpassword
    await user.save()
    res.json({message:"Password Change Successfully"})
    } catch (err) {
    res.status(500).json({error:err.message})    
    }
}

exports.forgotPassword = async(req,res) => {
    try {
    const { email } = req.body;
    const user = await User.findOne({email});
    if(!user){
    return res.status(404).json({message:"User not found"});    
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpire = Date.now() + 15 *  60 * 1000; 
    await user.save();
    const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS    
    },    
    });
    const resetLink = `http://localhost:5173/reset-password/${resetToken}`;
    await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Password Reset Request",
    html:`
         <h2>Passord Reset Request</h2>
         <p> click the button below to reset your password </p>
         <a href="${resetLink}" >Reset Password</a>
    `,    
    });
    res.json({message: "password reset link sent your email"})

    } catch (err) {
    res.status(500).json({error: err.message})    
    }
}

exports.resetPassword = async(req,res)=>{
    try {
    const {token}  = req.params;
    const {password} = req.body;
    
    const user = await User.findOne({
    resetToken: token,
    resetTokenExpire:{
    $gt: Date.now(),    
    },    
    });
    if(!user){
     return res.status(400).json({message:"Invalid or Expired token"});   
    }

    const salt = await bcrypt.genSalt(10)
    const hahsedpassword = await bcrypt.hash(password,salt)
    user.password = hahsedpassword;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();
    res.json({message: "Password Reset Successfully",});
    } catch (err) {
    res.status(500).json({error:err.message})    
    }
};