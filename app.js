// Imports
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const port = 1337;
const ejs = require('ejs');

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: '13371337',
    resave: false,
    saveUninitialized: true
}));
app.set('view engine', 'ejs');

// Database stuff
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
});
// Need table for blog too
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL
  );
`);
db.run(`
  CREATE TABLE IF NOT EXISTS blog (
  id INTEGER,
  blog_id INTEGER,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (id,blog_id)
  );
`);

db.run('INSERT INTO users (username, password) VALUES (?, ?)', ["Bob", "Bob"], function (err) {
    if (err) {
      console.error('Error inserting data:', err.message);
    } 
    else {
      console.log(`User "Bob" registered successfully.`);
    }
});


// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});
// Register route
app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    console.log(`Received data: username - ${username}, password - ${password}`);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function (err) {
        if (err) {
          console.error('Error inserting data:', err.message);
          res.status(500).send('Error registering user.');
        } 
        else {
          console.log(`User "${username}" registered successfully.`);
          res.redirect('/login');
        }
      });
});
// Login route
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Received login attempt: username - ${username}, password - ${password}`);
    db.get('SELECT id,username FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
      if (err) {
        console.error('Error querying the database:', err.message);
        res.status(500).send('Error querying the database.');
      } 
      else {
        if (row) {
          req.session.username = row.username;
          req.session.id = row.id;
          res.redirect('/user');
        } 
        else {
          res.send('Invalid login credentials.');
        }
      }
    });
});


// Start working from here
app.get('/user', (req, res) => {
  if(!req.session.id && !req.session.username){
    res.redirect('/login');
  } else {
    const username = req.session.username ;
    const id = req.session.id;
    db.all('SELECT * FROM blog WHERE id = ?',[id],(err,row) => {
      if(err) {
      res.render('profile', { username : username,row:row });
    } else {
      res.render('profile', { username : username,row:row});
    }
    });
  }
  });

app.post('/blog',(req,res) => {
  const id = req.session.id
  const {title,content} = req.body
  console.log(`The Blog is ${title} and ${content}`)
  db.run(`INSERT INTO blog (id,name,content) VALUES (?,?,?)`,[id,title,content],(err,row) => {
    if (err) {
      console.error('Error inserting blog', err.message);
      res.status(500).send('Error inserting blog.');
    } 
    else {
      console.log(`Blog written successful`);
      res.redirect('/user');
    }
  });
});

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});