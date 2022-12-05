
import  knex from 'knex';

const db = knex({ // Knex mysql
    client: "mysql2"
})


import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const mqClientSys = new DbClientSys({
    baseURL: 'ws://127.0.0.1:8080',
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

    const updateSttatus = await mqClientSys.update({
        text:sMsg
    }, db('test')
        .whereIn('id', aidMsg.slice(2,4))
        .select({id:'id'})
    );

    console.log('[run:update]:',':',updateSttatus);

    // ====================================
    
    const deleteSttatus = await mqClientSys.delete(db('test')
        .whereIn('id', aidMsg.slice(4,6))
        .select({id:'id'})
    );

    console.log('[run:delete]:',':',updateSttatus);

    // ====================================

    const selectData = await mqClientSys.select(db('test')
        .whereIn('id', aidMsg)
        .select()
    );

    console.log('[run:select]:',':',selectData);
    
    // }

    await mWait(5000);

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

