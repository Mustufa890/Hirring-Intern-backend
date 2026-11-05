const jwt = require('jsonwebtoken')

exports.protect = (req,res,next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if(!token){
  return res.status(401).json({message:"No Token"})  
  }
  try {
  const decoded = jwt.verify(token,process.env.JWT_SECRET);
  req.user = decoded;
  next();  
  } catch (err) {
  console.log("JWT Error:", err.message);
  return res.status(401).json({message: "Invalid Token"})  
  }   
}


exports.isAdmin = (req,res,next)=>{
   console.log("USER ROLE:", req.user.role);

   if(req.user.role !== "admin"){
   return res.status(403).json({message:"Admin Allow"})   
   }
   next()
}