
import  knex from 'knex';

import * as conf from '../Config/MainConfig';

const db = knex({ // Knex mysql
    client: "mysql2"
})


import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const dbProxy = new DbClientSys({
    baseURL: `ws://pass12@${conf.common.host}:${conf.common.port}`,
    nameApp: 'RUN_db_exe_all_cmd'
})

/** Тип строки для теста/примера */
interface RowI {
    test_id?:number;
    text?:string;
    num?:number;
}

async function run(){

    // await dbProxy.schema('test',db.schema.dropTableIfExists('test'));
    // const idSchemaTest = await dbProxy.schema('test', db.schema.createTable('test', (table) => {
    //     table.increments('test_id')
    //         .comment('ID');

    //     table.text('text')
    //         .comment('Текст сообщения');

    //     table.integer('num')
    //         .comment('Текст сообщения');
    // }));
    // console.log('[run:idSchemaTest]:',':',idSchemaTest);

    // Вставка
    const aMsg:RowI[] = []
    for (let i = 0; i < 50; i++) {
        const sMsg = '['+i+'] СообщениЕ ['+i+']';

        aMsg.push({text:sMsg, num:i});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }
    
    const row = await dbProxy.exe(db('test').insert(aMsg));

    const aidMsg = aMsg.map(el => el.test_id);

    // Вставка
    const aMsg2 = []
    for (let i = 0; i < 20; i++) {
        const sMsg = '['+i+'] СообщениЕ MERGE ['+i+']';

        aMsg2.push({test_id:aidMsg[i], text:sMsg, num:1000+i});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }
    
    const row2 = await dbProxy.exe(db('test').insert(aMsg2).onConflict().ignore());

    // ========================
    // SELECT
    // ========================
    const selectIn = await dbProxy.exe(db('test')
        .whereIn('test_id', aidMsg.splice(0,3))
        .limit(2)
    );
    console.log('SELECT>>>', selectIn)

    // ========================
    // DELETE
    // ========================
    
    // Удаление через запрос по primary key
    const aidDeleteQueryPrimaryKey:number[] = await dbProxy.exe(db('test')
        .where('test_id', aidMsg.splice(0,3)[0])
        .limit(2)
        .delete());
    console.log('aidDeleteQueryPrimaryKey:', aidDeleteQueryPrimaryKey)

    // даление через запрос по выбранному ключу
    const aidDeleteQuery:number[] = await dbProxy.exe(db('test')
        .where({'num': 25, 'test_id':3})
        .del());
    console.log('aidDeleteQuery:', aidDeleteQuery)

    // // ========================
    // // UPDATE
    // // ========================
   
    // Обновить через запрос по primary key
    const aidUpdateQueryPrimaryKey:number[] = await dbProxy.exe(db('test')
        .whereIn('test_id',aidMsg.splice(0,2))
        .update({text:'update_primary_key'}));
    console.log('aidUpdateQueryPrimaryKey:', aidUpdateQueryPrimaryKey)

    const aidUpdateQueryIncrement:number[] = await dbProxy.exe(db('test')
        .whereIn('test_id',aidMsg.splice(0,2))
        .decrement('num',500));
    console.log('aidUpdateQueryIncrement:', aidUpdateQueryIncrement)

    // console.log(await dbProxy.exe(db({t:'test'})
    //     .where('num', '>', 5)
    //     .whereIn('test_id', aidMsg.splice(0,2))
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

