/**
 * Created by stitchcula on 2016/9/11.
 */
"use strict";

import Router from 'koa-router'
import crypto from 'crypto'
import parse from 'co-body'

const router=new Router()

router.post('/create',async (ctx,next)=>{
    var {account,email,pass}=await parse.json(ctx)
    if(!(await ctx.mongo.collection("users").findOne({"$or":[{account},{email}]}))) {
        var ituin
        while(1){
            ituin=parseInt(Math.random()*100000000).toString()
            if(ituin.length==8&&
                !(await ctx.mongo.collection("users").findOne({uin:ituin},{_id:0})))
                break
        }
        var token=crypto.createHmac('sha1',ituin+new Date().getTime().toString()).digest('hex').substr(0,18)
        await ctx.mongo.collection("users").insertOne({uin:ituin,account,email,pass,token})
        ctx.body={result:{uin:ituin,token},err_code:null,err_msg:null}
    }else{
        ctx.body={result:{uin:null,token:null},err_code:595,err_msg:"already exists."}
    }
    await next()
})

//device: bind?device_id=
//user: bind?token=
router.get('/bind',async (ctx,next)=>{
    var res=ctx.query.token?
        (await ctx.mongo.collection("users").findOne({token:ctx.query.token})):
        (await ctx.mongo.collection("users").findOne({device_id:ctx.query.device_id}))
    var status=(ctx.query.token&&res.device_id)?
        (await ctx.mongo.collection("online_list").findOne({device_id:res.device_id})):
        null;
    ctx.body=res?
        {result:{uin:res.uin,token:res.token,device_id:res.device_id,device_status:status?1:-1}}:
        {err_code:502,err_msg:"denial of service."}
    await next()
})
/*
router.post("/nodes",async (ctx,next)=>{
    if(ctx.query.q){
        if(ctx.query.q=="online") {
            var body = await parse.json(ctx)
            body.time = new Date().getTime()
            await this.mongo.collection("online_list")
                .insertOne(body)
            ctx.body={result:200}
        }
        else if(ctx.query.q=="offline") {
            var body = await parse.json(ctx)
            var res=await this.mongo.collection("online_list")
                .removeMany(body)
            ctx.body={result:200}
        }
    }else
        ctx.body={err_code:502,err_msg:"denial of service."}
    await next()
})
*/
router.get('/',async (ctx,next)=>{
    var res=ctx.query.token?
        (await ctx.mongo.collection("users").findOne({token:ctx.query.token,uin:ctx.query.uin})):
        (await ctx.mongo.collection("users").findOne({pass:ctx.query.pass,email:ctx.query.email}))
    delete res.pass
    ctx.body=res?{result:res}:{err_code:502,err_msg:"denial of service."}
    await next()
})
router.put('/',async (ctx,next)=>{
    var res=await ctx.mongo.collection("users").findOne({token:ctx.query.token,uin:ctx.query.uin})
    if(!res)
        return ctx.body={err_code:502,err_msg:"denial of service."}
    var body=await parse.json(ctx)
    if(body.uin) delete body.uin
    if(body.token) delete body.token
    delete res._id
    await ctx.mongo.collection("users").updateOne({token:ctx.query.token,uin:ctx.query.uin}
        ,{"$set":Object.assign(res,body)}, {upsert:true})
    ctx.body={result:200}
    await next()
})
router.del('/',async (ctx,next)=>{
    var res=await ctx.mongo.collection("users").findOne({token:ctx.query.token,uin:ctx.query.uin})
    if(!res)
        return ctx.body={err_code:502,err_msg:"denial of service."}
    var token=crypto.createHmac('sha1',ituin+new Date().getTime().toString()).digest('hex').substr(0,18)
    await ctx.mongo.collection("users").updateOne({token:ctx.query.token,uin:ctx.query.uin}
        ,{"$set":token}, {upsert:true})
    ctx.body={result:200}
    await next()
})

export {router}
