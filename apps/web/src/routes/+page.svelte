<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card';

  function joinRoom() {
    void goto(resolve('/room'));
  }
</script>

<Card.Root class="mx-auto mt-8 max-w-md">
  <Card.Header>
    <Card.Title class="text-2xl">CigaretteBuddy</Card.Title>
    <Card.Description>
      Anonymous one-to-one video rooms. Get paired with whoever is waiting, or open a fresh room if
      nobody is. Two people per room.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <Button size="lg" class="w-full" onclick={joinRoom}>Join room</Button>
  </Card.Content>
</Card.Root>
