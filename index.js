const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Setting up body-parser
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function middleware(req, res, next) {
  next();
});

// Setting up MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Creating Schema
const exerciseTrackerUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseTrackerLogSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Users = mongoose.model("ExerciseTrackerUsers", exerciseTrackerUserSchema);
const Logs = mongoose.model("ExerciseTrackerLogs", exerciseTrackerLogSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const body = req.body;
  try {
    const doc = await createDoc("user", { username: body.username })
    const response = {
      username: doc.username,    
      _id: doc._id,
    };
    
    res.json(response);
  } catch (e) {
    console.error(e)
    res.json({ error: "Fail to create user" });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const docs = await getDocs('user');
    res.json(docs);
  } catch (e) {
    console.log(e);
    res.json({ error: "Fail to get users" });
  }
});

app.post('/api/users/:id/exercises', async (req, res) => {
  const body = req.body;
  const id = req.params.id;
  
  try {
    const userData = await findById("user", id);
    
    const log = {
      user_id: userData._id,
      date: body?.date ? new Date(body.date): new Date(),
      description: body.description,
      duration: body.duration
    };
    
    const createdLog = await createDoc('log', log);
    
    let createdLogRes = { 
      description: createdLog.description,
      duration: createdLog.duration,
      date: new Date(createdLog.date).toDateString(),
      _id: userData._id,
      username: userData.username 
    };

    delete createdLogRes["user_id"];

    console.log("Response create exercises = ", createdLogRes);
    
    res.json(createdLogRes);
  } catch (e) {
    console.log(e);
    res.json({ error: "Fail to add exercises" });
  }
});

async function createDoc(model, doc) {
  let res;
  
  if (model === "user") {
    res = await Users.create(doc);
  } else if (model === "log") {
    res = await Logs.create(doc);
  }

  console.log(`Create doc for ${model} response = ${res}`);
  
  return res;
}

async function getDocs(model) {
  let res;
  if (model === "user") {
    res = await Users.find();  
  } else if (model === "log") {
    res = await Logs.find();
  }
  
  return res;
}

async function findById(model, id) {
  let res;
  if (model === "user") {
    res = await Users.findById(id).exec();
  }
  return res;
}

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
