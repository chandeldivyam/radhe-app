// frontend/src/features/sync/zero-setup.ts
import { Zero } from '@rocicorp/zero';
import { type Schema, schema, createMutators, type Mutators, type AuthData } from '@radhe/zero-shared';
import { Atom } from '../../lib/atom';
import { clearJwt, getJwt, getRawJwt } from '../../lib/jwt';


export type LoginState = AuthData;

const zeroAtom = new Atom<Zero<Schema, Mutators>>();
const authAtom = new Atom<LoginState>();

const encodedJwt = getRawJwt();
const decodedJwt = getJwt();

authAtom.value =
  encodedJwt && decodedJwt
    ? (decodedJwt as LoginState)
    : undefined;

refreshAuth()

authAtom.onChange(auth => {
  zeroAtom.value?.close();
  const authData = auth;
  const currentEncodedJwt = getRawJwt();

  console.log('Auth state changed, configuring Zero. AuthData:', authData);

  const z = new Zero({
    // server: import.meta.env.VITE_PUBLIC_SERVER, TODO
    server: 'http://localhost:4848',

    userID: authData?.sub ?? 'anon',
    schema,

    mutators: createMutators(authData),

    auth: (error?: 'invalid-token') => {
      if (error === 'invalid-token') {
        console.log('Zero reported invalid token, clearing JWT.');
        clearJwt();
        authAtom.value = undefined;
        return undefined;
      }
      return currentEncodedJwt;
    },
    kvStore: 'idb',
    logLevel: 'info',
  });
  zeroAtom.value = z;
});

export function logout() {
  console.log('Logging out, clearing JWT and auth state.');
  clearJwt();
  authAtom.value = undefined; // Trigger auth change
}

export function refreshAuth(): LoginState {
  const encodedJwt = getRawJwt();
  const decodedJwt = getJwt();
  const newAuth = encodedJwt && decodedJwt ? (decodedJwt as LoginState) : undefined;
  authAtom.value = newAuth!;
  return newAuth!;
}

export { authAtom as authRef, zeroAtom as zeroRef };