import { useState } from 'react';
import { Button, Group, Modal, Progress, Stack, Text, Title } from '@mantine/core';
import {
  Building2,
  Home,
  MessageCircle,
  MessagesSquare,
  Scale,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useMarkInstructionsSeen } from '@/features/auth';
import styles from './InstructionWalkthrough.module.css';

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

/** One card per page of the app (spec 3.10). */
const STEPS: Step[] = [
  {
    icon: Home,
    title: 'Home',
    body: 'Your starting point. It recommends discussions based on what you picked in the assessment, and it is where both search bars live.',
  },
  {
    icon: MessagesSquare,
    title: 'Discussions',
    body: 'Browse by tag, or search for one. Every post needs at least one tag, and the newest posts are at the top.',
  },
  {
    icon: Building2,
    title: 'Companies',
    body: 'Each company page shows what the SHIP team found in published sources, kept separate from what employees reported. Averages from employees appear once five people have contributed.',
  },
  {
    icon: Scale,
    title: 'Compare',
    body: 'Put two companies side by side. We only compare figures that measure the same thing, and we say so when we cannot.',
  },
  {
    icon: MessageCircle,
    title: 'Messages',
    body: 'Tap the avatar on any post to message the author. Both of you stay anonymous - no names, no email addresses.',
  },
  {
    icon: User,
    title: 'Profile',
    body: 'Your posts, comments and contributions. You can retake the assessment or delete your account from here.',
  },
];

export interface InstructionWalkthroughProps {
  opened: boolean;
  /** Called after the walkthrough is dismissed or finished. */
  onClose: () => void;
}

/**
 * The one-time tour shown after the first assessment (spec 3.10).
 *
 * Moving between steps is keyboard-accessible Back/Next rather than a swipe,
 * because a swipe-only control is unusable with a keyboard. Finishing records
 * `hasSeenInstructions` on the server so it does not reappear on another
 * device.
 */
export function InstructionWalkthrough({ opened, onClose }: InstructionWalkthroughProps) {
  const [index, setIndex] = useState(0);
  const markSeen = useMarkInstructionsSeen();

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = () => {
    markSeen.mutate(undefined, { onSettled: onClose });
  };

  if (!step) return null;

  const Icon = step.icon;

  return (
    <Modal
      opened={opened}
      onClose={finish}
      title="How SHIP works"
      centered
      size="lg"
      closeOnClickOutside={false}
    >
      <Stack gap="lg">
        <Progress
          value={((index + 1) / STEPS.length) * 100}
          size="sm"
          color="ship"
          aria-label={`Step ${index + 1} of ${STEPS.length}`}
        />

        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <Icon size={24} />
          </span>
          <Title order={3} size="var(--ship-text-lg)" mt="sm">
            {step.title}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            {step.body}
          </Text>
        </div>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Step {index + 1} of {STEPS.length}
          </Text>
          <Group gap="xs">
            <Button
              variant="subtle"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
            >
              Back
            </Button>
            {isLast ? (
              <Button onClick={finish} loading={markSeen.isPending}>
                Got it
              </Button>
            ) : (
              <Button onClick={() => setIndex((current) => current + 1)} data-autofocus>
                Next
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
