// ==============================================================
// Подключения баз данных
// ==============================================================

export const cfDbProxy = { // Knex mysql
    client: "mysql",
    connection: {
        host: "localhost",
        user: "root",
        password: "Angel13q24w35e",
        database: "test_proxy"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 5000
};

export const cfDbMaster = { // Наиболее свежая БД
    client: "mysql",
    connection: {
        host: "localhost",
        user: "root",
        password: "Angel13q24w35e",
        database: "test_proxy"
    },
    pool: { "min": 0, "max": 7 },
    acquireConnectionTimeout: 5000
};

export const cfDb = [
    { // Knex mysql
        client: "mysql",
        connection: {
            host: "localhost",
            user: "root",
            password: "Angel13q24w35e",
            database: "test_proxy_master0"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 5000
    } ,{
        client: "mysql",
        connection: {
            host: "localhost",
            user: "root",
            password: "Angel13q24w35e",
            database: "test_proxy_master1"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 5000
    } ,{
        client: "mysql",
        connection: {
            host: "localhost",
            user: "root",
            password: "Angel13q24w35e",
            database: "test_proxy_master2"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 5000  
    }
];

/** Общие настройки приложения */
export const common = {
    env: 'dev', // Тип окружения
    nameApp: 'db_proxy', // Имя приложения // показываем
    host: '127.0.0.1', // Внутренний host на котором стартует noda слушается обращение к API
    port: 8080, // порт на котором будет работать нода
    host_public: 'https://larastory.ru', // Публичный host балансер к которому идет обращение с фронта
}