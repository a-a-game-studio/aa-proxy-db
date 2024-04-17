
import  knex from 'knex';

import * as conf from '../Config/MainConfig';

const db = knex({ // Knex mysql
    client: "mysql2"
})


import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const mqClientSys1 = new DbClientSys({
    baseURL: `ws://pass12@${conf.common.host}:${conf.common.port}`,
    nameApp: 'test_client'
})

const mqClientSys2 = new DbClientSys({
    baseURL: `ws://pass12@${conf.common.host}:${conf.common.port}`,
    nameApp: 'test_client'
})

const mqClientSys3 = new DbClientSys({
    baseURL: `ws://pass12@${conf.common.host}:${conf.common.port}`,
    nameApp: 'test_client'
})



/** Тип строки для теста/примера */
interface RowI {
    id?:number;
    text?:string;
    num?:number;
}

/** проверка что создается только одно соединение и только по требованию */
async function run(){

    await mWait(2000);

    await mqClientSys1.schema('test',db.schema.dropTableIfExists('test'));
    const idSchemaTest = await mqClientSys1.schema('test', db.schema.createTable('test', (table) => {
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
    
    const row = await mqClientSys1.insert('test', aMsg);

    const aidMsg = aMsg.map(el => el.id);

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

