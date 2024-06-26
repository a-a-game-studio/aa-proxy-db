
export enum MsgT {
    connect = '/connect', // Сообщение о соединении
    status = '/status', // Статус системы
    check = '/check', // Проверка соединения
    id = '/id', // получить id
    select = '/select', // Получить сообщение
    insert = '/insert', // Отправить сообщение
    replace = '/replace', // Отправить сообщение
    update = '/update', // Получить сообщение
    update_in = '/update-in', // Получить сообщение
    delete = '/delete', // Получить сообщение
    delete_in = '/delete-in', // Получить сообщение
    schema = '/schema', // Получить сообщение
    raw = '/raw', // Получить сообщение
}

/** Опции запросов */
export interface QueryContextOptionI {
    merge?:string[]; // Список колонок // insert | update
    mergeIgnore?:boolean; // Список колонок // insert | update
    updateRaw?:Record<string,string>; // update // increment|update от вычисления num = num + id + 5
    insertId?:true; // Вернуть исключительно id в место выполнения запроса
}

export interface QueryContextI {
    // n?:string; // Номер сообщения (когда оно уже зарегистрированно)
    uid?:string; // Уникальный идентификатор сообщения
    app:string; // Наименование приложения
    ip:string; // Входной IP адрес
    type:MsgT;
    table:string; // Таблица
    key_in?:string; // ключ условие выборки where in
	query?: string; // запрос/условие
    data?:any; // Данные
    time?:number; // Время отправки для механизмов очистки
    option?:QueryContextOptionI; // Опции запросов
    errors?:Record<string,string>;
}

export interface QueryErrorT {
    leve_db:'leve_db',
    append_db:'append_db',
    no_work_db:'no_work_db',
}

/** запрос на состояние */
export interface QueryStatusI {
    adb:string[],
    adbWait:string[],
    adbError:string[],
    adbCount:number,
    adbWaitCount:number,
    adbErrorCount:number,
    errors?:Record<string,string>
}

/** Тип БД */
export enum DbT {
    mysql = 'mysql'
}