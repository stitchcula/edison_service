/**
 * Created by stitchcula on 2016/9/4.
 */

import mongodb from 'mongodb'
import Mosca from './lib/cMosca.js'

(async function () {
    const mongo=await mongodb.MongoClient
        .connect(`mongodb://${process.env['MONGO_HOST']}:${process.env['MONGO_PORT']}/smth`)

    const mosca=new Mosca(mongo)
    mosca.listen(8005)
})()


