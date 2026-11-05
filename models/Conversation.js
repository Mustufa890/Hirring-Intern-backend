const { default: mongoose } = require("mongoose");

const conversationSchema = new mongoose.Schema({

   participants:[{
   type:mongoose.Schema.Types.ObjectId,
   ref:"User",
   required:true 
   }],
   
   internship:{
   type:mongoose.Schema.Types.ObjectId,
   ref:"Internship",
   required:true 
   }


},{timestamps:true})

module.exports = mongoose.model("Conversation", conversationSchema)