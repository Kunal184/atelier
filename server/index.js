//imports
const express = require("express");
const cors = require("cors");
require('dotenv').config();

//initializing the express app
const app = express();

//middlewares
app.use(cors());
app.use(express.json());

//health check route 
app.get('/health', (req, res)=>{
    res.status(200).json({status: 'ok'});
})

//port definition
const PORT = process.env.PORT||5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})