//fcc NightLife Coordination App challenge - https://www.freecodecamp.org/challenges/build-a-nightlife-coordination-app

//CONFIGURATION=================================================================
//EXPRESS
const express = require("express");
var app = express();

//MONGO AND MONGOOSE  see http://mongoosejs.com/docs/index.html
const mongo = require("mongodb").MongoClient;
const mongoose = require("mongoose");
var dbURL = "mongodb://nightlife-app:c4rr07qu33n@ds237717.mlab.com:37717/night-life-app";

mongoose.connect(dbURL,{ useMongoClient: true });
mongoose.Promise = global.Promise;
//Mongoose schema
//Users
var userSchema = new mongoose.Schema({
	name:String,
	email:String,
	password: String,
},{collection:'users'});
var User = mongoose.model("User",userSchema);
//Businesses
var businessSchema = new mongoose.Schema({
	location : String,
	id : String,
	name : String,
	rating : String,
	url : String,
	img_url : String,
	rsvp : [String]
},{collection:"businesses"});
var Business = mongoose.model("Business",businessSchema);

//BODY PARSER https://github.com/expressjs/body-parser
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//COOKIE PARSER
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//FLASH 
const flash = require("connect-flash");
app.use(flash());

//BCRYPT
const bcrypt = require("bcrypt");
const saltRounds = 10;

//EXPRESS-SESSION
const expressSession = require('express-session');
app.use(expressSession({secret:'carrot'}));

//REQUEST
const request = require("request");
//YELP-FUSION
    const yelpFusion = require('yelp-fusion');
    const yelpClient = yelpFusion.client("_YKXx9guIuQJerMLsi88veoJMr01JLV3evcpOhJlIm59slBNa4gS2D6FrLuvuvvN40u0I92PDlcYEK9N3slq0-9taO7-emLPFMbXdSnB6KGHcc2ra9X_d-6w05tIWnYx");

//PASSPORT
const passport = require("passport");
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, done) {
  done(null, user._id);
});
passport.deserializeUser(function(id,done) {
  User.findById(id, function(err,user) {
    done(err,user);
  });
});
//
//HANDLEBARS
const exphbs = require("express-handlebars")
app.engine('handlebars',exphbs({defaultLayout:'main'}));
app.set('view engine','handlebars');


//PASSPORT STRATEGIES===========================================================
const TwitterStrategy = require('passport-twitter').Strategy;

passport.use(new TwitterStrategy({
    consumerKey: "qDwLSDftpM509cQ2LyAsn5Ofp",
    consumerSecret: "Pq31UISUu4xjVhVo1baomgeg0psJruskhlFqT3FElEvPSJYQ3p",
    callbackURL: 'https://fcc-leah-carr-nightlife-app.herokuapp.com/auth/twitter/callback'
  },
  function(token, tokenSecret, profile, cb) {
    User.findOrCreate({ twitterId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


//ROUTING=======================================================================
app.use(express.static('public'));
  app.get("/", function(req, res) {
        if(req.session.location) {
            Business.find({'location' : req.session.location}, function(err, businesses) {
                if(err) {
                    console.log("Error looking up businesses by location: " + err);
                    throw err;
                }
                res.render("home",{'businesses':businesses});
            });
        } else {
          res.render("home");  
        }
    });
    
app.post("/locate",function(req,res) {
        
        req.session.location = req.body.location;  
        
        
        Business.find({'location':req.body.location}, function(err,businesses) {
            if(err) {
               console.log("Error looking up businesses for location: " + err);
            } 
            if(businesses.length < 1) {
                yelpClient.search({
                    categories:'Nightlife',
                    location: req.session.location
                }).then(response => {
                    for(var i = 0; i < response.jsonBody.businesses.length; i++) {
                        var newBusiness = new Business();
                        newBusiness.location = req.body.location;
                        newBusiness.id = response.jsonBody.businesses[i].id;
                        newBusiness.name = response.jsonBody.businesses[i].name;
                        newBusiness.rating = response.jsonBody.businesses[i].rating;
                        newBusiness.url = response.jsonBody.businesses[i].url;
                        newBusiness.img_url = response.jsonBody.businesses[i].image_url;
                        newBusiness.rsvp = [];
                        
                        newBusiness.save( function(err) {
                            if(err) {
                                console.log("Error saving new Business:" + err);
                                throw err;
                            }
                        });
                    }
                    res.redirect("/");
                }).catch(e => {
                    console.log(e);
                });  
            } else {
                res.redirect("/");
            }
        });
        
        
});
app.post("/going", passport.authenticate('twitter')); 
app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
});
//PORT==========================================================================
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});