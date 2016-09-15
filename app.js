/**
 * Created by stitchcula on 2016/9/4.
 */

"use strict";

import Koa from 'koa'
import Router from 'koa-router'
import mongo from 'koa-mongo'
import convert from 'koa-convert'
import mongodb from 'mongodb'
import Mosca from './lib/cMosca.js'

/***  MQTT init  ***/
(async function () {
    const mongo=await mongodb.MongoClient
        .connect(`mongodb://${process.env['MONGO_HOST']}:${process.env['MONGO_PORT']}/smth`)

    const mosca=new Mosca(mongo)
    mosca.listen(8005)
})()

/***  Router load  ***/
const router=new Router()
const routes=require('dir-requirer')(__dirname)('./routes')
for(var r in routes){
    router.use('/'+r,routes[r].router.routes())
}

/***  Koa init ***/
const app=new Koa()
/*
app.use(convert(mongo({
    host:process.env['MONGO_HOST']||'localhost',
    port:process.env['MONGO_PORT']||27017,
    //user:process.env['MONGO_USER']||"root",
    //pass:process.env['MONGO_PWD']||"",
    db:"smth"
})))
*/
app.use(async (ctx,next)=>{
    ctx.mongo=await mongodb.MongoClient
        .connect(`mongodb://${process.env['MONGO_HOST']}:${process.env['MONGO_PORT']}/smth`)
    await next()
    ctx.mongo.close()
})
app.use(async (ctx,next)=>{
    console.log(ctx.ip+" "+ctx.method+" "+ctx.path+" at "+new Date().toLocaleString())
    //ctx.mongo=ctx.mongo.db("smth")
    try{
        await next()
    }catch(err){
        console.error(err)
        if(typeof(err)=='string'&&err.length==3)
            ctx.body=err
        else if(typeof(err)=='number'&&err.length==3)
            ctx.status=err
        else
            ctx.body="500"
    }
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(8007)

