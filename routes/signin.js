var express = require("express");
var router = express.Router();
const crypto = require("crypto");
const request = require("request");
const querystring = require("querystring");
require('dotenv').config;

const consumer_key = process.env.CONSUMER_KEY;
const consumer_secret = process.env.CONSUMER_SECRET;

/**
 * TwitterのOAuth1.0のリクエストトークンを取得し, クライアントに認証画面のURLを返すAPI
 */
router.get("/", function(req, res, next) {
  const callback_url = "http://127.0.0.1:3000/signin/callback";
  const request_url = "https://api.twitter.com/oauth/request_token";
  const request_method = "POST";
   
  //署名キーを作成
  const signature_key = encodeURIComponent(consumer_secret) + "&" // access_token_secret is undefined

  //署名データを作成
  const time = new Date().getTime();
  let params = {
    "oauth_callback": callback_url,
    "oauth_consumer_key": consumer_key,
    "oauth_signature_method": "HMAC-SHA1",
    "oauth_timestamp": Math.floor(time/1000),
    "oauth_nonce": time,
    "oauth_version": "1.0"
  }

  Object.keys(params).forEach(key => {
    params[key] = encodeURIComponent(params[key]); //URIに変換
  })

  /**
   * base_params_array: "[key]=[val(uri)]"の文字列を格納した配列
   * signature: OAuth1.0の認証のための署名
   * request_header_params: リクエスト用のカスタムヘッダーの中身
   */
  let base_params_array = Object.keys(params).sort().map(key => {
    return `${key}=${params[key]}`;
  });
  request_params = encodeURIComponent(base_params_array.join("&"));
  const signature_data = `${encodeURIComponent(request_method)}&${encodeURIComponent(request_url)}&${request_params}`;
  const signature = crypto.createHmac("sha1", signature_key).update(signature_data).digest("base64");

  base_params_array.push(`oauth_signature=${encodeURIComponent(signature)}`)
  let request_header_params = base_params_array.join(",");

  const requestOption = {
    url: request_url,
    method: request_method,
    headers: {
      'Authorization': `OAuth ${request_header_params}`
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
      oauth_url: `https://api.twitter.com/oauth/authenticate?oauth_token=${query.oauth_token}`,
      oauth_token_secret: query.oauth_token_secret
    })
  })

});

module.exports = router;
