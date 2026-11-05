const { default: mongoose } = require("mongoose")

const connectDB = async () =>{
  try {
  await mongoose.connect(process.env.MONGO_URI,{

  })
  console.log("MongoDB Connected");
    
  } catch (err) {
  console.log(err.message);
  }  
}

module.exports = connectDB