import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import { SOCKET_EVENTS } from '@shared/events';
import type {
  RaiseHandPayload,
  ReactionPayload,
  Poll,
  QAQuestion,
} from '@shared/types';

export interface EngagementReaction extends ReactionPayload {
  /** Unique key for animation/keying. */
  key: string;
  /** Stable horizontal position (%) computed once at creation to prevent jitter. */
  left: number;
}

export interface UseEngagementReturn {
  /** Map of userId → whether their hand is raised */
  raisedHands: Record<string, boolean>;
  /** Recent emoji reactions (auto-cleared after 4 s) */
  reactions: EngagementReaction[];
  polls: Poll[];
  questions: QAQuestion[];
  isHandRaised: boolean;
  raiseHand: () => void;
  lowerHand: () => void;
  sendReaction: (emoji: string) => void;
  createPoll: (question: string, options: string[]) => void;
  votePoll: (pollId: string, optionId: string) => void;
  closePoll: (pollId: string) => void;
  submitQuestion: (text: string, userName: string) => void;
  upvoteQuestion: (questionId: string) => void;
  answerQuestion: (questionId: string) => void;
  requestEngagementState: () => void;
}

/**
 * Manages all meeting engagement: raise hand, emoji reactions, polls, and Q&A.
 * Must be used inside a room — pass the current roomId.
 */
export function useEngagement(roomId: string | null): UseEngagementReturn {
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<EngagementReaction[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [isHandRaised, setIsHandRaised] = useState(false);

  useEffect(() => {
    const onHandRaised = (payload: RaiseHandPayload) => {
      setRaisedHands(prev => ({ ...prev, [payload.userId]: payload.raised }));
      if (payload.userId === socket.id) setIsHandRaised(payload.raised);
    };

    const onReaction = (payload: ReactionPayload) => {
      const entry: EngagementReaction = {
        ...payload,
        key: `${payload.userId}-${Date.now()}-${Math.random()}`,
        left: 20 + Math.random() * 60,
      };
      setReactions(prev => [...prev, entry]);
      // Auto-clear after 4 s
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.key !== entry.key));
      }, 4000);
    };

    const onPollCreated = (poll: Poll) => {
      setPolls(prev => [...prev, poll]);
    };

    const onPollUpdated = (poll: Poll) => {
      setPolls(prev => prev.map(p => (p.id === poll.id ? poll : p)));
    };

    const onQuestionSubmitted = (q: QAQuestion) => {
      setQuestions(prev => [...prev, q]);
    };

    const onQuestionUpdated = (q: QAQuestion) => {
      setQuestions(prev => prev.map(existing => (existing.id === q.id ? q : existing)));
    };

    const onEngagementState = ({
      polls: initialPolls,
      questions: initialQuestions,
    }: {
      polls: Poll[];
      questions: QAQuestion[];
    }) => {
      setPolls(initialPolls);
      setQuestions(initialQuestions);
    };

    socket.on(SOCKET_EVENTS.HAND_RAISED, onHandRaised);
    socket.on(SOCKET_EVENTS.REACTION_RECEIVED, onReaction);
    socket.on(SOCKET_EVENTS.POLL_CREATED, onPollCreated);
    socket.on(SOCKET_EVENTS.POLL_UPDATED, onPollUpdated);
    socket.on(SOCKET_EVENTS.QUESTION_SUBMITTED, onQuestionSubmitted);
    socket.on(SOCKET_EVENTS.QUESTION_UPDATED, onQuestionUpdated);
    socket.on(SOCKET_EVENTS.ENGAGEMENT_STATE, onEngagementState);

    return () => {
      socket.off(SOCKET_EVENTS.HAND_RAISED, onHandRaised);
      socket.off(SOCKET_EVENTS.REACTION_RECEIVED, onReaction);
      socket.off(SOCKET_EVENTS.POLL_CREATED, onPollCreated);
      socket.off(SOCKET_EVENTS.POLL_UPDATED, onPollUpdated);
      socket.off(SOCKET_EVENTS.QUESTION_SUBMITTED, onQuestionSubmitted);
      socket.off(SOCKET_EVENTS.QUESTION_UPDATED, onQuestionUpdated);
      socket.off(SOCKET_EVENTS.ENGAGEMENT_STATE, onEngagementState);
    };
  }, []);

  const raiseHand = useCallback(() => {
    setIsHandRaised(true);
    socket.emit(SOCKET_EVENTS.RAISE_HAND, { raised: true });
  }, []);

  const lowerHand = useCallback(() => {
    setIsHandRaised(false);
    socket.emit(SOCKET_EVENTS.RAISE_HAND, { raised: false });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    socket.emit(SOCKET_EVENTS.SEND_REACTION, { emoji });
  }, []);

  const createPoll = useCallback(
    (question: string, options: string[]) => {
      if (!roomId) return;
      socket.emit(SOCKET_EVENTS.CREATE_POLL, { roomId, question, options });
    },
    [roomId],
  );

  const votePoll = useCallback(
    (pollId: string, optionId: string) => {
      if (!roomId) return;
      socket.emit(SOCKET_EVENTS.VOTE_POLL, { roomId, pollId, optionId });
    },
    [roomId],
  );

  const closePoll = useCallback(
    (pollId: string) => {
      if (!roomId) return;
      socket.emit(SOCKET_EVENTS.CLOSE_POLL, { roomId, pollId });
    },
    [roomId],
  );

  const submitQuestion = useCallback(
    (text: string, userName: string) => {
      if (!roomId) return;
      socket.emit(SOCKET_EVENTS.SUBMIT_QUESTION, { roomId, text, userName });
    },
    [roomId],
  );

  const upvoteQuestion = useCallback(
    (questionId: string) => {
      if (!roomId) return;
      socket.emit(SOCKET_EVENTS.UPVOTE_QUESTION, { roomId, questionId });
    },
    [roomId],
  );

  const answerQuestion = useCallback(
    (questionId: string) => {
      if (!roomId) return;
      socket.emit(SOCKET_EVENTS.ANSWER_QUESTION, { roomId, questionId });
    },
    [roomId],
  );

  const requestEngagementState = useCallback(() => {
    if (!roomId) return;
    socket.emit(SOCKET_EVENTS.REQUEST_ENGAGEMENT_STATE, { roomId });
  }, [roomId]);

  return {
    raisedHands,
    reactions,
    polls,
    questions,
    isHandRaised,
    raiseHand,
    lowerHand,
    sendReaction,
    createPoll,
    votePoll,
    closePoll,
    submitQuestion,
    upvoteQuestion,
    answerQuestion,
    requestEngagementState,
  };
}
