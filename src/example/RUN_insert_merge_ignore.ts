
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

    await mqClientSys.schema('test', db.schema.dropTableIfExists('test'));
    const idSchemaTest = await mqClientSys.schema('test', db.schema.createTable('test', (table) => {
        table.increments('id')
            .comment('ID');

        table.text('text')
            .comment('Текст сообщения');

        table.integer('num')
            .comment('Текст сообщения')
            .unique();
    }));
    console.log('[run:idSchemaTest]:',':',idSchemaTest);

    // Вставка Первичная
    const aMsg1 = []
    for (let i = 0; i < 10; i++) {
        const sMsg = '['+i+'] СообщениЕ ['+i+']';

        aMsg1.push({id:0, text:sMsg, num:i});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }

    const row1 = await mqClientSys.insert('test', aMsg1);

    const aidMsg1 = aMsg1.map(el => el.id);
    console.log('aidMsg1>>>',aidMsg1)

    // =========================================

    // Вставка merge с заменой [text]
    const aMsg2 = []
    for (let i = 5; i < 20; i++) {
        const sMsg = '['+i+'] Сообщени2Е ['+i+']';

        aMsg2.push({id:0, text:sMsg, num:i});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }
    
    const row2 = await mqClientSys.insert('test', aMsg2, { merge:['text']});

    const aidMsg2 = aMsg2.map(el => el.id);
    console.log('aidMsg2>>>',aidMsg2)

    // =========================================

    // Вставка ignore пропускает где конфликты
    const aMsg3 = []
    for (let i = 15; i < 30; i++) {
        const sMsg = '['+i+'] Сообщени3Е ['+i+']';

        aMsg3.push({id:0, text:sMsg, num:i});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }
    
    const row3 = await mqClientSys.insert('test', aMsg3, { mergeIgnore:true });

    const aidMsg3 = aMsg3.map(el => el.id);
    console.log('aidMsg3>>>',aidMsg3)

    // =========================================

    // Вставка merge all column !!!перезаписывает!!! [primary key]
    const aMsg4 = []
    for (let i = 25; i < 40; i++) {
        const sMsg = '['+i+'] Сообщени4Е ['+i+']';

        aMsg4.push({id:0, text:sMsg, num:i});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }

    console.log('Вставка закоментирована, при раскоментировании будет прогенерированна ошибка',
        '\nпоскольку будет проигнорирован merge c пустым массивом',
        '\nнужно указывать явно'
    );
    
    // const row4 = await mqClientSys.insert('test', aMsg4, { merge:[]});

    // const aidMsg4 = aMsg4.map(el => el.id);
    // console.log('aidMsg2>>>',aidMsg4)

    // =========================================

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

