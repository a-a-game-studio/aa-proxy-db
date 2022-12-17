

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
    const idSchemaTest = await mqClientSys.schema('test', db.schema.createTable('test', (table:any) => {
        table.increments('id')
            .comment('ID');

        table.text('text')
            .comment('Текст сообщения');
    }));
    console.log('[run:idSchemaTest]:',':',idSchemaTest);

    await mqClientSys.schema('item',db.schema.dropTableIfExists('item'));
    const idSchemaItem = await mqClientSys.schema('item', db.schema.createTable('item', (table:any) => {
        table.increments('id')
            .comment('ID');

        table.string('name', 100)
            .comment('Наименование товара');

        table.integer('price')
            .comment('Цена товара');
        
    }));
    console.log('[run:idSchemaOrder]:',':',idSchemaItem);

    await mqClientSys.schema('order',db.schema.dropTableIfExists('order'));
    const idSchemaOrder = await mqClientSys.schema('order', db.schema.createTable('order', (table:any) => {
        table.increments('id')
            .comment('ID');

        table.integer('item_id')
            .index('item_id')
            .comment('Наименование товара');

        table.integer('delivery')
            .comment('Наименование товара');
    }));
    console.log('[run:idSchemaOrder]:',':',idSchemaOrder);

    await mqClientSys.schema('order_char',db.schema.dropTableIfExists('order_char'));
    const idSchemaOrderChar = await mqClientSys.schema('order_char', db.schema.createTable('order_char', (table:any) => {
        table.increments('id')
            .comment('ID');

        table.integer('order_id')
            .index('order_id')
            .comment('Наименование товара');

        table.integer('key')
            .comment('характеристика товара');

        table.integer('val')
            .comment('значение характеристики товара');
    }));
    console.log('[run:idSchemaOrderChar]:',':',idSchemaOrderChar);

    
    await mqClientSys.schema('__replication__',db.schema.raw('TRUNCATE TABLE __replication__'));

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

