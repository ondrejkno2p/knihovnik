import bcrypt from 'bcryptjs';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { redirect } from '@sveltejs/kit';
import { users } from '$lib/server/db/schema';
import { db } from '$lib/server/db/drizzle';
import { eq, sql } from 'drizzle-orm';
import { sendRegistrationEmail } from '$lib/server/mail';
import { env } from '$env/dynamic/private';
import { schema } from './+page.svelte';
import type { PageServerLoad, Actions } from './$types';
import type { UserRegister } from '$lib/types';

export const load = (async () => {
  const form = await superValidate(schema);

  return { form };
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, schema);

    if (!form.valid) {
      return message(form, 'Enter all of the required information', {
        status: 400,
      });
    }

    try {
      const user = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.user_name, form.data.user_name));

      if (user[0].count > 0) {
        return setError(
          form,
          'user_name',
          'This username has already been taken',
        );
      }

      const email = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.email, form.data.email));

      if (email[0].count > 0) {
        return setError(form, 'email', 'You already have an account');
      }
    } catch (error) {
      console.error(error);
      return message(form, 'Internal Error (check)', { status: 500 });
    }

    const host = env['ORIGIN'] ?? 'https://knihovnik.vercel.app';
    const { password, ...rest } = form.data as UserRegister;
    const confirm_hash = crypto.randomUUID();

    let userId;

    try {
      userId = await db
        .insert(users)
        .values({
          ...rest,
          password_hash: await bcrypt.hash(password, 10),
          confirm_hash,
        })
        .returning({ id: users.id })
        .then((r) => r[0].id);

      await sendRegistrationEmail(
        rest.full_name,
        rest.email,
        `${host}/api/register?hash=${confirm_hash}`,
      );
    } catch (err) {
      console.error(err);

      if (userId !== undefined) {
        await db.delete(users).where(eq(users.id, userId));
      }
      const suffix = userId !== undefined ? '-followup' : '-insert';

      return message(form, `Internal Error (reg${suffix})`, { status: 500 });
    }

    throw redirect(303, '/register/success');
  },
} satisfies Actions;
