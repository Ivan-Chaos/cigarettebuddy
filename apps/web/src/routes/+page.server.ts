import { fail } from '@sveltejs/kit';
import { createUserSchema } from '@cigbuddy/shared';
import type { User } from '@cigbuddy/shared';
import { apiFetch } from '$lib/server/api';
import type { ApiList } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const users = await apiFetch<ApiList<User>>('/users', { fetch });
    return { users: users.data, total: users.meta.total, apiError: null };
  } catch (error) {
    // The page still renders when the API or database is down.
    return {
      users: [] as User[],
      total: 0,
      apiError: error instanceof Error ? error.message : 'API unavailable',
    };
  }
};

export const actions: Actions = {
  createUser: async ({ request, fetch }) => {
    const form = await request.formData();
    const parsed = createUserSchema.safeParse({
      name: form.get('name'),
      email: form.get('email'),
    });

    if (!parsed.success) {
      return fail(400, {
        message: parsed.error.issues[0]?.message ?? 'Invalid input',
        values: { name: String(form.get('name') ?? ''), email: String(form.get('email') ?? '') },
      });
    }

    try {
      await apiFetch('/users', {
        fetch,
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
    } catch (error) {
      return fail(502, {
        message: error instanceof Error ? error.message : 'Could not create user',
        values: parsed.data,
      });
    }

    return { success: true };
  },
};
