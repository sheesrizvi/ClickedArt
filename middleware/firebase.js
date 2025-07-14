const admin = require('firebase-admin')
// const serviceAccount = require('../mignite-firebase.json')

const serviceAccount = {
  "type": process.env.FIREBASE_PROJECT_TYPE,
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDHClzwyib9sjty\nClDlTE8VoMUdEXXiPtVMfeySox2CvQ/gu6xoakRvDRnsAJEQb5xDwDGZaFzKXPUV\nchu4ELc1QHNdCMCPeObWJg54igWlB26G8N1C6pfFFeyvuIDYWC5QoLZIJec53XTX\nFTe/TD/dnc0CzS5NPX7B6/dWY8Xa6rTp4xN8a61JB8o+8v+flgh8kiXrwA66Ay5u\ngNafETLcsR4aI0i5rw7Y+wy6GEL1VKSOxWaCBt9vZXL5+YzmLYUolcQzyBLTQtcM\niQyA5JZC6I6ipIa+uOKMzwqxomOpj7dtZ42o88x6WCkDZcUKlBIUT6zjE/Cx10//\nrhaKvE9bAgMBAAECggEAFbMqiNHxSE1rL7ayNR2Jrbj2ZIHn0T+6b3l3FlGUQRGt\nrnmnhUa4qUbLYbB6IEmaxsQoZCo9m45g5fKn1Px1jOe27BitLbcnq4dAoqGhlelm\ngm22IbqDy2flgw7hdTS/7+hllx4SxHtBZsWYa1G70MSIelq2RpOCw0+fipqcEo68\nixvUVWXqfTB5UCD1maIAa2sExSUFdnxsUGMbTtdkwRflyjjHoapQBeAsPCDVwyja\n327knyucioQw+xeixkcmgu2Kz2DCRieqnHagh9nokf9gysitoi+2yKE+Az0zJxwj\nTjJauE/8WGqGcPixYkYRpmXtLraXydW4k0PE4Q+5MQKBgQD/jSiq3IIbaqAB5fda\n+hs3ZvLEzYei3CEFCB/fkmZMuvbHrqczf5jurWfUYDtTSZTIcrG5ZwpGyjZMdDAi\nWY5Refev3794FqRzRY8wv1Tgd6qztDXaxp4WHTcQ7Sz2c69kdjYRbgSOdi6jw93u\ncW2m4Rc9z/mAFZxgINi0jwDGGQKBgQDHY88aJoORZjMYed1ONH0SdTMGZH0xFq1I\n77uo6GIbwC1jtU7xfTuBuf1FT3hU44NzVamw+QMgpgSRSJqp7zDa91ApAS0OJVmI\nyMJJl2kSM29Xyl8JBcdsy5osjllSitpTYjEO7VbD5VFeJAJKOG5CVocFv+FGNX1Q\nW+/a/BrnkwKBgFgcD1150dIqHSkKZRKVETU05Zc9Vfqs8yWM+5BWJbdm7xdB/Jwg\n7lW8rAPpegrpX8cM5IIMKNrndXk+xinRvuQQrXmSJ638AI9N+GTSUy1hlRWImNjp\nijANuqK3Y71Ffb+hklrIGAIWdVY5fhdsPGZBTYYeYuPqj5QFPzJh695hAoGAINVm\nvT+qWr8hmt42ezJZhjiWdm8FzpeVYXVYya+6uCclUk4A+fNNYUdnVYqInjH4630n\nvGTFBxNPnTz/ewxQVz5yjM4MxU+RNt0YYVX1j3G43BQPIkU5WckNUlj+jIEhAqog\nufyLVSbmB0KWvfIc9f+ZrHC0gAM+54S8MqthItECgYB1Mb7OqSA0VVB8J9MUhUeW\nNGVAq5DB3nc1Mp8m2Cy+I4r4x3MKocdVnBhmKtjmKMjVUqwDULtkK+0oy+9XGhuZ\nipTAtRUi9VRuwbIZzPDUqEJMQjAWkj9DunlhHga7W8ItPzLU5JI/9M7vB4vnYxtM\nKjvaNt60C5ot3L4QGPWI5w==\n-----END PRIVATE KEY-----\n",
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": process.env.FIREBASE_AUTH_URI,
  "token_uri": process.env.FIREBASE_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL,
  "universe_domain": process.env.FIREBASE_UNIVERSE_DOMAIN
}



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

 
module.exports = admin