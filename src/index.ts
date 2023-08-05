import 'reflect-metadata';
import {
  PrimaryKey,
  Entity,
  ManyToOne,
  Property,
  ValidationError,
  EntityManager,
} from '@mikro-orm/core';
import { Adapter, LuciaErrorConstructor } from 'lucia';
import { v4 } from 'uuid';

@Entity()
export class User {
  @PrimaryKey({ type: 'text' })
  id: string = v4();
}

@Entity()
export class Session {
  @PrimaryKey({ type: 'text' })
  id: string = v4();

  @ManyToOne(() => User)
  user!: User;

  @Property({ type: 'integer' })
  active_expires!: number;

  @Property({ type: 'integer' })
  idle_expires!: number;
}

@Entity()
export class UserKey {
  @PrimaryKey({ type: 'text' })
  id: string = v4();

  @ManyToOne(() => User)
  user!: User;

  @Property({ nullable: true, type: 'text' })
  hashed_password?: string;
}

export function mikroORMAdapter(
  em: EntityManager,
  entities = {
    User: User,
    Session: Session,
    UserKey: UserKey,
  },
) {
  const { User, Session, UserKey } = entities;

  return (luciaError: LuciaErrorConstructor): Adapter => {
    return {
      async getSessionAndUser(sessionId) {
        const res = await em.findOne(
          Session,
          {
            id: sessionId,
          },
          {
            populate: ['user'],
          },
        );

        if (!res) {
          return [null, null];
        }

        const { user, ...session } = res;

        return [
          {
            ...session,
            user_id: user.id,
          },
          user,
        ];
      },

      // user
      getUser(userId) {
        return em.findOne(User, {
          id: userId,
        });
      },
      async setUser(user, key) {
        if (!key) {
          em.create(User, {
            ...user,
          });

          await em.flush();

          return;
        }

        try {
          const newUser = em.create(User, {
            ...user,
          });

          em.create(UserKey, {
            id: key.id,
            hashed_password: key.hashed_password ?? undefined,
            user: newUser,
          });

          await em.flush();
        } catch (err) {
          if (err instanceof ValidationError) {
            console.error(err);
            // TODO: handle validation error and figure out what error to throw
            throw new luciaError('AUTH_DUPLICATE_KEY_ID');
          }

          throw err;
        }
      },
      async updateUser(userId, partialUser) {
        const user = await em.findOne(User, {
          id: userId,
        });

        if (!user) {
          return;
        }

        em.assign(user, partialUser);

        await em.flush();
      },
      async deleteUser(userId) {
        await em.removeAndFlush(em.getReference(User, userId));
      },

      // key
      async getKey(keyId) {
        const key = await em.findOne(UserKey, {
          id: keyId,
        });

        if (!key) {
          return null;
        }

        return {
          id: key.id,
          hashed_password: key.hashed_password ?? null,
          user_id: key.user.id,
        };
      },
      async getKeysByUserId(userId) {
        const keys = await em.find(UserKey, {
          user: em.getReference(User, userId),
        });

        return keys.map((key) => ({
          id: key.id,
          hashed_password: key.hashed_password ?? null,
          user_id: key.user.id,
        }));
      },
      async setKey(key) {
        try {
          em.create(UserKey, {
            id: key.id,
            hashed_password: key.hashed_password ?? undefined,
            user: em.getReference(User, key.user_id),
          });

          await em.flush();
        } catch (err) {
          if (err instanceof ValidationError) {
            console.error(err);
            // TODO: handle validation error and figure out what error to throw
            throw new luciaError('AUTH_DUPLICATE_KEY_ID');
          }

          throw err;
        }
      },
      async updateKey(keyId, partialKey) {
        const key = await em.findOne(UserKey, {
          id: keyId,
        });

        if (!key) {
          return;
        }

        em.assign(key, partialKey);

        await em.flush();
      },
      async deleteKey(keyId) {
        await em.removeAndFlush(em.getReference(UserKey, keyId));
      },
      async deleteKeysByUserId(userId) {
        const userKey = await em.findOneOrFail(UserKey, {
          user: em.getReference(User, userId),
        });

        await em.removeAndFlush(userKey);
      },

      // session
      async getSession(sessionId) {
        const session = await em.findOne(Session, {
          id: sessionId,
        });

        if (!session) {
          return null;
        }

        return {
          id: session.id,
          active_expires: session.active_expires,
          idle_expires: session.idle_expires,
          user_id: session.user.id,
        };
      },
      async getSessionsByUserId(userId) {
        const sessions = await em.find(Session, {
          user: em.getReference(User, userId),
        });

        return sessions.map((session) => ({
          id: session.id,
          active_expires: session.active_expires,
          idle_expires: session.idle_expires,
          user_id: session.user.id,
        }));
      },
      async setSession(session) {
        try {
          em.create(Session, {
            id: session.id,
            active_expires: session.active_expires,
            idle_expires: session.idle_expires,
            user: em.getReference(User, session.user_id),
          });

          await em.flush();
        } catch (err) {
          if (err instanceof ValidationError) {
            console.error(err);
            // TODO: handle validation error and figure out what error to throw
            throw new luciaError('AUTH_INVALID_USER_ID');
          }

          throw err;
        }
      },
      async updateSession(sessionId, partialSession) {
        const session = await em.findOne(Session, {
          id: sessionId,
        });

        if (!session) {
          return;
        }

        em.assign(session, partialSession);

        await em.flush();
      },
      async deleteSession(sessionId) {
        await em.removeAndFlush(em.getReference(Session, sessionId));
      },
      async deleteSessionsByUserId(userId) {
        const session = await em.findOneOrFail(Session, {
          user: em.getReference(User, userId),
        });

        await em.removeAndFlush(session);
      },
    };
  };
}
