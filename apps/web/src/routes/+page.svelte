<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let submitting = $state(false);
</script>

<h1>CigaretteBuddy</h1>
<p class="muted">
  SvelteKit + Express + Postgres monorepo boilerplate. This page is server-rendered from
  <code>/api/users</code>.
</p>

<section class="card" style="margin-top: 2rem">
  <h2 style="margin-top: 0; font-size: 1.1rem">Add a user</h2>

  <form
    method="POST"
    action="?/createUser"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update();
        submitting = false;
      };
    }}
    style="display: grid; gap: 0.75rem"
  >
    <input name="name" placeholder="Name" value={form?.values?.name ?? ''} required />
    <input
      name="email"
      type="email"
      placeholder="you@example.com"
      value={form?.values?.email ?? ''}
      required
    />
    <button type="submit" disabled={submitting}>
      {submitting ? 'Saving…' : 'Create user'}
    </button>
  </form>

  {#if form?.message}
    <p class="error" style="margin-bottom: 0">{form.message}</p>
  {/if}
</section>

<section style="margin-top: 2rem">
  <h2 style="font-size: 1.1rem">Users <span class="muted">({data.total})</span></h2>

  {#if data.apiError}
    <p class="error">{data.apiError}</p>
    <p class="muted">
      Start Postgres with <code>pnpm db:up</code>, run <code>pnpm db:migrate</code>, then reload.
    </p>
  {:else if data.users.length === 0}
    <p class="muted">No users yet — create one above or run <code>pnpm db:seed</code>.</p>
  {:else}
    <ul style="list-style: none; padding: 0; display: grid; gap: 0.5rem">
      {#each data.users as user (user.id)}
        <li class="card">
          <strong>{user.name}</strong>
          <div class="muted">{user.email}</div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
