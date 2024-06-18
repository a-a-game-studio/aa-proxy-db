
import  knex from 'knex';

import * as conf from '../Config/MainConfig';

const db = knex({ // Knex mysql
    client: "mysql2"
})


import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const dbProxy = new DbClientSys({
    baseURL: `ws://pass@${conf.common.host}:${conf.common.port}`,
    nameApp: 'RUN_db_exe_all_cmd'
})

/** Тип строки для теста/примера */
interface RowI {
    id?:number;
    text?:string;
    num?:number;
}

async function run(){

    

    // ========================
    // DELETE
    // ========================
    
    // Удаление через запрос по primary key
    const aidDeleteQueryPrimaryKey:number[] = await dbProxy.exe(db('test')
        .whereIn('id', [1,1])
        .delete());
    console.log('aidDeleteQueryPrimaryKey:', aidDeleteQueryPrimaryKey)

    // даление через запрос по выбранному ключу
    const aidDeleteQuery:number[] = await dbProxy.exe(db('test')
        .where({'id': 1, 'message_id':1})
        .del());
    console.log('aidDeleteQuery:', aidDeleteQuery)

    // // ========================
    // // UPDATE
    // // ========================
   
    // // Обновить через запрос по primary key
    // const aidUpdateQueryPrimaryKey:number[] = await dbProxy.exe(db('test')
    //     .whereIn('id',aidMsg.splice(0,2))
    //     .update({text:'update_primary_key'}));
    // console.log('aidUpdateQueryPrimaryKey:', aidUpdateQueryPrimaryKey)

    // const aidUpdateQueryIncrement:number[] = await dbProxy.exe(db('test')
    //     .whereIn('id',aidMsg.splice(0,2))
    //     .decrement('num',500));
    // console.log('aidUpdateQueryIncrement:', aidUpdateQueryIncrement)

    // console.log(await dbProxy.exe(db({t:'test'})
    //     .where('num', '>', 5)
    //     .whereIn('id', aidMsg.splice(0,2))
    //     .andWhereNot('num', 3)
    //     .increment('num', 1)))

    await mWait(2000);

    console.log('=========================');
    console.log('END');
    console.log('=========================');
    process.exit(0)
}
// for (let i = 0; i < 20; i++) {
run().catch((error) => {
    console.log('>>>ERROR>>>',error);
    process.exit(1)
});

// }

