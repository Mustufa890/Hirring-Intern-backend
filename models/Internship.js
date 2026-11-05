const { default: mongoose, model } = require("mongoose");

const internshipSchema = new mongoose.Schema({

   company:{
   type:mongoose.Schema.Types.ObjectId,
   ref:"User",
   required:true 
   },
   
   title:{
   type:String,
   required:true,
   trim:true 
   },

   description:{
   type:String,
   required:true 
   },

   skills:{
   type:[String],
   default:[] 
   },

   duration:{
   type:String,
   required:true 
   },
   
   location:{
   type:String,
   required:true 
   },

   stipend:{
   type:Number,
   default:0 
   },

   status:{
   type:String,
   enum:["open", "closed"],
   default:"open" 
   }
    

},{timestamps:true})

module.exports = mongoose.model("Internship", internshipSchema)