import { supabase } from './supabase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export async function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const { data } = await supabase.auth.getUser();
  const errInfo: SupabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: data.user?.id ?? null,
      email: data.user?.email ?? null,
    },
    operationType,
    path,
  };
  const errorMsg = JSON.stringify(errInfo);
  console.error('Supabase Error: ', errorMsg);
  throw new Error(errorMsg);
}
