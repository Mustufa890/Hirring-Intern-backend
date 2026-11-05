require('dotenv').config()
const express = require('express');
const http = require('http')
const connectDB = require('./config/db')
const cors = require('cors');
const { initSocket } = require('./socket');



const app = express()
app.use(express.json())
const cors=require("cors"); // ya const cors = require('cors');

const allowedOrigins = [
  'http://localhost:5173',
  'https://hirring-intern-production.up.railway.app',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Postman ya server-to-server requests ke liye
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes("hirring-intern")) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ⚠️ MAKE SURE: Yeh code aapke routes (jaise server.use('/api', ...)) se bilkul upar hona chahiye!



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