

import  knex, { Knex } from 'knex';

import * as conf from '../Config/MainConfig';

const db = knex({ // Knex mysql
    client: "mysql2"
})


import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const mqClientSys = new DbClientSys({
    baseURL: `ws://${conf.common.host}:${conf.common.port}`,
    nameApp: 'test_schema_init'
})

async function run(){


    await mqClientSys.schema('test',db.schema.dropTableIfExists('test'));
    const idSchema = await mqClientSys.schema('test', db.schema.createTable('test', (table:any) => {
        table.increments('id')
            .comment('ID');

        table.text('text')
            .comment('Текст сообщения');
    }));

    console.log('[run:schema]:',':',idSchema);
    
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

