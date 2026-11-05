const { default: mongoose } = require("mongoose");

const notificationSchema = new mongoose.Schema({

    sender:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"    
    },

    receiver:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"    
    },

    type:{
    type:String,
    enum:["Internship","Task","Interview"],
    default:"Internship"    
    },

    message:{
    type:String    
    },

    isRead:{
    type:Boolean,
    default:false    
    }


},{timestamps:true})

module.exports = mongoose.model("Notification",notificationSchema)