
import  knex from 'knex';

import * as conf from '../Config/MainConfig';
import { mRandomInteger } from '../Helper/NumberH';

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

const aItemCat = ['штаны', 'пиджак', 'юбка', 'платье', 'костюм']
const aItemColor = ['зеленый', 'синий', 'желтый', 'белый', 'черный']
const aItemSetting = ['широкий', 'короткий', 'длинный', 'большой', 'маленький']

async function run(){


    // Вставка
    const aItem:{id?:number;name:string;price:number}[] = [];
    for (let i = 0; i < 100; i++) {
        

        const sRandCat = aItemCat[mRandomInteger(0, aItemCat.length - 1)];
        const sRandColor = aItemColor[mRandomInteger(0, aItemColor.length - 1)]
        const sRandSetting = aItemSetting[mRandomInteger(0, aItemSetting.length - 1)]

        const sName = ['['+i+']', sRandCat,sRandColor,sRandSetting,'['+i+']'].join(' ');
        
        aItem.push({name:sName, price:mRandomInteger(10,100)});
    }
    
    const rowItem = await mqClientSys.insert('item', aItem);

    // ========================================

    const aOrder:{id?:number;item_id:number;delivery:number}[] = [];
    for (let i = 0; i < 100; i++) {
        const vItem = aItem[mRandomInteger(0, aItem.length - 1)]

        aOrder.push({item_id:vItem.id, delivery:mRandomInteger(10,100)});
    }

    const rowOrder = await mqClientSys.insert('order', aOrder);

    // ========================================

    const aOrderChar:{id?:number;order_id:number;key:number;val:number}[] = [];
    for (let i = 0; i < 100; i++) {
        const vOrder = aOrder[mRandomInteger(0, aOrder.length - 1)]

        aOrderChar.push({order_id:vOrder.id, key:mRandomInteger(10,100),val:mRandomInteger(10,100)});
    }
    
    const rowOrderChar = await mqClientSys.insert('order_char', aOrderChar);

    const aidItem = aItem.map((el:any) => el.id);
    const aidOrder = aOrder.map((el:any) => el.id);
    const aidOrderChar = aOrderChar.map((el:any) => el.id);
    // Обновление
    
    // const sMsg = 'Обновленное Сообщени WhereIN Е ['+']';

    for (let i = 20; i < 40; i++) {
        const idItem = aidItem[i];

        const sRandCat = aItemCat[mRandomInteger(0, aItemCat.length - 1)];
        const sRandColor = aItemColor[mRandomInteger(0, aItemColor.length - 1)]
        const sRandSetting = aItemSetting[mRandomInteger(0, aItemSetting.length - 1)]

        const sName = ['['+i+']', 'Обновленный товар', '['+i+']', sRandCat,sRandColor,sRandSetting,'['+i+']'].join(' ');

        aItem.push({name:sName, price:1000});
    }

    { // UPDATE обычный
        const sRandCat = aItemCat[mRandomInteger(0, aItemCat.length - 1)];
        const sRandColor = aItemColor[mRandomInteger(0, aItemColor.length - 1)]
        const sRandSetting = aItemSetting[mRandomInteger(0, aItemSetting.length - 1)]

        const sName = ['[',']', 'Обновленный товар', '[',']', sRandCat,sRandColor,sRandSetting,'[',']'].join(' ');

        const updateStatus = await mqClientSys.update({
            name:sName, 
            price:1000
        }, db('item')
            .whereIn('id', aidItem.slice(20,40))
            .select({id:'id'})
        );
    }

    { // UPDATE с JOIN
        const sRandCat = aItemCat[mRandomInteger(0, aItemCat.length - 1)];
        const sRandColor = aItemColor[mRandomInteger(0, aItemColor.length - 1)]
        const sRandSetting = aItemSetting[mRandomInteger(0, aItemSetting.length - 1)]

        const sName = ['[',']', 'Обновленный JOIN товар', '[',']', sRandCat,sRandColor,sRandSetting,'[',']'].join(' ');

        const updateStatus = await mqClientSys.updateJoin({
            name:sName, 
            price:1000
        }, db({i:'item'})
            .rightJoin({o:'order'}, 'o.item_id', 'i.id')
            .whereIn('o.id', aidOrder.slice(20,40))
            .select({id:'i.id'})
        );

        console.log('[run:update_join]:',':',updateStatus);
    }

    { // DELETE с JOIN
        const sRandCat = aItemCat[mRandomInteger(0, aItemCat.length - 1)];
        const sRandColor = aItemColor[mRandomInteger(0, aItemColor.length - 1)]
        const sRandSetting = aItemSetting[mRandomInteger(0, aItemSetting.length - 1)]

        const sName = ['[',']', 'Обновленный JOIN товар', '[',']', sRandCat,sRandColor,sRandSetting,'[',']'].join(' ');

        const deleteStatus = await mqClientSys.deleteJoin(db({i:'item'})
            .rightJoin({o:'order'}, 'o.item_id', 'i.id')
            .whereIn('o.id', aidOrder.slice(10,20))
            .select({id:'i.id'})
        );

        console.log('[run:delete_join]:',':',deleteStatus);
    }
    

    

    // // ====================================
    
    // const deleteSttatus = await mqClientSys.delete(db('test')
    //     .whereIn('id', aidItem.slice(4,6))
    //     .select({id:'id'})
    // );

    // console.log('[run:delete]:',':',deleteSttatus);

    // // ====================================

    // const selectData = await mqClientSys.select(db('test')
    //     .whereIn('id', aidItem)
    //     .select()
    // );

    // console.log('[run:select]:',':',selectData);
    
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

