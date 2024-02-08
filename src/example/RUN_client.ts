
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

async function run(){


    // Вставка
    const aMsg = []
    for (let i = 0; i < 100; i++) {
        const sMsg = '['+i+'] СообщениЕ ['+i+']';

        aMsg.push({text:sMsg});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }
    
    const row = await mqClientSys.insert('test', aMsg);
    console.log('[run]:',':',row);

    
    // Отдельно добавляем 11 элемент НЕ массивом
    const vMsg11 = {text:'['+10+'] СообщениЕ ['+10+']'};
    const row11 = await mqClientSys.insert('test', vMsg11)

    // Добавляем 11 строку
    aMsg.push(row11);

    console.log('>>>INSERTDATA>>>', aMsg, '>>>INSERT отдельно>>>', vMsg11)


    const aidMsg = aMsg.map((el:any) => el.id);
    // Обновление
    
    const sMsg = 'Обновленное СообщениЕ ['+'] - ' + aidMsg.slice(2,4);

    const updateStatus = await mqClientSys.update({
        text:sMsg
    }, db('test')
        .whereIn('id', aidMsg.slice(2,4))
        .select({id:'id'})
    );

    console.log('[run:update]:',':',updateStatus);

    // ====================================

    // Обновление
    
    const sMsgIn = 'Обновленное СообщениЕ [UPDATE IN] - '+aidMsg.slice(7,9);

    const updateInStatus = await mqClientSys.updateIn('test.id', aidMsg.slice(7,9), {
        text:sMsgIn
    });

    

    console.log('[run:update_in]:',':',updateInStatus);

    // ====================================
    
    const deleteStatus = await mqClientSys.delete(db('test')
        .whereIn('id', aidMsg.slice(4,6))
        .select({id:'id'})
    );

    console.log('[run:delete]:',':',deleteStatus);

    // ====================================
    
    const deleteInStatus = await mqClientSys.deleteIn('test.id', aidMsg.slice(1,3));

    console.log('[run:delete_in]:',':',deleteInStatus);

    // ====================================
    // SELECT ALL INSERT
    const selectData = await mqClientSys.select(db('test')
        .whereIn('id', aidMsg)
        .select()
    );

    console.log('[run:select]:',':',selectData);

    console.log('====================================')
    // LIMIT 2
    const selectDataLimit = await mqClientSys.select(db('test')
        .whereIn('id', aidMsg)
        .limit(2)
    );

    console.log('[run:select_limit]:',':',selectDataLimit);

    console.log('====================================')
    // FIRST
    const selectDataFirst = await mqClientSys.select(db('test')
        .whereIn('id', aidMsg)
        .first()
    );

    console.log('[run:select_first]:',':',selectDataFirst);

    console.log('====================================')
    // FIRST CUSTOM FIELD
    const selectDataFirstCustom = await mqClientSys.select(db('test')
        .whereIn('id', aidMsg)
        .first('id',{text_id:'id'},'text', {text_custom:'text'})
    );
    console.log('[run:select_first_custom]:',':',selectDataFirstCustom);
    
    // }

    console.log('MSG массив', aidMsg)

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

