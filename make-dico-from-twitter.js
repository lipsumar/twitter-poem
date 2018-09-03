var Twitter = require('twitter');
var natural = require('natural');
var tokenizer = new natural.WordTokenizer();
var async = require('async');
var dictionnary = [];

var client = new Twitter({
    "consumer_key": process.env.TWITTER_CONSUMER_KEY,
    "consumer_secret": process.env.TWITTER_CONSUMER_SECRET,
    "access_token_key": process.env.TWITTER_ACCESS_TOKEN_KEY,
    "access_token_secret": process.env.TWITTER_ACCESS_TOKEN_SECRET
});

async.series([
    addWordsFromScreenName.bind(null,'cnn'),
    addWordsFromScreenName.bind(null,'msnbc'),
    addWordsFromScreenName.bind(null,'abc'),
    addWordsFromScreenName.bind(null,'foxnews'),
    addWordsFromScreenName.bind(null,'cbsnews'),
    addWordsFromScreenName.bind(null,'nbcnews'),
    addWordsFromScreenName.bind(null,'realDonaldTrump'),

    addWordsFromScreenName.bind(null,'ladygaga'),
    addWordsFromScreenName.bind(null,'wilw'),
    addWordsFromScreenName.bind(null,'Swedishcanary'),
    addWordsFromScreenName.bind(null,'Passionposts'),
    addWordsFromScreenName.bind(null,'Bsritual')
], function(){
    console.log('all done');
    console.log('Got '+dictionnary.length)
    require('fs').writeFileSync('./dico-stem-twitter.txt', dictionnary.sort().join('\n'))
})


function addWordsFromScreenName(screen_name, cb){
    console.log('Fetching '+screen_name)
    client.get('statuses/user_timeline', {screen_name, count:200}, function(error, tweets, response) {
        if(error) {
            console.log('!! Error while getting tweets from '+screen_name)
            console.log('skipping')
            cb();
            return;
        }
        console.log(tweets.length+' tweets')
        tweets.forEach(handleTweet);
        console.log('Dictionnary size: '+dictionnary.length)
        setTimeout(cb, 1000)
        //cb()
    })
}



function handleTweet(tweet){
    var text = tweet.text;
    //console.log('ORIGINAL: ', text)
    text = cleanUpText(text)
    //console.log('CLEAN:    ', text)

    var tokens = tokenizer.tokenize(text)
    //console.log(tokens);
    stemmedTokens = tokens.map(natural.PorterStemmer.stem.bind(natural.PorterStemmer))
    //console.log(stemmedTokens)
    //console.log('--------------')

    addTokensToDictionnary(stemmedTokens)
}

function cleanUpText(text){
    text = text.replace(/htt[^ ]+/g, '')
    text = text.replace(/#[a-zA-Z0-9_]+/g, '')
    text = text.replace(/@[a-zA-Z0-9_]+/g, '')
    return text;
}


function addTokensToDictionnary(tokens){
    tokens.forEach(t => {
        if(!dictionnary.includes(t)){
            dictionnary.push(t);
        }
    })
}
