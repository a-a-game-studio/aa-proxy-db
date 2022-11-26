
export enum MsgT {
    connect = '/connect', // Сообщение о соединении
    check = '/check', // Проверка соединения
    aid = '/aid', // получить id
    select = '/select', // Получить сообщение
    insert = '/insert', // Отправить сообщение
    update = '/update', // Получить сообщение
    delete = '/delete', // Получить сообщение
    count = '/count', // Количество сообщений
    info = '/info' // Информация по очереди 
}

export interface MsgContextI {
    // n?:string; // Номер сообщения (когда оно уже зарегистрированно)
    uid?:string; // Уникальный идентификатор сообщения
    app:string; // Наименование приложения
    ip:string; // Входной IP адрес
    type:MsgT;
    table:string; // Таблица
	query?: string; // запрос/условие
    data?:any; // Данные
    time?:number; // Время отправки для механизмов очистки
}
