var express = require("express");
var router = express.Router();
const crypto = require("crypto");
const request = require("request");
const querystring = require("querystring");
require('dotenv').config;

const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;

/**
 * OAuth1.0による認証を行う際に各トークン取得の際のリクエストパラメータを生成する
 * @param {Object} baseParams: リクエストに必要なパラメータの初期値
 * @param {String} requestUrl: リクエスト先URL
 * @param {String} requestMethod: リクエスト方法 
 * @param {String} oauthTokenSecret: optional
 */
const createRequestParams = (baseParams, requestUrl, requestMethod, oauthTokenSecret) => {
  const signatureKey = encodeURIComponent(consumerSecret) + "&" + (!oauthTokenSecret?"":encodeURIComponent(oauthTokenSecret)) //署名キーを作成
  Object.keys(baseParams).forEach(key => {
    baseParams[key] = encodeURIComponent(baseParams[key]); //URIに変換
  })
  /**
   * baseParamsArray: "[key]=[val(uri)]"の文字列を格納した配列
   * signature: OAuth1.0の認証のための署名
   * requestHeaderParams: リクエスト用のカスタムヘッダーの中身
   */
  let baseParamsArray = Object.keys(baseParams).sort().map(key => {
    return `${key}=${baseParams[key]}`;
  });
  requestParams = encodeURIComponent(baseParamsArray.join("&"));
  const signatureData = `${encodeURIComponent(requestMethod)}&${encodeURIComponent(requestUrl)}&${requestParams}`;
  const signature = crypto.createHmac("sha1", signatureKey).update(signatureData).digest("base64");
  baseParamsArray.push(`oauth_signature=${encodeURIComponent(signature)}`);
  const requestHeaderParams = baseParamsArray.join(",");
  console.log(requestHeaderParams)

  return requestHeaderParams;
}

/**
 * TwitterのOAuth1.0のリクエストトークンを取得し, クライアントに認証画面のURLを返すAPI
 */
router.get("/", function(req, res, next) {
  const callbackUrl = "http://127.0.0.1:3000/signin/callback";
  const requestUrl = "https://api.twitter.com/oauth/request_token";
  const requestMethod = "POST";

  const time = new Date().getTime();
  let baseParams = {
    "oauth_callback": callbackUrl,
    "oauth_consumer_key": consumerKey,
    "oauth_signature_method": "HMAC-SHA1",
    "oauth_timestamp": Math.floor(time/1000),
    "oauth_nonce": time,
    "oauth_version": "1.0"
  }

  const requestHeaderParams = createRequestParams(baseParams, requestUrl, requestMethod)

  const requestOption = {
    url: requestUrl,
    method: requestMethod,
    headers: {
      'Authorization': `OAuth ${requestHeaderParams}`
    }
  }

  request(requestOption, (err, response, body) => {
    if (err || response.statusCode!==200) {
      next(new Error());
      console.error(err||response.statusCode);
      return;
    }
    const query = querystring.parse(body); 
    res.json({
      //oauth_url: `https://api.twitter.com/oauth/authenticate?oauth_token=${query.oauth_token}`,
      oauth_url: `https://api.twitter.com/oauth/authorize?oauth_token=${query.oauth_token}`,
      oauth_token_secret: query.oauth_token_secret
    })
  })

});

/**
 * アプリ連携したユーザーのアクセストークンを取得するAPI
 * 認証画面からのcallbackで受け取ったoauth_tokenとoauth_verifier, リクエストトークンを取得した際のoauth_token_secretをGETパラメータで渡す
 */
router.get("/access_token", (req, res, next) => {
  if (!req.query.oauth_token || !req.query.oauth_verifier || !req.query.oauth_token_secret) {
    next(new Error())
    console.error("Bad Request")
    return
  }
  const oauthToken =  req.query.oauth_token
  const oauthVerifier = req.query.oauth_verifier
  const oauthTokenSecret = req.query.oauth_token_secret
  const requestUrl = "https://api.twitter.com/oauth/access_token" 
  const requestMethod = "POST";

  const time = new Date().getTime();
  let baseParams = {
    "oauth_consumer_key": consumerKey,
    "oauth_token": oauthToken,
    "oauth_signature_method": "HMAC-SHA1",
    "oauth_timestamp": Math.floor(time/1000),
    "oauth_verifier": oauthVerifier,
    "oauth_nonce": time,
    "oauth_version": "1.0"
  }

  const requestHeaderParams = createRequestParams(baseParams, requestUrl, requestMethod, oauthTokenSecret)

  const requestOption = {
    url: requestUrl,
    method: requestMethod,
    headers: {
      'Authorization': `OAuth ${requestHeaderParams}`
    }
  }

  request(requestOption, (err, response, body) => {
    if (err || response.statusCode!==200) {
      next(new Error());
      console.error(err||response.statusCode);
      return;
    }
    const query = querystring.parse(body); 
    res.json({
      access_token: query.oauth_token,
      access_token_secret: query.oauth_token_secret,
      user_id: query.user_id,
      screen_name: query.screen_name
    })
  })
});

module.exports = router;
