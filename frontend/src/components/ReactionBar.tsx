/**
 * @fileoverview Barre de réactions d'un message : affichage groupé des réactions
 * existantes + sélecteur d'emoji pour en ajouter/retirer.
 *
 * S'appuie sur l'API `messagesApi` ; l'actualisation (temps réel via
 * `reaction_added`/`reaction_removed`, ou rechargement) est déléguée à `onChanged`.
 */
import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import clsx from 'clsx';
import { messagesApi } from '../api/messages';
import type { Reaction, ReactionType } from '../types';

/** Les 6 réactions supportées par le backend et leur emoji. */
const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: "J'aime" },
  { type: 'love', emoji: '❤️', label: 'Adore' },
  { type: 'laugh', emoji: '😂', label: 'Rire' },
  { type: 'wow', emoji: '😮', label: 'Surpris' },
  { type: 'sad', emoji: '😢', label: 'Triste' },
  { type: 'angry', emoji: '😠', label: 'En colère' },
];

interface ReactionBarProps {
  messageId: number;
  reactions: Reaction[];
  currentUserId?: number;
  /** Appelé après un ajout/retrait pour rafraîchir l'affichage. */
  onChanged: () => void;
}

export function ReactionBar({
  messageId,
  reactions,
  currentUserId,
  onChanged,
}: ReactionBarProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const groups = REACTIONS.map((r) => {
    const list = reactions.filter((x) => x.type === r.type);
    return {
      ...r,
      count: list.length,
      mine: list.some((x) => x.userId === currentUserId),
    };
  });

  // Le backend n'autorise qu'une réaction par utilisateur et par message.
  const myReaction = reactions.find((x) => x.userId === currentUserId);

  const toggle = async (type: ReactionType, mine: boolean) => {
    if (pending) return;
    setPending(true);
    try {
      if (mine) {
        await messagesApi.removeReaction(messageId, type);
      } else {
        // Bascule : retire d'abord l'éventuelle réaction précédente.
        if (myReaction && myReaction.type !== type) {
          await messagesApi.removeReaction(messageId, myReaction.type);
        }
        await messagesApi.addReaction(messageId, type);
      }
      onChanged();
    } catch {
      // Erreur silencieuse : l'UI reste cohérente au prochain rafraîchissement.
    } finally {
      setPending(false);
      setOpen(false);
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {groups
        .filter((g) => g.count > 0)
        .map((g) => (
          <button
            key={g.type}
            type="button"
            onClick={() => toggle(g.type, g.mine)}
            disabled={pending}
            title={g.label}
            className={clsx(
              'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
              g.mine
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            <span>{g.emoji}</span>
            <span>{g.count}</span>
          </button>
        ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={pending}
          title="Ajouter une réaction"
          className="rounded-full p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
        >
          <SmilePlus className="h-4 w-4" />
        </button>

        {open && (
          <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
            {REACTIONS.map((r) => {
              const mine = reactions.some(
                (x) => x.type === r.type && x.userId === currentUserId
              );
              return (
                <button
                  key={r.type}
                  type="button"
                  onClick={() => toggle(r.type, mine)}
                  title={r.label}
                  className={clsx(
                    'rounded p-1 text-lg leading-none hover:bg-gray-100',
                    mine && 'bg-primary-50'
                  )}
                >
                  {r.emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
