var express = require("express");
var router = express.Router();
const twitter = require("twitter");
require("dotenv").config();

const connection = new twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

const fetchTweet = async id => {
  return await connection.get(`statuses/show/${id}`, {});
};

/**
 * リプライチェインを再帰的にルートまで辿って各ツイート情報を格納した配列を返す
 * @param {array} tweetsStack - 取得したtweetを保持する配列
 * @param {int} id - tweet id
 */
const recursiveFetch = async (tweetsStack, id) => {
  try {
    if (!id) {
      return tweetsStack;
    }
    const tweet = await fetchTweet(id);
    tweetsStack.unshift(tweet);
    return recursiveFetch(tweetsStack, tweet.in_reply_to_status_id_str);
  } catch (err) {
    throw err;
  }
};

router.get("/", function(req, res, next) {
  if (!req.query.id) {
    console.log("hoge");
    return;
  }

  let tweetsStack = [];
  recursiveFetch(tweetsStack, req.query.id)
    .then(tweets => {
      let data = {};
      tweets.forEach(tweet => {
        data[tweet.id] = tweet;
      });
      res.json(data);
    })
    .catch(err => {
      console.error(err);
    });
});

module.exports = router;
