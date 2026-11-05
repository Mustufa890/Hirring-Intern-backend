const Internship = require('../models/Internship')

exports.createInternship = async (req, res) => {
  try {
    const { title, description, skills, duration, location, stipend } = req.body;

    if (!title || !description || !duration || !location) {
      return res.status(400).json({ message: "Fields required" });
    }

    if (req.user.role !== "company") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const internship = await Internship.create({
      company: req.user.id,
      title,
      description,
      skills,
      duration,
      location,
      stipend
    });

    const io = req.app.get('io');

    const populatedInternship = await Internship.findById(internship._id)
      .populate('company', 'name email');

    io.to('admins').emit('newInternship', populatedInternship);

    return res.status(201).json({
      message: "Internship created",
      internship: populatedInternship
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.Allinternship = async(req,res)=>{
  try {
  
  const internship = await Internship.find({status: "open"}).populate("company", "email") 
  
  return res.status(200).json({count: internship.length, internships:internship})  
  
  } catch (err) {
  return res.status(500).json({error:err.message})  
  }
}

exports.singleInternship = async(req,res)=>{
  try {
  const {id} = req.params;
  const internship = await Internship.findById(id).populate("company", "email")
  if(!internship){
  return res.status(404).json({message:"Not found"})  
  } 
  
  return res.status(200).json({internship})
  } catch (err) {
  return res.status(500).json({error:err.message})  
  }
}


exports.MyInternship = async(req,res)=>{
  try {
 
  const internship = await Internship.find({company:req.user.id}).sort({createdAt: -1});
  
  return res.status(200).json({count: internship.length, internships:internship})  
  
  } catch (err) {
   return res.status(500).json({error:err.message}) 
  }
}

exports.updateInternship = async(req,res)=>{
  try {
  const {id} = req.params;
  const {title, description, skills, duration, location,stipend } = req.body;
  
  const updateintern = await Internship.findById(id)
  if(!updateintern){
  return res.status(404).json({message:"Update not found"})  
  }

  if(updateintern.company.toString() !== req.user.id){
  return res.status(403).json({message:"Not Allowed"})  
  }

  

  if (title !== undefined) updateintern.title = title;
if (description !== undefined) updateintern.description = description;

if (skills !== undefined) updateintern.skills = skills;
if (duration !== undefined) updateintern.duration = duration;
if (location !== undefined) updateintern.location = location;
if (stipend !== undefined) updateintern.stipend = stipend;

await updateintern.save();

return res.status(200).json({message:"Update Internship Successfull",internship:updateintern})

  } catch (err) {
  return res.status(500).json({error:err.message})  
  }
}

exports.deleteInternship= async(req,res)=>{
  try {
  const {id} = req.params;
  const deleteIntern = await Internship.findById(id)
  if(!deleteIntern){
  return res.status(404).json({message:"Internship not found"})  
  }

  if(deleteIntern.company.toString() !== req.user.id){
  return res.status(403).json({message:"Not Allowed"})  
  }

  await deleteIntern.deleteOne()

  return res.status(200).json({message:"Internship Delete Successfull"})
  } catch (err) {
  return res.status(500).json({error:err.message})  
  }
}