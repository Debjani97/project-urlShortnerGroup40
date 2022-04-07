const { request } = require("express");
const urlModel = require("../models/urlModel");
const validUrl = require("valid-url")
const shortId = require("shortid")

const redis= require('redis')
const { promisify } = require("util");


//Connect to redis
//const redisClient = redis.createClient(
//     11787,
//     "redis-11787.c264.ap-south-1-1.ec2.cloud.redislabs.com",
//     { no_ready_check: true }
// );
// redisClient.auth("tYE4mme3ufW6Tj2ypJJ32ZuknmQfmTNf", function (err) {
//     if (err) throw err;
// });

// redisClient.on("connect", async function () {
//     console.log("Connected to Redis..");
// });

// //Connection setup for redis

// const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
// const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

const isValid = function (value) {
    if (typeof value == 'undefined' || value === null) return false
    if (typeof value == 'string' && value.trim().length === 0)return false
    return true
}

function validateUrl(value) {
    return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
        value
    );
}

//Connect to redis
const redisClient = redis.createClient(
    11787,
    "redis-11787.c264.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("tYE4mme3ufW6Tj2ypJJ32ZuknmQfmTNf", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



const baseUrl = "http://localhost:3000"
const createurl = async function (req, res) {
    try {
        const data = req.body
        const objectKey = Object.keys(data)
        if(objectKey.length > 0){
            if((objectKey.length !=1 && objectKey != 'longUrl')){
                return res.status(400).send({ status: false, msg: "only longUrl link is allowed !" })  
            }
        }

        if (!isValid(data.longUrl)) {
            return res.status(400).send({ status: false, msg: "longUrl is required" })
        }
        if (!validUrl.isUri(baseUrl)) {
            return res.status(401).send({ status: false, msg: "baseUrl is invalid" })
        }

         let longUrl = data.longUrl.trim()

        if (!(validateUrl(data.longUrl))) {
            return res.status(401).send({ status: false, msg: "longUrl is not invalid" })
        }

        let isUrlExist = await urlModel.findOne({longUrl}).select({longUrl:1, shortUrl:1, urlCode:1, _id: 0})

            if(isUrlExist){
                await SET_ASYNC(`${isUrlExist.urlCode}`, longUrl)
                return res.status(200).send({status: true, data: isUrlExist, msg: 'ShortUrl already generated in DB'})
            }

        let urlCode = shortId.generate()

         let shortUrl = baseUrl + '/' + urlCode
            
         data = {urlCode: urlCode,longUrl: checkUrl,shortUrl: shortUrl}
            
         const data1 = await urlModel.create(data);
        //---SET GENERATE DATA IN CACHE
        await SET_ASYNC(`${longUrl}`, JSON.stringify(data))
        return res.status(201).send({ status: true, msg: `URL created successfully`, data: data1 });     //set in redies cache key= urlCode, value=longUrl

        }
    catch (err) {
        return res.status(500).send({ status: false, msg: err.message })
    }
}

const geturl = async function (req, res) {
    try {
        const urlCode = req.params.urlCode
        //if (!isValid(urlCode))
         if (urlCode.length != 9){
            res.status(400).send({ status: false, message: 'Please provide valid urlCode' })
            return
        }

        let findUrlInCache = await GET_ASYNC(`${urlCode}`)

        if (findUrlInCache) {              
            return res.status(302).redirect(JSON.parse(findUrlInCache))
        }else{
        const url = await urlModel.findOne({ urlCode: urlCode }) //second check in D
        if (!url) {
            return res.status(404).send({ status: false, message: 'No URL Found' })
        }else{
            await SET_ASYNC(`${url.urlCode}`, JSON.stringify(url.longUrl))
            return res.status(302).redirect(url.longUrl)
        }
    }
} 
catch (err) {
        console.error(err)
        res.status(500).send({ status: false, message: err.message })
    }
}

module.exports = {createurl,geturl}


// const createurl = async function (req, res) {
//     try {
//         const data = req.body
//         const objectKey = Object.keys(data)
//         if(objectKey.length > 0){
//             if((objectKey != 'longUrl')){
//                 return res.status(400).send({ status: false, msg: "only longUrl link is allowed !" })  
//             }
//         }

//         let longUrl=data.longUrl

//         if (!isValid(data.longUrl)) {
//             return res.status(400).send({ status: false, msg: "longUrl is required" })
//         }
       
//         if (!validateUrl(data.longUrl)) {
//             return res.status(401).send({ status: false, msg: "longUrl is invalid" })
//         }
//         let urlCode = shortId.generate()

        
//             let shortUrl = baseUrl + '/' + urlCode
            
//             data.urlCode = urlCode 
//             data.shortUrl = shortUrl
//    let catchData= await GET_ASYNC(`${longUrl}`)
//    if(catchData){
//        console.log("redis")
//        let convert= JSON.parse(catchData)
//        return res.status(200).send({msg:"success", data:convert})
//    }
//         let isUrlexist= await urlModel.findOne({longUrl}).select({longUrl:1,urlCode:1,shortUrl:1, _id:0})
//            if(isUrlexist){
//                console.log("db")
//             await SET_ASYNC(`${longUrl}`,JSON.stringify(isUrlexist))  
//             return res.status(200).send({msg:"succes", data:isUrlexist})
//            }

//             let data1 = await urlModel.create(data)
//             let result = {
//                 longUrl: data1.longUrl,
//                 shortUrl: data1.shortUrl,
//                 urlCode: data1.urlCode
//             }
//             return res.status(201).send({ status: true,msg:"success", data: result })

//         }
    
//     catch (err) {
//         return res.status(500).send({ status: false, msg: err.message })
//     }

// }


// const geturl = async function (req, res) {
//     try {
//         const urlCode = req.params.urlCode
        
        
//         if (!isValid(urlCode)) {
//             res.status(400).send({ status: false, message: 'Please provide urlCode' })
//         }
//         let catchData= await GET_ASYNC(`${urlCode}`)
//         if(catchData){
//             console.log("redisget")
//             let convert= JSON.parse(catchData)
//             return res.status(300).redirect(convert.longUrl)
//         }
//         const url = await urlModel.findOne({urlCode }) 
//         await SET_ASYNC(`${urlCode}`,JSON.stringify(url))      //second check in Db
//         if (!url) {
//             return res.status(404).send({ status: false, message: 'No URL Found' })
//         }else{
//             console.log("mongo")
//         return res.status(301).redirect(url.longUrl)
//         }

//     } catch (err) {
//         console.error(err)
//         res.status(500).send({ status: false, message: err.message })
//     }
// }


// module.exports = {createurl,geturl}