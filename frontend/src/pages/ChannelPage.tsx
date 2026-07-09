import { useCallback, useEffect, useRef } from 'react';
import { useLoaderData, useFetcher, useRevalidator } from 'react-router-dom';
import { Hash, Settings, Users, Send, Smile, Paperclip } from 'lucide-react';
import { Button, Avatar } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { useChannelSocket } from '../hooks/useChannelSocket';
import { ReactionBar } from '../components/ReactionBar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Message, Channel } from '../types';

interface LoaderData {
  channel: Channel;
  messages: Message[];
}

export function ChannelPage() {
  const { channel, messages } = useLoaderData() as LoaderData;
  const { user } = useAuthStore();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Temps réel : recharge les messages quand le serveur signale un changement.
  const handleRealtimeChange = useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);
  const { typingUserIds, notifyTyping } = useChannelSocket(
    channel.id,
    handleRealtimeChange
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      formRef.current?.reset();
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Channel header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{channel.name}</h1>
            {channel.description && (
              <p className="text-sm text-gray-500">{channel.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Aucun message dans ce channel. Soyez le premier à écrire !
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwn={message.authorId === user?.id}
              currentUserId={user?.id}
              onReactionChange={handleRealtimeChange}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Indicateur « en train d'écrire » (temps réel) */}
      {typingUserIds.length > 0 && (
        <div className="px-1 py-1 text-xs italic text-gray-400">
          {typingUserIds.length === 1
            ? "Quelqu'un est en train d'écrire…"
            : `${typingUserIds.length} personnes sont en train d'écrire…`}
        </div>
      )}

      {/* Message input */}
      <fetcher.Form
        ref={formRef}
        method="post"
        className="pt-4 border-t border-gray-200"
      >
        <input type="hidden" name="intent" value="send-message" />
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              name="content"
              placeholder={`Envoyer un message dans #${channel.name}`}
              className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={1}
              onKeyDown={handleKeyDown}
              onChange={() => notifyTyping()}
              required
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600 rounded"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
          </div>
          <Button type="submit" isLoading={fetcher.state !== 'idle'}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </fetcher.Form>
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  currentUserId?: number;
  onReactionChange: () => void;
}

function MessageItem({
  message,
  isOwn,
  currentUserId,
  onReactionChange,
}: MessageItemProps) {
  const author = message.author;

  return (
    <div className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar user={author} size="sm" className="flex-shrink-0" />
      <div className={`flex-1 max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
        <div className={`flex items-baseline gap-2 ${isOwn ? 'justify-end' : ''}`}>
          <span className="font-medium text-gray-900">
            {author?.firstName} {author?.lastName}
          </span>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
              locale: fr,
            })}
          </span>
        </div>
        <div
          className={`mt-1 inline-block px-4 py-2 rounded-lg ${
            isOwn ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.editedAt && (
          <p className="text-xs text-gray-400 mt-1">(modifié)</p>
        )}
        <div className={isOwn ? 'flex justify-end' : ''}>
          <ReactionBar
            messageId={message.id}
            reactions={message.reactions ?? []}
            currentUserId={currentUserId}
            onChanged={onReactionChange}
          />
        </div>
      </div>
    </div>
  );
}
