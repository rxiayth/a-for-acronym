var express = require('express');
var request = require('request');
var bodyParser = require("body-parser");
var fs = require('fs');

const ACRONYMS = require('./acronyms');
const KEYS = require('./config');
var app = express();
const PORT=4390;


// Move those elsewhere!!
var clientId = KEYS.clientID;
var clientSecret = KEYS.clientSecret;


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Lets start our server
app.listen(PORT, function () {
    console.log("App listening on port " + PORT);
    console.log(ACRONYMS["DTM"]);
});


// This route handles GET requests to our root ngrok address 
app.get('/', function(req, res) {
    res.send('Ngrok is working! Path Hit: ' + req.url);
});

// This route handles get request to a /oauth endpoint. 
app.get('/oauth', function(req, res) {
    // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
    if (!req.query.code) {
        res.status(500);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    } else {
        // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
        request({
            url: 'https://slack.com/api/oauth.access', //URL to hit
            qs: {code: req.query.code, client_id: clientId, client_secret: clientSecret}, //Query string data
            method: 'GET', //Specify the method

        }, function (error, response, body) {
            if (error) {
                console.log(error);
            } else {
                res.json(body);
            }
        })
    }
});


// Route the endpoint that our slash command will point to and send back a simple response
app.post('/define', function(req, res) {
    function updateFile(acronym, definition, resMessage) {
        ACRONYMS[acronym] = definition;
        let newFile = "var acronyms = \n" + JSON.stringify(ACRONYMS) + "\nmodule.exports = acronyms;";
        try {
            fs.writeFileSync("acronyms.js", newFile);
            resMessage = acronym + " has been added with definition: " + definition;
            console.log(resMessage);
        } catch (e) {
            console.log(e.message)
        }
        return resMessage
    }


    let reqMessage = req.body.text || "";
    let resMessage = "";
    let acronym = "";
    let definition = "";
    let hasDefinition = reqMessage.indexOf(',') > -1;

    if (hasDefinition){
        let commaIndex = reqMessage.indexOf(',');
        acronym = reqMessage.substring(0, commaIndex).toUpperCase();
        definition = reqMessage.substring(commaIndex+1).trim();
        
        resMessage = updateFile(acronym, definition, resMessage); 
    } else {
        acronym = reqMessage.toUpperCase();
        if (acronym in ACRONYMS){
            resMessage = acronym + " stands for " + ACRONYMS[acronym];
        } else {
            resMessage = "word not found, but when you do know please run '/define acronym, definition'";
        }
    }

    let reply = 
        {
          "response_type": "ephemeral",
          "replace_original": false,
          "text": resMessage
        }
    res.send(reply);
    
    
});