[<<< На главную](./index.MD)

# User

--- 
## /user/getUserInfo
Получение инфы о пользователе
По токену
```typescript
    interface getUserInfoREQ {
        
    }

    export interface getUserInfoRESP {
        ok: boolean;
        errors: SimpleI.KeyVal[];
        data: UserI;
    }
```
    
--- 
## /user/registerByLoginAndPass
Регистрация по логину и паролю
```typescript
    interface registerByLoginAndPassREQ {
        login?: string;
        pass?: string;
        passConfirm?: string
    }

    interface registerByLoginAndPassRESP {
        ok: boolean;
        errors: SimpleI.KeyVal[];
        data: {
            token: string;
        };
    }
```   
    
--- 
## /user/update
Обновление основной информации
```typescript

    interface updateREQ {
        user: UserI;
    }

    interface updateRESP {
        ok: boolean;
        errors: SimpleI.KeyVal[];
        data: null;
    }
```   

[<<< На главную](./index.MD)