
import  knex from 'knex';

import * as conf from '../Config/MainConfig';

const db = knex({ // Knex mysql
    client: "mysql2"
})


import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const mqClientSys = new DbClientSys({
    baseURL: `ws://${conf.common.host}:${conf.common.port}`,
    nameApp: 'test_client'
})

async function run(){


    // Вставка
    const aMsg = []
    for (let i = 0; i < 10; i++) {
        const sMsg = '['+i+'] СообщениЕ ['+i+']';

        aMsg.push({text:sMsg});
        if(i % 1000 == 0){
            process.stdout.write('.');
        }
    }
    
    const row = await mqClientSys.insert('test', aMsg);
    console.log('[run]:',':',row);


    const aidMsg = aMsg.map((el:any) => el.id);
    // Обновление
    
    const sMsg = 'Обновленное СообщениЕ ['+']';

    const updateStatus = await mqClientSys.update({
        text:sMsg
    }, db('test')
        .whereIn('id', aidMsg.slice(2,4))
        .select({id:'id'})
    );

    console.log('[run:update]:',':',updateStatus);

    // ====================================
    
    const deleteSttatus = await mqClientSys.delete(db('test')
        .whereIn('id', aidMsg.slice(4,6))
        .select({id:'id'})
    );

    console.log('[run:delete]:',':',deleteSttatus);

    // ====================================

    const selectData = await mqClientSys.select(db('test')
        .whereIn('id', aidMsg)
        .select()
    );

    console.log('[run:select]:',':',selectData);
    
    // }

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

