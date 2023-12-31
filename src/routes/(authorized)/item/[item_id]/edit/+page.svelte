<script lang="ts">
  import { goto } from '$app/navigation';
  import PromiseButton from '$lib/components/PromiseButton.svelte';
  import ReadOnlyTextFieldInput from '$lib/components/ReadOnlyTextFieldInput.svelte';
  import ReadOnlyTextInput from '$lib/components/ReadOnlyTextInput.svelte';
  import { superForm } from 'sveltekit-superforms/client';
  export let data;
  const { form, errors } = superForm(data.form);
  $: item = data.item;
  $: community_visibility = data.community_visibility;
  $: $form.name = data.item.name;
  $: $form.description = data.item.description;
  const old_name = data.item.name;
  const old_description = data.item.description;
  $: disabled = old_name == $form.name && old_description == $form.description;
  const change_visibility = async (community_id: number) => {
    const res = await fetch(
      '/api/item/' + item.id + '/' + community_id + '/visibility',
      {
        method: 'POST',
      },
    );
    if (!res.ok) {
      throw new Error(String(res.status));
    }
    return (await res.json()) as {
      item_id: number | null;
      community_id: number | null;
    } | null;
  };
  const hide_all = async () => {
    const res = await fetch('/api/item/' + item.id + '/hide_all', {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(String(res.status));
    }
    return (await res.json()) as {
      item_id: number | null;
      community_id: number | null;
    } | null;
  };
  const show_all = async () => {
    const res = await fetch('/api/item/' + item.id + '/show_all', {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(String(res.status));
    }
    return (await res.json()) as {
      item_id: number | null;
      community_id: number | null;
    } | null;
  };
  const deleteItem = async () => {
    const response = await fetch('/api/item/' + item.id + '/remove', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
  };
</script>

<div class="space-y-8">
  <div>
    <form method="POST" action="?/edit" class="grid grid-cols-1 gap-4">
      <ReadOnlyTextInput
        label="Name"
        name="name"
        bind:value={$form.name}
        error={$errors.name}
      />

      <ReadOnlyTextFieldInput
        label="Description"
        name="description"
        bind:value={$form.description}
        error={$errors.description}
      />

      <div class="self-end justify-self-center col-span-full">
        <button {disabled} class="btn variant-filled-primary"
          >Save changes</button
        >
      </div>
    </form>
  </div>
  <div class="mb-6">
    <h4 class="text-2xl">Visibility settings</h4>
    <p class="text-sm">Which communities can see and borrow this item?</p>
    <div class="grid grid-cols-2 justify-items-center mt-4">
      <span>
        <PromiseButton
          disabled={community_visibility.filter((value) => {
            return value.item_visibility;
          }).length == 0}
          callback={async () => {
            return await hide_all();
          }}
          succes={(value) => {
            community_visibility = community_visibility.flatMap((fvalue) => {
              return {
                user_community_relations: fvalue.user_community_relations,
                communities: fvalue.communities,
                item_visibility: null,
              };
            });
          }}
          btn_class={'btn variant-filled-error py-1 my-2'}
          >Hide All</PromiseButton
        >
      </span>
      <span>
        <PromiseButton
          disabled={community_visibility.filter((value) => {
            return !value.item_visibility;
          }).length == 0}
          callback={async () => {
            return await show_all();
          }}
          succes={(value) => {
            community_visibility = community_visibility.flatMap((fvalue) => {
              return {
                user_community_relations: fvalue.user_community_relations,
                communities: fvalue.communities,
                item_visibility: {
                  community_id: fvalue.communities.id,
                  item_id: item.id,
                },
              };
            });
          }}
          btn_class={'btn variant-filled-primary py-1 my-2'}
          >Show All</PromiseButton
        >
      </span>
    </div>
    <div class="mt-2">
      <ol class="grid justify-items-center">
        {#each community_visibility as visibility (visibility.communities.id)}
          <li
            class="inline-grid grid-cols-3 justify-items-center items-baseline"
          >
            <span>
              <a href={'/community/' + visibility.communities.id}
                >{visibility.communities.name}</a
              >
            </span>
            <span>
              {#if visibility.item_visibility}
                <p>Visible</p>
              {:else}
                <p>Hidden</p>
              {/if}
            </span>
            <span>
              <PromiseButton
                disabled={false}
                callback={async () => {
                  return await change_visibility(visibility.communities.id);
                }}
                succes={(value) => {
                  const index = community_visibility.indexOf(visibility);
                  community_visibility[index].item_visibility = value;
                }}
                btn_class={'btn variant-filled-primary py-1 my-2'}
                >Change</PromiseButton
              >
            </span>
          </li>
        {/each}
      </ol>
    </div>
  </div>

  <div>
    <h4 class="text-2xl">Deletion</h4>
    <p class="mb-2">Warning: this cannot be undone.</p>

    <div class="grid justify-items-center">
      <PromiseButton
        btn_class={'btn variant-filled-error py-1 my-2'}
        callback={deleteItem}
        succes={() => {
          goto('/offer');
        }}
        disabled={false}
      >
        Delete Item
      </PromiseButton>
    </div>
  </div>
</div>
