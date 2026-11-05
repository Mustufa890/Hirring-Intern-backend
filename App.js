require('dotenv').config()
const express = require('express');
const http = require('http')
const connectDB = require('./config/db')
const cors = require('cors');
const { initSocket } = require('./socket');



const app = express()
app.use(express.json())
server.use(cors({
  origin: function (origin, callback) {
    // 1. Allow server-to-server, Postman, or local testing tools (no origin header)
    if (!origin) return callback(null, true);
    
    // 2. Allow ANY subdomain or production domain containing your app name
    if (origin.includes("hirring-intern") || origin.includes("localhost")) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"), false)
    }
  },
  credentials: true
}));


connectDB();


app.use('/api/application',require('./routes/applicationRoute'))
app.use('/api/auth',require('./routes/authRoute'))
app.use('/api/conversation',require('./routes/conversationRoute'))
app.use('/api/internship',require('./routes/internshipRoute'))
app.use('/api/message',require('./routes/messageRoute'))
app.use('/api/notification',require('./routes/notificationRoute'))
app.use('/api/assessment',require('./routes/assessmentRoute'))

const server = http.createServer(app);

const io = initSocket(server);
app.set('io', io);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

server.listen(process.env.PORT, () => {
  console.log(`Server is running ${process.env.PORT}`)
})