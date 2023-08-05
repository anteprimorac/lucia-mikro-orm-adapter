# lucia-mikro-orm-adapter
[Mikro ORM](https://mikro-orm.io/) adapter for [Lucia auth library](https://lucia-auth.com/).

## Installation
```bash
npm i -S lucia-mikro-orm-adapter
```

## Usage
```js
import { lucia } from "lucia";
import { mikroORMAdapter, User, Session, UserKey } from "lucia-mikro-orm-adapter";

export const orm = await MikroORM.init({
  // register auth entities
  entities: [User, Session, UserKey],
  // ...
});

export const auth = lucia({
  adapter: mikroORMAdapter(orm),
  // ...
});
```

### Options

You can pass custom entities to the adapter through the options object. This is useful if you want to extend the default entities or use your own.

```js
mikroORMAdapter(orm, {
  User,
  Session,
  UserKey,
});
```
