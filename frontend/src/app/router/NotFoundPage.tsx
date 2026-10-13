import { useNavigate } from 'react-router-dom';
import { Button, Group, Stack, Text, Title } from '@mantine/core';
import { paths } from '@/shared/config/paths';

/** Shown for any URL that matches no route. */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Stack gap="md" align="center" py="xl">
      <Title order={1} ta="center">
        We could not find that page
      </Title>
      <Text size="sm" c="dimmed" ta="center" maw={440}>
        The link may be out of date, or the page may have been removed. Nothing is broken on your
        side.
      </Text>
      <Group>
        <Button onClick={() => navigate(paths.home())}>Go to home</Button>
        <Button variant="light" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </Group>
    </Stack>
  );
}
