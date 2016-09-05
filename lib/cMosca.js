/**
 * Created by stitchcula on 2016/9/4.
 */

import mosca from 'mosca'

export default class Mosca {
    constructor(mongo){
        this.mongo=mongo
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
                factory: mosca.persistence.Redis,
                host:process.env['REDIS_HOST'],
                port:process.env['REDIS_PORT'],
                password:process.env['REDIS_AUTH']
            }
        }
    }
    listen(port){
        if(port) this.settings.port=port
        this.server = new mosca.Server(this.settings)
        this.server.on('ready',this.onReady.bind(this))
        this.server.on('published',this.onPublished.bind(this))
        this.server.on("clientConnected",this.onConnected.bind(this))
    }
    async onReady(){
        this.server.authenticate = function(client, username, password, callback) {
            console.log(`user:${username},pwd:${password}`)
            callback(null, true);
        }
        this.server.authorizePublish=function (client, topic, payload, callback) {
            console.log("authorizePublish:"+client.id)
            callback(null,true)
        }
        this.server.authorizeSubscribe=function (client, topic, callback) {
            console.log("authorizeSubscribe:"+client.id)
            callback(null,true)
        }
        console.log("MQTT broker is running at "+new Date())
    }
    async onPublished(packet){
        //Topic->device id or user uin
        //node_id->modules id or user token
        //node_type->modules or USER
        //msg_type->data/notice
        if(packet.topic.split('/')[0]!="$SMTH")
            return
        var {node_id,node_type,msg_type,msg_id,msg_c}=JSON.parse(packet.payload.toString())
        console.log(packet.topic+":"+node_id+
            " SEND "+JSON.stringify({node_type,msg_type,msg_id,msg_c})+
            " at "+new Date())
        if(node_type=="USER"){//User->Edison
            //todo:
            //user's order, save to db
        }else{//Edison->User
            //save to db
            //device's data or notice, if it's notice,user sure response.
            await this.mongo.collection("publish_msg")
                .insertOne({uin:packet.topic,node_id,node_type,msg_type,msg_id,msg_c})
            if(msg_type=="NOTICE"){
                this.server.published({
                    topic:packet.topic+"/NOTICE",
                    payload:packet.payload,
                    qos:1,retain:false
                },function (x) {
                    console.log(x)
                })
            }
        }
    }
    async onConnected(a){
        console.log(a.id)
    }
}