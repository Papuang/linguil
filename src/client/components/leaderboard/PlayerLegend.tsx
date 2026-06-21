'use client';

import { memo, useMemo, lazy, Suspense } from 'react';
import { Button } from '@/client/components/ui/button';
import { X, Pencil } from 'lucide-react';

// Dynamically import `UpdateNameDialog` with a loading placeholder.
const UpdateNameDialog = lazy(() => import('@/client/components/leaderboard/UpdateNameDialog').then(mod => ({ default: mod.UpdateNameDialog })));

// Data shape for a player in the legend.
type PlayerLegendDataPoint = {
  uid: string;
  name: string;
  fill: string;
};

// Props for PlayerLegendItem.
type PlayerLegendItemProps = {
  // Player data to render.
  player: PlayerLegendDataPoint;
  // True if this is the current user.
  isCurrentUser: boolean;
  // Current user's full name.
  currentUserName?: string;
  // Callback to remove a friend.
  onRemoveFriend?: (uid: string, name: string) => void;
  // Callback to update user's name.
  onUpdateName?: (newName: string) => Promise<void>;
};

// Renders a single item in the player legend.
const PlayerLegendItem = memo<PlayerLegendItemProps>(({ 
  player, 
  isCurrentUser, 
  currentUserName, 
  onRemoveFriend, 
  onUpdateName 
}) => {
  // Handles the remove friend action.
  const handleRemove = () => {
    if (onRemoveFriend) {
      onRemoveFriend(player.uid, player.name);
    }
  };

  // Show remove button if not current user and handler exists.
  const canRemove = !isCurrentUser && onRemoveFriend;
  // Show update button if current user and handler exists.
  const canUpdate = isCurrentUser && onUpdateName && currentUserName !== undefined;

  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: player.fill }} />
      <span>{player.name}</span>
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6"
          onClick={handleRemove}
          aria-label={`Remove ${player.name} from friends`}>
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
      {canUpdate && (
        <Suspense fallback={<div className="w-6 h-6 flex items-center justify-center"></div>}>
            <UpdateNameDialog currentName={currentUserName} onSave={onUpdateName}>
                <Button variant="ghost" size="icon" className="w-6 h-6" aria-label="Update your display name">
                    <Pencil className="text-muted-foreground" style={{ width: '12px', height: '12px' }} />
                </Button>
            </UpdateNameDialog>
        </Suspense>
      )}
    </div>
  );
});
PlayerLegendItem.displayName = 'PlayerLegendItem';

// Props for PlayerLegend.
type PlayerLegendProps = {
  // Data for the player legend.
  data: PlayerLegendDataPoint[];
  // Current user's UID.
  currentUserId?: string;
  // Current user's display name.
  currentUserDisplayName?: string;
  // Callback to remove a friend.
  onRemoveFriend?: (uid: string, name: string) => void;
  // Callback to update user's name.
  onUpdateName?: (newName: string) => Promise<void>;
};

// Renders a legend of players for the leaderboard chart.
const PlayerLegend = memo<PlayerLegendProps>(({ 
  data, 
  currentUserId, 
  currentUserDisplayName, 
  onRemoveFriend, 
  onUpdateName 
}) => {
  // Memoizes legend rows, chunked into groups of 5.
  const playerLegendRows = useMemo(() => {
    const rows: PlayerLegendDataPoint[][] = [];
    if (!data) return rows;

    for (let i = 0; i < data.length; i += 5) {
      rows.push(data.slice(i, i + 5));
    }
    return rows;
  }, [data]);

  return (
    <div className="flex flex-col items-center gap-y-2">
      {playerLegendRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center items-center gap-x-4 flex-wrap">
          {row.map((player) => (
            <PlayerLegendItem
              key={player.uid}
              player={player}
              isCurrentUser={player.uid === currentUserId}
              currentUserName={currentUserDisplayName}
              onRemoveFriend={onRemoveFriend}
              onUpdateName={onUpdateName}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

PlayerLegend.displayName = 'PlayerLegend';

export { PlayerLegend };