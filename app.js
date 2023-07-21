// Imports
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const port = 1337;

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: '13371337',
    resave: false,
    saveUninitialized: true
}));

// Database stuff
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
});
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL
  )
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
          req.session.username = username;
          res.redirect('/user');
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
    db.get('SELECT username FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
      if (err) {
        console.error('Error querying the database:', err.message);
        res.status(500).send('Error querying the database.');
      } 
      else {
        if (row) {
          req.session.username = row.username;
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
    const username = req.session.username || 'Guest';
    res.send(`Current user: ${username}`);
});

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});