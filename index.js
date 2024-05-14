const TelegramBot = require('node-telegram-bot-api');
const axios = require("axios");
// replace the token with the Telegram token you receive from @BotFather
const { MongoClient } = require('mongodb');
require('dotenv').config()
const uri = process.env.URI;


// Create a new MongoClient
const client = new MongoClient(uri);

//connection to mongoDB for token retrieval
async function connectToMongoDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const database = client.db('test')
        console.log("db.coll",database.collection)
        const collection = database.collection('bot')
        const tokenDoc =  await collection.findOne({});
       return tokenDoc.token
        // console.log("token",tokenDoc.token)
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}


//save user data (subscribers)
const saveUserData = async (userData)=>{

    try {
        const database = client.db('test');
        const collection  = database.collection('users')
        await collection.insertOne(userData)
        console.log("User data saved!!")
    } catch (error) {
        console.log("Error saving user data ",error)
    }
}


const checkIfUserExists= async ( chatId)=> {
    try {
        const database = client.db('test');
        const collection = database.collection('users');
        const existingUser = await collection.findOne({ chatId: chatId });
        return existingUser !== null;
    } catch (err) {
        console.error('Error checking if user exists:', err);
    }
}


//store all current users or subscribers
let currentUsers = new Set();
// get current user data
async function getSubscriber() {
    try {
        const database = client.db('test');
        const collection  = database.collection('users')
        const userData = await collection.find({}).toArray();
        for (const user of userData) {
            // subscribers.add([user.chatId, user.status]);
            const pair = [user.chatId, user.status];
            if (
              ![...currentUsers].some(
                (existingPair) =>
                  existingPair[0] === pair[0] && existingPair[1] === pair[1]
              )
            ) {
              currentUsers.add(pair);
            }
          }
    } catch (err) {
        console.error('Error getting user data:', err);
    }
}
getSubscriber()

//unsubscribe user
const removeUserData= async (chatId) => {
    try {
        const database = client.db('test');
        const collection = database.collection('users');
        await collection.deleteOne({ chatId: chatId });
        console.log('User data removed from MongoDB');
    } catch (err) {
        console.error('Error removing user data:', err);
    }
}




const getToken = async()=>{
    const openWeatherMapApiKey ="08cf8568d1ecbc77f18a093c272cdf36";
    try {
        const token = await connectToMongoDB();
        if (token) {
             bot = new TelegramBot(token, { polling: true });
            
             console.log(currentUsers)
             const commands =  "Welcome!!\nThis weather bot is created by Aditya Gupta \nHere are the list of commands you can use to get subscribed to weather information \nTo subscribe to the weather bot - /subscribe\n To unsubscribe from the weather bot - /unsubscribe";
             
             bot.onText(/\/echo (.+)/, async (msg, match) => {
                const chatId = msg.chat.id;
                const resp = match[1]; // the captured "whatever"
              
                // send back the matched "whatever" to the chat
                bot.sendMessage(chatId, "This message is my response");
              }); 
              
              // Listen for any kind of message. There are different kinds of
              // messages.
              bot.on('message', async (msg) => {
                const chatId = msg.chat.id;
                const cmd = msg.text;


                if(cmd === '/start'){
                    bot.sendMessage(chatId,commands)
                }

                if (cmd === "/subscribe") {
                    const existingUser = await checkIfUserExists(chatId);
                    if (existingUser) {
                        bot.sendMessage(
                            chatId,
                            "You are already subscribed to the weather bot."
                        );
                    } else {
                        bot.sendMessage(
                            chatId,
                            "Subscribed to weather bot \nWeather updates will be sent once a day"
                        );

                        const firstName = msg.chat.first_name;
                        const userData = {
                            chatId: chatId,
                            status:"active"
                        };

                        await saveUserData( userData);
                    }
                }
                
                if (cmd === '/unsubscribe') {
                    // Remove user data from MongoDB
                    await removeUserData(chatId);
                    bot.sendMessage(
                        chatId,
                        "Unsubscribed from weather bot. You will no longer receive weather updates."
                    );
                }

                bot.sendMessage(chatId, 'Received your message');
              });

              

              bot.on("polling_error", (msg) => console.log("Polling error ",msg));


        } else {
            console.error("No token found in the database!");
        }
    } catch (err) {
        console.error('Error starting bot:', err);
    }
    setInterval(() => {
        var weatherUpdate = "";
        for (const user of currentUsers) {
          if (user[1] === "active") {
            var chatId = user[0];
            axios
              .get(
                `http://api.openweathermap.org/data/2.5/forecast?id=524901&appid=${openWeatherMapApiKey}`
              )
              .then((response) => {
                const weatherDescription =  
                  response.data.list[0].weather[0].description;
                const temperature = response.data.list[0].main.temp;
                weatherUpdate = `Today\'s weather: ${weatherDescription} and temperature is ${temperature}F.`;
                console.log("weather update send to", chatId);
                bot.sendMessage(chatId, weatherUpdate);
              })
              .catch((error) => {
                console.error("Error fetching weather data:", error);
                bot.sendMessage(chatId, weatherUpdate);
              });
          }
        }
        subscribers = new Set();
        getSubscriber();
      }, 400000);
}
getToken()


