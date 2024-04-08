
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

    console.log('drop')
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
    for (let i = 0; i < 10; i++) {
        const sMsg = '['+i+'] СообщениЕ ['+i+']';

        aMsg.push({id:0, text:sMsg, num:i});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }
    
    const row = await mqClientSys.insert('test', aMsg);
    console.log('[run]:',':',row);

    const aidMsg = aMsg.map(el => el.id);

    
    // PLACK
    const plack:number[] = await mqClientSys.select(db('test')
        .whereIn('id', aidMsg)
        .pluck('num')
    );
    console.log('plack:', plack)

    // ONE
    const one:RowI = await mqClientSys.select(db('test')
        .whereIn('id', [aidMsg[0]])
        .first()
    );
    console.log('one:', one)


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

