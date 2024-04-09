
import  knex from 'knex';

import * as conf from '../Config/MainConfig';

const db = knex({ // Knex mysql
    client: "mysql2"
})


import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const mqClientSys = new DbClientSys({
    baseURL: `ws://pass12@${conf.common.host}:${conf.common.port}`,
    nameApp: 'test_client'
})

/** Тип строки для теста/примера */
interface RowI {
    id?:number;
    text?:string;
    num?:number;
}

async function run(){

    await mqClientSys.schema('test',db.schema.dropTableIfExists('test'));
    const idSchemaTest = await mqClientSys.schema('test', db.schema.createTable('test', (table) => {
        table.increments('id')
            .comment('ID');

        table.text('text')
            .comment('Текст сообщения');

        table.integer('num')
            .comment('Текст сообщения');
    }));
    console.log('[run:idSchemaTest]:',':',idSchemaTest);

    // Вставка
    const aMsg = []
    for (let i = 0; i < 50; i++) {
        const sMsg = '['+i+'] СообщениЕ ['+i+']';

        aMsg.push({id:0, text:sMsg, num:i});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }
    
    const row = await mqClientSys.insert('test', aMsg);

    const aidMsg = aMsg.map(el => el.id);

    // ========================
    // DELETE
    // ========================
    
    // Удаление через запрос по primary key
    const aidDeleteQueryPrimaryKey:number[] = await mqClientSys.deleteQuery('test', db('test')
        .whereIn('id',aidMsg.splice(0,3))
        .pluck('id'));
    console.log('aidDeleteQueryPrimaryKey:', aidDeleteQueryPrimaryKey)

    // даление через запрос по выбранному ключу
    const aidDeleteQuery:number[] = await mqClientSys.deleteQuery('test.num', db('test')
        .whereIn('id',aidMsg.splice(0,4))
        .pluck('num'));
    console.log('aidDeleteQuery:', aidDeleteQuery)

    // ========================
    // UPDATE
    // ========================
   
    // Обновить через запрос по primary key
    const aidUpdateQueryPrimaryKey:number[] = await mqClientSys.updateQuery('test',  {text:'update_primary_key'}, db('test')
        .whereIn('id',aidMsg.splice(0,2))
        .pluck('id'));
    console.log('aidUpdateQueryPrimaryKey:', aidUpdateQueryPrimaryKey)

    // ПОбновить через запрос по выбранному ключу
    const aidUpdateQuery:number[] = await mqClientSys.updateQuery('test.num', {text:'update_where_in'}, db('test')
        .whereIn('id',aidMsg.splice(0,6))
        .pluck('num'));
    console.log('aidUpdateQuery:', aidUpdateQuery)

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

