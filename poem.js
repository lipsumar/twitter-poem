var Twitter = require('twitter');
var chalk = require('chalk');
var natural = require('natural');
var tokenizer = new natural.WordTokenizer();
var leftpad = require('left-pad');
var _ = require('underscore');
var dictionnary = [];
var excludeWords = require('./exclude.json');
var alreadySeenWords = [];
var currentWords = [];
var currentSentence = '';
var MIN_SENTENCE_LENGTH = 1;
var MAX_SENTENCE_LENGTH = 4;
var realWords = require('fs').readFileSync('./dico-stem-twitter.txt', {encoding:'utf8'})
    .split('\n')
    .reduce((memo, w) => {
        memo[w] = true
        return memo;
    }, {});


var client = new Twitter({
    consumer_key: 't3eQO6y5rOqBVW2hKS1E8sidB',
    consumer_secret: 'RYaBEIAI9qyjp2gGyKKfWQPsVXF3n3zS1wusVJJJX6IGW8WLRE',
    access_token_key: '65347065-8VmDExKAmgUQYE4bGtkg57Rg0EhhQxBbtOUtRSw8k',
    access_token_secret: 'FgywkKcr6A0TeslVudXckUYE5PdXaXzHocFcJG23JIwnf'
});


connect()

function connect(){
    client.stream('statuses/sample', {},  function(stream){
        stream.on('data', function(tweet) {

            if(tweet && tweet.text && tweet.lang === 'en'){
                var words = tokenizer.tokenize(tweet.text.toLowerCase());
                words.forEach(addWordFromTwitter)
            }

        });

        stream.on('error', waitAndReconnect);
        stream.on('close', waitAndReconnect);
        stream.on('end', waitAndReconnect);
    });
}

function waitAndReconnect(err){
    console.log('>>>>> error/close/end')
    console.log(err)
    console.log('Reconnecting in 10s...')
    setTimeout(connect, 10*1000);
}


function updateSentence(){
    removeOldWordsFromDictionnary(1*60*1000)
    var top = getTopFromDictionnary(20);

    var nextLength = getNextSentenceLength();
	var nextWords = [];
	if(nextLength > currentWords.length){
        console.log('+')
		var wordToAdd = getRandomWord();
		if(!wordToAdd){
            console.log('whoops')
            return;
        }

        alreadySeenWords.push(wordToAdd.toLowerCase());
        if(alreadySeenWords.length>100){
            alreadySeenWords.shift();
            removeFromDictionnary(wordToAdd);
        }

		var nextIndex = Math.round(Math.random()*currentWords.length);

		for (var i = 0,j=currentWords.length+1; i < j; i++) {
			if(i===nextIndex){
				nextWords.push(wordToAdd);
			}else{
				nextWords.push(currentWords.shift());
			}
		}
	}else{

		var indexToRemove = _.random(0, currentWords.length-1);
        console.log('- ['+indexToRemove+']')
		for (var i = 0,j=currentWords.length; i < j; i++) {
			if(i!==indexToRemove){
				nextWords.push(currentWords.shift());
			}
		}

	}
	currentWords = nextWords;
    currentSentence = currentWords.join(' ');

    io.emit('sentence',{
        sentence: currentSentence
    });

    //drawStats(top);
    //console.log('-------------------------')
	console.log('|');
	console.log('|  '+currentSentence);
    console.log('|');
    console.log(chalk.dim('Dictionnary: '+dictionnary.length+' | Forbidden: '+alreadySeenWords.length))

}
function tick(){
    try{
        updateSentence()
    }catch(err){
        console.log('!!!!!!!!!!!! Error')
        console.log(err)
    }

    setTimeout(tick, 4000);
}
tick()

function addWordFromTwitter(word){
    var stem = natural.PorterStemmer.stem(word);
    if(!acceptWord(stem, word)){
        return
    }

    if(inDictionnary(word)){
        incrementWordCount(word);
    }else{
        addToDictionnary(word);
    }
}

var regexOut = /[0-9"\/\\_\[\]\(\)]/;
function acceptWord(w, from){
    if(w.length < 4) return false;
    if(w.length > 20) return false;
    /*if(w[0]==='@') return false;
    if(w[0]==='#') return false;
    if(w[0]==='\'' && w[w.length-1]==='\'') return false;
    if(excludeWords.includes(w.toLowerCase())) return false;*/
    if(alreadySeenWords.includes(w.toLowerCase())) return false;
    if(from.trim().substring(0,3) ==='htt') return false;
    /*if(w.split('\n').length>1) return false;*/
    if(w.match(regexOut)) return false;
    if(!realWords[w]){
        //console.log('OUT:', w, from)
        return false;
    }
    return true;
}

function inDictionnary(word){
    return dictionnary.find(e => e.word === word) ? true : false
}

function addToDictionnary(word){
    dictionnary.push({
        word,
        count: 1,
        lastSeen: (new Date()).getTime()
    })
}

function removeFromDictionnary(word){
    dictionnary = dictionnary.filter(e => e.word !== word)
}

function removeOldWordsFromDictionnary(maxDelta){
    var before = dictionnary.length
    var now = (new Date()).getTime()
    dictionnary = dictionnary.filter(e => e.lastSeen > now - maxDelta)
    if((before-dictionnary.length)>0){
        console.log(chalk.dim(chalk.yellow('Removed '+(before-dictionnary.length)+' old tokens\n')));
    }

}

function incrementWordCount(word){
    var entry = dictionnary.find(e => e.word === word);
    entry.count++
    entry.lastSeen = (new Date()).getTime()
}

function getTopFromDictionnary(num){
    var sorted = dictionnary.sort((a, b) => a.count - b.count).reverse()
    var top = sorted.slice(0, num)
    return top;
}

function drawStats(top){
    top.forEach(function(entry){
        var word = entry.word;
        if(alreadySeenWords.includes(entry.word)){
            word = chalk.dim(word);
        }
        console.log(leftpad(entry.word,20).replace(entry.word, word)+' '+leftpad(entry.count, 2));
    });
}

function getNextSentenceLength(){
    if(currentWords.length<=MIN_SENTENCE_LENGTH){
        return currentWords.length+1;
    }else if(currentWords.length>=MAX_SENTENCE_LENGTH){
        return currentWords.length-1;
    }else{
        return currentWords.length+(Math.random()>0.5 ? 1 : -1);
    }
}

function getRandomWord(){
    if(dictionnary.length===0) return
	var word, i=0;

    if(Math.random()<0.2){
        return _.sample(excludeWords)
    }else{
        while(i<100){
            word = _.sample(dictionnary).word;
            if(!currentWords.includes(word) && !alreadySeenWords.includes(word)){
                break;
            }
            i++
        }
    }


	return word;
}




var express = require('express'),
	app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
io.on('connection', function(socket){
  //console.log('a user connected');
});
app.use(express.static('.'));
app.get('/next', function(req, res){
	res.send({sentence:lastArt});
})
http.listen(process.env.PORT || 3000, function(){
  console.log('listening on *:3000');
});
