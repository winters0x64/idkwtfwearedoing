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
let database = new Promise(function(data,error) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      followers INTEGER DEFAULT 0,
      following INTEGER DEFAULT 0
    );
`);
db.run(`
  CREATE TABLE IF NOT EXISTS blog (
  blog_id INTEGER PRIMARY KEY AUTOINCREMENT,
  id INTEGER,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY (id) REFERENCES users(id)
  );
`);
db.run(`
CREATE TABLE IF NOT EXISTS reach (
  follower INTEGER,
  followed INTEGER,
  PRIMARY KEY (follower,followed)
)`)
})

/* database.then(
  function(value) {
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', ["Bob", "Bob"], function (err) {
    if (err) {
      console.error('Error inserting data:', err.message);
    } 
    else {
      console.log(`User "Bob" registered successfully.`);
    }
});}
) */

db.get('select id from users where username = ?',["bob"],function(err,data) {
  if (err) {
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', ["bob", "bob"], function (err) {
      if (err) {
        console.error('Error inserting data:', err.message);
      } 
      else {
        console.log(`User "bob" registered successfully.`);
      }
  });
  } else {
    console.log('bob exists');
  }
})




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
          req.session.num = row.id;
          res.redirect('/feed');
        } 
        else {
          res.send('Invalid login credentials.');
        }
      }
    });
});


// Start working from here
app.get('/user/:username', (req, res) => {
  if(!req.session.num && !req.session.username){
    res.redirect('/login');
  } else {
    const username = req.params.username;
    const id_num = req.session.num
    db.get('SELECT id,followers,following from users WHERE username = ?',[username],(err,data) => {
      if(err) {
        res.send('No user found');
      } else if (req.params.username === req.session.username) {
        res.redirect(`/profile/${username}`)
      } else {
        let id = data.id
        db.all('SELECT * FROM blog WHERE id = ?',[id],(err,row) => {
          if(err) {
          res.render('user', { data,username,row });
        } else {
          console.log(`Followers = ${data.followers} Following = ${data.following}`)
          res.render('user', { data,username,row});
          console.log(`name ${username} id = ${id_num}`)
        }
        })
      }
    })
  }
});

app.get('/profile/:username', (req, res) => {
  if(!req.session.num && !req.session.username){
    res.redirect('/login');
  } else if (req.params.username !== req.session.username) {
    res.send('You are not authorized to view this page.');
  } else {
    const username = req.params.username;
    const id = req.session.num;
    db.get('SELECT followers,following from users WHERE id = ?',[id],(err,data) => {
      if(err) {
        res.send('No user found');
      } else {
        db.all('SELECT * FROM blog WHERE id = ?',[id],(err,row) => {
          if(err) {
          res.render('profile', { data,username,row });
        } else {
          console.log(`Followers = ${data.followers} Following = ${data.following}`)
          res.render('profile', { data,username,row});
          console.log(`name ${username} id = ${id}`)
        }
        })
      }
    })
  }
});

app.post('/follow/:username', (req, res) => {
  if (!req.session.num || !req.session.username) {
    res.redirect('/login');
  } else {
    const loggedInUser = req.session.username;
    const targetUsername = req.params.username;
    console.log(`${loggedInUser} of ${targetUsername}`)

    // Check if the logged-in user and target user exist in the database
    db.get('SELECT id FROM users WHERE username = ?', [loggedInUser], (err, loggedInUserRow) => {
      if (err) {
        console.error('Error querying the database:', err.message);
        res.status(500).send('Error querying the database.');
      } else {
        db.get('SELECT id FROM users WHERE username = ?', [targetUsername], (err, targetUserRow) => {
          if (err) {
            console.error('Error querying the database:', err.message);
            res.status(500).send('Error querying the database.');
          } else {
            console.log(`target user:= ${targetUserRow.id} || logged user := ${loggedInUserRow.id}`)
            if (!targetUserRow || !loggedInUserRow) {
              res.status(404).send('User not found.');
            } else {
              // Update the follower and following counts for both users

              const targetUserId = targetUserRow.id
              const loggedInUserId = loggedInUserRow.id

              db.all('SELECT * from reach where follower = ?',[loggedInUserId],(err,data) => {
                
                if(err){
                  console.error('Error Quering the reach database:', err.message);
                } else {
                  let alreadyFollowed = false;
                  for (let j = 0; j < data.length; j++) {
                    console.log(data[j].followed)
                    if (data[j].followed === targetUserId) {
                      console.log('already followed')
                      alreadyFollowed = true;
                      break;
                    }
                  }

                  if (alreadyFollowed) {
                    res.send('Already Followed');
                    return;
                  } else {
                    // If not already followed, proceed to update the database and counts
                    db.run('INSERT INTO reach (follower, followed) VALUES (?, ?)', [loggedInUserId, targetUserId], (err) => {
                      if (err) {
                        console.error('Error Updating the reach table:', err.message);
                      }
                    });
                  
                  db.run('UPDATE users SET followers = followers + 1 WHERE id = ?', [targetUserId], (err) => {
                    if (err) {
                      console.error('Error updating follower count:', err.message);
                    }
                  });
    
                  db.run('UPDATE users SET following = following + 1 WHERE id = ?', [loggedInUserId], (err) => {
                    if (err) {
                      console.error('Error updating following count:', err.message);
                    }
                  });
                }
              }

              res.redirect(`/user/${targetUsername}`);
            })
          }
        }
        });
      }
    });
  }
});


app.post('/blog/:username',(req,res) => {
  const id = req.session.num
  const name = req.params.username
  const {title,content} = req.body
  console.log(`The Blog is ${title} and ${content}`)
  db.run(`INSERT INTO blog (id,name,content) VALUES (?,?,?)`,[id,title,content],(err,row) => {
    if (err) {
      console.error('Error inserting blog', err.message);
      res.status(500).send('Error inserting blog.');
    } 
    else {
      console.log(`Blog written successful`);
      res.redirect(`/profile/${name}`);
    }
  })
});

app.get('/feed',(req,res) => {
  if(!req.session.num && !req.session.username){
    res.redirect('/login');
  } else {
    db.all('SELECT * FROM blog',(err,row) => {
      if(err) {
      res.status(500).send("Error Loading the feed ");
    } else {
      db.all('SELECT * FROM users ',(err,user) => {
        if (err) {
          console.error('Error Loading the users.', err.message);
          res.status(500).send('Error Loading the users.');
        } 
        else {
          res.render('feed', { user :user,row:row});
        }
      })
    }
  })
}
});
  

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});