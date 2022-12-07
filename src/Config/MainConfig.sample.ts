
/** Общие настройки приложения */
export const common = {
    env: 'dev', // Тип окружения
    nameApp: 'db_proxy', // Имя приложения // показываем
    host: '127.0.0.1', // Внутренний host на котором стартует noda слушается обращение к API
    port: 9000, // порт на котором будет работать нода
    host_public: 'https://larastory.ru', // Публичный host балансер к которому идет обращение с фронта
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


export const cfDb = [
    { // Knex mysql
        client: "mysql2",
        connection: {
            host: "localhost",
            user: "root",
            password: "*",
            database: "*1"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 60000
    },
    { // Knex mysql
        client: "mysql2",
        connection: {
            host: "localhost",
            user: "root",
            password: "*",
            database: "*2"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 60000
    },
    { // Knex mysql
        client: "mysql2",
        connection: {
            host: "localhost",
            user: "root",
            password: "*",
            database: "*3"
        },
        pool: { "min": 0, "max": 7 },
        acquireConnectionTimeout: 60000
    },
]