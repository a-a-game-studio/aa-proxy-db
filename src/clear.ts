
import { dbProxy } from "./System/DBConnect";

import dayjs from 'dayjs';
import { mFormatDateTime } from "./Helper/DateTimeH";

async function run(){

    // Удаляем логи старше 10 дней
    const dtClear10Day = mFormatDateTime(dayjs().subtract(10, 'day'));

    const aidQuery = await dbProxy('query').where('created_at', '<', dtClear10Day).limit(10000).pluck('id');
    await dbProxy('query').whereIn('id', aidQuery).del()
    console.log('Удалено записей обработанных спустя 10 дней:', aidQuery.length);

    console.log('=========================');
    console.log('END');
    console.log('=========================');
    process.exit(0)
}
run().catch((error) => {
    console.log('>>>ERROR>>>',error);
    process.exit(1)
});