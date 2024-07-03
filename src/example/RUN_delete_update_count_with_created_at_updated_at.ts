
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

        table.dateTime('created_at')
            .notNullable()
            .defaultTo(db.raw('CURRENT_TIMESTAMP'))
            .comment('Дата изменения записи');

        table.dateTime('updated_at')
            .notNullable()
            .defaultTo(db.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
            .comment('Дата изменения записи');
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
    
    // Получить количество удаленных сообщение by IN
    const aidDeleteIn:number[] = await mqClientSys.deleteIn('test', aidMsg.splice(0,5));
    console.log('aidDeleteIn:', aidDeleteIn)
    console.log('aidDeleteInCount:', aidDeleteIn.length)

    // Получить количество удаленных сообщений by QUERY
    const aidDeleteQuery:number[] = await mqClientSys.deleteQuery('test', db('test')
        .whereIn('id', aidMsg.splice(0,7))
        .select({id:'id'})
    );
    console.log('aidDeleteQuery:', aidDeleteQuery);
    console.log('aidDeleteQueryCount:', aidDeleteQuery.length);

    // ========================
    // UPDATE
    // ========================

    // Получить количество удаленных сообщение by IN
    const aidUpdateIn:number[] = await mqClientSys.updateIn('test', aidMsg.splice(0,3), {text:'update_in'});
    console.log('aidUpdateIn:', aidUpdateIn)
    console.log('aidUpdateInCount:', aidUpdateIn.length)

    // Получить количество удаленных сообщений by QUERY
    const aidUpdateQuery:number[] = await mqClientSys.updateQuery('test', {text:'update_in'}, db('test')
        .whereIn('id', aidMsg.splice(0,4))
        .select({id:'id'})
    );
    console.log('aidUpdateQuery:', aidUpdateQuery);
    console.log('aidUpdateQueryCount:', aidUpdateQuery.length);

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

