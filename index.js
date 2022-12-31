const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const moment = require('moment'); 
const momentTz = require('moment-timezone');

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

    const momentDate = momentTz.tz(new Date(), 'Asia/Kuala_Lumpur');
    const log = {
      user_id: userData._id,
      date: body?.date ? momentTz.tz(new Date(body.date), 'Asia/Kuala_Lumpur'): momentDate,
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
    
    res.json(createdLogRes);
  } catch (e) {
    console.log(e);
    res.json({ error: "Fail to add exercises" });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {

    const userData = await findById("user", req.params._id);

    let filter = {
      user_id: req.params._id,
    };

    if (req?.query?.from && req?.query?.to) {
      filter = {
        ...filter,
        date: { $gte: new Date(req.query.from), $lte: new Date(req.query.to) },
      }
    }

    const totalDocs = await countDocs("log", filter);
    
    const logs = await getDocsWithFilter("log", filter, "description duration date", req?.query?.limit)
    
    const response = {
      username: userData.username,
      count: totalDocs,
      _id: userData._id,
      log: logs.map((log) => {
        const date = new Date(log.date);
        return {
          description: log.description,
          duration: log.duration,
          date: date.toDateString(),
        }
      }),
    };

    res.json(response);
    
  } catch (e) {
    console.log(e);
    res.json({ error: "Fail to get users logs exercise" });
  }
});

function getMonthShortName(monthNo) {
  const date = new Date();
  date.setMonth(monthNo - 1);

  return date.toLocaleString('en-US', { month: 'short' });
}

async function createDoc(model, doc) {
  let res;
  
  if (model === "user") {
    res = await Users.create(doc);
  } else if (model === "log") {
    res = await Logs.create(doc);
  }
  
  return res;
}

async function countDocs(model, filterQuery) {
  let res;
  
  if (model === "log") {
    res = await Logs.countDocuments(filterQuery);
  }
  return res;
}

async function getDocsWithFilter(model, filterQuery, selectedFields, limit) {
  let res;
  
  if (model === "log") {
    if (limit) {
      res = await Logs.find(filterQuery, selectedFields).limit(limit).exec();
    } else {
      res = await Logs.find(filterQuery, selectedFields).exec();
    }
  }

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
