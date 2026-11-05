const Notification = require("../models/Notification")

exports.createNotification = async(req,res)=>{
    try {
    const {receiver,type,message} = req.body;
    
    if(!receiver || !type || !message){
    return res.status(400).json({message:"Receive Type message is required"})    
    }

    const notification = await Notification.create({receiver,type,message})
    if(notification){
    return res.status(201).json({message:"Notification Create Successfull",notification})    
    }
    } catch (err) {
    return res.status(500).json({error:err.message})    
    }
}

exports.getNotification = async(req,res)=>{
    try {
    const {receiver} = req.body;
    const notification = await Notification.find({receiver}).sort({createdAt: -1})
    
    if(notification.length===0){
    return res.status(404).json({message:" Not receive notification"})    
    }
    
    return res.status(200).json({message:"Notification show successfull",notification})
    } catch (err) {
    return res.status(500).json({error:err.message})    
    }
}

exports.Readmessage = async(req,res)=>{
    try {
    const {id} = req.params;
    
    const read = await Notification.findByIdAndUpdate(id,{isRead:true},{new:true})

    if(!read){
    return res.status(404).json({message:"Message read not found"})    
    }

    return res.status(200).json({message:"Message read Sucessfull"})
    } catch (err) {
    return res.status(500).json({error:err.message})    
    }
}


exports.deleteNotifications = async(req,res)=>{
    try {
    const {id} = req.params;
    
    const notification = await Notification.findByIdAndDelete(id)

    if(!notification){
    return res.status(404).json({message:"Notifications not found "})    
    }

    return res.status(200).json({message:"Notification delete",notification})
    } catch (err) {
    return res.status(500).json({error:err.message})    
    }
}