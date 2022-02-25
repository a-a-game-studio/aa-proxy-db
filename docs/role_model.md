[<<< На главную](./index.MD)

# Модуль для редактирования прав пользователей и редактирования ролей

# API

## Список пользователей /api/admin/user/get-users
```typescript
    export interface RequestI {
        offset: number; // С какой записи получать данные
        limit: number; // Сколько записей получать
        search_fullname?: string; // Поиск По ФИО
        search_username?: string; // Поиск по Имени пользователя
    }

    export interface ResponseI {
        list_user: UserI[]; // Список пользователей
    }
```

## Информация о пользователе /api/admin/user/get-user
```typescript
    export interface RequestI {
        user_id: number; // ID пользователя
    }

    export interface ResponseI {
        one_user: UserI; // Информация о пользователе
    }
```

## Краткая информация по группе /api/admin/user/get-group
```typescript
    export interface RequestI {
        group_id:number; // ID группы
    }

    export interface ResponseI {
        one_group:GroupI; // Информация по группе
    }
```

## Краткая информация по контроллеру доступа /api/admin/user/get-ctrl-access
```typescript
    export interface RequestI {
        alias: string; // Псевдоним контроллера доступа
    }

    export interface ResponseI {
        one_ctrl_access: CtrlAccessI; // Информация по группе
    }
```

## Роли доступные пользователю /api/admin/user/get-user-groups
```typescript
    export interface RequestI {
        user_id: number; // ID пользователя
    }

    export interface ResponseI {
        list_group: GroupI[]; // Информация о пользователе
    }
```

## Модули доступные группе /api/admin/user/get-ctrl-access-of-group
```typescript
    export interface RequestI {
        group_id: number; // ID группы
    }

    export interface ResponseI {
        list_ctrl_access: AccessGroupI[]; // Список пользователей
    }
```

## Все Роли/Группы пользователей /api/admin/user/get-group-list
```typescript
    export interface RequestI {}

    export interface ResponseI {
        list_group: GroupI; // Информация по группе
    }
```

## Все контроллеры /api/admin/user/get-ctrl-access-list
```typescript
    export interface RequestI {}

    /** Параметры api ответа */
    export interface ResponseI {
        list_ctrl_access: CtrlAccessI[]; // список модулей
    }
```

## Данные группы сохраненны /api/admin/user/save-group
```typescript
    export interface RequestI {
        group_id: number; // ID группы
        name?: string; // Наименование группы
        alias?: string; // Псевдоним
        descript?: string; // Описание
    }

    export interface ResponseI {
        cmd_save_group: boolean; // Информация по группе
    }
```

## Сохранены данные контроллера доступа к модулю /api/admin/user/save-ctrl-access
```typescript
    export interface RequestI {
        ctrl_access_id: number; // ID контроллера доступа - который обновляем
        alias?: string; // Псевдоним
        name?: string; // Имя контроллера
        descript?: string; // Описание
    }

    export interface ResponseI {
        cmd_save_ctrl_access: boolean;
    }
```

## Изменены параметры доступа к модулю /api/admin/user/save-access-group
```typescript
    export interface RequestI {
        access_group_id: number; // ID параметров доступа
        create_access: boolean; // Разрешение на создание
        read_access: boolean; // Разрешение на чтение
        update_access: boolean; // Разрешение на обнление
        delete_access: boolean; // Разрешение на удаление
    }

    export interface ResponseI {
        cmd_save_access_group: boolean; // Успешно или нет прошло изменение доступа
    }
```

## Добавлен alias контроллера /api/admin/user/add-ctrl-access
```typescript
    export interface RequestI {
        alias:string; // Псевдоним
        name?:string; // Имя контроллера
        descript?:string; // Описание
    }

    export interface ResponseI {
        cmd_add_ctrl_access:number; // ID нового контроллера доступа
    }
```

## Добавлена роль пользователю /api/admin/user/add-user-to-group
```typescript
    export interface RequestI {
        user_id: number; // ID пользователя
        group_id: number; // ID группы
    }

    /** Параметры api ответа */
    export interface ResponseI {
        cmd_add_user_to_group: number; // ID Связи пользователя и группы
    }
```

## Группе добавлен доступ к модулю /api/admin/user/add-ctrl-access-to-group
```typescript
    export interface RequestI {
        ctrl_access_id: number;
        group_id: number;
    }

    export interface ResponseI {
        cmd_add_ctrl_access_to_group: number; // ID связи контроллера и группы
    }
```

## Удалена роль у пользователя /api/admin/user/del-user-from-group
```typescript
    export interface RequestI {
        user_id: number; // ID пользователя
        group_id: number; // ID группы
    }

    export interface ResponseI {
        cmd_del_user_from_group: boolean; // Статус операции
    }

```

## Удален контроллер доступа /api/admin/user/del-ctrl-access
```typescript
    export interface RequestI {
        alias:string; // Псевдоним
    }

    export interface ResponseI {
        cmd_del_ctrl_access:boolean; // Статус операции
    }

```

## Группе удален доступ к модулю /api/admin/user/del-ctrl-access-from-group
```typescript
    export interface RequestI {
        ctrl_access_id: number;
        group_id: number;
    }

    /** Параметры api ответа */
    export interface ResponseI {
        cmd_del_ctrl_access_from_group: boolean; // Статус удаления
    }

```

[<<< На главную](./index.MD)