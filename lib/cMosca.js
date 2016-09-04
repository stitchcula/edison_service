/**
 * Created by stitchcula on 2016/9/4.
 */

import mosca from 'mosca'

export default class Mosca {
    constructor(){
        var ascoltatore={
            type:'redis',
            redis:require('redis'),
            host:process.env['REDIS_HOST'],
            port:process.env['REDIS_PORT'],
            password:process.env['REDIS_AUTH'],
            return_buffers:true
        }
        this.settings={
            port:1883,
            backend:ascoltatore,
            persistence:{
                factory: mosca.persistence.Redis
                host:process.env['REDIS_HOST'],
                port:process.env['REDIS_PORT'],
                password:process.env['REDIS_AUTH'],
            }
        }
    }
    listen(port){
        if(port) this.settings.port=port
        this.server = new mosca.Server(this.settings)
        this.server.on('ready',this.onReady)
        this.server.on('published',this.onPublished)
        this.server.on("clientConnected",this.onConnected)
    }
    async onReady(){
        this.server.authorizePublish=async function (client, topic, payload, callback) {
            callback(null,true)
        }
        this.server.authorizeSubscribe=async function (client, topic, callback) {
            callback(null,true)
        }
    }
    async onPublished(packet){
        //Topic->device id or user uin
        //node_id->modules id or user token
        //node_type->modules or USER
        var {node_id,node_type,message}=packet.payload.toJSON()
        console.log(packet.topic+":"+node_id+" SEND "+JSON.stringify({node_type,message})+" at "+new Date())
        if(node_type=="USER"){//User->Edison
            //todo:
            //user's order, save to db
        }else{//Edison->User
            //todo:
            //save to db
            //device's data or notice, if it's notice,user sure response.
        }
    }
    async onConnected(a,b){
        console.log(a)
        console.log(b)
    }
}