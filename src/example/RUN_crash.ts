
import  knex from 'knex';

import * as conf from '../Config/MainConfig';
import { mRandomInteger } from '../Helper/NumberH';

const db = knex({ // Knex mysql
    client: "mysql2"
})

const dbCrashRename = knex(conf.aCfDb.test_proxy_master2)


import { mWait } from "../Helper/WaitH";
import { DbClientSys } from "../System/DbClientSys";

// CORE API
const mqClientSys = new DbClientSys({
    baseURL: `ws://pass12@${conf.common.host}:${conf.common.port}`,
    nameApp: 'test_client'
})

const aItemCat = ['штаны', 'пиджак', 'юбка', 'платье', 'костюм'];
const aItemColor = ['зеленый', 'синий', 'желтый', 'белый', 'черный'];
const aItemSetting = ['широкий', 'короткий', 'длинный', 'большой', 'маленький'];

async function run(){

    await mqClientSys.schema('item_crash',db.schema.dropTableIfExists('item_crash'));
    await mqClientSys.schema('item_crash_temp',db.schema.dropTableIfExists('item_crash_temp'));
    const idSchemaItem = await mqClientSys.schema('item_crash', db.schema.createTable('item_crash', (table:any) => {
        table.increments('id')
            .comment('ID');

        table.string('name', 100)
            .comment('Наименование товара');

        table.integer('price')
            .comment('Цена товара');
        
    }));
    console.log('[run:item_crash]:',':',idSchemaItem);

    let bInsertCrashTest = false;

    // Вставка
    let aItem:{id?:number;name:string;price:number}[] = [];
    const iCount = 400;
    for (let i = 0; i < iCount; i++) {

        const sRandCat = aItemCat[mRandomInteger(0, aItemCat.length - 1)];
        const sRandColor = aItemColor[mRandomInteger(0, aItemColor.length - 1)];
        const sRandSetting = aItemSetting[mRandomInteger(0, aItemSetting.length - 1)];

        const sName = ['['+i+']', sRandCat,sRandColor,sRandSetting,'['+i+']'].join(' ');
        
        aItem.push({name:sName, price:mRandomInteger(10,100)});

        if(i % 10 === 0){
            console.log('Итерация: ', i, '/', iCount);
            const rowItem = await mqClientSys.insert('item_crash', aItem);
            aItem = [];
            await mWait(200);
        }

        if(i % 100 === 0 && i > 1 && !bInsertCrashTest){
            bInsertCrashTest = true;
            (async () => {
                console.log('Переименовываем таблицу');
                await dbCrashRename.schema.renameTable('item_crash', 'item_crash_temp');
                console.log('Ожидаем восстановления таблицы')
                await mWait(5*100);
                console.log('Переименовываем таблицу')
                await dbCrashRename.schema.renameTable('item_crash_temp', 'item_crash');
            })();
        }

    }
    
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

