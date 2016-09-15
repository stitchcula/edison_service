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
        this.server.on("clientDisconnected",this.onDisconnected.bind(this))
    }
    async onReady(){
        this.server.authenticate =async function(client, obj, token, callback) {//online login
            token=token.toString()
            if(obj&&token) {
                var {uin,device_id}=JSON.parse(obj)
                var res =uin?(await this.mongo.collection("users").findOne({token, uin})):
                    (await this.mongo.collection("users").findOne({token, device_id}))
                if (res) {
                    await this.mongo.collection("online_list")
                        .insertOne({session: client.id, uin,device_id, time: new Date().getTime()})
                    /*
                    if(uin)//用户接入的时候报告设备状态
                        setTimeout(function () {
                            this.server.publish({
                                topic: "$SMTH/" + device_id + "/ONLINE",
                                payload: res.uin,
                                qos: 1, retain: false
                            })}.bind(this), 1000)
                    else//设备一上线就通知用户
                        this.server.publish({
                            topic: "$SMTH/" + device_id + "/ONLINE",
                            payload: res.uin,
                            qos: 1, retain: false
                        })
                        */
                    callback(null, true);
                } else
                    callback(null, false);
            }
        }.bind(this)
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
        if(packet.topic.split('/')[0]!="$SMTH"||packet.topic.split('/')[2])
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
                this.server.publish({
                    topic:packet.topic+"/NOTICE",
                    payload:packet.payload,
                    qos:1,retain:false
                })
            }
        }
    }
    async onDisconnected(client){//offline logout
        var res=await this.mongo.collection("online_list")
            .removeOne({session:client.id})
        /*
        this.server.publish({topic:"$SMTH/"+res.device_id+"/OFFLINE",
            payload:packet.payload,
            qos:1,retain:false})
            */
        console.log(res.result)
    }
}