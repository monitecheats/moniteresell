'use client';

import * as React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import { computePricing, formatCredits } from '@/lib/subscriptions';

interface GameOption {
  uid: string | null;
  name: string | null;
  devices: string[];
  durations: string[];
  price: Record<string, number | string>;
  active: boolean;
}

const quantityOptions = [1, 5, 10, 20];

type CreateSubscriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function CreateSubscriptionDialog({ open, onOpenChange, onCreated }: CreateSubscriptionDialogProps) {
  const { toast } = useToast();
  const { user, csrfToken, refreshCsrf, refreshUser } = useDashboard();
  const [games, setGames] = React.useState<GameOption[]>([]);
  const [loadingGames, setLoadingGames] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [gameUid, setGameUid] = React.useState('');
  const [device, setDevice] = React.useState('');
  const [duration, setDuration] = React.useState('');
  const [quantity, setQuantity] = React.useState<number>(1);

  const canBypassCredits = user?.permissions.includes('create_keys_nocredit') ?? false;

  const selectedGame = React.useMemo(() => games.find((game) => game.uid === gameUid), [games, gameUid]);
  const deviceOptions = React.useMemo(() => selectedGame?.devices ?? [], [selectedGame]);
  const durationOptions = React.useMemo(() => selectedGame?.durations ?? [], [selectedGame]);
  const rawPrice = selectedGame?.price?.[duration];
  const pricing = React.useMemo(
    () => computePricing(rawPrice, quantity, canBypassCredits),
    [rawPrice, quantity, canBypassCredits]
  );
  const rawPriceLabel = React.useMemo(() => {
    if (pricing.unitPrice != null) {
      return null;
    }
    if (typeof rawPrice === 'string') {
      return rawPrice;
    }
    return null;
  }, [pricing.unitPrice, rawPrice]);
  const unitPriceLabel = canBypassCredits
    ? 'Waived (no credits deducted)'
    : pricing.unitPrice != null
    ? formatCredits(pricing.unitPrice)
    : rawPriceLabel ?? '—';
  const totalCostLabel = canBypassCredits
    ? 'Waived (permission granted)'
    : pricing.requiresDebit && pricing.unitPrice != null
    ? formatCredits(pricing.totalCost)
    : '—';

  React.useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }
    setLoadingGames(true);
    fetch('/api/games', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load games');
        }
        const data = (await response.json()) as { games: GameOption[] };
        setGames(data.games.filter((game) => game.uid));
      })
      .catch((err) => {
        console.error(err);
        setError('Unable to load available products');
      })
      .finally(() => {
        setLoadingGames(false);
      });
  }, [open]);

  React.useEffect(() => {
    if (!selectedGame) {
      setDevice('');
      setDuration('');
      return;
    }
    if (deviceOptions.length === 1) {
      setDevice(deviceOptions[0] ?? '');
    }
    if (durationOptions.length === 1) {
      setDuration(durationOptions[0] ?? '');
    }
  }, [selectedGame, deviceOptions, durationOptions]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gameUid || !duration || (!device && deviceOptions.length > 0)) {
      setError('Please select a game, device, and duration.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const ensureToken = async () => {
        if (csrfToken) return csrfToken;
        return refreshCsrf();
      };
      const executeRequest = async (token: string) =>
        fetch('/api/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token
          },
          credentials: 'include',
          body: JSON.stringify({ gameUid, device: device || (deviceOptions[0] ?? ''), duration, quantity })
        });

      let token = await ensureToken();
      if (!token) {
        throw new Error('Missing CSRF token');
      }
      let response = await executeRequest(token);

      if (response.status === 403) {
        const freshToken = await refreshCsrf();
        if (freshToken && freshToken !== token) {
          token = freshToken;
          response = await executeRequest(token);
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          await refreshUser();
        }
        const data = await response.json().catch(() => ({}));
        throw new Error((data?.error as string) ?? 'Request failed');
      }
      await refreshUser();
      toast({ title: 'Subscriptions created', description: 'Your new subscriptions are ready.' });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to create subscriptions');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="md:hidden" onClick={() => onOpenChange(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create subscriptions</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label>Product</Label>
              <Select value={gameUid} onValueChange={setGameUid} disabled={loadingGames}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingGames ? 'Loading products…' : 'Select a game'} />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.uid ?? ''} value={game.uid ?? ''}>
                      {game.name ?? game.uid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Device</Label>
              {deviceOptions.length === 0 ? (
                <Input value="No device required" disabled readOnly />
              ) : (
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceOptions.map((option) => (
                      <SelectItem key={option} value={option} className="capitalize">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Quantity</Label>
              <Select value={String(quantity)} onValueChange={(value) => setQuantity(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quantityOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-medium text-foreground">Summary</p>
            <p className="text-muted-foreground">
              Credits available: {user ? formatCredits(user.credits) : '—'}
            </p>
            <p className="text-muted-foreground">Unit price: {unitPriceLabel}</p>
            <p className="text-foreground">Total cost: {totalCostLabel}</p>
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                loadingGames ||
                !gameUid ||
                !duration ||
                (!device && deviceOptions.length > 0) ||
                (pricing.requiresDebit && pricing.unitPrice == null)
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
