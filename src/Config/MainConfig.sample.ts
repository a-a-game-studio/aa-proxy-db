
/** Общие настройки приложения */
export const common = {
    env: 'dev', // Тип окружения
    nameApp: 'db_proxy', // Имя приложения // показываем
    host: '127.0.0.1', // Внутренний host на котором стартует noda слушается обращение к API
    port: 9000, // порт на котором будет работать нода
    host_public: 'https://larastory.ru', // Публичный host балансер к которому идет обращение с фронта
    pswd:'*'
}

export const cfDbProxy = { // Knex mysql
    client: "mysql2",
    connection: {
        host: "localhost",
        user: "root",
        password: "*",
        database: "*"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 60000
};

export const cfDbMaster = { // Knex mysql
    client: "mysql2",
    connection: {
        host: "localhost",
        user: "root",
        password: "*",
        database: "*1"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 60000
};

export const cfDbLog = { // Knex mysql
    client: "mysql2",
    connection: {
        host: "localhost",
        user: "root",
        password: "*",
        database: "*1"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 60000
};

/** логирование данных */
export const cfLogChange = {
    connect:'ws://127.0.0.1:3030',
    logBuffer:{log1:'packet_log1',log2:'packet_log2'}, // Предполагается запись в dbProxy - не обязательный параметр
    logConnect:cfDbLog,
    table:[
        // from=таблица -кто тригерит, to=таблица куда, id=идентификатор таблицы,col какие поля, type = список/один
        // левая таблица должна присутствовать колонкой в правой
        {from:'item', to:'item', where:['item_id'], col:['item_id']}, // товары
        {from:'item', to:'order', where:['item_id'], alias:'price', col:['price'], 'type':'val'}, // при изменении товара изменить заказ
        {from:'order', to:'order', where:['order_id'], col:['item_id','delivery']}, // заказ
        {from:'order_char', to:'order', where:['order_id'], col:['key_id', 'val_id'], type:'list'}, // товары
        {from:'order_char', to:'order_char', where:['order_id'], col:['key_id', 'val_id'], type:'list'}, // товары
    ]
}

/** События для отправки */
export const сfHook = {
    error:'https://'
}

export const aCfDb = {
    test_proxy_master0:{ // Knex mysql
        client: "mysql2",
        connection: {
            host: "localhost",
            port: 3306,
            user: "root",
            password: "*",
            database: "test_proxy_master0"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 60000
    },
   test_proxy_master1:{ // Knex mysql
        client: "mysql2",
        connection: {
            host: "localhost",
            port: 3306,
            user: "root",
            password: "*",
            database: "test_proxy_master1"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 60000
    },
    test_proxy_master2:{ // Knex mysql
        client: "mysql2",
        connection: {
            host: "localhost",
            port: 3306,
            user: "root",
            password: "*",
            database: "test_proxy_master2"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 60000
    },
}

/** Предпочтение при чтении */
export const aCfDbRead = {
    // '10.100.0.1':['110.10.50.1:3036:test_proxy_master0'], // от : куда
    '192.168.0.106':{ // от : куда
        user: "root", // Для чтения
        password: "*", // Для чтения
        adb:[ // Массив конфигураций БД
            aCfDb.test_proxy_master0,
            aCfDb.test_proxy_master1,
            aCfDb.test_proxy_master2
        ]
    }
}