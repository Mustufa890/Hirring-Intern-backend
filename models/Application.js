const { default: mongoose } = require("mongoose");

const applicationSchema = new mongoose.Schema({

    internship:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Internship"    
    },

    applicant:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"    
    },

    resumeUrl:{
    type:String,
    required:true    
    },

    coverLetter:{
    type:String    
    },

  status: {
  type: String,
  enum: ["pending", "received", "reviewed", "shortlisted", "rejected"],
  default: "pending"
}
},{timestamps:true})

module.exports = mongoose.model("Application", applicationSchema)